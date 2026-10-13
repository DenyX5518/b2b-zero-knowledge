import {
  connectRealtime,
  createOfficePreview,
  createRecoveryShares,
  decryptFile,
  decryptXChaCha20,
  deriveUnlockKey,
  encryptFile,
  encryptXChaCha20,
  fromBase64,
  generateContentKey,
  recoverSecret,
  startAuthentication,
  startRegistration,
  toBase64
} from "./secure-runtime.js";

const ORG_ID = "astana-industrial-01";
const DEMO_PASSPHRASE = "demo-2026";
const STORAGE_PREFIX = `kontur:v2:${ORG_ID}`;
const API_ORIGIN = "http://127.0.0.1:3001";

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l3 3"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-5"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  badge: '<path d="M12 2l3 2 3.5-.2.2 3.5 2 3-2 3-.2 3.5-3.5-.2-3 2-3-2-3.5.2-.2-3.5-2-3 2-3 .2-3.5 3.5.2z"/><path d="M9 12l2 2 4-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z"/>',
  video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  paperclip: '<path d="M21.4 11.6l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7L9.4 18a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  fingerprint: '<path d="M12 11a2 2 0 0 1 2 2c0 4.5-1 7-2 9M8 13a4 4 0 0 1 8 0c0 4-.8 7-2 9M4 13a8 8 0 0 1 16 0c0 3-.4 5.5-1 8M5 18c.5-1.5.7-3.2.7-5a6.3 6.3 0 0 1 .5-2.5"/>',
  rotate: '<path d="M20 7h-6V1M4 17h6v6"/><path d="M20 7a9 9 0 0 0-15-3.5L3 6M4 17a9 9 0 0 0 15 3.5l2-2.5"/>',
  warning: '<path d="M10.3 2.9L1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  clipboard: '<path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><rect x="9" y="2" width="6" height="5" rx="2"/>',
  external: '<path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
};

function icon(name, className = "") {
  const body = icons[name] || icons.info;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

document.querySelectorAll("[data-icon]").forEach((node) => {
  node.innerHTML = icon(node.dataset.icon);
});

const rooms = [
  { id: "board", initials: "СД", name: "Совет директоров", preview: "Финальная версия протокола…", time: "10:42", unread: 2, members: 8 },
  { id: "security", initials: "ИБ", name: "Информационная безопасность", preview: "Проверка нового устройства", time: "09:18", unread: 1, members: 12 },
  { id: "project", initials: "КТ", name: "Проект «Көк-Темір»", preview: "Согласование сметы", time: "вчера", unread: 0, members: 23 },
  { id: "private", initials: "ЕТ", name: "Ерлан Тлеубаев", preview: "Документ получил, спасибо", time: "вчера", unread: 0, members: 2, private: true }
];

const employees = [
  { initials: "АД", name: "Алия Даулетова", email: "a.dauletova@astana-industrial.kz", department: "Администрация", role: "Администратор", devices: "2 доверенных", state: "active" },
  { initials: "ЕТ", name: "Ерлан Тлеубаев", email: "e.tleubayev@astana-industrial.kz", department: "Совет директоров", role: "Руководитель", devices: "2 доверенных", state: "active" },
  { initials: "СА", name: "Сауле Ахметова", email: "s.akhmetova@astana-industrial.kz", department: "Юридический отдел", role: "Юрист", devices: "1 доверенное", state: "active" },
  { initials: "ТИ", name: "Тимур Исмагулов", email: "t.ismagulov@astana-industrial.kz", department: "Инфобезопасность", role: "Офицер ИБ", devices: "Новая регистрация", state: "warn" },
  { initials: "НК", name: "Нурлан Касымов", email: "n.kassymov@astana-industrial.kz", department: "Финансы", role: "Сотрудник", devices: "1 доверенное", state: "active" },
  { initials: "МЖ", name: "Мадина Жанибек", email: "m.zhanibek@astana-industrial.kz", department: "Проектный офис", role: "Сотрудник", devices: "2 доверенных", state: "active" }
];

const permissionGroups = [
  { title: "Документы", items: [["Просмотр", "Открывать разрешённые документы", true], ["Редактирование", "Создавать новые версии", true], ["Передача", "Назначать получателей", true], ["Скачивание", "Сохранять plaintext на устройство", false], ["Печать", "Отправлять документ на печать", false], ["Подписание", "Подписывать от имени организации", true]] },
  { title: "Коммуникации", items: [["Создание комнат", "Создавать групповые пространства", true], ["Управление участниками", "Добавлять и исключать сотрудников", true], ["Удаление сообщений", "Удалять сообщения для всех", false]] },
  { title: "Администрирование", items: [["Управление сотрудниками", "Блокировать и назначать роли", true], ["Операции с ключами", "Запрашивать ротацию и recovery", false], ["Экспорт аудита", "Получать обезличенный журнал", true]] }
];

const state = {
  view: location.hash.replace("#", "") || "overview",
  unlocked: false,
  key: null,
  rootKeyBytes: null,
  recoveryShares: [],
  messages: [],
  documents: [],
  audit: [],
  selectedRoom: "board",
  recoveryApprovals: new Set(),
  activeRole: "Руководитель",
  backendStatus: "unknown",
  backendSession: null,
  backendRoomId: null,
  realtime: null,
  realtimeState: "offline",
  activeObjectUrl: null
};

const defaultMessages = [
  { id: crypto.randomUUID(), room: "board", author: "Ерлан Тлеубаев", initials: "ЕТ", time: "10:31", text: "Коллеги, направил обновлённый протокол заседания. Проверьте раздел по бюджету до 14:00.", self: false },
  { id: crypto.randomUUID(), room: "board", author: "Сауле Ахметова", initials: "СА", time: "10:36", text: "Юридические формулировки согласованы. Добавила одно замечание к пункту 4.2.", self: false },
  { id: crypto.randomUUID(), room: "board", author: "Алия Даулетова", initials: "АД", time: "10:42", text: "Принято. После правки отправлю документ на финальное согласование двум ответственным.", self: true },
  { id: crypto.randomUUID(), room: "security", author: "Тимур Исмагулов", initials: "ТИ", time: "09:12", text: "Новое устройство Нурлана ожидает подтверждения. Attestation пройдена, осталось второе согласование.", self: false },
  { id: crypto.randomUUID(), room: "project", author: "Мадина Жанибек", initials: "МЖ", time: "16:20", text: "Смета версии 7 загружена во внутренний viewer. Скачивание отключено политикой проекта.", self: false },
  { id: crypto.randomUUID(), room: "private", author: "Ерлан Тлеубаев", initials: "ЕТ", time: "15:44", text: "Документ получил, спасибо. Открою с доверенного устройства.", self: false }
];

const defaultDocuments = [
  { id: "doc-protocol", title: "Протокол заседания №18", type: "doc", status: "На согласовании", statusTone: "amber", classification: "Конфиденциально", classificationTone: "high", owner: "Алия Даулетова", updated: "сегодня, 10:39", version: 6, canEdit: true, content: "ПРОТОКОЛ ЗАСЕДАНИЯ №18\n\nДата: 13 октября 2026 года\n\n1. Утвердить бюджет программы цифровой трансформации.\n2. Назначить ответственными руководителей проектного офиса и службы информационной безопасности.\n3. Финальная версия вступает в силу после согласования двумя уполномоченными лицами." },
  { id: "doc-budget", title: "Бюджет проекта «Көк-Темір»", type: "sheet", status: "Черновик", statusTone: "gray", classification: "Для служебного пользования", classificationTone: "internal", owner: "Нурлан Касымов", updated: "сегодня, 09:54", version: 7, canEdit: true, content: "БЮДЖЕТ ПРОЕКТА «КӨК-ТЕМІР»\n\nКапитальные расходы: 480 000 000 ₸\nОперационные расходы: 96 000 000 ₸\nРезерв: 12%\n\nКомментарий: значения предварительные, внешняя передача запрещена политикой проекта." },
  { id: "doc-policy", title: "Политика информационной безопасности", type: "pdf", status: "Утверждён", statusTone: "green", classification: "Внутренний", classificationTone: "internal", owner: "Тимур Исмагулов", updated: "12 окт., 18:05", version: 3, canEdit: false, content: "ПОЛИТИКА ИНФОРМАЦИОННОЙ БЕЗОПАСНОСТИ\n\nВерсия 3.0 — утверждена\n\nДокумент определяет порядок регистрации устройств, обращения с конфиденциальными данными, управления криптографическими ключами и реагирования на инциденты." },
  { id: "doc-contract", title: "Договор поставки — KZ-1048", type: "doc", status: "Ожидает подписи", statusTone: "teal", classification: "Конфиденциально", classificationTone: "high", owner: "Сауле Ахметова", updated: "12 окт., 14:21", version: 4, canEdit: false, content: "ДОГОВОР ПОСТАВКИ KZ-1048\n\nПредмет договора: поставка промышленного оборудования согласно спецификации.\n\nДокумент ожидает квалифицированной электронной подписи двух представителей сторон." }
];

const main = document.getElementById("main-content");
const modalLayer = document.getElementById("modal-layer");

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function formatNow() {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Qyzylorda" }).format(new Date());
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveVaultKey(passphrase) {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`kontur-argon2id-salt:${ORG_ID}`)));
  const rootKeyBytes = await deriveUnlockKey(passphrase, salt);
  state.rootKeyBytes = rootKeyBytes;
  state.recoveryShares = await createRecoveryShares(rootKeyBytes, 3, 2);
  return crypto.subtle.importKey("raw", rootKeyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptPayload(payload) {
  if (!state.key) throw new Error("Vault is locked");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aadText = `tenant=${ORG_ID};schema=kontur-demo-v1`;
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aadText), tagLength: 128 }, state.key, encoded);
  return { v: 1, alg: "AES-256-GCM", tenant: ORG_ID, iv: bytesToBase64(iv), aad: btoa(aadText), ciphertext: bytesToBase64(new Uint8Array(encrypted)) };
}

