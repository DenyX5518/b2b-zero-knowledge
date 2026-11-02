import { Icon } from "./Icon.jsx";

export function Toasts({ items }) {
  return <div className="toast-region" aria-live="polite">{items.map((item) => <div className={`toast ${item.tone || "success"}`} key={item.id}><Icon name={item.tone === "danger" ? "warning" : "check"} /><span><strong>{item.title}</strong><small>{item.description}</small></span></div>)}</div>;
}
