# Контур: архитектура B2B/B2G zero-knowledge платформы

Статус документа: целевая архитектура после MVP. Демонстрационная реализация в `dist/` намеренно уже этого проекта; различия зафиксированы в `MVP_LIMITATIONS.md`.

## 1. System architecture

```text
Корпоративные устройства                         Инфраструктура провайдера
┌──────────────────────────────┐                 ┌───────────────────────────┐
│ Web / Desktop / Mobile       │  TLS 1.3        │ Edge / API Gateway        │
│ ├─ локальный vault ключей    ├────────────────►│ ├─ auth & device registry │
│ ├─ crypto worker             │                 │ ├─ tenant policy service  │
│ ├─ viewer/editor             │                 │ ├─ chat/realtime service  │
│ └─ plaintext только в RAM    │◄────────────────┤ ├─ document service       │
└──────────────┬───────────────┘  ciphertext     │ └─ audit service          │
               │                                 ├─────────────┬─────────────┤
┌──────────────▼───────────────┐                 │ PostgreSQL  │ S3 / MinIO  │
│ Org-controlled key holders   │                 │ metadata +  │ encrypted   │
│ HSM/TPM/passkey + 2-of-3     │                 │ ciphertext  │ blobs       │
└──────────────────────────────┘                 └─────────────┴─────────────┘
```

Клиент получает разрешённые зашифрованные ключевые конверты, локально открывает их device key и шифрует содержимое до отправки. Сервер авторизует операции и маршрутизирует ciphertext, но не получает ключей содержимого. Control plane (лицензии, организации, устройства, политики) отделён от data plane (сообщения, документы, файлы).

Domain-модули: `auth`, `organizations`, `employees`, `roles`, `permissions`, `devices`, `crypto`, `chats`, `messages`, `documents`, `files`, `audit`, `notifications`, `admin`.

## 2. Trust boundaries и threat model

| Актив | Доверенная сторона | Основная угроза | Базовая защита |
|---|---|---|---|
| Plaintext сообщений/документов | авторизованное устройство организации | компрометация backend/DB | E2EE, отдельные content keys, AEAD |
| Organization Root Key (ORK) | уполномоченные компании | инсайдер или потеря одного holder | 2-of-3 shares, HSM/TPM, ротация |
| Device private key | конкретное устройство | кража устройства | non-exportable key, secure enclave, revoke |
| Метаданные | провайдер | корреляция пользователей и активности | минимизация, псевдонимизация, короткое хранение |
| Политики и роли | организация + policy service | malicious admin / confused deputy | dual control, step-up MFA, immutable audit |
| Audit trail | организация | удаление или переписывание следов | append-only hash chain, WORM replica, подписи |

Предполагаем компрометацию БД, object storage и backend провайдера. В результате атакующий получает ciphertext, ограниченные метаданные и возможность отказа в обслуживании, но не plaintext. E2EE не защищает данные на уже разблокированном заражённом endpoint, от разрешённого получателя, скриншотов, камеры, clipboard или намеренного экспорта. Traffic analysis и доступность остаются рисками. Администратор организации не получает автоматический plaintext-доступ: расследование требует отдельно разрешённого recovery/audit workflow.

## 3. Cryptographic architecture

- Payload AEAD: XChaCha20-Poly1305 (предпочтительно для контента) или AES-256-GCM при аппаратном ускорении/FIPS-требованиях.
- KDF: HKDF-SHA-256 для разведения доменов ключей; Argon2id для passphrase recovery.
- Identity/device signatures: Ed25519; key agreement: X25519. Для FIPS-контура выбирается совместимый набор P-256/AES-GCM без смешивания профилей.
- Envelope encryption: каждый объект имеет случайный DEK; DEK упаковывается ключом комнаты/документа; тот — ключами разрешённых устройств или групп.
- Associated Data связывает ciphertext с `tenant_id`, `object_id`, `version`, `sender_device_id`, `algorithm_suite` и предотвращает перенос между контекстами.
- Nonce генерируется CSPRNG и никогда не повторяется для одного ключа. Формат ciphertext версионируется.
- Криптография реализуется проверенными библиотеками/libsodium/WebCrypto; собственные примитивы запрещены.

