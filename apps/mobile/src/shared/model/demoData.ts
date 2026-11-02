import type { Ionicons } from "@expo/vector-icons";
import { DEMO_ACCOUNT, type RoomId } from "../config/constants";

export type Tone = "green" | "blue" | "amber" | "dark";

export type Room = { id: RoomId; initials: string; title: string; members: number; group: boolean; tone: Tone };

export type ChatMessage = {
  id: string;
  room: RoomId;
  author: string;
  initials: string;
  time: string;
  sentAt?: string;
  text: string;
  self: boolean;
  pending?: boolean;
};

export type DocumentVersion = { version: number; title: string; content: string; status: string; updated: string; author: string };

export type DocumentItem = {
  id: string;
  title: string;
  kind: "doc" | "sheet" | "pdf";
  status: string;
  statusTone: Tone;
  classification: string;
  owner: string;
  updated: string;
  version: number;
  content: string;
  canEdit?: boolean;
  editor?: string;
  history?: DocumentVersion[];
  syncedVersion?: number;
};

export const documentStatuses: { name: string; tone: Tone }[] = [
  { name: "Черновик", tone: "blue" },
  { name: "На согласовании", tone: "amber" },
  { name: "Утверждён", tone: "green" }
];

export const rooms: Room[] = [
  { id: "board", initials: "СД", title: "Совет директоров", members: 8, group: true, tone: "dark" },
  { id: "security", initials: "ИБ", title: "Информационная безопасность", members: 12, group: true, tone: "green" },
  { id: "project", initials: "КТ", title: "Проект «Көк-Темір»", members: 23, group: true, tone: "blue" },
  { id: "private", initials: "ЕТ", title: "Ерлан Тлеубаев", members: 2, group: false, tone: "amber" }
];

const demoId = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

export const defaultMessages: ChatMessage[] = [
  { id: demoId("1"), room: "board", author: "Ерлан Тлеубаев", initials: "ЕТ", time: "10:31", text: "Коллеги, направил обновлённый протокол. Проверьте раздел по бюджету до 14:00.", self: false },
  { id: demoId("2"), room: "board", author: "Сауле Ахметова", initials: "СА", time: "10:36", text: "Юридические формулировки согласованы. Добавила замечание к пункту 4.2.", self: false },
  { id: demoId("3"), room: "board", author: DEMO_ACCOUNT.name, initials: DEMO_ACCOUNT.initials, time: "10:42", text: "Принято. После правки отправлю документ на финальное согласование.", self: true },
  { id: demoId("4"), room: "security", author: "Тимур Исмагулов", initials: "ТИ", time: "09:12", text: "Новое устройство ожидает WebAuthn attestation.", self: false },
  { id: demoId("5"), room: "security", author: "Тимур Исмагулов", initials: "ТИ", time: "09:18", text: "Проверка завершена: attestation валиден, устройство можно одобрять.", self: false },
  { id: demoId("6"), room: "project", author: "Нурлан Касымов", initials: "НК", time: "17:20", text: "Смета по «Көк-Темір» отправлена на согласование — версия 7 уже в документах.", self: false },
  { id: demoId("7"), room: "private", author: "Ерлан Тлеубаев", initials: "ЕТ", time: "18:05", text: "Документ получил, спасибо. Вернусь с комментариями завтра утром.", self: false }
];

export const defaultDocuments: DocumentItem[] = [
  { id: "doc-protocol", title: "Протокол заседания №18", kind: "doc", status: "На согласовании", statusTone: "amber", classification: "Конфиденциально", owner: DEMO_ACCOUNT.name, updated: "сегодня, 10:39", version: 6, canEdit: true, content: "ПРОТОКОЛ ЗАСЕДАНИЯ №18\n\n1. Утвердить бюджет программы цифровой трансформации.\n2. Назначить ответственными проектный офис и службу информационной безопасности.\n3. Финальная версия вступает в силу после согласования двумя уполномоченными лицами." },
  { id: "doc-budget", title: "Бюджет проекта «Көк-Темір»", kind: "sheet", status: "Черновик", statusTone: "blue", classification: "Для служебного пользования", owner: "Нурлан Касымов", updated: "сегодня, 09:54", version: 7, canEdit: true, content: "Капитальные расходы: 480 000 000 ₸\nОперационные расходы: 96 000 000 ₸\nРезерв: 12%" },
  { id: "doc-policy", title: "Политика информационной безопасности", kind: "pdf", status: "Утверждён", statusTone: "green", classification: "Внутренний", owner: "Тимур Исмагулов", updated: "12 окт., 18:05", version: 3, canEdit: false, content: "Документ определяет порядок регистрации устройств, управления ключами и реагирования на инциденты." }
];

