import { Icon } from "./Icon.jsx";

export function LockedGate({ feature, onUnlock }) {
  return <section className="lock-gate"><div className="lock-gate-inner"><div className="lock-illustration"><Icon name="lock" /></div><h2>{feature} зашифрованы</h2><p>Расшифровка выполняется на устройстве. Провайдер не получает ключ организации или plaintext.</p><button className="button primary" onClick={onUnlock}><Icon name="unlock" /> Разблокировать контур</button></div></section>;
}
