import { Icon } from "../../../shared/ui/Icon.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

export function AuditPage({ audit, onVerify }) {
  return <div className="view">
    <PageHeading eyebrow="КОНТРОЛЬ И РАССЛЕДОВАНИЯ" title="Журнал аудита" description="Append-only события без plaintext сообщений и документов."><button className="button primary" onClick={onVerify}><Icon name="check" /> Проверить цепочку</button></PageHeading>
    <div className="audit-integrity"><Icon name="shield" /><div><strong>Hash chain + HSM/service signatures</strong><small>{audit.length} событий · plaintext не логируется</small></div><code className="audit-code">{audit.at(-1)?.hash || "GENESIS"}</code></div>
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Событие</th><th>Субъект</th><th>Результат</th><th>Время</th><th>Hash</th></tr></thead><tbody>{[...audit].reverse().map((event) => <tr key={event.id}><td><div className="audit-event"><span className="audit-event-icon"><Icon name="activity" /></span><span><strong>{event.action}</strong><small>{event.target}</small></span></div></td><td>{event.actor}</td><td><span className={event.result === "Отклонено" ? "result-denied" : "result-ok"}>{event.result}</span></td><td>{new Date(event.at).toLocaleString("ru-RU")}</td><td><code className="hash-text">{event.hash}</code></td></tr>)}</tbody></table></div>
  </div>;
}
