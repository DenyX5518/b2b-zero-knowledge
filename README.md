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

1. Проверьте `.env` и замените все значения `change-me`.
2. Запустите Docker daemon.
3. Соберите проект и поднимите Docker-контур:

```powershell
npm run build
npm run infra:up
```

Readiness: `http://127.0.0.1:3001/api/v1/health/ready`.

Демо API login использует `admin@astana-industrial.kz`, пароль `demo-2026` и заранее одобренный `deviceId=kontur-demo-browser`. Кнопки на странице «Инфраструктура» проверяют backend, открывают сессию и выполняют реальную refresh-token rotation.

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