## 4. Key hierarchy

```text
Organization Root Key (ORK, никогда не у провайдера)
├─ Organization KEK epoch N
│  ├─ Room Key → Message DEK per message
│  ├─ Document Key → Version DEK per version
│  └─ Audit Disclosure Key (отдельная политика)
├─ Device envelopes (X25519 recipient wrapping)
└─ Recovery secret → Shamir shares 2-of-3
```

ORK создаётся на доверенном устройстве/в HSM. Для recovery генерируются 3 shares, каждая передаётся отдельному holder и не хранится провайдером. Восстановление проходит на изолированной станции; сервер лишь фиксирует согласования. Ротация создаёт новый epoch и перепаковывает ключи лениво; ciphertext больших объектов не перешифровывается без необходимости. Отзыв устройства запрещает новые конверты, ротирует затронутые group keys, но не может «забыть» уже увиденный plaintext.

## 5. Organization isolation model

- Каждый запрос содержит tenant context, полученный только из проверенного access token, а не из произвольного header.
- Все таблицы имеют `tenant_id`; PostgreSQL Row Level Security включён как второй барьер.
- Object keys имеют непрозрачный tenant prefix; presigned URL выдаётся после policy check и только на ciphertext.
- Для каждой организации отдельные ORK/KEK, audit chain и namespace; глобального content key нет.
- Enterprise-варианты: отдельная БД/schema/bucket или полностью отдельный deployment. B2G on-prem использует тот же протокол и API-контракт.

## 6. Authentication architecture

OIDC/SAML SSO организации + WebAuthn/passkeys для MFA. Первичная привязка устройства подтверждается существующим устройством или двумя администраторами. Access token 5–10 минут, refresh token rotation с reuse detection, device-bound sessions (DPoP/mTLS где применимо). Risk-based step-up обязателен для управления ключами, ролями, экспортом и recovery. Увольнение сотрудника отзывает сессии/устройства и запускает ротацию доступных ему group keys.

## 7. Authorization model

RBAC задаёт базовую роль, ABAC уточняет решение по классификации документа, подразделению, устройству, времени и состоянию сессии. Policy decision выполняется backend для каждой операции; UI только объясняет результат.

Ресурсные действия: `view`, `edit`, `share`, `download`, `print`, `sign`, `approve`, `delete`, `manage`. Для чувствительных операций поддерживаются four-eyes approval, expiry, legal hold и deny-overrides. Решение policy + причина попадают в audit log.

## 8. Database schema

Основные таблицы PostgreSQL:

- `organizations(id, license_state, crypto_profile, key_epoch, created_at)`
- `departments(id, tenant_id, parent_id, name)`
- `employees(id, tenant_id, subject_id, department_id, status)`
- `roles`, `permissions`, `role_bindings`, `resource_grants`
- `devices(id, tenant_id, employee_id, public_enc_key, public_sign_key, status, attestation)`
- `key_envelopes(id, tenant_id, recipient_device_id, key_ref, epoch, ciphertext, suite)`
- `rooms`, `room_members`, `messages(id, tenant_id, room_id, sender_device_id, ciphertext, aad, version)`
- `documents`, `document_versions(ciphertext_ref, wrapped_dek, content_hash, author_device_id)`
- `workflows`, `approvals`, `signatures`
- `files(ciphertext_ref, encrypted_metadata, size, chunk_manifest)`
- `audit_events(seq, tenant_id, actor_id, action, target_ref, decision, prev_hash, event_hash, signature)`
- `sessions`, `refresh_families`, `outbox`, `idempotency_keys`

Foreign keys включают `tenant_id`, чтобы исключить cross-tenant связи. RLS и автоматические tests проверяют tenant leakage.

## 9. API structure

Версионированный REST (`/api/v1`) для control plane и команд; WebSocket для событий. Основные ресурсы: `/auth`, `/organizations`, `/employees`, `/devices`, `/key-envelopes`, `/rooms`, `/messages`, `/documents`, `/files`, `/policies`, `/approvals`, `/audit`.

