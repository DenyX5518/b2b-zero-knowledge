import { create } from "zustand";
import { API_ORIGIN, BACKEND_ROOM_IDS, DEMO_ACCOUNT, DEMO_DEVICE, DEMO_DOCUMENT_IDS, DEMO_PASSPHRASE, DOCUMENT_STATUSES, ORG_ID, STORAGE_PREFIX } from "../../shared/config/constants.js";
import { defaultDocuments, defaultMessages } from "../../shared/model/demo-data.js";
import { base64ToBytes, bytesToBase64, formatNow, formatTime, sha256 } from "../../shared/lib/format.js";

// Секреты намеренно не находятся в сериализуемом UI-store.
const runtime = { vaultKey: null, rootKey: null, shares: [], socket: null, audit: [], userId: null, refreshTimer: null, documentSync: null, documentSyncAgain: false };
const loadCrypto = () => import("@kontur/crypto-client");
const localRoomByBackendId = Object.fromEntries(Object.entries(BACKEND_ROOM_IDS).map(([room, id]) => [id, room]));
// Access token живёт 5 минут; обновляем заранее, чтобы realtime-переподключение не получило просроченный токен.
const ACCESS_REFRESH_MS = 4 * 60 * 1000;

async function encryptPayload(payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aadText = `tenant=${ORG_ID};schema=react-v1`;
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aadText), tagLength: 128 },
    runtime.vaultKey,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return { version: 1, suite: "AES-256-GCM", tenant: ORG_ID, iv: bytesToBase64(iv), aad: btoa(aadText), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

async function decryptPayload(envelope) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv), additionalData: base64ToBytes(envelope.aad), tagLength: 128 },
    runtime.vaultKey,
    base64ToBytes(envelope.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function persistVault(messages, documents) {
  if (!runtime.vaultKey) return;
  const [messageEnvelope, documentEnvelope] = await Promise.all([encryptPayload(messages), encryptPayload(documents)]);
  localStorage.setItem(`${STORAGE_PREFIX}:messages`, JSON.stringify(messageEnvelope));
  localStorage.setItem(`${STORAGE_PREFIX}:documents`, JSON.stringify(documentEnvelope));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}/api/v1${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(Array.isArray(body?.message) ? body.message.join("; ") : body?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const bearer = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

function tokenSubject(accessToken) {
  try { return JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub; } catch { return null; }
}

// Автор и время едут внутри ciphertext: сервер видит только senderId и размер payload.
async function sealMessage(item, backendRoomId) {
  const { encryptXChaCha20 } = await loadCrypto();
  const payload = new TextEncoder().encode(JSON.stringify({ v: 2, text: item.text, author: item.author, initials: item.initials, sentAt: item.sentAt }));
  return encryptXChaCha20(payload, runtime.rootKey, { tenantId: ORG_ID, roomId: backendRoomId, clientMessageId: item.id }, 1);
}

async function openMessage(message, room) {
  const { decryptXChaCha20 } = await loadCrypto();
  const plaintext = await decryptXChaCha20({ version: 1, suite: "XCHACHA20-POLY1305-IETF", keyEpoch: Number(message.keyEpoch), nonce: String(message.nonce), aad: String(message.aad), ciphertext: String(message.ciphertext) }, runtime.rootKey);
  const raw = new TextDecoder().decode(plaintext);
  plaintext.fill(0);
  let payload = null;
  try { payload = JSON.parse(raw); } catch { /* сообщения v1 содержат только текст */ }
  if (typeof payload?.text !== "string") payload = { text: raw };
  const self = Boolean(runtime.userId) && message.senderId === runtime.userId;
  const sentAt = payload.sentAt || message.createdAt || new Date().toISOString();
  return { id: String(message.clientMessageId), room, author: payload.author || (self ? DEMO_ACCOUNT.name : "Участник"), initials: payload.initials || (self ? DEMO_ACCOUNT.initials : "УЧ"), time: formatTime(sentAt), sentAt, text: payload.text, self };
}

function mergeMessages(current, incoming) {
  const byId = new Map(current.map((item) => [item.id, item]));
  let changed = false;
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing) { byId.set(item.id, item); changed = true; }
    else if (existing.pending) { byId.set(item.id, { ...existing, pending: false }); changed = true; }
  }
  if (!changed) return null;
  return [...byId.values()].sort((a, b) => (a.sentAt || "").localeCompare(b.sentAt || ""));
}

const syncIdOf = (document) => DEMO_DOCUMENT_IDS[document.id] || document.id;
const snapshotOf = (document) => ({ version: document.version, title: document.title, content: document.content, status: document.status, updated: document.updated, author: document.editor || document.owner });
const SUITE = { version: 1, suite: "XCHACHA20-POLY1305-IETF", keyEpoch: 1 };

function aadContext(aad) {
  try { return JSON.parse(new TextDecoder().decode(base64ToBytes(aad))); } catch { return null; }
}

// Каждая версия документа шифруется своим случайным DEK; DEK обёрнут ключом организации.
async function sealDocument(document) {
  const { encryptXChaCha20, generateContentKey } = await loadCrypto();
  const context = { tenantId: ORG_ID, documentId: syncIdOf(document), version: document.version };
  const payload = { v: 1, title: document.title, kind: document.type, status: document.status, classification: document.classification, owner: document.owner, editor: document.editor, updated: document.updated, version: document.version, content: document.content, canEdit: document.canEdit !== false, history: document.history || [] };
  const dek = await generateContentKey();
  const envelope = await encryptXChaCha20(new TextEncoder().encode(JSON.stringify(payload)), dek, { ...context, purpose: "document" }, 1);
  const wrapped = await encryptXChaCha20(dek, runtime.rootKey, { ...context, purpose: "dek-wrap" }, 1);
  dek.fill(0);
  return { wrappedDek: JSON.stringify({ nonce: wrapped.nonce, aad: wrapped.aad, ciphertext: wrapped.ciphertext }), nonce: envelope.nonce, aad: envelope.aad, ciphertext: envelope.ciphertext };
}

async function openRemoteDocument(remote) {
  const { decryptXChaCha20 } = await loadCrypto();
  const wrapped = JSON.parse(remote.wrappedDek);
  // AAD приходит с сервера, поэтому сверяем, что он относится именно к этому документу и версии.
  for (const aad of [wrapped.aad, remote.aad]) {
    const context = aadContext(aad);
    if (context?.tenantId !== ORG_ID || context.documentId !== remote.id || context.version !== remote.version) throw new Error("AAD mismatch");
  }
  const dek = await decryptXChaCha20({ ...SUITE, ...wrapped }, runtime.rootKey);
  const plaintext = await decryptXChaCha20({ ...SUITE, nonce: remote.nonce, aad: remote.aad, ciphertext: remote.ciphertext }, dek);
  dek.fill(0);
  const payload = JSON.parse(new TextDecoder().decode(plaintext));
  plaintext.fill(0);
  if (payload.version !== remote.version) throw new Error("Version mismatch");
  return payload;
}

function documentFromPayload(remoteId, payload, local) {
  return {
    ...(local || {}),
    id: local?.id || remoteId,
    title: payload.title,
    type: payload.kind || "doc",
    status: payload.status,
    statusTone: DOCUMENT_STATUSES.find(([name]) => name === payload.status)?.[1] || local?.statusTone || "gray",
    classification: payload.classification,
    classificationTone: local?.classificationTone || (payload.classification === "Конфиденциально" ? "high" : "internal"),
    owner: payload.owner,
    editor: payload.editor,
    updated: payload.updated,
    version: payload.version,
    content: payload.content,
    canEdit: payload.canEdit !== false,
    history: payload.history || [],
    syncedVersion: payload.version
  };
}

function stopRefreshTimer() {
  clearInterval(runtime.refreshTimer);
  runtime.refreshTimer = null;
}

export const useKonturStore = create((set, get) => ({
  unlocked: false,
  messages: [],
  documents: [],
  audit: [],
  selectedRoom: "board",
  unread: {},
  approvals: [],
  backendStatus: "unknown",
  backendSession: null,
  realtimeState: "offline",
  toasts: [],
  modal: null,
  mobileOpen: false,

  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  setSelectedRoom: (selectedRoom) => set((state) => ({ selectedRoom, unread: { ...state.unread, [selectedRoom]: 0 } })),
  openModal: (type, data = {}) => set({ modal: { type, ...data } }),
  closeModal: () => set({ modal: null }),

  toast: (title, description, tone = "success") => {
    const item = { id: crypto.randomUUID(), title, description, tone };
    set((state) => ({ toasts: [...state.toasts, item] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== item.id) })), 4300);
  },

  appendAudit: async (action, target, result = "Разрешено", actor = DEMO_ACCOUNT.name) => {
    const previous = runtime.audit.at(-1)?.hash || "GENESIS";
    const event = { id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, target, result, tenant: ORG_ID, prevHash: previous };
    event.hash = await sha256(JSON.stringify(event));
    runtime.audit = [...runtime.audit, event];
    set({ audit: runtime.audit });
    localStorage.setItem(`${STORAGE_PREFIX}:audit`, JSON.stringify(runtime.audit));
  },

  unlock: async (passphrase) => {
    const { createRecoveryShares, deriveUnlockKey } = await loadCrypto();
    const salt = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`kontur-argon2id-salt:${ORG_ID}`)));
    const root = await deriveUnlockKey(passphrase, salt);
    runtime.rootKey = root;
    runtime.shares = await createRecoveryShares(root, 3, 2);
    runtime.vaultKey = await crypto.subtle.importKey("raw", root, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    const savedMessages = localStorage.getItem(`${STORAGE_PREFIX}:messages`);
    const savedDocuments = localStorage.getItem(`${STORAGE_PREFIX}:documents`);
    let messages;
    let documents;
    try {
      messages = savedMessages ? await decryptPayload(JSON.parse(savedMessages)) : structuredClone(defaultMessages);
      documents = savedDocuments ? await decryptPayload(JSON.parse(savedDocuments)) : structuredClone(defaultDocuments);
    } catch {
      runtime.rootKey.fill(0);
      Object.assign(runtime, { rootKey: null, vaultKey: null, shares: [] });
      throw new Error("Неверная кодовая фраза: сохранённый vault не расшифровался.");
    }
    runtime.audit = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:audit`) || "[]");
    set({ messages, documents, audit: runtime.audit, unlocked: true, modal: null });
    await persistVault(messages, documents);
    if (!runtime.audit.length) await get().appendAudit("Vault разблокирован", "React client · Argon2id");
    get().toast("Контур разблокирован", "Ключ выведен Argon2id локально, в браузере.");
    get().autoConnect();
  },

  lock: () => {
    runtime.socket?.disconnect();
    runtime.socket = null;
    runtime.rootKey?.fill(0);
    runtime.rootKey = null;
    runtime.vaultKey = null;
    runtime.shares = [];
    set({ unlocked: false, messages: [], documents: [], approvals: [], unread: {}, realtimeState: "offline" });
    get().toast("Контур заблокирован", "Ключевой материал очищен из памяти клиента.");
  },

  // После разблокировки клиент сам подключается к backend, если тот запущен: так сообщения
  // синхронизируются между веб- и мобильным клиентом без ручного входа на вкладке «Инфраструктура».
  autoConnect: async () => {
    const session = get().backendSession;
    if (session) return get().connectRealtime(session);
    if (await get().checkBackend({ silent: true })) await get().demoLogin({ silent: true });
  },

  sendMessage: async (text) => {
    const state = get();
    const sentAt = new Date().toISOString();
    const item = { id: crypto.randomUUID(), room: state.selectedRoom, author: DEMO_ACCOUNT.name, initials: DEMO_ACCOUNT.initials, time: formatTime(sentAt), sentAt, text, self: true, pending: true };
    const messages = [...state.messages, item];
    set({ messages });
    await persistVault(messages, state.documents);
    await get().appendAudit("Сообщение отправлено", `room:${state.selectedRoom} · content omitted`);
    await get().deliverMessage(item);
  },

  deliverMessage: async (item) => {
    const backendRoomId = BACKEND_ROOM_IDS[item.room];
    if (!runtime.socket?.connected || !backendRoomId || !runtime.rootKey) return false;
    try {
      const envelope = await sealMessage(item, backendRoomId);
      await runtime.socket.timeout(8000).emitWithAck("message:send", { roomId: backendRoomId, clientMessageId: item.id, ciphertext: envelope.ciphertext, nonce: envelope.nonce, aad: envelope.aad, keyEpoch: envelope.keyEpoch });
    } catch {
      return false; // остаётся в локальной encrypted queue и уйдёт при следующем подключении
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
    const decoded = [];
    let rejected = 0;
    for (const raw of rawMessages) {
      const room = localRoomByBackendId[raw?.roomId];
      if (!room || !raw?.clientMessageId) continue;
      try { decoded.push(await openMessage(raw, room)); } catch { rejected += 1; }
    }
    if (rejected) get().toast("Часть сообщений отклонена", `${rejected} payload не прошли AEAD-проверку.`, "danger");
    const current = get();
    const merged = mergeMessages(current.messages, decoded);
    if (!merged) return;
    const known = new Set(current.messages.map((message) => message.id));
    const unread = { ...current.unread };
    for (const item of decoded) {
      if (!known.has(item.id) && !item.self && item.room !== current.selectedRoom) unread[item.room] = (unread[item.room] || 0) + 1;
    }
    set({ messages: merged, unread });
    await persistVault(merged, get().documents);
  },

  syncHistory: async () => {
    const session = get().backendSession;
    if (!session) return;
    const batches = await Promise.all(Object.values(BACKEND_ROOM_IDS).map((roomId) => apiRequest(`/rooms/${roomId}/messages`, { headers: bearer(session) }).catch(() => [])));
    await get().receiveMessages(batches.flat());
  },

  createDocument: async ({ title, content, file }) => {
    if (!content.trim() && !file) throw new Error("Введите текст или выберите файл.");
    if (file && file.size > 700 * 1024) throw new Error("На автономном стенде файл должен быть не больше 700 КБ.");
    const extension = file?.name.split(".").pop()?.toLowerCase();
    if (file && !["docx", "xlsx", "pdf"].includes(extension)) throw new Error("Поддерживаются DOCX, XLSX и PDF.");
    const id = crypto.randomUUID();
    const document = { id, title: title.trim() || file?.name || "Новый документ", type: extension === "pdf" ? "pdf" : extension === "xlsx" ? "sheet" : "doc", status: "Черновик", statusTone: "gray", classification: "Внутренний", classificationTone: "internal", owner: DEMO_ACCOUNT.name, updated: `сегодня, ${formatNow()}`, version: 1, canEdit: !file, content: content.trim() || `Файл ${file.name} зашифрован на устройстве.` };
    if (file) {
      const { encryptFile, generateContentKey, toBase64 } = await loadCrypto();
      const fileKey = await generateContentKey();
      document.fileManifest = await encryptFile(file, fileKey, id);
      document.fileKey = toBase64(fileKey);
      fileKey.fill(0);
    }
    const state = get();
    const documents = [document, ...state.documents];
    set({ documents });
    await persistVault(state.messages, documents);
    await get().appendAudit("Документ создан", `${document.title} · v1`);
    get().toast("Документ создан", file ? "Файл зашифрован chunked XChaCha20-Poly1305." : "Текст сохранён в encrypted vault.");
    if (!file) get().syncDocuments();
  },

  // Каждое сохранение — новая версия: предыдущая остаётся в истории внутри того же зашифрованного vault.
  updateDocument: async (id, { title, content, status }) => {
    const current = get().documents.find((document) => document.id === id);
    if (!current) throw new Error("Документ не найден.");
    if (current.fileManifest || current.canEdit === false) throw new Error("Этот документ доступен только для просмотра.");
    const nextTitle = title.trim() || current.title;
    const nextContent = content.trim();
    if (!nextContent) throw new Error("Документ не может быть пустым.");
    if (nextTitle === current.title && nextContent === current.content && status === current.status) return;
    const snapshot = { version: current.version, title: current.title, content: current.content, status: current.status, updated: current.updated, author: current.editor || current.owner };
    const statusTone = DOCUMENT_STATUSES.find(([name]) => name === status)?.[1] || current.statusTone;
    const next = { ...current, title: nextTitle, content: nextContent, status, statusTone, version: current.version + 1, updated: `сегодня, ${formatNow()}`, editor: DEMO_ACCOUNT.name, history: [...(current.history || []), snapshot].slice(-20) };
    const documents = get().documents.map((document) => document.id === id ? next : document);
    set((state) => ({ documents, modal: state.modal?.type === "document" && state.modal.document.id === id ? { ...state.modal, document: next } : state.modal }));
    await persistVault(get().messages, documents);
    await get().appendAudit("Документ изменён", `${next.title} · v${next.version}`);
    get().toast("Версия сохранена", `«${next.title}» → v${next.version}. Текст зашифрован локально.`);
    get().syncDocuments();
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
    const session = get().backendSession;
    if (!session || !runtime.rootKey) return;
    const remote = await apiRequest("/documents/sync", { headers: bearer(session) });
    const remoteVersions = new Map(remote.map((item) => [item.id, item.version]));
    const snapshot = get().documents;
    const updates = new Map();
    const additions = [];
    const pushes = [];
    let rejected = 0;
    for (const item of remote) {
      const local = snapshot.find((document) => syncIdOf(document) === item.id);
      if (local?.fileManifest) continue;
      // Устройство, ещё ни разу не синхронизировавшее документ, считает его изменённым, если правило его локально.
      const localChanged = Boolean(local) && (local.syncedVersion === undefined ? Boolean(local.editor) : local.version > local.syncedVersion);
      if (local && local.syncedVersion === item.version) { if (localChanged) pushes.push(local); continue; }
      let serverCopy;
      try { serverCopy = documentFromPayload(item.id, await openRemoteDocument(item), local); } catch { rejected += 1; continue; }
      if (!local) additions.push(serverCopy);
      else if (!localChanged || (local.content === serverCopy.content && local.title === serverCopy.title && local.status === serverCopy.status)) updates.set(local.id, { base: local.version, next: serverCopy });
      else {
        // Документ изменили на двух устройствах: локальная правка становится новой версией поверх серверной.
        const rebased = { ...local, version: item.version + 1, syncedVersion: item.version, history: [...serverCopy.history, snapshotOf(serverCopy)].slice(-20) };
        updates.set(local.id, { base: local.version, next: rebased });
        pushes.push(rebased);
      }
    }
    for (const document of snapshot) {
      if (!document.fileManifest && !remoteVersions.has(syncIdOf(document))) pushes.push(document);
    }
    if (rejected) get().toast("Часть документов отклонена", `${rejected} версий не прошли проверку AEAD.`, "danger");

    const pulled = additions.length + [...updates.values()].filter(({ base, next }) => next.version !== base).length;
    if (updates.size || additions.length) {
      set((state) => {
        const documents = [...additions, ...state.documents.map((document) => {
          const update = updates.get(document.id);
          if (!update) return document;
          if (document.version !== update.base) { runtime.documentSyncAgain = true; return document; } // пользователь успел изменить документ
          return update.next;
        })];
        const open = state.modal?.type === "document" ? documents.find((document) => document.id === state.modal.document.id) : null;
        return { documents, modal: open ? { ...state.modal, document: open } : state.modal };
      });
      await persistVault(get().messages, get().documents);
      if (pulled) get().toast("Документы обновлены", `Получено версий с другого устройства: ${pulled}.`);
    }

    for (const document of pushes) {
      try {
        const sealed = await sealDocument(document);
        await apiRequest(`/documents/sync/${syncIdOf(document)}`, { method: "POST", headers: bearer(session), body: JSON.stringify({ baseVersion: remoteVersions.get(syncIdOf(document)) ?? 0, version: document.version, ...sealed }) });
        set((state) => ({ documents: state.documents.map((entry) => entry.id === document.id && entry.version === document.version ? { ...entry, syncedVersion: document.version } : entry) }));
      } catch (error) {
        if (error.status !== 409) throw error;
        runtime.documentSyncAgain = true; // другое устройство успело раньше — заберём его версию и повторим
      }
    }
    if (pushes.length) await persistVault(get().messages, get().documents);
  },

  openDocument: async (document) => {
    set({ modal: { type: "document", document } });
    await get().appendAudit("Документ открыт", document.title);
  },

  verifyAudit: async () => {
    let previous = "GENESIS";
    let valid = true;
    for (const stored of get().audit) {
      const event = { ...stored };
      const hash = event.hash;
      delete event.hash;
      if (event.prevHash !== previous || await sha256(JSON.stringify(event)) !== hash) { valid = false; break; }
      previous = hash;
    }
    get().toast(valid ? "Цепочка подтверждена" : "Целостность нарушена", valid ? `${get().audit.length} событий последовательно связаны.` : "Обнаружено изменённое событие.", valid ? "success" : "danger");
  },

  toggleApproval: (holderId) => set((state) => {
    if (state.approvals.includes(holderId)) return state;
    if (state.approvals.length >= 2) return state;
    return { approvals: [...state.approvals, holderId] };
  }),

  recoverKey: async () => {
    const { recoverSecret } = await loadCrypto();
    const selected = get().approvals.map((id) => runtime.shares[Number(id.split("-")[1]) - 1]);
    const recovered = await recoverSecret(selected);
    const valid = recovered.every((byte, index) => byte === runtime.rootKey[index]);
    recovered.fill(0);
    await get().appendAudit("Recovery drill", `Shamir 2-of-3 · ${valid ? "verified" : "failed"}`);
    set({ approvals: [] });
    get().toast(valid ? "Ключ восстановлен" : "Recovery не пройден", valid ? "Два share восстановили исходные 256 бит; буфер очищен." : "Полученный секрет не совпал.", valid ? "success" : "danger");
  },

  checkBackend: async ({ silent = false } = {}) => {
    set({ backendStatus: "checking" });
    try {
      await apiRequest("/health/ready", { signal: AbortSignal.timeout(3500) });
      set({ backendStatus: "ready" });
      if (!silent) get().toast("Backend готов", "PostgreSQL и Redis прошли readiness-check.");
      return true;
    } catch {
      set({ backendStatus: "down" });
      if (!silent) get().toast("Backend не запущен", "Запустите npm run infra:up.", "danger");
      return false;
    }
  },

  startSession: (session) => {
    runtime.userId = tokenSubject(session.accessToken);
    set({ backendSession: session, backendStatus: "ready" });
    stopRefreshTimer();
    runtime.refreshTimer = setInterval(() => get().rotateSession({ silent: true }), ACCESS_REFRESH_MS);
  },

  connectRealtime: async (session) => {
    if (!get().unlocked || !runtime.rootKey) return;
    const { connectRealtime } = await loadCrypto();
    runtime.socket?.disconnect();
    const socket = connectRealtime(API_ORIGIN, session.accessToken, {
      onState: (realtimeState) => set({ realtimeState }),
      onMessage: (message) => get().receiveMessages([message])
    });
    // На каждое (пере)подключение: войти во все комнаты, догрузить пропущенное и отправить очередь.
    socket.on("connect", async () => {
      await Promise.all(Object.values(BACKEND_ROOM_IDS).map((roomId) => socket.timeout(5000).emitWithAck("room:join", { roomId }).catch(() => null)));
      await get().syncHistory();
      await get().flushPending();
      await get().syncDocuments();
    });
    socket.on("document:updated", () => { get().syncDocuments(); });
    runtime.socket = socket;
  },

  demoLogin: async ({ silent = false } = {}) => {
    try {
      const session = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email: DEMO_ACCOUNT.email, password: DEMO_PASSPHRASE, deviceId: DEMO_DEVICE.id, deviceName: DEMO_DEVICE.name }) });
      get().startSession(session);
      await get().connectRealtime(session);
      get().toast(silent ? "Синхронизация включена" : "Demo-сессия открыта", silent ? "Сообщения доставляются через backend на все устройства." : "Access + rotating refresh token получены.");
    } catch (error) {
      if (!silent) get().toast("Вход не выполнен", error.message, "danger");
    }
  },

  passkeyLogin: async () => {
    try {
      const { startAuthentication } = await loadCrypto();
      const optionsJSON = await apiRequest("/auth/webauthn/authenticate/options", { method: "POST", body: JSON.stringify({ email: DEMO_ACCOUNT.email }) });
      const response = await startAuthentication({ optionsJSON });
      const session = await apiRequest("/auth/webauthn/authenticate/verify", { method: "POST", body: JSON.stringify({ challenge: optionsJSON.challenge, response }) });
      get().startSession(session);
      await get().connectRealtime(session);
      get().toast("Passkey подтверждён", "Открыта device-bound сессия.");
    } catch (error) { get().toast("Passkey login отклонён", error.message, "danger"); }
  },

  rotateSession: async ({ silent = false } = {}) => {
    const session = get().backendSession;
    if (!session) return;
    try {
      const next = await apiRequest("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) });
      set({ backendSession: next });
      if (runtime.socket) runtime.socket.auth = { token: next.accessToken };
      if (!silent) get().toast("Token family ротирована", "Предыдущий refresh token теперь считается использованным.");
    } catch (error) {
      stopRefreshTimer();
      runtime.socket?.disconnect();
      runtime.socket = null;
      set({ backendSession: null, realtimeState: "offline" });
      get().toast("Ротация отклонена", error.message, "danger");
    }
  },

  logout: async () => {
    const session = get().backendSession;
    if (session) {
      try { await apiRequest("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) }); } catch { /* local close still applies */ }
    }
    stopRefreshTimer();
    runtime.socket?.disconnect();
    runtime.socket = null;
    set({ backendSession: null, realtimeState: "offline" });
    get().toast("Сессия закрыта", "Refresh-token family отозвана.");
  }
}));