async function decryptPayload(envelope) {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(envelope.iv), additionalData: base64ToBytes(envelope.aad), tagLength: 128 }, state.key, base64ToBytes(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function persistVault() {
  const [messageEnvelope, documentEnvelope] = await Promise.all([encryptPayload(state.messages), encryptPayload(state.documents)]);
  localStorage.setItem(`${STORAGE_PREFIX}:messages`, JSON.stringify(messageEnvelope));
  localStorage.setItem(`${STORAGE_PREFIX}:documents`, JSON.stringify(documentEnvelope));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function appendAudit(action, target, result = "Разрешено", actor = "Алия Даулетова") {
  const previous = state.audit.at(-1)?.hash || "GENESIS";
  const event = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor,
    action,
    target,
    result,
    tenant: ORG_ID,
    prevHash: previous
  };
  event.hash = await sha256(JSON.stringify(event));
  state.audit.push(event);
  localStorage.setItem(`${STORAGE_PREFIX}:audit`, JSON.stringify(state.audit));
}

async function seedAudit() {
  if (state.audit.length) return;
  await appendAudit("Вход с доверенного устройства", "Web session · Chrome / Windows");
  await appendAudit("Документ открыт", "Протокол заседания №18");
  await appendAudit("Политика доступа проверена", "download=false · doc-budget", "Отклонено", "Policy engine");
  await appendAudit("Участник добавлен в комнату", "Проект «Көк-Темір»", "Разрешено", "Тимур Исмагулов");
  await appendAudit("Ключ комнаты ротирован", "room:security · epoch 12", "Разрешено", "Crypto service");
}

async function unlockVault(passphrase) {
  try {
    state.key = await deriveVaultKey(passphrase);
    const savedMessages = localStorage.getItem(`${STORAGE_PREFIX}:messages`);
    const savedDocuments = localStorage.getItem(`${STORAGE_PREFIX}:documents`);
    if (savedMessages && savedDocuments) {
      state.messages = await decryptPayload(JSON.parse(savedMessages));
      state.documents = await decryptPayload(JSON.parse(savedDocuments));
    } else {
      state.messages = structuredClone(defaultMessages);
      state.documents = structuredClone(defaultDocuments);
      await persistVault();
    }
    const storedAudit = localStorage.getItem(`${STORAGE_PREFIX}:audit`);
    state.audit = storedAudit ? JSON.parse(storedAudit) : [];
    await seedAudit();
    state.unlocked = true;
    if (state.backendSession) await connectBackendRealtime().catch(() => undefined);
    updateVaultUI();
    closeModal();
    render();
    toast("Контур разблокирован", "Ключ получен локально и останется только в памяти этой вкладки.");
  } catch (error) {
    console.error("Vault unlock failed", error);
    state.rootKeyBytes?.fill(0);
    state.rootKeyBytes = null;
    state.recoveryShares = [];
    state.key = null;
    const errorNode = document.getElementById("unlock-error");
    if (errorNode) errorNode.textContent = `Не удалось открыть vault: ${error instanceof Error ? error.message : "неизвестная ошибка"}`;
  }
}

function lockVault() {
  state.realtime?.disconnect();
  state.realtime = null;
  state.realtimeState = "offline";
  state.key = null;
  state.rootKeyBytes?.fill(0);
  state.rootKeyBytes = null;
  state.recoveryShares = [];
  state.unlocked = false;
  state.messages = [];
  state.documents = [];
  state.recoveryApprovals.clear();
  updateVaultUI();
  render();
  toast("Контур заблокирован", "Ключ удалён из памяти вкладки. Ciphertext остался в локальном хранилище.");
}

function updateVaultUI() {
  const button = document.getElementById("vault-button");
  const label = document.getElementById("vault-label");
  button.classList.toggle("unlocked", state.unlocked);
  label.textContent = state.unlocked ? "Контур защищён" : "Контур заблокирован";
  button.querySelector("svg").outerHTML = icon(state.unlocked ? "shield" : "lock");
}

function pageHeading(eyebrow, title, description, actions = "") {
  return `<div class="page-heading"><div><div class="eyebrow-label">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</div>`;
}

function lockedGate(feature) {
  return `<section class="lock-gate"><div class="lock-gate-inner"><div class="lock-illustration">${icon("lock")}</div><h2>${feature} зашифрованы</h2><p>Расшифровка выполняется на устройстве. Провайдер и backend не получают ключ организации или plaintext.</p><button class="button primary" data-action="unlock">${icon("unlock")} Разблокировать контур</button></div></section>`;
}

function renderOverview() {
  const status = state.unlocked ? "Локальный ключ активен" : "Требуется разблокировка";
  return `<div class="view">
    ${pageHeading("ASTANA INDUSTRIAL GROUP", "Добрый день, Алия", "Единая защищённая среда для коммуникаций, документов и контролируемого доступа.")}
    <section class="hero-security">
      <div class="hero-copy">
        <div class="eyebrow-label">ZERO-KNOWLEDGE КОНТУР</div>
        <h2>Ваши данные читают только те, кому вы доверяете.</h2>
        <p>Сообщения и документы шифруются на устройстве. Инфраструктура хранит ciphertext и не владеет корпоративными ключами.</p>
        <div class="hero-actions">
          <button class="button primary" data-action="${state.unlocked ? "server-view" : "unlock"}">${icon(state.unlocked ? "eye" : "unlock")} ${state.unlocked ? "Что видит сервер" : "Открыть демо-контур"}</button>
          <span class="live-note"><i></i>${status}</span>
        </div>
      </div>
      <div class="security-diagram" aria-label="Путь зашифрованных данных">
        <div class="diagram-row">${icon("cpu")}<span>Ваше устройство</span><small>plaintext</small></div><div class="diagram-flow"></div>
        <div class="diagram-row">${icon("shield")}<span>AES-256-GCM</span><small>локально</small></div><div class="diagram-flow"></div>
        <div class="diagram-row">${icon("database")}<span>Инфраструктура</span><small>ciphertext</small></div>
      </div>
    </section>
    <section class="metric-grid">
      <article class="metric-card"><div class="metric-card-top"><span>Активные сотрудники</span><span class="metric-icon">${icon("users")}</span></div><strong>248</strong><small class="good">+6 за этот месяц</small></article>
      <article class="metric-card"><div class="metric-card-top"><span>Защищённые комнаты</span><span class="metric-icon">${icon("message")}</span></div><strong>32</strong><small>100% end-to-end encrypted</small></article>
      <article class="metric-card"><div class="metric-card-top"><span>Документы в работе</span><span class="metric-icon">${icon("file")}</span></div><strong>17</strong><small>4 ожидают согласования</small></article>
      <article class="metric-card"><div class="metric-card-top"><span>События безопасности</span><span class="metric-icon">${icon("activity")}</span></div><strong>0</strong><small class="good">Критичных за 30 дней нет</small></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-head"><div><h2>Последняя активность</h2><p>Содержимое событий не попадает в журнал</p></div><button class="text-button" data-view="audit">Весь журнал →</button></div>
        <div class="panel-body activity-list">
          ${activityItem("edit", "Протокол заседания №18 обновлён", "Алия Даулетова · версия 6", "10:39")}
          ${activityItem("shield", "Ключ комнаты успешно ротирован", "Информационная безопасность · epoch 12", "09:18")}
          ${activityItem("users", "Новое устройство ожидает подтверждения", "Тимур Исмагулов · WebAuthn", "08:54")}
          ${activityItem("file", "Договор KZ-1048 отправлен на подпись", "Сауле Ахметова · 2 подписанта", "вчера")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h2>Состояние контура</h2><p>Последняя проверка 4 минуты назад</p></div><span class="status-pill green">Норма</span></div>
        <div class="posture-score"><div class="score-ring"><span>94</span><small>из 100</small></div><div class="posture-copy"><strong>Высокий уровень защиты</strong><p>Все критические политики включены. Одно устройство требует проверки.</p></div></div>
        <ul class="check-list"><li>${icon("check")}<span>MFA и passkeys</span><small>100%</small></li><li>${icon("check")}<span>Доверенные устройства</span><small>247 / 248</small></li><li>${icon("check")}<span>Ротация ключей</span><small>12 окт.</small></li></ul>
      </article>
    </section>
  </div>`;
}

function activityItem(iconName, title, detail, time) {
  return `<div class="activity-item"><span class="activity-icon">${icon(iconName)}</span><span class="activity-copy"><strong>${title}</strong><small>${detail}</small></span><time class="activity-time">${time}</time></div>`;
}

function renderChats() {
  if (!state.unlocked) return `<div class="view">${pageHeading("ЗАЩИЩЁННЫЕ КОММУНИКАЦИИ", "Сообщения", "Личные и групповые комнаты внутри криптографического контура организации.")}${lockedGate("Сообщения")}</div>`;
  const activeRoom = rooms.find((room) => room.id === state.selectedRoom) || rooms[0];
  const messages = state.messages.filter((message) => message.room === activeRoom.id);
  return `<div class="view">
    ${pageHeading("ЗАЩИЩЁННЫЕ КОММУНИКАЦИИ", "Сообщения", "Ciphertext хранится отдельно от ключей организации.")}
    <section class="chat-layout">
      <aside class="chat-list"><div class="chat-list-head"><div class="chat-list-head-row"><h2>Комнаты</h2><button class="round-add" data-action="new-room" type="button" aria-label="Новая комната">+</button></div><label class="chat-filter">${icon("search")}<input id="room-search" type="search" placeholder="Найти комнату" /></label></div>
        <div class="room-list">${rooms.map((room) => `<button class="room-item ${room.id === activeRoom.id ? "active" : ""}" data-room="${room.id}" type="button"><span class="room-avatar ${room.private ? "private" : ""}">${room.initials}</span><span class="room-copy"><strong>${room.name}</strong><small>${room.preview}</small></span><span class="room-meta"><time>${room.time}</time>${room.unread ? `<b class="unread">${room.unread}</b>` : ""}</span></button>`).join("")}</div>
      </aside>
      <section class="chat-main"><header class="chat-main-head"><div class="chat-title"><span class="room-avatar">${activeRoom.initials}</span><span><strong>${activeRoom.name}</strong><small>${activeRoom.members} участников · защищённая комната · realtime: ${state.realtimeState}</small></span></div><div class="chat-head-actions"><button class="icon-button" data-action="demo-call" aria-label="Аудиозвонок">${icon("phone")}</button><button class="icon-button" data-action="demo-call" aria-label="Видеозвонок">${icon("video")}</button><button class="icon-button" data-action="room-info" aria-label="Информация">${icon("info")}</button></div></header>
        <div class="message-scroll" id="message-scroll"><div class="date-separator">Сегодня</div>${messages.length ? messages.map(messageTemplate).join("") : '<div class="empty-state">В этой комнате пока нет сообщений.</div>'}</div>
        <form class="composer" id="message-form"><button class="icon-button" data-action="attachment" type="button" aria-label="Прикрепить файл">${icon("paperclip")}</button><textarea id="message-input" rows="1" maxlength="2000" placeholder="Напишите защищённое сообщение…" aria-label="Текст сообщения"></textarea><button class="send-button" type="submit" aria-label="Отправить">${icon("send")}</button></form>
      </section>
      <aside class="chat-details"><h3 class="details-title">О комнате</h3><div class="crypto-badge"><div class="crypto-badge-head">${icon("shield")} Сквозное шифрование</div><p>Ключ комнаты доступен только доверенным устройствам участников.</p></div><div class="details-section"><small>УЧАСТНИКИ · ${activeRoom.members}</small><div class="member-stack">${employees.slice(0,4).map((employee) => `<div class="mini-member"><span class="avatar">${employee.initials}</span><span><strong>${employee.name}</strong><small>${employee.role}</small></span></div>`).join("")}</div></div><div class="details-section"><small>НАСТРОЙКИ</small><button class="detail-link" data-action="server-view">Показать ciphertext <span>→</span></button><button class="detail-link" data-view="access">Политика доступа <span>→</span></button><button class="detail-link" data-view="audit">История действий <span>→</span></button></div></aside>
    </section>
  </div>`;
}

function messageTemplate(message) {
  return `<article class="message ${message.self ? "self" : ""}"><span class="avatar">${escapeHTML(message.initials)}</span><div class="message-body"><div class="message-author"><strong>${escapeHTML(message.author)}</strong><time>${escapeHTML(message.time)}</time></div><div class="bubble">${escapeHTML(message.text)}</div><div class="encrypted-mark">${icon("lock")} зашифровано на устройстве</div></div></article>`;
}

function renderDocuments() {
  if (!state.unlocked) return `<div class="view">${pageHeading("ДОКУМЕНТООБОРОТ", "Документы", "Внутренний viewer и управляемые права без передачи plaintext провайдеру.")}${lockedGate("Документы")}</div>`;
  const actions = `<button class="button" data-action="server-view">${icon("database")} Хранилище</button><button class="button primary" data-action="new-document">${icon("plus")} Новый документ</button>`;
  return `<div class="view">${pageHeading("ДОКУМЕНТООБОРОТ", "Документы", "Версии шифруются отдельно; скачивание и печать управляются политиками.", actions)}
    <div class="toolbar"><label class="toolbar-search">${icon("search")}<input id="document-search" type="search" placeholder="Поиск по названию" /></label><select class="select-control" aria-label="Статус"><option>Все статусы</option><option>На согласовании</option><option>Утверждён</option></select><select class="select-control" aria-label="Классификация"><option>Все уровни</option><option>Конфиденциально</option><option>Внутренний</option></select><span class="toolbar-spacer"></span><span class="status-pill green">${icon("shield")} E2EE включено</span></div>
    <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Документ</th><th>Статус</th><th>Классификация</th><th>Владелец</th><th>Изменён</th><th></th></tr></thead><tbody>${state.documents.map(documentRow).join("")}</tbody></table></div>
  </div>`;
}

function documentRow(doc) {
  const iconType = doc.type === "pdf" ? "pdf" : doc.type === "sheet" ? "sheet" : "";
  return `<tr data-doc-row="${doc.id}"><td><div class="doc-name"><span class="doc-icon ${iconType}">${icon("file")}</span><span><strong>${escapeHTML(doc.title)}</strong><small>Версия ${doc.version} · encrypted object</small></span></div></td><td><span class="status-pill ${doc.statusTone}">${escapeHTML(doc.status)}</span></td><td><span class="classification"><i class="${doc.classificationTone}"></i>${escapeHTML(doc.classification)}</span></td><td>${escapeHTML(doc.owner)}</td><td>${escapeHTML(doc.updated)}</td><td><div class="table-actions"><button class="table-icon" data-action="open-document" data-id="${doc.id}" aria-label="Открыть">${icon("eye")}</button><button class="table-icon" data-action="doc-menu" aria-label="Меню">${icon("dots")}</button></div></td></tr>`;
}

function renderTeam() {
  const actions = `<button class="button" data-action="device-review">${icon("fingerprint")} Устройства</button><button class="button primary" data-action="invite-employee">${icon("plus")} Добавить сотрудника</button>`;
  return `<div class="view">${pageHeading("ОРГАНИЗАЦИЯ", "Сотрудники", "Каждая учётная запись связана с конкретным сотрудником и доверенными устройствами.", actions)}
    <div class="summary-strip"><article class="summary-card"><small>Всего сотрудников</small><strong>248</strong></article><article class="summary-card"><small>Активные сегодня</small><strong>192</strong></article><article class="summary-card"><small>Требуют внимания</small><strong>1</strong></article></div>
    <div class="toolbar"><label class="toolbar-search">${icon("search")}<input id="employee-search" type="search" placeholder="Имя, email или отдел" /></label><select class="select-control"><option>Все подразделения</option><option>Администрация</option><option>Инфобезопасность</option></select><select class="select-control"><option>Все роли</option><option>Администратор</option><option>Сотрудник</option></select></div>
    <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Сотрудник</th><th>Подразделение</th><th>Роль</th><th>Устройства</th><th>Статус</th><th></th></tr></thead><tbody>${employees.map((employee) => `<tr data-employee-row><td><div class="employee-name"><span class="avatar">${employee.initials}</span><span><strong>${employee.name}</strong><small>${employee.email}</small></span></div></td><td>${employee.department}</td><td><span class="role-pill">${employee.role}</span></td><td><span class="device-state"><i class="${employee.state === "warn" ? "warn" : ""}"></i>${employee.devices}</span></td><td><span class="status-pill ${employee.state === "warn" ? "amber" : "green"}">${employee.state === "warn" ? "Проверка" : "Активен"}</span></td><td><button class="table-icon" data-action="employee-menu" aria-label="Меню">${icon("dots")}</button></td></tr>`).join("")}</tbody></table></div>
  </div>`;
}

function renderAccess() {
  const roles = [["Администратор", "3 сотрудника"], ["Руководитель", "12 сотрудников"], ["Офицер ИБ", "5 сотрудников"], ["Юрист", "8 сотрудников"], ["Сотрудник", "220 сотрудников"]];
  return `<div class="view">${pageHeading("ПОЛИТИКИ ДОСТУПА", "Роли и права", "Backend обязан повторно проверять каждое действие; интерфейс лишь показывает принятое решение.")}
    <section class="access-grid"><aside class="role-list-panel"><div class="role-list-head"><strong>Роли организации</strong><button class="round-add" data-action="new-role" type="button">+</button></div>${roles.map(([role,count]) => `<button class="role-button ${state.activeRole === role ? "active" : ""}" data-role="${role}"><span><strong>${role}</strong><small>${count}</small></span><b>›</b></button>`).join("")}</aside>
      <div class="permission-panel"><header class="permission-head"><div><h2>${state.activeRole}</h2><p>Изменения требуют step-up MFA и записываются в audit log.</p></div><button class="button small" data-action="save-policy">Сохранить политику</button></header>${permissionGroups.map((group) => `<section class="permission-group"><div class="permission-group-title">${group.title}</div>${group.items.map(([name,description,enabled], index) => `<div class="permission-row"><span><strong>${name}</strong><small>${description}</small></span><span class="source-pill">Наследуется от роли</span><button class="switch ${enabled ? "on" : ""}" data-action="toggle-permission" data-permission="${group.title}:${index}" aria-label="${name}" aria-pressed="${enabled}"></button></div>`).join("")}</section>`).join("")}</div>
    </section>
  </div>`;
}

function renderAudit() {
  const actions = `<button class="button" data-action="verify-audit">${icon("check")} Проверить цепочку</button><button class="button primary" data-action="export-audit">${icon("download")} Экспорт</button>`;
  const events = [...state.audit].reverse();
  const headHash = state.audit.at(-1)?.hash || "Журнал появится после разблокировки";
  return `<div class="view">${pageHeading("КОНТРОЛЬ И РАССЛЕДОВАНИЯ", "Журнал аудита", "Append-only события без plaintext сообщений и документов.", actions)}
    <div class="audit-integrity">${icon("shield")}<div><strong>Целостность журнала контролируется hash chain</strong><small>${state.audit.length} событий · последний якорь в демонстрационном локальном контуре</small></div><code class="audit-code">${headHash}</code></div>
    <div class="toolbar"><label class="toolbar-search">${icon("search")}<input id="audit-search" type="search" placeholder="Действие, сотрудник или объект" /></label><select class="select-control"><option>Все действия</option><option>Документы</option><option>Ключи</option><option>Доступы</option></select><select class="select-control"><option>Последние 7 дней</option><option>Сегодня</option><option>30 дней</option></select></div>
    <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Событие</th><th>Субъект</th><th>Результат</th><th>Время</th><th>Hash</th></tr></thead><tbody>${events.length ? events.map(auditRow).join("") : `<tr><td colspan="5"><div class="empty-state">Разблокируйте контур, чтобы инициализировать демонстрационный журнал.</div></td></tr>`}</tbody></table></div>
  </div>`;
}

function auditRow(event) {
  const time = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Qyzylorda" }).format(new Date(event.at));
  const denied = event.result === "Отклонено";
  return `<tr data-audit-row><td><div class="audit-event"><span class="audit-event-icon">${icon(denied ? "warning" : "activity")}</span><span><strong>${escapeHTML(event.action)}</strong><small>${escapeHTML(event.target)}</small></span></div></td><td>${escapeHTML(event.actor)}</td><td><span class="${denied ? "result-denied" : "result-ok"}">${escapeHTML(event.result)}</span></td><td>${time}</td><td><code class="hash-text" title="${event.hash}">${event.hash}</code></td></tr>`;
}

function renderCrypto() {
  const holders = [
    ["holder-1", "ЕТ", "Ерлан Тлеубаев", "Генеральный директор"],
    ["holder-2", "ТИ", "Тимур Исмагулов", "Руководитель ИБ"],
    ["holder-3", "СА", "Сауле Ахметова", "Главный юрист"]
  ];
  const approved = state.recoveryApprovals.size;
  return `<div class="view">${pageHeading("КРИПТОГРАФИЧЕСКИЙ КОНТУР", "Ключи принадлежат организации", "Провайдер управляет доступностью инфраструктуры, но не может получить plaintext.", `<button class="button" data-action="server-view">${icon("eye")} Взгляд сервера</button><button class="button primary" data-action="rotate-key">${icon("rotate")} Запросить ротацию</button>`)}
    <section class="crypto-layout"><article class="key-map"><h2>Иерархия ключей</h2><p>Каждый уровень имеет отдельный домен и epoch. Компрометация одного content key не раскрывает остальные объекты.</p>
      <div class="key-node root"><span class="key-node-icon">${icon("key")}</span><span><strong>Organization Root Key</strong><small>Локально у компании · epoch 4</small></span><span class="key-state">вне сервера</span></div>
      <div class="key-branch"><div class="key-node"><span class="key-node-icon">${icon("shield")}</span><span><strong>Organization KEK</strong><small>Упаковывает ключи доменов</small></span><span class="key-state">активен</span></div><div class="key-node"><span class="key-node-icon">${icon("message")}</span><span><strong>Room keys · 32</strong><small>Отдельный ключ на комнату</small></span><span class="key-state">epoch 12</span></div><div class="key-node"><span class="key-node-icon">${icon("file")}</span><span><strong>Document keys · 143</strong><small>DEK на каждую версию</small></span><span class="key-state">envelope</span></div><div class="key-node"><span class="key-node-icon">${icon("fingerprint")}</span><span><strong>Device envelopes · 247</strong><small>X25519 на доверенное устройство</small></span><span class="key-state">bound</span></div></div>
    </article>
    <article class="recovery-card"><h2>Восстановление 2 из 3</h2><p>Один участник не может восстановить критический ключ самостоятельно. Выберите двух держателей для демонстрации.</p><div class="holder-list">${holders.map(([id,initials,name,role]) => { const isApproved = state.recoveryApprovals.has(id); return `<div class="holder ${isApproved ? "approved" : ""}"><span class="avatar">${initials}</span><span><strong>${name}</strong><small>${role}</small></span><button class="button small ${isApproved ? "primary" : ""}" data-holder="${id}" ${approved >= 2 && !isApproved ? "disabled" : ""}>${isApproved ? "Share получен" : "Запросить"}</button></div>`; }).join("")}</div>
      <div class="approval-box ${approved >= 2 ? "ready" : ""}"><strong>${approved >= 2 ? "Кворум достигнут" : `Получено подтверждений: ${approved} из 2`}</strong><div class="progress-line"><span class="${approved >= 2 ? "full" : approved === 1 ? "half" : ""}"></span></div>${approved >= 2 ? `<p>Shares объединяются только в памяти этой доверенной вкладки и затем обнуляются.</p><button class="button small primary" data-action="recover-demo">Проверить восстановление ключа</button>` : ""}</div>
      <div class="security-note">${icon("info")}<span>Это реальное пороговое разделение Shamir 2‑из‑3. В пилоте каждый share должен быть зашифрован на отдельное доверенное устройство держателя; backend координирует церемонию, но не получает открытые shares.</span></div>
    </article></section>
  </div>`;
}

function renderInfrastructure() {
  const status = state.backendStatus;
  const statusLabel = status === "ready" ? "Контур запущен" : status === "down" ? "Backend недоступен" : "Не проверен";
  const statusClass = status === "ready" ? "ready" : status === "down" ? "down" : "idle";
  const services = [
    ["NestJS API", "REST + Socket.IO", "Авторизация, tenancy, policy enforcement и координация ciphertext."],
    ["PostgreSQL 17", "RLS / tenant_id", "Метаданные и зашифрованные envelopes с tenant isolation."],
    ["Redis 8", "Rate limit / presence", "WebSocket presence, одноразовые challenge и сессии."],
    ["MinIO", "Encrypted objects", "Chunked XChaCha20‑Poly1305 blobs; plaintext не покидает клиент."],
    ["WebAuthn + OIDC", "Passwordless / SSO", "Passkeys, корпоративный IdP и ротация refresh-token families."],
    ["PKCS#11 HSM", "Audit signatures", "Аппаратная подпись audit anchors; software signer только для dev."],
    ["Yjs CRDT", "Encrypted updates", "Совместное редактирование через непрозрачные для сервера updates."],
    ["OnlyOffice bridge", "On-prem trusted mode", "Опциональный редактор внутри периметра компании; явно не zero-knowledge для редактора."]
  ];
  const sessionActions = state.backendSession
    ? `<button class="button" data-action="enroll-passkey">${icon("fingerprint")} Новый passkey</button><button class="button" data-action="rotate-session">${icon("rotate")} Ротировать token</button><button class="button" data-action="logout-backend">Выйти</button>`
    : `<button class="button" data-action="passkey-login" ${status !== "ready" ? "disabled" : ""}>${icon("fingerprint")} Passkey login</button><button class="button" data-action="login-backend" ${status !== "ready" ? "disabled" : ""}>Demo login</button>`;
  return `<div class="view">${pageHeading("PILOT FOUNDATION", "Инфраструктурный контур", "Запускаемый backend и сервисы для реальной многопользовательской синхронизации.", `${sessionActions}<button class="button primary" data-action="check-backend">${icon("activity")} Проверить backend</button>`)}
    <div class="runtime-banner ${statusClass}"><span class="runtime-dot"></span><div><strong>${statusLabel}</strong><small>${status === "ready" ? "PostgreSQL и Redis ответили readiness-check." : `Локальная точка проверки: ${API_ORIGIN}/api/v1/health/ready`}</small></div></div>
    <section class="infra-grid">${services.map(([name, mode, description]) => `<article class="service-card"><div class="service-icon">${icon(name.includes("MinIO") || name.includes("PostgreSQL") || name.includes("Redis") ? "database" : name.includes("WebAuthn") ? "fingerprint" : name.includes("HSM") ? "key" : "cpu")}</div><div><small>${mode}</small><h2>${name}</h2><p>${description}</p></div><span class="service-state">implemented</span></article>`).join("")}</section>
    <div class="security-note">${icon("info")}<span>Статический приватный стенд работает автономно. Полный контур запускается локально командой <code>npm run infra:up</code>; IdP, аппаратный HSM и trusted OnlyOffice подключаются конфигурацией конкретной организации.${state.backendSession ? " Demo-сессия активна; access token хранится только в памяти вкладки." : ""}</span></div>
  </div>`;
}

function render() {
  const titles = { overview: "Обзор", chats: "Сообщения", documents: "Документы", team: "Сотрудники", access: "Доступы", audit: "Журнал аудита", crypto: "Криптоконтур", infrastructure: "Инфраструктура" };
  if (!titles[state.view]) state.view = "overview";
  const renderers = { overview: renderOverview, chats: renderChats, documents: renderDocuments, team: renderTeam, access: renderAccess, audit: renderAudit, crypto: renderCrypto, infrastructure: renderInfrastructure };
  main.innerHTML = renderers[state.view]();
  document.getElementById("page-context").textContent = titles[state.view];
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  if (location.hash !== `#${state.view}`) history.replaceState(null, "", `#${state.view}`);
  requestAnimationFrame(() => {
    const scroll = document.getElementById("message-scroll");
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });
}

function openModal(content, wide = false) {
  modalLayer.innerHTML = `<section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${content}</section>`;
  modalLayer.querySelector("input, textarea, button")?.focus();
}

function closeModal() {
  if (state.activeObjectUrl) URL.revokeObjectURL(state.activeObjectUrl);
  state.activeObjectUrl = null;
  modalLayer.innerHTML = "";
}

function openUnlockModal() {
  if (state.unlocked) return lockVault();
  openModal(`<div class="modal-body"><div class="unlock-visual">${icon("lock")}</div><div class="unlock-copy"><div class="eyebrow-label">ЛОКАЛЬНЫЙ VAULT</div><h3>Разблокировать контур</h3><p>32‑байтный ключ выводится Argon2id (64 MiB, 3 прохода) внутри браузера. В сеть он не отправляется и хранится только в памяти вкладки.</p></div><form id="unlock-form"><div class="field"><label for="passphrase">Кодовая фраза организации</label><input id="passphrase" type="password" value="${DEMO_PASSPHRASE}" autocomplete="off" /></div><div class="demo-hint">Для MVP используйте <code>${DEMO_PASSPHRASE}</code>; вычисление может занять несколько секунд.</div><div id="unlock-error" class="result-denied" style="margin-top:9px"></div><div class="unlock-warning">${icon("warning")}<span>Демонстрационная фраза публична. Реальный пилот требует аппаратного ключа/WebAuthn и уникального секрета организации.</span></div><button class="button primary" style="width:100%;margin-top:17px" type="submit">${icon("unlock")} Вывести ключ Argon2id</button></form></div>`);
}

function openServerView() {
  const messageRaw = localStorage.getItem(`${STORAGE_PREFIX}:messages`);
  const envelope = messageRaw ? JSON.parse(messageRaw) : null;
  const visible = envelope ? JSON.stringify({ tenant: envelope.tenant, v: envelope.v, alg: envelope.alg, iv: envelope.iv, aad: envelope.aad, ciphertext: `${envelope.ciphertext.slice(0, 260)}…` }, null, 2) : "Ciphertext ещё не создан. Сначала разблокируйте демо-контур.";
  openModal(`<header class="modal-head"><div><h2>Что видит инфраструктура</h2><p>Реальный объект из localStorage этого MVP. Ключа и plaintext здесь нет.</p></div><button class="modal-close" data-action="close-modal">${icon("close")}</button></header><div class="modal-body"><div class="cipher-view">${escapeHTML(visible)}</div><div class="server-facts"><div class="server-fact"><small>Payload</small><strong>Ciphertext</strong></div><div class="server-fact"><small>Алгоритм MVP</small><strong>AES-256-GCM</strong></div><div class="server-fact"><small>Ключ</small><strong>Только в RAM клиента</strong></div></div><div class="security-note">${icon("info")}<span>Провайдер всё ещё видит ограниченные служебные метаданные: tenant ID, размер объекта, время и сетевые сведения. Production-архитектура минимизирует их, но не обещает анонимность.</span></div></div><footer class="modal-actions"><button class="button" data-action="close-modal">Закрыть</button></footer>`);
}

function sanitizeOfficeHTML(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((node) => node.remove());
  parsed.querySelectorAll("*").forEach((node) => [...node.attributes].forEach((attribute) => {
    if (attribute.name.startsWith("on") || attribute.name === "style" || ["src", "href"].includes(attribute.name)) node.removeAttribute(attribute.name);
  }));
  return parsed.body.innerHTML;
}

function renderOfficePreview(preview) {
  if (preview.kind === "pdf") {
    state.activeObjectUrl = preview.objectUrl;
    return `<iframe class="pdf-frame" src="${preview.objectUrl}#toolbar=0&navpanes=0" title="Защищённый PDF viewer"></iframe>`;
  }
  if (preview.kind === "docx") return `<div class="office-docx">${sanitizeOfficeHTML(preview.html)}</div>`;
  if (preview.kind === "xlsx") return `<div class="sheet-preview"><table>${preview.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHTML(cell instanceof Date ? cell.toLocaleDateString("ru-RU") : cell ?? "")}</td>`).join("")}</tr>`).join("")}</table></div>`;
  return `<div class="empty-state">${escapeHTML(preview.reason)}</div>`;
}

