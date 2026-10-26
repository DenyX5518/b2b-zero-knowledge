import { useState } from "react";
import { DEMO_PASSPHRASE } from "../../../shared/config/constants.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { Modal } from "../../../shared/ui/Modal.jsx";

export function UnlockModal({ onClose, onUnlock }) {
  const [passphrase, setPassphrase] = useState(DEMO_PASSPHRASE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onUnlock(passphrase);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось вывести ключ");
      setBusy(false);
    }
  };

  return <Modal onClose={onClose}><div className="modal-body">
    <div className="unlock-visual"><Icon name="lock" /></div>
    <div className="unlock-copy"><div className="eyebrow-label">ЛОКАЛЬНЫЙ VAULT</div><h3>Разблокировать контур</h3><p>Ключ выводится Argon2id (64 MiB, 3 прохода) внутри браузера и остаётся в RAM вкладки.</p></div>
    <form onSubmit={submit}>
      <div className="field"><label>Кодовая фраза организации</label><input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoFocus /></div>
      <div className="demo-hint">Демо: <code>{DEMO_PASSPHRASE}</code></div>
      {error && <div className="result-denied modal-error">{error}</div>}
      <div className="unlock-warning"><Icon name="warning" /><span>Публичная фраза не подходит для реальных секретов.</span></div>
      <button className="button primary full-button" disabled={busy}>{busy ? "Argon2id выполняется…" : "Вывести ключ и открыть"}</button>
      <button className="button full-button secondary-action" type="button" onClick={onClose}>Отмена</button>
    </form>
  </div></Modal>;
}
