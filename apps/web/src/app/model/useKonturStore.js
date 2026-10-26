import { create } from "zustand";
import { API_ORIGIN, DEMO_PASSPHRASE, ORG_ID, STORAGE_PREFIX } from "../../shared/config/constants.js";
import { defaultDocuments, defaultMessages } from "../../shared/model/demo-data.js";
import { base64ToBytes, bytesToBase64, formatNow, sha256 } from "../../shared/lib/format.js";

// Секреты намеренно не находятся в сериализуемом UI-store.
const runtime = { vaultKey: null, rootKey: null, shares: [], socket: null, audit: [] };
const loadCrypto = () => import("@kontur/crypto-client");

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
  if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join("; ") : body?.message || `HTTP ${response.status}`);
  return body;
}

export const useKonturStore = create((set, get) => ({
  unlocked: false,
  messages: [],
  documents: [],
  audit: [],
  selectedRoom: "board",
  approvals: [],
  backendStatus: "unknown",
  backendSession: null,
  backendRoomId: null,
  realtimeState: "offline",
  toasts: [],
  modal: null,
  mobileOpen: false,

  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  setSelectedRoom: (selectedRoom) => set({ selectedRoom }),
  openModal: (type, data = {}) => set({ modal: { type, ...data } }),
  closeModal: () => set({ modal: null }),

  toast: (title, description) => {
    const item = { id: crypto.randomUUID(), title, description };
    set((state) => ({ toasts: [...state.toasts, item] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== item.id) })), 4300);
  },

  appendAudit: async (action, target, result = "Разрешено", actor = "Алия Даулетова") => {
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
    const messages = savedMessages ? await decryptPayload(JSON.parse(savedMessages)) : structuredClone(defaultMessages);
    const documents = savedDocuments ? await decryptPayload(JSON.parse(savedDocuments)) : structuredClone(defaultDocuments);
    runtime.audit = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:audit`) || "[]");
    set({ messages, documents, audit: runtime.audit, unlocked: true, modal: null });
    await persistVault(messages, documents);
    if (!runtime.audit.length) await get().appendAudit("Vault разблокирован", "React client · Argon2id");
    get().toast("Контур разблокирован", "React-клиент вывел ключ Argon2id локально.");
  },

  lock: () => {
    runtime.socket?.disconnect();
    runtime.socket = null;
    runtime.rootKey?.fill(0);
    runtime.rootKey = null;
    runtime.vaultKey = null;
    runtime.shares = [];
    set({ unlocked: false, messages: [], documents: [], approvals: [], realtimeState: "offline" });
    get().toast("Контур заблокирован", "Ключевой материал очищен из состояния клиента.");
  },

  sendMessage: async (text) => {
    const { encryptXChaCha20 } = await loadCrypto();
    const state = get();
    const id = crypto.randomUUID();
    const item = { id, room: state.selectedRoom, author: "Алия Даулетова", initials: "АД", time: formatNow(), text, self: true };
    const messages = [...state.messages, item];
    set({ messages });
    await persistVault(messages, state.documents);
    await get().appendAudit("Сообщение отправлено", `room:${state.selectedRoom} · content omitted`);
    let delivered = false;
    if (runtime.socket?.connected && state.backendRoomId && runtime.rootKey) {
      try {
        const envelope = await encryptXChaCha20(new TextEncoder().encode(text), runtime.rootKey, { tenantId: ORG_ID, roomId: state.backendRoomId, clientMessageId: id }, 1);
        await new Promise((resolve, reject) => runtime.socket.timeout(5000).emit("message:send", { roomId: state.backendRoomId, clientMessageId: id, ciphertext: envelope.ciphertext, nonce: envelope.nonce, aad: envelope.aad, keyEpoch: envelope.keyEpoch }, (error, response) => error ? reject(error) : resolve(response)));
        delivered = true;
      } catch { /* encrypted local queue remains */ }
    }
    get().toast("Сообщение зашифровано", delivered ? "Ciphertext доставлен через Socket.IO." : "Сохранено в локальной encrypted queue.");
  },

  createDocument: async ({ title, content, file }) => {
    if (!content.trim() && !file) throw new Error("Введите текст или выберите файл.");
    if (file && file.size > 700 * 1024) throw new Error("На автономном стенде файл должен быть не больше 700 КБ.");
    const extension = file?.name.split(".").pop()?.toLowerCase();
    if (file && !["docx", "xlsx", "pdf"].includes(extension)) throw new Error("Поддерживаются DOCX, XLSX и PDF.");
    const id = crypto.randomUUID();
    const document = { id, title: title.trim() || file?.name || "Новый документ", type: extension === "pdf" ? "pdf" : extension === "xlsx" ? "sheet" : "doc", status: "Черновик", statusTone: "gray", classification: "Внутренний", classificationTone: "internal", owner: "Алия Даулетова", updated: `сегодня, ${formatNow()}`, version: 1, canEdit: !file, content: content.trim() || `Файл ${file.name} зашифрован на устройстве.` };
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
    get().toast(valid ? "Цепочка подтверждена" : "Целостность нарушена", valid ? `${get().audit.length} событий последовательно связаны.` : "Обнаружено изменённое событие.");
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
    get().toast(valid ? "Ключ восстановлен" : "Recovery не пройден", valid ? "Два share восстановили исходные 256 бит; буфер очищен." : "Полученный секрет не совпал.");
  },

  checkBackend: async () => {
    set({ backendStatus: "checking" });
    try {
      await apiRequest("/health/ready", { signal: AbortSignal.timeout(3500) });
      set({ backendStatus: "ready" });
      get().toast("Backend готов", "PostgreSQL и Redis прошли readiness-check.");
    } catch {
      set({ backendStatus: "down" });
      get().toast("Backend не запущен", "Запустите npm run infra:up.");
    }
  },

  connectRealtime: async (session) => {
    if (!get().unlocked || !runtime.rootKey) return;
    const { connectRealtime, decryptXChaCha20 } = await loadCrypto();
    const backendRooms = await apiRequest("/rooms", { headers: { Authorization: `Bearer ${session.accessToken}` } });
    const roomId = backendRooms[0]?.id || null;
    set({ backendRoomId: roomId });
    runtime.socket?.disconnect();
    const socket = connectRealtime(API_ORIGIN, session.accessToken, {
      onState: (realtimeState) => set({ realtimeState }),
      onMessage: async (message) => {
        if (!runtime.rootKey || !message?.clientMessageId) return;
        try {
          const plaintext = await decryptXChaCha20({ version: 1, suite: "XCHACHA20-POLY1305-IETF", keyEpoch: Number(message.keyEpoch), nonce: String(message.nonce), aad: String(message.aad), ciphertext: String(message.ciphertext) }, runtime.rootKey);
          const text = new TextDecoder().decode(plaintext);
          plaintext.fill(0);
          const current = get();
          if (current.messages.some((item) => item.id === message.clientMessageId)) return;
          const messages = [...current.messages, { id: String(message.clientMessageId), room: "board", author: "Участник realtime", initials: "RT", time: formatNow(), text, self: false }];
          set({ messages });
          await persistVault(messages, current.documents);
        } catch { get().toast("Realtime payload отклонён", "AEAD-проверка не пройдена."); }
      }
    });
    socket.on("connect", () => { if (roomId) socket.emit("room:join", { roomId }); });
    runtime.socket = socket;
  },

  demoLogin: async () => {
    try {
      const session = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@astana-industrial.kz", password: DEMO_PASSPHRASE, deviceId: "kontur-demo-browser", deviceName: "React pilot browser" }) });
      set({ backendSession: session });
      await get().connectRealtime(session);
      get().toast("Demo-сессия открыта", "Access + rotating refresh token получены.");
    } catch (error) { get().toast("Вход не выполнен", error.message); }
  },

  passkeyLogin: async () => {
    try {
      const { startAuthentication } = await loadCrypto();
      const optionsJSON = await apiRequest("/auth/webauthn/authenticate/options", { method: "POST", body: JSON.stringify({ email: "admin@astana-industrial.kz" }) });
      const response = await startAuthentication({ optionsJSON });
      const session = await apiRequest("/auth/webauthn/authenticate/verify", { method: "POST", body: JSON.stringify({ challenge: optionsJSON.challenge, response }) });
      set({ backendSession: session });
      await get().connectRealtime(session);
      get().toast("Passkey подтверждён", "Открыта device-bound сессия.");
    } catch (error) { get().toast("Passkey login отклонён", error.message); }
  },

  rotateSession: async () => {
    const session = get().backendSession;
    if (!session) return;
    try {
      const next = await apiRequest("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) });
      set({ backendSession: next });
      if (runtime.socket) runtime.socket.auth = { token: next.accessToken };
      get().toast("Token family ротирована", "Предыдущий refresh token теперь считается использованным.");
    } catch (error) {
      set({ backendSession: null });
      get().toast("Ротация отклонена", error.message);
    }
  },

  logout: async () => {
    const session = get().backendSession;
    if (session) {
      try { await apiRequest("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) }); } catch { /* local close still applies */ }
    }
    runtime.socket?.disconnect();
    runtime.socket = null;
    set({ backendSession: null, realtimeState: "offline" });
    get().toast("Сессия закрыта", "Refresh-token family отозвана.");
  }
}));