async function openDocument(docId) {
  const doc = state.documents.find((item) => item.id === docId);
  if (!doc) return;
  let viewer = `<div class="editor-canvas"><div class="editor-page"><textarea id="document-content" ${doc.canEdit ? "" : "readonly"}>${escapeHTML(doc.content)}</textarea></div></div>`;
  if (doc.fileManifest && doc.fileKey) {
    try {
      const decrypted = await decryptFile(doc.fileManifest, fromBase64(doc.fileKey));
      const file = new File([decrypted.blob], decrypted.name, { type: decrypted.blob.type });
      viewer = `<div class="protected-viewer" data-watermark="Алия Даулетова · ${new Date().toLocaleString("ru-RU")}">${renderOfficePreview(await createOfficePreview(file))}</div>`;
    } catch {
      viewer = `<div class="empty-state result-denied">Файл не прошёл локальную расшифровку или проверку AEAD.</div>`;
    }
  }
  openModal(`<header class="modal-head"><div><h2>${escapeHTML(doc.title)}</h2><p>Версия ${doc.version} · расшифровано локально · download=false · print=false</p></div><button class="modal-close" data-action="close-modal">${icon("close")}</button></header><div class="modal-body"><div class="doc-editor-meta"><span class="status-pill ${doc.statusTone}">${escapeHTML(doc.status)}</span><span class="classification"><i class="${doc.classificationTone}"></i>${escapeHTML(doc.classification)}</span><span class="status-pill green">${icon("shield")} XChaCha20‑Poly1305</span><span class="status-pill gray">watermark + print block</span></div>${viewer}</div><footer class="modal-actions"><button class="button" data-action="close-modal">Закрыть</button>${doc.canEdit && !doc.fileManifest ? `<button class="button primary" data-action="save-document" data-id="${doc.id}">${icon("lock")} Зашифровать и сохранить</button>` : `<span class="status-pill gray">Защищённый просмотр</span>`}</footer>`, true);
  modalLayer.querySelector(".protected-viewer")?.addEventListener("contextmenu", (event) => event.preventDefault());
  appendAudit("Документ открыт", doc.title).then(() => { if (state.view === "audit") render(); });
}