export const employees = [
  { initials: DEMO_ACCOUNT.initials, name: DEMO_ACCOUNT.name, email: "t.testov@aktau-industrial.kz", department: "Администрация", role: "Администратор", devices: "2 доверенных", warn: false },
  { initials: "ЕТ", name: "Ерлан Тлеубаев", email: "e.tleubayev@aktau-industrial.kz", department: "Совет директоров", role: "Руководитель", devices: "2 доверенных", warn: false },
  { initials: "СА", name: "Сауле Ахметова", email: "s.akhmetova@aktau-industrial.kz", department: "Юридический отдел", role: "Юрист", devices: "1 доверенное", warn: false },
  { initials: "ТИ", name: "Тимур Исмагулов", email: "t.ismagulov@aktau-industrial.kz", department: "Инфобезопасность", role: "Офицер ИБ", devices: "WebAuthn enrollment", warn: true },
  { initials: "НК", name: "Нурлан Касымов", email: "n.kassymov@aktau-industrial.kz", department: "Финансы", role: "Сотрудник", devices: "1 доверенное", warn: false }
];

export const recoveryHolders = [
  { id: "holder-1", initials: "ЕТ", name: "Ерлан Тлеубаев", role: "Генеральный директор" },
  { id: "holder-2", initials: "ТИ", name: "Тимур Исмагулов", role: "Руководитель ИБ" },
  { id: "holder-3", initials: "СА", name: "Сауле Ахметова", role: "Главный юрист" }
];

export const keyHierarchy: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string }[] = [
  { icon: "shield-outline", title: "Organization KEK", note: "epoch 1" },
  { icon: "chatbubbles-outline", title: "Room keys", note: "Socket.IO ciphertext" },
  { icon: "document-text-outline", title: "Document DEK", note: "отдельный на версию" },
  { icon: "phone-portrait-outline", title: "Device envelopes", note: "X25519" }
];

export const permissions = ["Просмотр документов", "Редактирование", "Передача", "Скачивание", "Печать", "Подписание", "Создание комнат", "Управление участниками", "Операции с ключами"];

export const rolePermissions: Record<string, boolean[]> = {
  "Администратор": [true, true, true, true, false, true, true, true, true],
  "Руководитель": [true, true, true, false, false, true, true, true, false],
  "Офицер ИБ": [true, false, false, false, false, false, true, true, true],
  "Юрист": [true, true, true, false, false, true, false, false, false],
  "Сотрудник": [true, true, false, false, false, false, false, false, false]
};

export const infrastructureServices: { icon: keyof typeof Ionicons.glyphMap; name: string; mode: string; description: string }[] = [
  { icon: "server-outline", name: "NestJS API", mode: "REST + Socket.IO", description: "Авторизация, tenancy, policy enforcement и ciphertext routing." },
  { icon: "albums-outline", name: "PostgreSQL 17", mode: "tenant_id + RLS", description: "Метаданные, envelopes, audit и session families." },
  { icon: "flash-outline", name: "Redis 8", mode: "challenge / rate limit", description: "WebAuthn challenge, presence и ephemeral coordination." },
  { icon: "cube-outline", name: "MinIO", mode: "S3-compatible", description: "Только encrypted chunks и presigned ciphertext URLs." },
  { icon: "finger-print-outline", name: "WebAuthn + OIDC", mode: "passkeys / SSO", description: "Direct attestation, PKCE и device lifecycle." },
  { icon: "key-outline", name: "PKCS#11 HSM", mode: "audit signatures", description: "Аппаратная подпись; ephemeral Ed25519 только для dev." }
];

// В vault, сохранённых до появления редактирования, флага нет: утверждённый PDF по умолчанию только для чтения.
export function isEditable(document: DocumentItem): boolean {
  return document.canEdit ?? document.kind !== "pdf";
}
