import { ServiceCard } from "../../../entities/service/ui/ServiceCard.jsx";
import { API_ORIGIN } from "../../../shared/config/constants.js";
import { infrastructureServices } from "../../../shared/model/demo-data.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

export function InfrastructurePage({ status, session, realtimeState, onCheck, onLogin, onPasskey, onRotate, onLogout, navigate }) {
  return <div className="view">
    <PageHeading eyebrow="PILOT FOUNDATION" title="Инфраструктурный контур" description="Backend и БД действительно запускаются через Docker Compose."><button className="button" onClick={() => navigate("how-to")}><Icon name="help" /> Инструкция</button><button className="button primary" onClick={onCheck}><Icon name="activity" /> Проверить backend</button></PageHeading>
    <div className={`runtime-banner ${status === "ready" ? "ready" : status === "down" ? "down" : "idle"}`}><span className="runtime-dot" /><div><strong>{status === "ready" ? "Контур запущен" : status === "down" ? "Backend недоступен" : status === "checking" ? "Проверяем контур…" : "Ожидает проверки"}</strong><small>{API_ORIGIN}/api/v1/health/ready · realtime: {realtimeState}</small></div></div>
    <div className="toolbar">{!session ? <><button className="button primary" onClick={onLogin} disabled={status !== "ready"}>Demo login</button><button className="button" onClick={onPasskey} disabled={status !== "ready"}><Icon name="fingerprint" /> Passkey login</button></> : <><button className="button" onClick={onRotate}><Icon name="rotate" /> Ротировать token</button><button className="button" onClick={onLogout}>Выйти</button></>}</div>
    <section className="infra-grid">{infrastructureServices.map((service) => <ServiceCard service={service} key={service[0]} />)}</section>
  </div>;
}