function openNewDocument() {
  openModal(`<header class="modal-head"><div><h2>Новый защищённый документ</h2><p>Текст или файл шифруется на клиенте до сохранения.</p></div><button class="modal-close" data-action="close-modal">${icon("close")}</button></header><form id="new-document-form"><div class="modal-body"><div class="field"><label for="new-document-title">Название</label><input id="new-document-title" maxlength="120" placeholder="Можно оставить пустым при загрузке файла" /></div><div class="field"><label for="new-document-content">Текстовый документ</label><textarea id="new-document-content" placeholder="Введите текст или выберите DOCX/XLSX/PDF ниже…"></textarea></div><label class="file-drop" for="new-document-file">${icon("upload")}<span><strong>Добавить DOCX, XLSX или PDF</strong><small>Для автономного стенда — до 700 КБ; backend принимает до 100 МБ</small></span><input id="new-document-file" type="file" accept=".docx,.xlsx,.pdf,application/pdf" /></label><div id="document-error" class="result-denied"></div></div><footer class="modal-actions"><button class="button" data-action="close-modal" type="button">Отмена</button><button class="button primary" type="submit">${icon("lock")} Создать и зашифровать</button></footer></form>`, true);
}

function openCommandMenu() {
  openModal(`<header class="modal-head"><div><h2>Быстрый переход</h2><p>Навигация и действия рабочего контура</p></div><button class="modal-close" data-action="close-modal">${icon("close")}</button></header><div class="modal-body command-menu">${[["message","chats","Открыть сообщения","Защищённые комнаты"],["file","documents","Найти документ","DOCX / XLSX / PDF viewer"],["users","team","Сотрудники","Устройства и статусы"],["shield","crypto","Проверить криптоконтур","Ключи и recovery"],["cpu","infrastructure","Инфраструктура","NestJS и сервисы"]].map(([ico,view,title,desc]) => `<button class="command-item" data-view="${view}"><span>${icon(ico)}</span><span><strong>${title}</strong><small>${desc}</small></span><b>→</b></button>`).join("")}</div>`);
}

