import { Icon } from "../../../shared/ui/Icon.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

const features = [
  ["shield", "Client-side crypto", "Argon2id, XChaCha20-Poly1305, AES-GCM vault и X25519 envelopes."],
  ["message", "Защищённые чаты", "Socket.IO переносит ciphertext; сервер проверяет JWT и членство комнаты."],
  ["file", "Документы", "Chunked encryption, версии, локальный DOCX/XLSX/PDF viewer и encrypted Yjs updates."],
  ["fingerprint", "Identity", "OIDC PKCE, WebAuthn direct attestation, device lifecycle и rotating sessions."],
  ["key", "Recovery", "Настоящая схема Shamir 2-из-3 и независимые holder approvals."],
  ["activity", "Audit", "Hash chain пересчитывается клиентом; backend поддерживает service/HSM signatures."]
];

const toc = [
  ["what", "О проекте"], ["start", "Быстрый старт"], ["implemented", "Что реализовано"],
  ["docker", "Docker-контур"], ["workflows", "Как это работает"], ["architecture", "Архитектура frontend"], ["limits", "Ограничения"]
];

export function HowToPage({ navigate }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <div className="view">
    <PageHeading eyebrow="РУКОВОДСТВО ПО PILOT MVP" title="Как пользоваться «Контуром»" description="Что это за система, где проходят границы доверия и как запустить полный стек."><button className="button primary" onClick={() => navigate("overview")}>Открыть рабочую область</button></PageHeading>
    <div className="how-layout"><div className="how-content">
      <section className="how-section" id="what"><h2>Что это за проект</h2><p>«Контур» — закрытая B2B/B2G платформа корпоративной связи и документооборота. Проверенные организации получают лицензию и становятся отдельными криптографическими ячейками внутри общей инфраструктуры.</p><p>Провайдер хранит и маршрутизирует зашифрованные сообщения, документы и key envelopes, но не владеет ключами содержимого. Компрометация центральной БД не должна автоматически раскрывать plaintext одной или всех организаций.</p><div className="architecture-flow"><div className="architecture-zone client"><strong>Доверенная зона компании</strong><small>Passkey, local vault, plaintext в RAM, ORK/KEK, Shamir holders</small></div><span className="architecture-arrow">→</span><div className="architecture-zone server"><strong>Инфраструктура провайдера</strong><small>NestJS, PostgreSQL, Redis, MinIO, Socket.IO — ciphertext и ограниченные метаданные</small></div></div></section>

      <section className="how-section" id="start"><h2>Быстрый старт в интерфейсе</h2><div className="how-steps"><div className="how-step"><b>1</b><strong>Разблокируйте vault</strong><p>Нажмите «Контур заблокирован» и используйте демонстрационную фразу <code>demo-2026</code>. Argon2id выведет 256-битный ключ локально.</p></div><div className="how-step"><b>2</b><strong>Откройте сценарий</strong><p>Проверьте сообщения, документы, recovery, аудит или инфраструктуру через левое меню.</p></div><div className="how-step"><b>3</b><strong>Посмотрите ciphertext</strong><p>«Взгляд сервера» показывает envelope из browser storage, а не введённый текст.</p></div></div><h3>Основные разделы</h3><ul><li><b>Сообщения:</b> локальное шифрование и realtime-доставка через Socket.IO при запущенном backend.</li><li><b>Документы:</b> создание текста либо загрузка DOCX/XLSX/PDF до 700 КБ в автономном стенде; Docker API принимает encrypted upload до 100 МБ.</li><li><b>Криптоконтур:</b> выберите любых двух из трёх держателей и выполните реальное восстановление Shamir.</li><li><b>Инфраструктура:</b> readiness-check, demo login, passkey login и refresh-token rotation.</li></ul></section>

      <section className="how-section" id="implemented"><h2>Что уже реализовано</h2><div className="feature-matrix">{features.map(([icon, title, detail]) => <div className="feature-item" key={title}><Icon name={icon} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div><h3>Frontend</h3><p>React 19.3.1 + React DOM, production-сборка Vite 8.3.5. Интерфейс разбит по Feature-Sliced Design: <code>app</code>, <code>pages</code>, <code>widgets</code>, <code>features</code>, <code>entities</code> и <code>shared</code>. Zustand хранит UI и domain state, а ключевой материал намеренно остаётся вне сериализуемого store.</p><h3>Backend</h3><p>NestJS 11 предоставляет REST и Socket.IO API. PostgreSQL хранит tenant-scoped metadata, Redis — краткоживущие challenge/rate-limit/presence данные, MinIO — только encrypted objects.</p></section>

      <section className="how-section" id="docker"><h2>Backend и база данных через Docker?</h2><div className="docker-answer"><Icon name="check" /><span><strong>Да. Полный локальный контур запускается Docker Compose.</strong><small>Контейнеры: API, PostgreSQL 17, Redis 8, MinIO и minio-init. OnlyOffice включается отдельным profile, потому что является trusted processing mode.</small></span></div><pre className="code-block">{`# 1. Установить зависимости и собрать monorepo
npm install
npm run build

# 2. Проверить .env и заменить все change-me
# 3. Поднять API, БД, Redis и object storage
npm run infra:up

# Frontend для разработки с HMR
npm run dev:web

# Readiness backend
http://127.0.0.1:3001/api/v1/health/ready

# Production preview frontend
npm start`}</pre><p>Для OnlyOffice используйте <code>docker-compose --profile trusted-editor ...</code> и размещайте его внутри периметра заказчика. Серверный Office-редактор видит plaintext во время редактирования, поэтому он не относится к zero-knowledge зоне провайдера.</p></section>

      <section className="how-section" id="workflows"><h2>Как работают ключевые сценарии</h2><h3>Сообщение</h3><ol><li>Клиент получает room key envelope для доверенного устройства.</li><li>Текст шифруется XChaCha20-Poly1305 с AAD, содержащим tenant/room/message context.</li><li>Socket.IO gateway проверяет JWT и членство комнаты, сохраняет ciphertext и делает fan-out.</li><li>Получатель проверяет AEAD и расшифровывает данные локально.</li></ol><h3>Документ</h3><ol><li>Для файла создаётся случайный DEK.</li><li>Файл делится на chunks, каждый получает уникальный nonce и AEAD envelope.</li><li>MinIO получает только encrypted chunks; PostgreSQL — version metadata и wrapped DEK.</li><li>Viewer скачивает ciphertext, расшифровывает в памяти и создаёт локальный preview.</li></ol><h3>Recovery 2-из-3</h3><ol><li>Секрет разбивается на три Shamir shares.</li><li>Каждая share принадлежит отдельному holder device.</li><li>Backend собирает подписанные approvals и encrypted envelopes, не раскрывая shares.</li><li>Две shares объединяются только на recovery workstation; временный буфер очищается.</li></ol></section>

      <section className="how-section" id="architecture"><h2>Компонентная архитектура frontend</h2><p>Страница не является одним монолитным компонентом. Каркас приложения находится в widgets, пользовательские действия — в features, предметные строки/карточки — в entities, отдельные экраны — в pages, а переиспользуемые UI и утилиты — в shared.</p><pre className="code-block">{`src/
├─ app/          # композиция приложения и Zustand store
├─ pages/        # 9 самостоятельных страниц
├─ widgets/      # sidebar, topbar, app shell
├─ features/     # vault, documents, server view
├─ entities/     # message, document, employee, service
└─ shared/       # UI-kit, config, router, helpers, demo data`}</pre><p>Такой разрез уменьшает связность: новый экран собирается из готовых объектов, а security-sensitive операции сосредоточены в одном слое состояния.</p></section>

      <section className="how-section" id="limits"><h2>Что важно понимать</h2><ul><li>Веб-приложение не может физически запретить фото экрана или OS-level capture. Watermark и print-block — deterrence, а не абсолютная DLP.</li><li>Реальный HSM, корпоративный IdP, AAGUID policy и MDM зависят от инфраструктуры конкретного заказчика.</li><li>Публичная фраза и demo account предназначены только для стенда.</li><li>До обработки государственных тайн нужны независимый crypto audit, pentest, migration-only RLS, HA/DR и WORM-якорение audit.</li></ul><div className="security-note"><Icon name="warning" /><span>Не загружайте реальные конфиденциальные данные в публичную демонстрационную конфигурацию. Развёртывание заказчика должно отключить DEMO_SEED и выполнить собственный key provisioning.</span></div></section>
    </div><aside className="how-toc"><strong>На этой странице</strong>{toc.map(([id, label]) => <button key={id} onClick={() => scrollTo(id)}>{label}</button>)}</aside></div>
  </div>;
}
