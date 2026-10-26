import { Icon } from "./Icon.jsx";

export function Modal({ children, wide = false, onClose }) {
  return <div className="modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">{children}</section></div>;
}

export function ModalHeader({ title, description, onClose }) {
  return <header className="modal-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="modal-close" onClick={onClose}><Icon name="close" /></button></header>;
}