function openOrgMenu() {
  document.querySelector(".org-menu")?.remove();
  const rect = document.getElementById("org-switcher").getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "org-menu";
  menu.style.left = `${Math.min(rect.left + 14, innerWidth - 248)}px`;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.innerHTML = `<button><span class="org-monogram">AI</span><span><strong>Astana Industrial</strong><small>Текущий лицензированный контур</small></span></button><button disabled><span class="org-monogram" style="background:#dfe6e2">+</span><span><strong>Другой контур</strong><small>Нужна отдельная лицензия и ключ</small></span></button>`;
  document.body.append(menu);
}

function toast(title, description) {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `${icon("check")}<span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(description)}</small></span>`;
  document.getElementById("toast-region").append(node);
  setTimeout(() => node.remove(), 4200);
}

async function sendMessage() {
  const input = document.getElementById("message-input");
  const text = input?.value.trim();
  if (!text || !state.unlocked) return;
  const id = crypto.randomUUID();
  state.messages.push({ id, room: state.selectedRoom, author: "Алия Даулетова", initials: "АД", time: formatNow(), text, self: true });
  await persistVault();
  await appendAudit("Сообщение отправлено", `room:${state.selectedRoom} · content omitted`);
  let delivered = false;
  if (state.realtime?.connected && state.backendRoomId && state.rootKeyBytes) {
    try {
      const envelope = await encryptXChaCha20(new TextEncoder().encode(text), state.rootKeyBytes, { tenantId: ORG_ID, roomId: state.backendRoomId, clientMessageId: id }, 1);
      await new Promise((resolve, reject) => state.realtime.timeout(5000).emit("message:send", { roomId: state.backendRoomId, clientMessageId: id, ciphertext: envelope.ciphertext, nonce: envelope.nonce, aad: envelope.aad, keyEpoch: envelope.keyEpoch }, (error, response) => error ? reject(error) : resolve(response)));
      delivered = true;
    } catch { /* local encrypted queue remains available */ }
  }
  render();
  toast("Сообщение зашифровано", delivered ? "XChaCha20 ciphertext доставлен через Socket.IO." : "Сохранено в локальной encrypted queue; realtime сейчас недоступен.");
}

