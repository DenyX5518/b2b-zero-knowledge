import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import { BACKEND_ROOM_IDS, DEMO_ACCOUNT, DEMO_DEVICE, DEMO_DOCUMENT_IDS, DEMO_PASSPHRASE, ORG_ID, STORAGE_PREFIX, defaultApiOrigin, type RoomId } from "../../shared/config/constants";
import { ApiError, apiRequest, type BackendSession, type EncryptedMessage } from "../../shared/lib/api";
import { createRecoveryShares, decryptXChaCha20, deriveUnlockKey, encryptXChaCha20, generateContentKey, openJson, recoverSecret, sealJson, sha256Hex, type CipherEnvelope } from "../../shared/lib/crypto";
import { decodeJwtSubject, fromBase64, toBase64, utf8Decode, utf8Encode } from "../../shared/lib/encoding";
import { formatTime } from "../../shared/lib/format";
import { defaultDocuments, defaultMessages, documentStatuses, isEditable, type ChatMessage, type DocumentItem, type DocumentVersion } from "../../shared/model/demoData";

export type MobileTab = "home" | "chats" | "documents" | "security";
export type Route =
  | { name: "conversation"; roomId: RoomId }
  | { name: "document"; documentId: string }
  | { name: "new-document" }
  | { name: "crypto" | "audit" | "infrastructure" | "team" | "access" | "server" };
export type RealtimeState = "offline" | "connecting" | "connected" | "disconnected" | "error";
export type BackendStatus = "unknown" | "checking" | "ready" | "down";
export type Toast = { id: string; title: string; description: string; tone: "success" | "danger" };
export type AuditEvent = { id: string; at: string; actor: string; action: string; target: string; result: string; tenant: string; prevHash: string; hash: string };

const KEYS = {
  messages: `${STORAGE_PREFIX}:messages`,
  documents: `${STORAGE_PREFIX}:documents`,
  audit: `${STORAGE_PREFIX}:audit`,
  apiOrigin: `${STORAGE_PREFIX}:api-origin`
};
// Ключ доверенного устройства хранится в iOS Keychain и не покидает это устройство.
const DEVICE_KEY = `kontur.device-key.${ORG_ID}`;
const VAULT_SCHEMA = "mobile-vault-v1";
const ACCESS_REFRESH_MS = 4 * 60 * 1000;
const localRoomByBackendId = Object.fromEntries(Object.entries(BACKEND_ROOM_IDS).map(([room, id]) => [id, room])) as Record<string, RoomId>;

// Секреты и соединения намеренно не лежат в сериализуемом состоянии.
const runtime: { rootKey: Uint8Array | null; shares: Uint8Array[]; socket: Socket | null; userId: string | null; refreshTimer: ReturnType<typeof setInterval> | null; documentSync: Promise<void> | null; documentSyncAgain: boolean } = {
  rootKey: null, shares: [], socket: null, userId: null, refreshTimer: null, documentSync: null, documentSyncAgain: false
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const errorText = (error: unknown) => error instanceof Error ? error.message : "Неизвестная ошибка";

async function persistVault(messages: ChatMessage[], documents: DocumentItem[]): Promise<void> {
  if (!runtime.rootKey) return;
  await AsyncStorage.multiSet([
    [KEYS.messages, JSON.stringify(sealJson(messages, runtime.rootKey, VAULT_SCHEMA))],
    [KEYS.documents, JSON.stringify(sealJson(documents, runtime.rootKey, VAULT_SCHEMA))]
  ]);
}

// Автор и время едут внутри ciphertext — формат совпадает с web-клиентом.
function sealMessage(item: ChatMessage, backendRoomId: string) {
  const payload = utf8Encode(JSON.stringify({ v: 2, text: item.text, author: item.author, initials: item.initials, sentAt: item.sentAt }));
  return encryptXChaCha20(payload, runtime.rootKey!, { tenantId: ORG_ID, roomId: backendRoomId, clientMessageId: item.id }, 1);
}

type MessagePayload = { text?: unknown; author?: unknown; initials?: unknown; sentAt?: unknown };

function openMessage(raw: EncryptedMessage, room: RoomId): ChatMessage {
  const plaintext = decryptXChaCha20(raw, runtime.rootKey!);
  const decoded = utf8Decode(plaintext);
  plaintext.fill(0);
  let payload: MessagePayload | null = null;
  try { payload = JSON.parse(decoded) as MessagePayload; } catch { /* сообщения v1 содержат только текст */ }
  const text = typeof payload?.text === "string" ? payload.text : decoded;
  const self = Boolean(runtime.userId) && raw.senderId === runtime.userId;
  const sentAt = typeof payload?.sentAt === "string" ? payload.sentAt : raw.createdAt || new Date().toISOString();
  return {
    id: String(raw.clientMessageId),
    room,
    author: typeof payload?.author === "string" ? payload.author : self ? DEMO_ACCOUNT.name : "Участник",
    initials: typeof payload?.initials === "string" ? payload.initials : self ? DEMO_ACCOUNT.initials : "УЧ",
    time: formatTime(sentAt),
    sentAt,
    text,
    self
  };
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] | null {
  const byId = new Map(current.map((item) => [item.id, item]));
  let changed = false;
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing) { byId.set(item.id, item); changed = true; }
    else if (existing.pending) { byId.set(item.id, { ...existing, pending: false }); changed = true; }
  }
  if (!changed) return null;
  return [...byId.values()].sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? ""));
}

