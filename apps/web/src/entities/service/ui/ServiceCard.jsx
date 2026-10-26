import { Icon } from "../../../shared/ui/Icon.jsx";

export function ServiceCard({ service }) {
  const [name, mode, description] = service;
  const icon = name.includes("PostgreSQL") || name.includes("Redis") || name.includes("MinIO") ? "database" : name.includes("WebAuthn") ? "fingerprint" : name.includes("HSM") ? "key" : "cpu";
  return <article className="service-card">
    <div className="service-icon"><Icon name={icon} /></div>
    <div><small>{mode}</small><h2>{name}</h2><p>{description}</p></div>
    <span className="service-state">implemented</span>
  </article>;
}
