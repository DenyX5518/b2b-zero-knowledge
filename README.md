# Контур — zero-knowledge B2B/B2G pilot MVP

Запускаемый прототип закрытой корпоративной среды: E2EE-чаты, encrypted document storage, WebSocket delivery, WebAuthn/OIDC, rotating sessions, device lifecycle, Shamir recovery, tamper-evident audit и локальный просмотр DOCX/XLSX/PDF.

## Что реализовано

- React 19 + Vite 8 frontend с компонентной FSD-архитектурой и Zustand для состояния.
- NestJS 11 API, Socket.IO gateway, PostgreSQL 17, Redis 8 и MinIO через Docker Compose.
- Строгая tenant-привязка каждой сущности и каждого server-side запроса; подготовлены PostgreSQL RLS policies.
- Access JWT на 5 минут и Argon2id-хешированные refresh tokens с rotation, reuse detection и отзывом всей token family.
- OIDC Authorization Code + PKCE, WebAuthn/passkeys с direct attestation, approval/revoke устройств.
- Клиентские Argon2id (64 MiB / 3 прохода), XChaCha20-Poly1305, X25519 sealed boxes и отдельные content keys.
- Настоящее Shamir Secret Sharing 2-из-3; backend получает только зашифрованные для recovery workstation shares.
- Зашифрованные Yjs CRDT updates и chunked file encryption.
- DOCX, XLSX и PDF viewer; watermark, отключённые UI download/print и печатный блок.
- MinIO хранит только ciphertext, а presigned URL выдаётся после tenant/policy check.
- Audit hash chain пересчитывается при проверке и подписывается ephemeral Ed25519 в dev либо PKCS#11 HSM в pilot.
- OnlyOffice bridge только в явно включаемом customer-controlled trusted-editor режиме.

## Frontend

```powershell
npm install
npm run build
npm start
```

Откройте `http://127.0.0.1:4173`. Демо-фраза — `demo-2026`. В браузере реально выполняются Argon2id, Shamir и шифрование файлов. Для автономного режима ciphertext хранится в `localStorage`; статический стенд не отправляет plaintext наружу. Подробная инструкция доступна в интерфейсе по маршруту `#/how-to`.

Для разработки с Vite HMR:

```powershell
npm run dev:web
```

Откройте `http://localhost:5173`. Vite проксирует `/api` и `/socket.io` в backend (`http://127.0.0.1:3001`, переопределяется `VITE_API_PROXY_TARGET`), поэтому dev-сервер работает с API без расширения CORS-списка.

`npm start` (`scripts/serve.mjs`) — это не dev-сервер, а маленький статический сервер для production-сборки из `dist/`: он отдаёт её на `127.0.0.1:4173` (origin, который backend разрешает в `WEB_ORIGIN`) со строгими заголовками безопасности (CSP, запрет фреймов). Так проверяется именно то, что будет развёрнуто. Для повседневной разработки достаточно `npm run dev:web`.

После разблокировки vault клиент сам проверяет backend, открывает demo-сессию и подключает realtime: сообщения синхронизируются между веб-клиентом и iPhone без ручного входа.

Frontend организован по Feature-Sliced Design:

```text
apps/web/src/
  app/          composition root и Zustand store
  pages/        страницы продукта
  widgets/      Sidebar, Topbar, App Shell
  features/     vault, documents, server ciphertext view
  entities/     message, document, employee, service
  shared/       UI-kit, config, router, helpers
```

## Полный локальный контур

1. Создайте `.env` со случайными секретами: `npm run env:init` (существующий `.env` не перезаписывается).
2. Запустите Docker daemon.
3. Соберите проект и поднимите Docker-контур:

```powershell
npm install
npm run env:init
npm run build
npm run infra:up
```

Readiness: `http://127.0.0.1:3001/api/v1/health/ready`.

### Как переносить `.env`

`.env` не хранится в git и переносить его между машинами не обязательно: на новой машине достаточно `npm run env:init` — секреты для локального стенда генерируются заново, а демо-вход (`admin@aktau-industrial.kz` / `demo-2026`) остаётся прежним. Переносить существующий `.env` нужно только вместе с данными Docker-томов (пароль PostgreSQL зашит в том при первом запуске); тогда копируйте его офлайн — флешкой или через менеджер паролей, но не через git, мессенджеры и почту. Для пилота у заказчика секреты задаются в его хранилище секретов.

### Синхронизация между устройствами

- **Сообщения** — Socket.IO: ciphertext сохраняется в PostgreSQL, история догружается при подключении, неотправленное уходит из очереди автоматически.
- **Документы** — каждая версия текстового документа шифруется отдельным случайным DEK (XChaCha20-Poly1305), DEK оборачивается ключом организации, а ciphertext хранится в MinIO (`GET/POST /api/v1/documents/sync`). Сервер принимает версию, только если клиент видел актуальную (оптимистичная блокировка), и рассылает `document:updated` остальным устройствам. Если документ изменили на двух устройствах, локальная правка становится новой версией поверх серверной, а чужая остаётся в истории — ничего не теряется. Загруженные файлы DOCX/XLSX/PDF пока остаются на устройстве, где их добавили.

## iOS-клиент через Expo Go

Мобильный клиент расположен в `apps/mobile`. Он изолирован от web-workspace и использует Expo SDK 58, React Native 0.88 и React 19.3.

```powershell
cd apps/mobile
npm install
npm start
```

Откройте Expo Go на iPhone и отсканируйте QR-код. iPhone и компьютер должны быть в одной Wi-Fi сети; Windows Firewall должен пропускать входящие соединения на порт `3001` (Docker Desktop обычно добавляет правило сам).

Что работает на iPhone — то же, что и в веб-клиенте:

- разблокировка vault: Argon2id (64 MiB, 3 прохода) на устройстве даёт тот же ключ, что и в браузере; после первого ввода ключ доверенного устройства хранится в iOS Keychain;
- чаты: поиск, фильтры, непрочитанные, отправка и приём через Socket.IO, догрузка истории и очередь неотправленных сообщений;
- документы: поиск, просмотр с watermark, создание зашифрованных текстовых документов;
- криптоконтур с настоящим Shamir 2-из-3, журнал аудита с проверкой hash chain, роли и доступы, сотрудники, «Что видит сервер»;
- инфраструктура: проверка backend, demo login, ротация refresh token, выход.

Адрес backend подставляется автоматически из адреса Metro (`http://<IP компьютера>:3001`) и меняется в разделе «Контур → Инфраструктура».

Демо API login использует `admin@aktau-industrial.kz`, пароль `demo-2026` и заранее одобренные устройства `kontur-demo-browser` (веб) и `kontur-demo-mobile` (iPhone). Seed создаёт четыре демо-комнаты с фиксированными UUID — их знают оба клиента, а сервер видит только идентификатор, не название.

OnlyOffice запускается отдельно и только внутри доверенного периметра заказчика:

```powershell
docker-compose --profile trusted-editor --env-file .env -f infra/docker-compose.yml up -d
```

Перед этим задайте `TRUSTED_EDITOR_MODE=true`, `TRUSTED_EDITOR_BRIDGE_URL` и новый `ONLYOFFICE_JWT_SECRET`. Обычный server-side OnlyOffice видит plaintext и поэтому не относится к zero-knowledge зоне провайдера.

## Проверки

```powershell
npm run check
npm test
docker-compose --env-file .env -f infra/docker-compose.yml config --quiet
```

Описание trust boundaries — [ARCHITECTURE.md](ARCHITECTURE.md). То, что всё ещё нельзя честно считать production-ready, — [MVP_LIMITATIONS.md](MVP_LIMITATIONS.md).