Сервер принимает только ciphertext-поля, проверяет schema/size/tenant/policy и idempotency key. Ошибки не раскрывают существование чужих ресурсов. OpenAPI-контракт генерирует typed SDK. Upload — multipart ciphertext с проверяемым client-side hash.

## 10. WebSocket architecture

Короткоживущий socket ticket выдаётся после HTTPS-auth. Gateway валидирует tenant и членство при connect и при каждом subscribe. Каналы имеют вид непрозрачных `room:{id}`; payload — ciphertext + безопасный envelope. Redis/NATS масштабирует fan-out, но не является источником истины. Sequence number и resume cursor устраняют пропуски; replay window и idempotency защищают от повторов. Presence хранится кратко и не содержит plaintext.

## 11. Document-storage architecture

Редактор работает с plaintext в изолированном client worker. Изменения (CRDT/Yjs updates или версии) шифруются до синхронизации. Большие файлы шифруются чанками отдельными nonce/DEK; MinIO/S3 видит только ciphertext. Viewer не получает download URL на plaintext. Запрет download/print снижает случайные утечки, но не предотвращает скриншоты или запись разрешённым пользователем. OnlyOffice/Collabora требуют customer-controlled trusted processing enclave/on-prem bridge; обычный серверный редактор разрушил бы zero-knowledge модель.

## 12. Audit architecture

Audit содержит действия и решения доступа, но не тексты/названия чувствительных документов. События канонизируются, связываются `prev_hash`, подписываются сервисным ключом и периодически якорятся во внешнем WORM-хранилище организации. Отдельный client disclosure event фиксирует факт расшифровки. Security team получает фильтры, verification и controlled export. Провайдерский operational log отделён от tenant audit.

## 13. Deployment architecture

Одинаковые OCI-образы и Helm charts поддерживают SaaS, private cloud, on-prem и air-gapped. Состав: reverse proxy/WAF, stateless NestJS services, WebSocket gateways, PostgreSQL HA, Redis/NATS, MinIO/S3, audit WORM target, observability без payload. Секреты сервиса находятся в Vault/KMS заказчика, но content keys туда не передаются. Air-gapped поставка включает signed image bundle, offline CRL/update channel, SBOM и reproducible verification.

## 14. Folder structure

```text
apps/
  web/                 Next.js client + crypto workers
  mobile/              React Native
  api/                 NestJS composition root
  realtime/            WebSocket gateway
packages/
  contracts/           OpenAPI/events/schema
  crypto-protocol/     formats + wrappers over audited libraries
  policy/              RBAC/ABAC types and evaluator
  ui/                   design system
modules/
  auth/ organizations/ employees/ roles/ permissions/ devices/
  chats/ messages/ documents/ files/ audit/ notifications/ admin/
infra/
  docker/ helm/ terraform/ airgap/
docs/
  adr/ threat-model/ runbooks/
```

Модули общаются через typed contracts и domain events. Crypto protocol имеет отдельное versioning и security review.

## 15. MVP roadmap

1. **Показательный MVP (эта поставка):** рабочая оболочка, локальное AES-GCM шифрование сообщений/документов, simulated tenant vault, permissions, chained audit, recovery 2-of-3 UX, server-view ciphertext.
2. **Pilot foundation:** NestJS/PostgreSQL/MinIO, реальные accounts/devices, WebAuthn, libsodium, tenant RLS, encrypted uploads, WebSocket delivery, tests и observability.
3. **Controlled pilot:** audited Shamir implementation/HSM flows, key rotation/revocation, CRDT documents, dual control, external penetration test, recovery drills.
4. **Production/B2G:** formal threat model review, crypto audit, compliance mapping, HA/DR, signed supply chain/SBOM, on-prem/air-gap installers, ЭЦП и office bridges.

Критический security gate перед pilot: протокол, key lifecycle и recovery должны пройти независимый криптографический аудит. Демонстрационный код не является таким протоколом.