type RemoteDocument = { id: string; version: number; wrappedDek: string; nonce: string; aad: string; ciphertext: string };
type DocumentPayload = { title: string; kind?: DocumentItem["kind"]; status: string; classification: string; owner: string; editor?: string; updated: string; version: number; content: string; canEdit?: boolean; history?: DocumentVersion[] };

const syncIdOf = (document: DocumentItem) => DEMO_DOCUMENT_IDS[document.id] ?? document.id;
const snapshotOf = (document: DocumentItem): DocumentVersion => ({ version: document.version, title: document.title, content: document.content, status: document.status, updated: document.updated, author: document.editor ?? document.owner });

function aadContext(aad: string): { tenantId?: string; documentId?: string; version?: number } | null {
  try { return JSON.parse(utf8Decode(fromBase64(aad))) as { tenantId?: string; documentId?: string; version?: number }; } catch { return null; }
}

// Формат совпадает с web-клиентом: каждая версия шифруется своим DEK, DEK обёрнут ключом организации.
function sealDocument(document: DocumentItem) {
  const context = { tenantId: ORG_ID, documentId: syncIdOf(document), version: document.version };
  const payload: DocumentPayload & { v: 1 } = { v: 1, title: document.title, kind: document.kind, status: document.status, classification: document.classification, owner: document.owner, editor: document.editor, updated: document.updated, version: document.version, content: document.content, canEdit: isEditable(document), history: document.history ?? [] };
  const dek = generateContentKey();
  const envelope = encryptXChaCha20(utf8Encode(JSON.stringify(payload)), dek, { ...context, purpose: "document" }, 1);
  const wrapped = encryptXChaCha20(dek, runtime.rootKey!, { ...context, purpose: "dek-wrap" }, 1);
  dek.fill(0);
  return { wrappedDek: JSON.stringify({ nonce: wrapped.nonce, aad: wrapped.aad, ciphertext: wrapped.ciphertext }), nonce: envelope.nonce, aad: envelope.aad, ciphertext: envelope.ciphertext };
}

function openRemoteDocument(remote: RemoteDocument): DocumentPayload {
  const wrapped = JSON.parse(remote.wrappedDek) as { nonce: string; aad: string; ciphertext: string };
  // AAD приходит с сервера, поэтому сверяем, что он относится именно к этому документу и версии.
  for (const aad of [wrapped.aad, remote.aad]) {
    const context = aadContext(aad);
    if (context?.tenantId !== ORG_ID || context.documentId !== remote.id || context.version !== remote.version) throw new Error("AAD mismatch");
  }
  const dek = decryptXChaCha20(wrapped, runtime.rootKey!);
  const plaintext = decryptXChaCha20(remote, dek);
  dek.fill(0);
  const payload = JSON.parse(utf8Decode(plaintext)) as DocumentPayload;
  plaintext.fill(0);
  if (payload.version !== remote.version) throw new Error("Version mismatch");
  return payload;
}

