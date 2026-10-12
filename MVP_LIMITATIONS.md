# Что намеренно упрощено в показательном MVP

MVP нужен для демонстрации продукта и ключевых trust boundaries, а не для обработки реальных секретных данных.

| Упрощение | Почему сейчас | Что теряем |
|---|---|---|
| Статическое browser-only приложение без NestJS/PostgreSQL/Redis/MinIO | позволяет показать полный UX без небезопасного «полубэкенда» | нет реальной многопользовательской синхронизации, серверного RBAC и долговременного хранилища |
| Демо-пароль известен и PBKDF2 применяется вместо Argon2id | WebCrypto доступен без внешних зависимостей; пароль нужен лишь для демонстрации | нельзя считать vault защищённым от офлайн-перебора как production-систему |
| AES-256-GCM вместо XChaCha20-Poly1305 | нативно поддерживается браузером | требуется строгая дисциплина nonce; нет libsodium-профиля |
| Recovery 2-of-3 моделируется UX-сценарием | настоящий Shamir + holder devices требует протокола, provisioning и security review | shares не восстанавливают реальный ORK, нет защиты от сговора двух holders |
| Один демонстрационный tenant | фокус на глубине сценария и изоляции namespace | нет доказанной RLS/DB-isolation и tenant migration |
| Роли и permissions исполняются в клиенте | backend отсутствует | пользователь может изменить локальный JS; это только визуализация policy |
| Чаты без WebSocket и других реальных клиентов | нет server runtime | нет presence, delivery/read sync, offline queue и conflict resolution |
| Редактор документов текстовый, без CRDT/OnlyOffice/ЭЦП | интеграции существенно расширяют attack surface | нет совместного редактирования, DOCX/XLSX/PDF fidelity и юридической подписи |
| Audit — локальная SHA-256 hash chain | показывает tamper-evident модель без сервера/WORM | владелец браузера может удалить журнал целиком; нет внешнего якорения/подписи |
| Нет SSO, WebAuthn, device attestation и token rotation | они зависят от identity backend и устройств | нет production authentication/session security |
| Метаданные примеров открыты в UI | важно объяснить продукт | demo не доказывает encrypted metadata policy и traffic-analysis resistance |
| Запрет download/print демонстрируется интерфейсом | браузер не может гарантированно запретить capture | нет DLP/IRM, watermarking и endpoint enforcement |

Итог: MVP достоверно показывает продуктовые сценарии и принцип «ciphertext at rest, key in memory», но не должен использоваться с реальными коммерческими, государственными или персональными данными. Следующий шаг — Pilot foundation из `ARCHITECTURE.md`.
