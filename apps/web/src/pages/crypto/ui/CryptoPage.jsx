import { Icon } from "../../../shared/ui/Icon.jsx";
import { LockedGate } from "../../../shared/ui/LockedGate.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

const holders = [
  ["holder-1", "ЕТ", "Ерлан Тлеубаев", "Генеральный директор"],
  ["holder-2", "ТИ", "Тимур Исмагулов", "Руководитель ИБ"],
  ["holder-3", "СА", "Сауле Ахметова", "Главный юрист"]
];

export function CryptoPage({ unlocked, onUnlock, approvals, onApprove, onRecover }) {
  if (!unlocked) return <div className="view"><PageHeading eyebrow="КРИПТОГРАФИЧЕСКИЙ КОНТУР" title="Ключи принадлежат организации" description="Ключевая иерархия появляется только после локальной разблокировки." /><LockedGate feature="Ключи" onUnlock={onUnlock} /></div>;
  return <div className="view">
    <PageHeading eyebrow="КРИПТОГРАФИЧЕСКИЙ КОНТУР" title="Ключи принадлежат организации" description="Провайдер управляет инфраструктурой, но не получает plaintext." />
    <section className="crypto-layout">
      <article className="key-map"><h2>Иерархия ключей</h2><p>Каждый объект имеет отдельный DEK и контекст AEAD.</p><div className="key-node root"><span className="key-node-icon"><Icon name="key" /></span><span><strong>Organization Root Key</strong><small>Только RAM доверенного клиента</small></span><span className="key-state">вне сервера</span></div><div className="key-branch">{[["shield", "Organization KEK", "epoch 4"], ["message", "Room keys", "Socket.IO ciphertext"], ["file", "Document DEK", "per version"], ["fingerprint", "Device envelopes", "X25519"]].map(([icon, title, note]) => <div className="key-node" key={title}><span className="key-node-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{note}</small></span><span className="key-state">active</span></div>)}</div></article>
      <article className="recovery-card"><h2>Восстановление 2 из 3</h2><p>Выберите двух независимых держателей.</p><div className="holder-list">{holders.map(([id, initials, name, role]) => { const approved = approvals.includes(id); return <div className={`holder ${approved ? "approved" : ""}`} key={id}><span className="avatar">{initials}</span><span><strong>{name}</strong><small>{role}</small></span><button className={`button small ${approved ? "primary" : ""}`} disabled={approvals.length >= 2 && !approved} onClick={() => onApprove(id)}>{approved ? "Share получен" : "Запросить"}</button></div>; })}</div><div className={`approval-box ${approvals.length >= 2 ? "ready" : ""}`}><strong>{approvals.length >= 2 ? "Кворум достигнут" : `Подтверждений: ${approvals.length} из 2`}</strong>{approvals.length >= 2 && <button className="button small primary" onClick={onRecover}>Проверить восстановление</button>}</div><div className="security-note"><Icon name="info" /><span>Реальное Shamir Secret Sharing; backend координирует ceremony, но получает только encrypted share envelopes.</span></div></article>
    </section>
  </div>;
}
