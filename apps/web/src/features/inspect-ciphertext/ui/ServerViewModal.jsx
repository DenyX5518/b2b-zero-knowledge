import { STORAGE_PREFIX } from "../../../shared/config/constants.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { Modal, ModalHeader } from "../../../shared/ui/Modal.jsx";

export function ServerViewModal({ onClose }) {
  const envelope = localStorage.getItem(`${STORAGE_PREFIX}:messages`);
  let visible = "Ciphertext ещё не создан. Разблокируйте контур, чтобы сформировать envelope.";
  if (envelope) {
    const parsed = JSON.parse(envelope);
    visible = JSON.stringify({ ...parsed, ciphertext: `${parsed.ciphertext.slice(0, 300)}…` }, null, 2);
  }
  return <Modal onClose={onClose}>
    <ModalHeader title="Что видит инфраструктура" description="Envelope из browser storage — без ключа и plaintext." onClose={onClose} />
    <div className="modal-body">
      <pre className="cipher-view">{visible}</pre>
      <div className="server-facts"><div className="server-fact"><small>Payload</small><strong>Ciphertext</strong></div><div className="server-fact"><small>Vault</small><strong>AES-256-GCM</strong></div><div className="server-fact"><small>Files/chat</small><strong>XChaCha20</strong></div></div>
    </div>
  </Modal>;
}
