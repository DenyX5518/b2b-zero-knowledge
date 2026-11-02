import { Icon } from "../../../shared/ui/Icon.jsx";

export function MessageBubble({ message }) {
  return <article className={`message ${message.self ? "self" : ""}`}>
    <span className="avatar">{message.initials}</span>
    <div className="message-body">
      <div className="message-author"><strong>{message.self ? "Вы" : message.author}</strong><time>{message.time}</time></div>
      <div className="bubble">{message.text}</div>
      <div className="encrypted-mark">
        <Icon name="lock" /> зашифровано на устройстве
        {message.self && (message.pending
          ? <span className="delivery pending"><Icon name="clock" /> в очереди</span>
          : <span className="delivery"><Icon name="checks" /> доставлено</span>)}
      </div>
    </div>
  </article>;
}