function documentFromPayload(remoteId: string, payload: DocumentPayload, local?: DocumentItem): DocumentItem {
  return {
    ...(local ?? {}),
    id: local?.id ?? remoteId,
    title: payload.title,
    kind: payload.kind ?? "doc",
    status: payload.status,
    statusTone: documentStatuses.find((entry) => entry.name === payload.status)?.tone ?? local?.statusTone ?? "dark",
    classification: payload.classification,
    owner: payload.owner,
    editor: payload.editor,
    updated: payload.updated,
    version: payload.version,
    content: payload.content,
    canEdit: payload.canEdit ?? true,
    history: payload.history ?? [],
    syncedVersion: payload.version
  };
}

function stopRefreshTimer() {
  if (runtime.refreshTimer) clearInterval(runtime.refreshTimer);
  runtime.refreshTimer = null;
}

function closeSocket() {
  runtime.socket?.removeAllListeners();
  runtime.socket?.disconnect();
  runtime.socket = null;
}

type MobileState = {
  activeTab: MobileTab;
  route: Route | null;
  unlockSheetOpen: boolean;
  unlocked: boolean;
  unlocking: boolean;
  unlockProgress: number;
  hasDeviceKey: boolean;
  messages: ChatMessage[];
  documents: DocumentItem[];
  audit: AuditEvent[];
  unread: Partial<Record<RoomId, number>>;
  approvals: string[];
  apiOrigin: string;
  backendStatus: BackendStatus;
  backendSession: BackendSession | null;
  realtimeState: RealtimeState;
  toasts: Toast[];

  init: () => Promise<void>;
  setActiveTab: (tab: MobileTab) => void;
  openRoute: (route: Route) => void;
  goBack: () => void;
  openChat: (roomId: RoomId) => void;
  requireUnlock: () => boolean;
  setUnlockSheetOpen: (open: boolean) => void;
  toast: (title: string, description: string, tone?: Toast["tone"]) => void;
  appendAudit: (action: string, target: string, result?: string) => Promise<void>;
  unlock: (passphrase?: string) => Promise<void>;
  lock: (silent?: boolean) => void;
  forgetDeviceKey: () => Promise<void>;
  sendMessage: (roomId: RoomId, text: string) => Promise<void>;
  deliverMessage: (item: ChatMessage) => Promise<boolean>;
  flushPending: () => Promise<void>;
  receiveMessages: (raw: EncryptedMessage[]) => Promise<void>;
  syncHistory: () => Promise<void>;
  createDocument: (input: { title: string; content: string }) => Promise<void>;
  updateDocument: (documentId: string, changes: { title: string; content: string; status: string }) => Promise<void>;
  syncDocuments: () => Promise<void>;
  runDocumentSync: () => Promise<void>;
  openDocument: (documentId: string) => Promise<void>;
  verifyAudit: () => Promise<void>;
  toggleApproval: (holderId: string) => void;
  recoverKey: () => Promise<void>;
  setApiOrigin: (value: string) => Promise<void>;
  checkBackend: (options?: { silent?: boolean }) => Promise<boolean>;
  autoConnect: () => Promise<void>;
  demoLogin: (options?: { silent?: boolean }) => Promise<void>;
  startSession: (session: BackendSession) => void;
  connectRealtime: () => void;
  resume: () => Promise<void>;
  rotateSession: (options?: { silent?: boolean }) => Promise<boolean>;
  logout: () => Promise<void>;
};

