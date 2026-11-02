import { DEMO_ACCOUNT, ORG_NAME } from "../../../shared/config/constants.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

const metrics = [
  ["Активные сотрудники", "248", "users", "+6 за месяц"],
  ["Защищённые комнаты", "32", "message", "Socket.IO + E2EE"],
  ["Документы в работе", "17", "file", "DOCX / XLSX / PDF"],
  ["События безопасности", "0", "activity", "Критичных нет"]
];

const capabilities = [
  ["shield", "Argon2id + Shamir 2-из-3", "Ключи только на клиенте"],
  ["message", "Realtime ciphertext", "NestJS Socket.IO gateway · веб и iPhone"],
  ["file", "Encrypted Office viewer", "Chunked XChaCha20-Poly1305"],
  ["fingerprint", "Passkeys и SSO", "WebAuthn attestation + OIDC PKCE"]
];

const diagram = [
  ["cpu", "Ваше устройство", "plaintext только в памяти"],
  ["shield", "XChaCha20 / AES-GCM", "шифрование локально"],
  ["database", "Инфраструктура", "хранит только ciphertext"]
];

export function OverviewPage({ unlocked, onUnlock, onServerView, navigate }) {
  return <div className="view">
    <PageHeading eyebrow={`${ORG_NAME} Group`} title={`Добрый день, ${DEMO_ACCOUNT.greetingName}`} description="Единая защищённая среда для коммуникаций, документов и контролируемого доступа." />
    <section className="hero-security">
      <div className="hero-copy">
        <div className="eyebrow-label">Zero-knowledge контур</div>
        <h2>Ваши данные читают только те, кому вы доверяете.</h2>
        <p>Сообщения и документы шифруются на устройстве. Инфраструктура хранит ciphertext и не владеет корпоративными ключами.</p>
        <div className="hero-actions">
          <button className="button primary" onClick={unlocked ? onServerView : onUnlock}><Icon name={unlocked ? "eye" : "unlock"} /> {unlocked ? "Что видит сервер" : "Открыть демо-контур"}</button>
          {unlocked && <button className="button ghost" onClick={() => navigate("chats")}><Icon name="message" /> Перейти к сообщениям</button>}
          <span className={`hero-status ${unlocked ? "on" : ""}`}><i />{unlocked ? "Локальный ключ активен" : "Требуется разблокировка"}</span>
        </div>
      </div>
      <div className="security-diagram">
        {diagram.map(([icon, title, note], index) => <div className={`diagram-node ${index === 1 ? "active" : ""}`} key={title}>
          <span className="diagram-icon"><Icon name={icon} /></span>
          <span><strong>{title}</strong><small>{note}</small></span>
        </div>)}
      </div>
    </section>
    <section className="metric-grid">{metrics.map(([label, value, icon, note]) => <article className="metric-card" key={label}><div className="metric-card-top"><span>{label}</span><span className="metric-icon"><Icon name={icon} /></span></div><strong>{value}</strong><small className="good">{note}</small></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel"><div className="panel-head"><div><h2>Что уже работает</h2><p>Исполняемые security flows</p></div><span className="react-badge">React 19 + Vite 8</span></div><div className="panel-body activity-list">{capabilities.map(([icon, title, detail]) => <div className="activity-item" key={title}><span className="activity-icon"><Icon name={icon} /></span><span className="activity-copy"><strong>{title}</strong><small>{detail}</small></span><span className="result-ok">готово</span></div>)}</div></article>
      <article className="panel"><div className="panel-head"><div><h2>Принцип изоляции</h2><p>Отдельная криптографическая ячейка</p></div></div><div className="panel-body"><div className="isolation-stack"><div><span>Компания A</span><strong>ORK-A / KEK-A</strong></div><div><span>Компания B</span><strong>ORK-B / KEK-B</strong></div><div><span>Провайдер</span><strong>нет content keys</strong></div></div><button className="text-button" onClick={onServerView}>Посмотреть серверный envelope →</button></div></article>
    </section>
  </div>;
}
