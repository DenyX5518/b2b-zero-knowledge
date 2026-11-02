// Превью, время и счётчик непрочитанных вычисляются из сообщений; здесь только описание комнат.
export const rooms = [
  { id: "board", initials: "СД", name: "Совет директоров", members: 8, group: true },
  { id: "security", initials: "ИБ", name: "Информационная безопасность", members: 12, group: true },
  { id: "project", initials: "КТ", name: "Проект «Көк-Темір»", members: 23, group: true },
  { id: "private", initials: "ЕТ", name: "Ерлан Тлеубаев", members: 2, group: false }
];

export const employees = [
  ["ТТ", "Тестов Тест Тестович", "t.testov@aktau-industrial.kz", "Администрация", "Администратор", "2 доверенных", "active"],
  ["ЕТ", "Ерлан Тлеубаев", "e.tleubayev@aktau-industrial.kz", "Совет директоров", "Руководитель", "2 доверенных", "active"],
  ["СА", "Сауле Ахметова", "s.akhmetova@aktau-industrial.kz", "Юридический отдел", "Юрист", "1 доверенное", "active"],
  ["ТИ", "Тимур Исмагулов", "t.ismagulov@aktau-industrial.kz", "Инфобезопасность", "Офицер ИБ", "WebAuthn enrollment", "warn"],
  ["НК", "Нурлан Касымов", "n.kassymov@aktau-industrial.kz", "Финансы", "Сотрудник", "1 доверенное", "active"]
];

export const defaultMessages = [
  { id: crypto.randomUUID(), room: "board", author: "Ерлан Тлеубаев", initials: "ЕТ", time: "10:31", text: "Коллеги, направил обновлённый протокол. Проверьте раздел по бюджету до 14:00.", self: false },
  { id: crypto.randomUUID(), room: "board", author: "Сауле Ахметова", initials: "СА", time: "10:36", text: "Юридические формулировки согласованы. Добавила замечание к пункту 4.2.", self: false },
  { id: crypto.randomUUID(), room: "board", author: "Тестов Тест Тестович", initials: "ТТ", time: "10:42", text: "Принято. После правки отправлю документ на финальное согласование.", self: true },
  { id: crypto.randomUUID(), room: "security", author: "Тимур Исмагулов", initials: "ТИ", time: "09:12", text: "Новое устройство ожидает WebAuthn attestation.", self: false },
  { id: crypto.randomUUID(), room: "security", author: "Тимур Исмагулов", initials: "ТИ", time: "09:18", text: "Проверка завершена: attestation валиден, устройство можно одобрять.", self: false },
  { id: crypto.randomUUID(), room: "project", author: "Нурлан Касымов", initials: "НК", time: "17:20", text: "Смета по «Көк-Темір» отправлена на согласование — версия 7 уже в документах.", self: false },
  { id: crypto.randomUUID(), room: "private", author: "Ерлан Тлеубаев", initials: "ЕТ", time: "18:05", text: "Документ получил, спасибо. Вернусь с комментариями завтра утром.", self: false }
];

export const defaultDocuments = [
  { id: "doc-protocol", title: "Протокол заседания №18", type: "doc", status: "На согласовании", statusTone: "amber", classification: "Конфиденциально", classificationTone: "high", owner: "Тестов Тест Тестович", updated: "сегодня, 10:39", version: 6, canEdit: true, content: "ПРОТОКОЛ ЗАСЕДАНИЯ №18\n\n1. Утвердить бюджет программы цифровой трансформации.\n2. Назначить ответственными проектный офис и службу информационной безопасности.\n3. Финальная версия вступает в силу после согласования двумя уполномоченными лицами." },
  { id: "doc-budget", title: "Бюджет проекта «Көк-Темір»", type: "sheet", status: "Черновик", statusTone: "gray", classification: "Для служебного пользования", classificationTone: "internal", owner: "Нурлан Касымов", updated: "сегодня, 09:54", version: 7, canEdit: true, content: "Капитальные расходы: 480 000 000 ₸\nОперационные расходы: 96 000 000 ₸\nРезерв: 12%" },
  { id: "doc-policy", title: "Политика информационной безопасности", type: "pdf", status: "Утверждён", statusTone: "green", classification: "Внутренний", classificationTone: "internal", owner: "Тимур Исмагулов", updated: "12 окт., 18:05", version: 3, canEdit: false, content: "Документ определяет порядок регистрации устройств, управления ключами и реагирования на инциденты." }
];

export const infrastructureServices = [
  ["NestJS API", "REST + Socket.IO", "Авторизация, tenancy, policy enforcement и ciphertext routing."],
  ["PostgreSQL 17", "tenant_id + RLS migration", "Метаданные, envelopes, audit и session families."],
  ["Redis 8", "challenge / rate limit", "WebAuthn challenge, presence и ephemeral coordination."],
  ["MinIO", "S3-compatible", "Только encrypted chunks и presigned ciphertext URLs."],
  ["WebAuthn + OIDC", "passkeys / SSO", "Direct attestation, PKCE и device lifecycle."],
  ["PKCS#11 HSM", "audit signatures", "Аппаратная подпись; ephemeral Ed25519 только для dev."],
  ["Yjs CRDT", "encrypted updates", "Совместное редактирование без server-side plaintext."],
  ["OnlyOffice bridge", "trusted on-prem", "Опциональный редактор внутри периметра заказчика."]
];