export const useMobileStore = create<MobileState>((set, get) => ({
  activeTab: "home",
  route: null,
  unlockSheetOpen: false,
  unlocked: false,
  unlocking: false,
  unlockProgress: 0,
  hasDeviceKey: false,
  messages: [],
  documents: [],
  audit: [],
  unread: {},
  approvals: [],
  apiOrigin: defaultApiOrigin(),
  backendStatus: "unknown",
  backendSession: null,
  realtimeState: "offline",
  toasts: [],

  init: async () => {
    const [savedOrigin, deviceKey] = await Promise.all([
      AsyncStorage.getItem(KEYS.apiOrigin).catch(() => null),
      SecureStore.getItemAsync(DEVICE_KEY).catch(() => null)
    ]);
    set({ apiOrigin: savedOrigin || defaultApiOrigin(), hasDeviceKey: Boolean(deviceKey) });
  },

  setActiveTab: (activeTab) => set({ activeTab, route: null }),
  openRoute: (route) => set({ route }),
  goBack: () => set({ route: null }),
  openChat: (roomId) => {
    if (!get().requireUnlock()) return;
    set((state) => ({ route: { name: "conversation", roomId }, unread: { ...state.unread, [roomId]: 0 } }));
  },
  requireUnlock: () => {
    if (get().unlocked) return true;
    set({ unlockSheetOpen: true });
    return false;
  },
  setUnlockSheetOpen: (unlockSheetOpen) => set({ unlockSheetOpen }),

  toast: (title, description, tone = "success") => {
    const item: Toast = { id: crypto.randomUUID(), title, description, tone };
    set((state) => ({ toasts: [...state.toasts.slice(-2), item] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== item.id) })), 3600);
  },

  appendAudit: async (action, target, result = "Разрешено") => {
    const previous = get().audit.at(-1)?.hash ?? "GENESIS";
    const event = { id: crypto.randomUUID(), at: new Date().toISOString(), actor: DEMO_ACCOUNT.name, action, target, result, tenant: ORG_ID, prevHash: previous };
    const stored: AuditEvent = { ...event, hash: sha256Hex(JSON.stringify(event)) };
    const audit = [...get().audit, stored];
    set({ audit });
    await AsyncStorage.setItem(KEYS.audit, JSON.stringify(audit));
  },

  unlock: async (passphrase) => {
    set({ unlocking: true, unlockProgress: 0 });
    try {
      let key: Uint8Array;
      if (passphrase === undefined) {
        const stored = await SecureStore.getItemAsync(DEVICE_KEY);
        if (!stored) throw new Error("Ключ устройства не найден — введите кодовую фразу.");
        key = fromBase64(stored);
      } else {
        key = await deriveUnlockKey(passphrase, (unlockProgress) => set({ unlockProgress }));
      }
      const saved = Object.fromEntries(await AsyncStorage.multiGet([KEYS.messages, KEYS.documents, KEYS.audit]));
      let messages: ChatMessage[];
      let documents: DocumentItem[];
      try {
        messages = saved[KEYS.messages] ? openJson<ChatMessage[]>(JSON.parse(saved[KEYS.messages]!) as CipherEnvelope, key) : clone(defaultMessages);
        documents = saved[KEYS.documents] ? openJson<DocumentItem[]>(JSON.parse(saved[KEYS.documents]!) as CipherEnvelope, key) : clone(defaultDocuments);
      } catch {
        key.fill(0);
        throw new Error("Неверная кодовая фраза: сохранённый vault не расшифровался.");
      }
      runtime.rootKey = key;
      runtime.shares = await createRecoveryShares(key);
      // Без Keychain разблокировка всё равно работает — просто в следующий раз понадобится фраза.
      const savedToKeychain = await SecureStore.setItemAsync(DEVICE_KEY, toBase64(key), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }).then(() => true, () => false);
      const audit = saved[KEYS.audit] ? JSON.parse(saved[KEYS.audit]!) as AuditEvent[] : [];
      set({ unlocked: true, unlocking: false, unlockSheetOpen: false, hasDeviceKey: savedToKeychain, messages, documents, audit, unread: {} });
      await persistVault(messages, documents);
      await get().appendAudit("Vault разблокирован", passphrase === undefined ? "iOS client · Keychain" : "iOS client · Argon2id");
      get().toast("Контур разблокирован", passphrase === undefined ? "Ключ доверенного устройства получен из Keychain." : "Ключ выведен Argon2id прямо на iPhone.");
      void get().autoConnect();
    } catch (error) {
      set({ unlocking: false, unlockProgress: 0 });
      throw error;
    }
  },

  lock: (silent = false) => {
    closeSocket();
    runtime.rootKey?.fill(0);
    runtime.rootKey = null;
    runtime.shares = [];
    set({ unlocked: false, messages: [], documents: [], approvals: [], unread: {}, route: null, realtimeState: "offline" });
    if (!silent) get().toast("Контур заблокирован", "Ключевой материал очищен из памяти приложения.");
  },

  forgetDeviceKey: async () => {
    await SecureStore.deleteItemAsync(DEVICE_KEY);
    set({ hasDeviceKey: false });
    get().lock(true);
    get().toast("Ключ устройства удалён", "Для следующей разблокировки понадобится кодовая фраза.");
  },

  sendMessage: async (roomId, text) => {
    const sentAt = new Date().toISOString();
    const item: ChatMessage = { id: crypto.randomUUID(), room: roomId, author: DEMO_ACCOUNT.name, initials: DEMO_ACCOUNT.initials, time: formatTime(sentAt), sentAt, text, self: true, pending: true };
    const messages = [...get().messages, item];
    set({ messages });
    await persistVault(messages, get().documents);
    await get().appendAudit("Сообщение отправлено", `room:${roomId} · content omitted`);
    await get().deliverMessage(item);
  },

  deliverMessage: async (item) => {
    const socket = runtime.socket;
    const backendRoomId = BACKEND_ROOM_IDS[item.room];
    if (!socket?.connected || !runtime.rootKey) return false;
    try {
      const envelope = sealMessage(item, backendRoomId);
      await socket.timeout(8000).emitWithAck("message:send", { roomId: backendRoomId, clientMessageId: item.id, ciphertext: envelope.ciphertext, nonce: envelope.nonce, aad: envelope.aad, keyEpoch: envelope.keyEpoch });
    } catch {
      return false; // сообщение остаётся в зашифрованной очереди
    }
    const messages = get().messages.map((message) => message.id === item.id ? { ...message, pending: false } : message);
    set({ messages });
    await persistVault(messages, get().documents);
    return true;
  },

  flushPending: async () => {
    for (const item of get().messages.filter((message) => message.pending)) {
      if (!await get().deliverMessage(item)) break;
    }
  },

  receiveMessages: async (rawMessages) => {
    if (!runtime.rootKey) return;
    const decoded: ChatMessage[] = [];
    let rejected = 0;
    for (const raw of rawMessages) {
      const room = localRoomByBackendId[raw?.roomId];
      if (!room || !raw?.clientMessageId) continue;
      try { decoded.push(openMessage(raw, room)); } catch { rejected += 1; }
    }
    if (rejected) get().toast("Часть сообщений отклонена", `${rejected} payload не прошли AEAD-проверку.`, "danger");
    const current = get();
    const merged = mergeMessages(current.messages, decoded);
    if (!merged) return;
    const known = new Set(current.messages.map((message) => message.id));
    const openRoom = current.route?.name === "conversation" ? current.route.roomId : null;
    const unread = { ...current.unread };
    for (const item of decoded) {
      if (!known.has(item.id) && !item.self && item.room !== openRoom) unread[item.room] = (unread[item.room] ?? 0) + 1;
    }
    set({ messages: merged, unread });
    await persistVault(merged, get().documents);
  },

  syncHistory: async () => {
    const { backendSession, apiOrigin } = get();
    if (!backendSession) return;
    const batches = await Promise.all(Object.values(BACKEND_ROOM_IDS).map((roomId) => apiRequest<EncryptedMessage[]>(apiOrigin, `/rooms/${roomId}/messages`, { token: backendSession.accessToken }).catch(() => [])));
    await get().receiveMessages(batches.flat());
  },

  createDocument: async ({ title, content }) => {
    if (!content.trim()) throw new Error("Введите текст документа.");
    const document: DocumentItem = { id: crypto.randomUUID(), title: title.trim() || "Новый документ", kind: "doc", status: "Черновик", statusTone: "blue", classification: "Внутренний", owner: DEMO_ACCOUNT.name, updated: `сегодня, ${formatTime()}`, version: 1, canEdit: true, content: content.trim() };
    const documents = [document, ...get().documents];
    set({ documents, route: { name: "document", documentId: document.id } });
    await persistVault(get().messages, documents);
    await get().appendAudit("Документ создан", `${document.title} · v1`);
    get().toast("Документ создан", "Текст зашифрован XChaCha20-Poly1305 на устройстве.");
    void get().syncDocuments();
  },

  // Каждое сохранение — новая версия; предыдущая остаётся в истории внутри того же зашифрованного vault.
  updateDocument: async (documentId, { title, content, status }) => {
    const current = get().documents.find((document) => document.id === documentId);
    if (!current) throw new Error("Документ не найден.");
    if (!isEditable(current)) throw new Error("Этот документ доступен только для просмотра.");
    const nextTitle = title.trim() || current.title;
    const nextContent = content.trim();
    if (!nextContent) throw new Error("Документ не может быть пустым.");
    if (nextTitle === current.title && nextContent === current.content && status === current.status) return;
    const snapshot = { version: current.version, title: current.title, content: current.content, status: current.status, updated: current.updated, author: current.editor ?? current.owner };
    const statusTone = documentStatuses.find((entry) => entry.name === status)?.tone ?? current.statusTone;
    const next: DocumentItem = { ...current, title: nextTitle, content: nextContent, status, statusTone, version: current.version + 1, updated: `сегодня, ${formatTime()}`, editor: DEMO_ACCOUNT.name, history: [...(current.history ?? []), snapshot].slice(-20) };
    const documents = get().documents.map((document) => document.id === documentId ? next : document);
    set({ documents });
    await persistVault(get().messages, documents);
    await get().appendAudit("Документ изменён", `${next.title} · v${next.version}`);
    get().toast("Версия сохранена", `«${next.title}» → v${next.version}. Текст зашифрован на iPhone.`);
    void get().syncDocuments();
  },

  // Запуски сериализуются: событие с сервера во время синхронизации просто ставит повтор.
  syncDocuments: async () => {
    if (runtime.documentSync) { runtime.documentSyncAgain = true; return runtime.documentSync; }
    runtime.documentSync = (async () => {
      try {
        do { runtime.documentSyncAgain = false; await get().runDocumentSync(); } while (runtime.documentSyncAgain);
      } catch { /* backend недоступен — повторим при следующем подключении */ }
      finally { runtime.documentSync = null; }
    })();
    return runtime.documentSync;
  },

  runDocumentSync: async () => {
    const { backendSession: session, apiOrigin } = get();
    if (!session || !runtime.rootKey) return;
    const remote = await apiRequest<RemoteDocument[]>(apiOrigin, "/documents/sync", { token: session.accessToken });
    const remoteVersions = new Map(remote.map((item) => [item.id, item.version]));
    const snapshot = get().documents;
    const updates = new Map<string, { base: number; next: DocumentItem }>();
    const additions: DocumentItem[] = [];
    const pushes: DocumentItem[] = [];
    let rejected = 0;
    for (const item of remote) {
      const local = snapshot.find((document) => syncIdOf(document) === item.id);
      // Устройство, ещё ни разу не синхронизировавшее документ, считает его изменённым, если правило его локально.
      const localChanged = Boolean(local) && (local!.syncedVersion === undefined ? Boolean(local!.editor) : local!.version > local!.syncedVersion);
      if (local && local.syncedVersion === item.version) { if (localChanged) pushes.push(local); continue; }
      let serverCopy: DocumentItem;
      try { serverCopy = documentFromPayload(item.id, openRemoteDocument(item), local); } catch { rejected += 1; continue; }
      if (!local) additions.push(serverCopy);
      else if (!localChanged || (local.content === serverCopy.content && local.title === serverCopy.title && local.status === serverCopy.status)) updates.set(local.id, { base: local.version, next: serverCopy });
      else {
        // Документ изменили на двух устройствах: локальная правка становится новой версией поверх серверной.
        const rebased: DocumentItem = { ...local, version: item.version + 1, syncedVersion: item.version, history: [...(serverCopy.history ?? []), snapshotOf(serverCopy)].slice(-20) };
        updates.set(local.id, { base: local.version, next: rebased });
        pushes.push(rebased);
      }
    }
    for (const document of snapshot) {
      if (!remoteVersions.has(syncIdOf(document))) pushes.push(document);
    }
    if (rejected) get().toast("Часть документов отклонена", `${rejected} версий не прошли проверку AEAD.`, "danger");

    const pulled = additions.length + [...updates.values()].filter(({ base, next }) => next.version !== base).length;
    if (updates.size || additions.length) {
      const documents = [...additions, ...get().documents.map((document) => {
        const update = updates.get(document.id);
        if (!update) return document;
        if (document.version !== update.base) { runtime.documentSyncAgain = true; return document; } // пользователь успел изменить документ
        return update.next;
      })];
      set({ documents });
      await persistVault(get().messages, documents);
      if (pulled) get().toast("Документы обновлены", `Получено версий с другого устройства: ${pulled}.`);
    }

    for (const document of pushes) {
      try {
        const sealed = sealDocument(document);
        await apiRequest(apiOrigin, `/documents/sync/${syncIdOf(document)}`, { method: "POST", token: session.accessToken, body: { baseVersion: remoteVersions.get(syncIdOf(document)) ?? 0, version: document.version, ...sealed } });
        set((state) => ({ documents: state.documents.map((entry) => entry.id === document.id && entry.version === document.version ? { ...entry, syncedVersion: document.version } : entry) }));
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
        runtime.documentSyncAgain = true; // другое устройство успело раньше — заберём его версию и повторим
      }
    }
    if (pushes.length) await persistVault(get().messages, get().documents);
  },

  openDocument: async (documentId) => {
    if (!get().requireUnlock()) return;
    const document = get().documents.find((entry) => entry.id === documentId);
    if (!document) return;
    set({ route: { name: "document", documentId } });
    await get().appendAudit("Документ открыт", document.title);
  },

  verifyAudit: async () => {
    let previous = "GENESIS";
    let valid = true;
    for (const stored of get().audit) {
      const { hash, ...event } = stored;
      if (event.prevHash !== previous || sha256Hex(JSON.stringify(event)) !== hash) { valid = false; break; }
      previous = hash;
    }
    get().toast(valid ? "Цепочка подтверждена" : "Целостность нарушена", valid ? `${get().audit.length} событий последовательно связаны.` : "Обнаружено изменённое событие.", valid ? "success" : "danger");
  },

  toggleApproval: (holderId) => set((state) => {
    if (state.approvals.includes(holderId) || state.approvals.length >= 2) return state;
    return { approvals: [...state.approvals, holderId] };
  }),

  recoverKey: async () => {
    if (!runtime.rootKey) return;
    const selected = get().approvals.map((id) => runtime.shares[Number(id.split("-")[1]) - 1]).filter((share): share is Uint8Array => Boolean(share));
    const recovered = await recoverSecret(selected);
    const valid = recovered.length === runtime.rootKey.length && recovered.every((byte, index) => byte === runtime.rootKey![index]);
    recovered.fill(0);
    set({ approvals: [] });
    await get().appendAudit("Recovery drill", `Shamir 2-of-3 · ${valid ? "verified" : "failed"}`);
    get().toast(valid ? "Ключ восстановлен" : "Recovery не пройден", valid ? "Два share восстановили исходные 256 бит; буфер очищен." : "Полученный секрет не совпал.", valid ? "success" : "danger");
  },

  setApiOrigin: async (value) => {
    let origin = value.trim().replace(/\/+$/, "");
    if (origin && !/^https?:\/\//i.test(origin)) origin = `http://${origin}`;
    if (!origin) origin = defaultApiOrigin();
    if (origin === get().apiOrigin) return;
    closeSocket();
    stopRefreshTimer();
    set({ apiOrigin: origin, backendStatus: "unknown", backendSession: null, realtimeState: "offline" });
    await AsyncStorage.setItem(KEYS.apiOrigin, origin);
  },

  checkBackend: async ({ silent = false } = {}) => {
    set({ backendStatus: "checking" });
    try {
      await apiRequest(get().apiOrigin, "/health/ready", { timeoutMs: 4000 });
      set({ backendStatus: "ready" });
      if (!silent) get().toast("Backend готов", "PostgreSQL и Redis прошли readiness-check.");
      return true;
    } catch (error) {
      set({ backendStatus: "down" });
      if (!silent) get().toast("Backend недоступен", errorText(error), "danger");
      return false;
    }
  },

  // После разблокировки приложение само открывает сессию и подключает realtime, если backend доступен.
  autoConnect: async () => {
    if (get().backendSession) return get().connectRealtime();
    if (await get().checkBackend({ silent: true })) await get().demoLogin({ silent: true });
  },

  demoLogin: async ({ silent = false } = {}) => {
    try {
      const session = await apiRequest<BackendSession>(get().apiOrigin, "/auth/login", { method: "POST", body: { email: DEMO_ACCOUNT.email, password: DEMO_PASSPHRASE, deviceId: DEMO_DEVICE.id, deviceName: DEMO_DEVICE.name } });
      get().startSession(session);
      get().connectRealtime();
      get().toast(silent ? "Синхронизация включена" : "Сессия открыта", silent ? "Сообщения доставляются через backend на все устройства." : "Access + rotating refresh token получены.");
    } catch (error) {
      if (!silent) get().toast("Вход не выполнен", errorText(error), "danger");
    }
  },

  startSession: (session) => {
    runtime.userId = decodeJwtSubject(session.accessToken);
    set({ backendSession: session, backendStatus: "ready" });
    stopRefreshTimer();
    runtime.refreshTimer = setInterval(() => { void get().rotateSession({ silent: true }); }, ACCESS_REFRESH_MS);
  },

  connectRealtime: () => {
    const session = get().backendSession;
    if (!session || !get().unlocked || !runtime.rootKey) return;
    closeSocket();
    set({ realtimeState: "connecting" });
    const socket = io(`${get().apiOrigin}/realtime`, { auth: { token: session.accessToken }, transports: ["websocket"], reconnection: true, reconnectionDelayMax: 8000 });
    socket.on("connect", async () => {
      set({ realtimeState: "connected" });
      await Promise.all(Object.values(BACKEND_ROOM_IDS).map((roomId) => socket.timeout(5000).emitWithAck("room:join", { roomId }).catch(() => null)));
      await get().syncHistory();
      await get().flushPending();
      await get().syncDocuments();
    });
    socket.on("disconnect", (reason) => {
      set({ realtimeState: "disconnected" });
      // Сервер рвёт соединение при просроченном access token — обновляем его и подключаемся снова.
      if (reason === "io server disconnect") void get().resume();
    });
    socket.on("connect_error", () => set({ realtimeState: "error" }));
    socket.on("message:created", (message: EncryptedMessage) => { void get().receiveMessages([message]); });
    socket.on("document:updated", () => { void get().syncDocuments(); });
    runtime.socket = socket;
  },

  // Вызывается при возврате приложения на передний план: iOS замораживает таймеры и сокеты в фоне.
  resume: async () => {
    if (!get().unlocked || !get().backendSession) return;
    if (!await get().rotateSession({ silent: true })) return;
    if (!runtime.socket) return get().connectRealtime();
    if (!runtime.socket.connected) { runtime.socket.auth = { token: get().backendSession!.accessToken }; runtime.socket.connect(); }
    else { await get().syncHistory(); await get().syncDocuments(); }
  },

  rotateSession: async ({ silent = false } = {}) => {
    const session = get().backendSession;
    if (!session) return false;
    try {
      const next = await apiRequest<BackendSession>(get().apiOrigin, "/auth/refresh", { method: "POST", body: { refreshToken: session.refreshToken } });
      set({ backendSession: next });
      if (runtime.socket) runtime.socket.auth = { token: next.accessToken };
      if (!silent) get().toast("Token family ротирована", "Предыдущий refresh token теперь считается использованным.");
      return true;
    } catch (error) {
      // Без сети (status 0) сессию сохраняем: socket.io сам переподключится, когда связь вернётся.
      if (error instanceof ApiError && error.status === 0) {
        if (!silent) get().toast("Backend недоступен", errorText(error), "danger");
        return false;
      }
      stopRefreshTimer();
      closeSocket();
      set({ backendSession: null, realtimeState: "offline" });
      if (!silent) get().toast("Ротация отклонена", errorText(error), "danger");
      return false;
    }
  },

  logout: async () => {
    const session = get().backendSession;
    if (session) {
      try { await apiRequest(get().apiOrigin, "/auth/logout", { method: "POST", body: { refreshToken: session.refreshToken } }); } catch { /* локальное закрытие всё равно выполняется */ }
    }
    stopRefreshTimer();
    closeSocket();
    set({ backendSession: null, realtimeState: "offline" });
    get().toast("Сессия закрыта", "Refresh-token family отозвана.");
  }
}));

export const runtimeEnvelopePreview = async (): Promise<string | null> => AsyncStorage.getItem(KEYS.messages);
