import { ServiceCard } from "../../../entities/service/ui/ServiceCard.jsx";
import { API_ORIGIN, DEMO_ACCOUNT, DEMO_DEVICE, REALTIME_LABELS } from "../../../shared/config/constants.js";
import { infrastructureServices } from "../../../shared/model/demo-data.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

const STATUS_COPY = {
  ready: ["ready", "Контур запущен"],
  down: ["down", "Backend недоступен"],
  checking: ["idle", "Проверяем контур…"],
  unknown: ["idle", "Ожидает проверки"]
};

export function InfrastructurePage({ status, session, unlocked, realtimeState, onCheck, onLogin, onPasskey, onRotate, onLogout, navigate }) {
  const [tone, title] = STATUS_COPY[status] || STATUS_COPY.unknown;
  const [realtimeLabel, realtimeTone] = REALTIME_LABELS[realtimeState] || REALTIME_LABELS.offline;
  return <div className="view">
    <PageHeading eyebrow="Pilot foundation" title="Инфраструктурный контур" description="Backend и БД действительно запускаются через Docker Compose.">
      <button className="button" onClick={() => navigate("how-to")}><Icon name="help" /> Инструкция</button>
      <button className="button primary" onClick={onCheck} disabled={status === "checking"}><Icon name="activity" /> Проверить backend</button>
    </PageHeading>
    <div className={`runtime-banner ${tone}`}>
      <span className="runtime-dot" />
      <div><strong>{title}</strong><small>{API_ORIGIN}/api/v1/health/ready</small></div>
      <span className={`status-pill ${realtimeTone}`}><i className="pill-dot" />Realtime: {realtimeLabel}</span>
    </div>
    <section className="session-card">
      <div className="session-copy">
        <strong>{session ? "Сессия открыта" : "Сессия не открыта"}</strong>
        <small>{session ? `${DEMO_ACCOUNT.email} · устройство ${DEMO_DEVICE.id} · access token 5 мин, refresh с ротацией` : unlocked ? "После разблокировки клиент подключается автоматически, если backend запущен." : "Разблокируйте контур — клиент сам откроет сессию и включит синхронизацию."}</small>
      </div>
      <div className="session-actions">
        {!session ? <>
          <button className="button primary" onClick={onLogin} disabled={status !== "ready"}>Demo login</button>
          <button className="button" onClick={onPasskey} disabled={status !== "ready"}><Icon name="fingerprint" /> Passkey login</button>
        </> : <>
          <button className="button" onClick={onRotate}><Icon name="rotate" /> Ротировать token</button>
          <button className="button danger" onClick={onLogout}>Выйти</button>
        </>}
      </div>
    </section>
    <section className="infra-grid">
      {infrastructureServices.map((service) => <ServiceCard service={service} key={service[0]} />)}
    </section>
  </div>;
}
