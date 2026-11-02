import Constants from "expo-constants";

// Значения совпадают с web-клиентом: одинаковые ORG_ID и фраза дают одинаковый ключ Argon2id,
// поэтому iPhone и браузер расшифровывают сообщения друг друга.
export const ORG_ID = "aktau-industrial-01";
export const ORG_NAME = "Aktau Industrial";
export const DEMO_PASSPHRASE = "demo-2026";
export const STORAGE_PREFIX = `kontur:mobile-v1:${ORG_ID}`;

export const DEMO_ACCOUNT = {
  name: "Тестов Тест Тестович",
  shortName: "Тест Тестович",
  initials: "ТТ",
  role: "Администратор организации",
  email: "admin@aktau-industrial.kz"
} as const;

export const DEMO_DEVICE = { id: "kontur-demo-mobile", name: "Pilot iPhone", label: "KTR-IOS-MOBILE" } as const;

export type RoomId = "board" | "security" | "project" | "private";

// Те же UUID создаёт seed API и использует web-клиент.
export const BACKEND_ROOM_IDS: Record<RoomId, string> = {
  board: "c340d1ac-2d53-405a-bb92-9fd423b41899",
  security: "18c59cf0-eb06-442a-8221-d9e3f5c8d373",
  project: "75c73883-5363-4766-ac1c-0ba06e93b629",
  private: "e8c107c4-4ce7-431e-9962-e3d3cbc1c6ff"
};

// Демо-документы есть на обоих клиентах сразу; фиксированные UUID связывают их с одной записью на сервере.
export const DEMO_DOCUMENT_IDS: Record<string, string> = {
  "doc-protocol": "8ea37dee-4def-405a-a26b-5f02c5959827",
  "doc-budget": "3bda9703-f72a-4322-a3b9-0d9b32d07ed6",
  "doc-policy": "f8124c66-ad9c-4fad-bd02-af1b5446261f"
};

// Expo Go знает IP компьютера, на котором запущен Metro: backend в Docker слушает тот же хост на :3001.
export function defaultApiOrigin(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? "";
  const host = hostUri.split(":")[0];
  return host ? `http://${host}:3001` : "http://127.0.0.1:3001";
}
