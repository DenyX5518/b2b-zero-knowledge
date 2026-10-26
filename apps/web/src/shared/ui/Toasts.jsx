import { Icon } from "./Icon.jsx";

export function Toasts({ items }) {
  return <div className="toast-region">{items.map((item) => <div className="toast" key={item.id}><Icon name="check" /><span><strong>{item.title}</strong><small>{item.description}</small></span></div>)}</div>;
}