async function saveOpenDocument(docId) {
  const doc = state.documents.find((item) => item.id === docId);
  const content = document.getElementById("document-content")?.value;
  if (!doc || content == null || !doc.canEdit) return;
  doc.content = content;
  doc.version += 1;
  doc.updated = `сегодня, ${formatNow()}`;
  await persistVault();
  await appendAudit("Создана версия документа", `${doc.title} · v${doc.version}`);
  closeModal();
  render();
  toast("Версия сохранена", `Документ зашифрован. Текущая версия: ${doc.version}.`);
}

async function createDocument(form) {
  const titleInput = form.querySelector("#new-document-title").value.trim();
  const content = form.querySelector("#new-document-content").value.trim();
  const file = form.querySelector("#new-document-file").files[0];
  const errorNode = form.querySelector("#document-error");
  if (!content && !file) { errorNode.textContent = "Введите текст или выберите файл."; return; }
  if (file && file.size > 700 * 1024) { errorNode.textContent = "На автономном стенде файл должен быть не больше 700 КБ. Backend рассчитан на 100 МБ."; return; }
  const extension = file?.name.split(".").pop()?.toLocaleLowerCase();
  if (file && !["docx", "xlsx", "pdf"].includes(extension)) { errorNode.textContent = "Поддерживаются только DOCX, XLSX и PDF."; return; }
  const id = crypto.randomUUID();
  const title = titleInput || file?.name || "Новый документ";
  const type = extension === "pdf" ? "pdf" : extension === "xlsx" ? "sheet" : "doc";
  const doc = { id, title, type, status: "Черновик", statusTone: "gray", classification: "Внутренний", classificationTone: "internal", owner: "Алия Даулетова", updated: `сегодня, ${formatNow()}`, version: 1, canEdit: !file, content: content || `Файл ${file.name} зашифрован на устройстве.` };
  if (file) {
    const fileKey = await generateContentKey();
    doc.fileManifest = await encryptFile(file, fileKey, id);
    doc.fileKey = toBase64(fileKey);
    fileKey.fill(0);
  }
  state.documents.unshift(doc);
  await persistVault();
  await appendAudit("Документ создан", `${title} · v1`);
  closeModal();
  render();
  toast("Документ создан", file ? "Файл разбит на chunks и зашифрован XChaCha20‑Poly1305." : "Текст сохранён только в зашифрованном vault.");
}

