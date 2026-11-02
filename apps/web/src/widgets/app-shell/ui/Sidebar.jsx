import { DEMO_ACCOUNT, ORG_NAME } from "../../../shared/config/constants.js";
import { Icon } from "../../../shared/ui/Icon.jsx";

const mainNavigation = [
  ["overview", "grid", "Обзор"],
  ["chats", "message", "Сообщения"],
  ["documents", "file", "Документы"],
  ["team", "users", "Сотрудники"],
  ["access", "key", "Доступы"],
  ["audit", "activity", "Журнал аудита"]
];

const securityNavigation = [
  ["crypto", "shield", "Криптоконтур"],
  ["infrastructure", "cpu", "Инфраструктура"]
];

export function Sidebar({ route, navigate, mobileOpen, setMobileOpen, onServerView, unreadTotal, unlocked }) {
  const go = (view) => {
    navigate(view);
    setMobileOpen(false);
  };

  const navItem = ([view, icon, label]) => (
    <button key={view} className={`nav-item ${route === view ? "active" : ""}`} onClick={() => go(view)}>
      <Icon name={icon} />
      <span>{label}</span>
      {view === "chats" && unreadTotal > 0 ? <span className="nav-count">{unreadTotal}</span> : null}
      {view === "crypto" && <i className={`status-dot ${unlocked ? "" : "off"}`} />}
    </button>
  );

  return <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
    <button className="brand" onClick={() => go("overview")} aria-label="Контур — главная">
      <span className="brand-mark"><span /></span>
      <span className="brand-copy"><strong>Контур</strong><small>secure workspace</small></span>
    </button>
    <button className="org-switcher" onClick={() => go("team")}>
      <span className="org-monogram">AI</span>
      <span className="org-switcher-copy"><small>Организация</small><strong>{ORG_NAME}</strong></span>
      <span className="chevron">⌄</span>
    </button>
    <nav className="primary-nav" aria-label="Основная навигация">{mainNavigation.map(navItem)}</nav>
    <div className="sidebar-section-label">Безопасность</div>
    <nav className="primary-nav">
      {securityNavigation.map(navItem)}
      <button className="nav-item" onClick={() => { onServerView(); setMobileOpen(false); }}><Icon name="database" /><span>Взгляд сервера</span></button>
      <button className={`nav-item help-link ${route === "how-to" ? "active" : ""}`} onClick={() => go("how-to")}><Icon name="help" /><span>Как пользоваться</span></button>
    </nav>
    <div className="sidebar-foot">
      <div className="license-card"><span className="license-icon"><Icon name="badge" /></span><div><strong>Enterprise Pilot</strong><small>Лицензия активна до 31.12.2026</small></div></div>
      <button className="profile-card" onClick={() => go("team")}><span className="avatar avatar-accent">{DEMO_ACCOUNT.initials}</span><span><strong>{DEMO_ACCOUNT.name}</strong><small>{DEMO_ACCOUNT.role}</small></span><span className="more">•••</span></button>
    </div>
  </aside>;
}
