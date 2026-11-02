export const ORG_ID = "aktau-industrial-01";
export const ORG_NAME = "Aktau Industrial";
export const DEMO_PASSPHRASE = "demo-2026";
export const STORAGE_PREFIX = `kontur:react-v1:${ORG_ID}`;
// В dev-режиме запросы идут на origin Vite и проксируются в backend (см. vite.config.js).
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || (import.meta.env.DEV ? location.origin : "http://127.0.0.1:3001");

export const DEMO_ACCOUNT = {
  name: "Тестов Тест Тестович",
  greetingName: "Тест Тестович",
  initials: "ТТ",
  role: "Администратор",
  email: "admin@aktau-industrial.kz"
};

export const DEMO_DEVICE = { id: "kontur-demo-browser", name: "React pilot browser" };

// Те же UUID создаёт seed API и использует iOS-клиент: сервер видит только идентификатор комнаты.
export const BACKEND_ROOM_IDS = {
  board: "c340d1ac-2d53-405a-bb92-9fd423b41899",
  security: "18c59cf0-eb06-442a-8221-d9e3f5c8d373",
  project: "75c73883-5363-4766-ac1c-0ba06e93b629",
  private: "e8c107c4-4ce7-431e-9962-e3d3cbc1c6ff"
};

// Демо-документы есть на обоих клиентах сразу; фиксированные UUID связывают их с одной записью на сервере.
export const DEMO_DOCUMENT_IDS = {
  "doc-protocol": "8ea37dee-4def-405a-a26b-5f02c5959827",
  "doc-budget": "3bda9703-f72a-4322-a3b9-0d9b32d07ed6",
  "doc-policy": "f8124c66-ad9c-4fad-bd02-af1b5446261f"
};

export const DOCUMENT_STATUSES = [
  ["Черновик", "gray"],
  ["На согласовании", "amber"],
  ["Утверждён", "green"]
];

export const REALTIME_LABELS = {
  connected: ["Синхронизировано", "green"],
  connecting: ["Подключение…", "amber"],
  disconnected: ["Нет связи", "amber"],
  error: ["Ошибка realtime", "red"],
  offline: ["Только локально", "gray"]
};

export const VIEW_TITLES = {
  overview: "Обзор",
  chats: "Сообщения",
  documents: "Документы",
  team: "Сотрудники",
  access: "Доступы",
  audit: "Журнал аудита",
  crypto: "Криптоконтур",
  infrastructure: "Инфраструктура",
  "how-to": "Как пользоваться"
};