async function checkBackend() {
  state.backendStatus = "checking";
  render();
  try {
    const response = await fetch(`${API_ORIGIN}/api/v1/health/ready`, { signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error("not ready");
    state.backendStatus = "ready";
    toast("Backend готов", "NestJS, PostgreSQL и Redis прошли readiness-check.");
  } catch {
    state.backendStatus = "down";
    toast("Backend не запущен", "Запустите локальный контур командой npm run infra:up.");
  }
  render();
}

async function backendRequest(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}/api/v1${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(Array.isArray(body?.message) ? body.message.join("; ") : body?.message || `HTTP ${response.status}`); error.body = body; error.status = response.status; throw error; }
  return body;
}

async function connectBackendRealtime() {
  if (!state.backendSession || !state.unlocked || !state.rootKeyBytes) return;
  const backendRooms = await backendRequest("/rooms", { headers: { Authorization: `Bearer ${state.backendSession.accessToken}` } });
  state.backendRoomId = backendRooms[0]?.id ?? null;
  state.realtime?.disconnect();
  state.realtime = connectRealtime(API_ORIGIN, state.backendSession.accessToken, {
    onState: (status) => {
      state.realtimeState = status;
      if (state.view === "chats") render();
    },
    onMessage: async (message) => {
      if (!state.rootKeyBytes || !message?.clientMessageId || state.messages.some((item) => item.id === message.clientMessageId)) return;
      try {
        const plaintext = await decryptXChaCha20({ version: 1, suite: "XCHACHA20-POLY1305-IETF", keyEpoch: Number(message.keyEpoch), nonce: String(message.nonce), aad: String(message.aad), ciphertext: String(message.ciphertext) }, state.rootKeyBytes);
        state.messages.push({ id: String(message.clientMessageId), room: "board", author: "Участник realtime", initials: "RT", time: formatNow(), text: new TextDecoder().decode(plaintext), self: false });
        plaintext.fill(0);
        await persistVault();
        if (state.view === "chats") render();
      } catch { toast("Realtime payload отклонён", "AEAD-проверка входящего сообщения не пройдена."); }
    }
  });
  state.realtime.on("connect", () => { if (state.backendRoomId) state.realtime.emit("room:join", { roomId: state.backendRoomId }); });
}

async function loginBackend() {
  try {
    state.backendSession = await backendRequest("/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@astana-industrial.kz", password: DEMO_PASSPHRASE, deviceId: "kontur-demo-browser", deviceName: "Pilot browser" }) });
    await connectBackendRealtime();
    toast("Demo-сессия открыта", "Получены короткий access token и rotating refresh token.");
  } catch (error) { toast("Вход не выполнен", error instanceof Error ? error.message : "Backend error"); }
  render();
}

async function rotateBackendSession() {
  if (!state.backendSession) return;
  try {
    state.backendSession = await backendRequest("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: state.backendSession.refreshToken }) });
    if (state.realtime) state.realtime.auth = { token: state.backendSession.accessToken };
    toast("Token family ротирована", "Предыдущий refresh token теперь считается использованным; повтор отзовёт всю family.");
  } catch (error) { state.backendSession = null; toast("Ротация отклонена", error instanceof Error ? error.message : "Backend error"); }
  render();
}

async function logoutBackend() {
  if (!state.backendSession) return;
  try { await backendRequest("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: state.backendSession.refreshToken }) }); } catch { /* session is cleared locally even if the backend is unreachable */ }
  state.realtime?.disconnect();
  state.realtime = null;
  state.realtimeState = "offline";
  state.backendRoomId = null;
  state.backendSession = null;
  render();
  toast("Сессия закрыта", "Refresh-token family отозвана.");
}

async function enrollPasskey() {
  if (!state.backendSession || !window.PublicKeyCredential) { toast("Passkey недоступен", "Нужны активная admin-сессия и браузер с WebAuthn."); return; }
  const deviceId = `kontur-passkey-${crypto.randomUUID()}`;
  let deviceRecordId;
  try {
    await backendRequest("/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@astana-industrial.kz", password: DEMO_PASSPHRASE, deviceId, deviceName: "WebAuthn pilot device" }) });
  } catch (error) { deviceRecordId = error.body?.deviceRecordId; }
  if (!deviceRecordId) { toast("Enrollment не начат", "Backend не вернул pending device record."); return; }
  try {
    await backendRequest(`/devices/${deviceRecordId}/approve`, { method: "POST", headers: { Authorization: `Bearer ${state.backendSession.accessToken}` } });
    const enrollment = await backendRequest("/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@astana-industrial.kz", password: DEMO_PASSPHRASE, deviceId, deviceName: "WebAuthn pilot device" }) });
    const authHeader = { Authorization: `Bearer ${enrollment.enrollmentToken}` };
    const optionsJSON = await backendRequest("/auth/webauthn/register/options", { method: "POST", headers: authHeader, body: "{}" });
    const response = await startRegistration({ optionsJSON });
    await backendRequest("/auth/webauthn/register/verify", { method: "POST", headers: authHeader, body: JSON.stringify({ response }) });
    toast("Passkey зарегистрирован", "Direct WebAuthn attestation сохранена; устройство стало active.");
  } catch (error) { toast("WebAuthn enrollment прерван", error instanceof Error ? error.message : "Authenticator error"); }
}

async function passkeyLogin() {
  if (!window.PublicKeyCredential) { toast("Passkey недоступен", "Этот браузер не поддерживает WebAuthn."); return; }
  try {
    const optionsJSON = await backendRequest("/auth/webauthn/authenticate/options", { method: "POST", body: JSON.stringify({ email: "admin@astana-industrial.kz" }) });
    const response = await startAuthentication({ optionsJSON });
    state.backendSession = await backendRequest("/auth/webauthn/authenticate/verify", { method: "POST", body: JSON.stringify({ challenge: optionsJSON.challenge, response }) });
    await connectBackendRealtime();
    render();
    toast("Passkey подтверждён", "Открыта device-bound сессия с rotating refresh token.");
  } catch (error) { toast("Passkey login отклонён", error instanceof Error ? error.message : "Authenticator error"); }
}

async function openDeviceReview() {
  if (!state.backendSession) { toast("Нужна backend-сессия", "Откройте её на странице «Инфраструктура»."); return; }
  try {
    const devices = await backendRequest("/devices", { headers: { Authorization: `Bearer ${state.backendSession.accessToken}` } });
    openModal(`<header class="modal-head"><div><h2>Доверенные устройства</h2><p>Статусы читаются из PostgreSQL; approve/revoke исполняются backend и попадают в audit.</p></div><button class="modal-close" data-action="close-modal">${icon("close")}</button></header><div class="modal-body device-review-list">${devices.map((device) => `<article class="device-review-row"><span class="service-icon">${icon("fingerprint")}</span><span><strong>${escapeHTML(device.displayName)}</strong><small>${escapeHTML(device.attestationLevel)} · ${escapeHTML(device.status)}</small></span><span>${device.status === "pending" && device.attestationLevel !== "admin-approved-awaiting-webauthn" ? `<button class="button small primary" data-action="approve-device" data-id="${device.id}">Одобрить</button>` : device.status === "pending" ? `<span class="status-pill amber">Ожидает WebAuthn</span>` : device.status === "active" ? `<button class="button small" data-action="revoke-device" data-id="${device.id}">Отозвать</button>` : `<span class="status-pill gray">Отозвано</span>`}</span></article>`).join("") || `<div class="empty-state">Устройства не найдены.</div>`}</div><footer class="modal-actions"><button class="button" data-action="close-modal">Закрыть</button></footer>`, true);
  } catch (error) { toast("Устройства не загружены", error instanceof Error ? error.message : "Backend error"); }
}

async function changeDeviceState(id, action) {
  if (!state.backendSession) return;
  try {
    await backendRequest(`/devices/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${state.backendSession.accessToken}` } });
    toast(action === "approve" ? "Устройство одобрено" : "Устройство отозвано", action === "revoke" ? "Сессии устройства отозваны; требуется ротация group keys." : "Устройство может завершить WebAuthn enrollment.");
    await openDeviceReview();
  } catch (error) { toast("Операция отклонена", error instanceof Error ? error.message : "Backend error"); }
}

async function verifyAudit() {
  let previous = "GENESIS";
  let valid = true;
  for (const stored of state.audit) {
    const event = { ...stored };
    const hash = event.hash;
    delete event.hash;
    if (event.prevHash !== previous || await sha256(JSON.stringify(event)) !== hash) { valid = false; break; }
    previous = hash;
  }
  toast(valid ? "Цепочка подтверждена" : "Нарушена целостность", valid ? `${state.audit.length} событий последовательно связаны SHA-256.` : "Одно или несколько событий были изменены.");
}

function exportAudit() {
  const sanitized = state.audit.map(({ actor, action, target, result, at, hash, prevHash }) => ({ actor, action, target, result, at, hash, prevHash }));
  const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "kontur-audit-demo.json";
  anchor.click();
  URL.revokeObjectURL(url);
  toast("Экспорт подготовлен", "В файл не включено содержимое сообщений или документов.");
}

function filterRows(selector, value, getText = (node) => node.textContent) {
  const query = value.trim().toLocaleLowerCase("ru");
  document.querySelectorAll(selector).forEach((row) => { row.style.display = getText(row).toLocaleLowerCase("ru").includes(query) ? "" : "none"; });
}

document.addEventListener("click", async (event) => {
  const viewTarget = event.target.closest("[data-view]");
  if (viewTarget) {
    state.view = viewTarget.dataset.view;
    closeModal();
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("mobile-backdrop").classList.remove("show");
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    main.focus({ preventScroll: true });
    return;
  }
  const roomTarget = event.target.closest("[data-room]");
  if (roomTarget) { state.selectedRoom = roomTarget.dataset.room; render(); return; }
  const roleTarget = event.target.closest("[data-role]");
  if (roleTarget) { state.activeRole = roleTarget.dataset.role; render(); return; }
  const holderTarget = event.target.closest("[data-holder]");
  if (holderTarget && !holderTarget.disabled) {
    state.recoveryApprovals.add(holderTarget.dataset.holder);
    await appendAudit("Recovery share подтверждён", `${holderTarget.dataset.holder} · share content omitted`, "Разрешено", "Recovery coordinator");
    render();
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;
  if (action === "unlock") openUnlockModal();
  if (action === "close-modal") closeModal();
  if (action === "server-view") openServerView();
  if (action === "new-document") openNewDocument();
  if (action === "open-document") await openDocument(actionTarget.dataset.id);
  if (action === "check-backend") await checkBackend();
  if (action === "login-backend") await loginBackend();
  if (action === "rotate-session") await rotateBackendSession();
  if (action === "logout-backend") await logoutBackend();
  if (action === "enroll-passkey") await enrollPasskey();
  if (action === "passkey-login") await passkeyLogin();
  if (action === "device-review") await openDeviceReview();
  if (action === "approve-device") await changeDeviceState(actionTarget.dataset.id, "approve");
  if (action === "revoke-device") await changeDeviceState(actionTarget.dataset.id, "revoke");
  if (action === "save-document") await saveOpenDocument(actionTarget.dataset.id);
  if (action === "verify-audit") await verifyAudit();
  if (action === "export-audit") exportAudit();
  if (action === "toggle-permission") {
    actionTarget.classList.toggle("on");
    actionTarget.setAttribute("aria-pressed", actionTarget.classList.contains("on"));
  }
  if (action === "save-policy") {
    await appendAudit("Политика роли изменена", state.activeRole);
    toast("Политика сохранена", "Изменение добавлено в append-only audit log.");
  }
  if (action === "recover-demo") {
    const selectedShares = [...state.recoveryApprovals].map((holderId) => state.recoveryShares[Number(holderId.split("-")[1]) - 1]).filter(Boolean);
    const recovered = await recoverSecret(selectedShares);
    const valid = Boolean(state.rootKeyBytes) && recovered.length === state.rootKeyBytes.length && recovered.every((byte, index) => byte === state.rootKeyBytes[index]);
    recovered.fill(0);
    await appendAudit("Recovery drill выполнен", `Organization Root Key · Shamir 2-of-3 · ${valid ? "verified" : "failed"}`, valid ? "Разрешено" : "Отклонено", "Recovery coordinator");
    toast(valid ? "Ключ восстановлен" : "Recovery не пройден", valid ? "Два реальных Shamir-share восстановили исходные 256 бит; буфер очищен." : "Полученный секрет не совпал с исходным ключом.");
  }
  if (action === "rotate-key") toast("Запрос ротации создан", "В production потребуется step-up MFA и двойное подтверждение.");
  if (["new-room", "invite-employee", "new-role"].includes(action)) toast("Сценарий отмечен для пилота", "В MVP доступен основной защищённый поток; создание сущностей подключается к backend на следующем этапе.");
  if (["demo-call", "attachment", "room-info", "doc-menu", "employee-menu"].includes(action)) toast("Демонстрационный режим", "Эта вспомогательная операция не входит в текущий security-critical pilot flow.");
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "unlock-form") await unlockVault(event.target.querySelector("#passphrase").value);
  if (event.target.id === "message-form") await sendMessage();
  if (event.target.id === "new-document-form") await createDocument(event.target);
});

document.addEventListener("input", (event) => {
  if (event.target.id === "room-search") filterRows(".room-item", event.target.value);
  if (event.target.id === "document-search") filterRows("[data-doc-row]", event.target.value);
  if (event.target.id === "employee-search") filterRows("[data-employee-row]", event.target.value);
  if (event.target.id === "audit-search") filterRows("[data-audit-row]", event.target.value);
});

document.getElementById("vault-button").addEventListener("click", openUnlockModal);
document.getElementById("command-search").addEventListener("click", openCommandMenu);
document.getElementById("org-switcher").addEventListener("click", openOrgMenu);
document.getElementById("notifications-button").addEventListener("click", () => toast("Уведомления", "1 устройство ожидает подтверждения службы безопасности."));
document.getElementById("mobile-menu").addEventListener("click", () => {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("mobile-backdrop").classList.add("show");
});
document.getElementById("mobile-backdrop").addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("mobile-backdrop").classList.remove("show");
});
modalLayer.addEventListener("click", (event) => { if (event.target === modalLayer) closeModal(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeModal(); document.querySelector(".org-menu")?.remove(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCommandMenu(); }
});
window.addEventListener("hashchange", () => { state.view = location.hash.replace("#", "") || "overview"; render(); });

render();
setTimeout(openUnlockModal, 450);
