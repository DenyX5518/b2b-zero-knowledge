import { VIEW_TITLES } from "../../../shared/config/constants.js";
import { Icon } from "../../../shared/ui/Icon.jsx";

export function Topbar({ route, unlocked, onVault, onMenu, onHelp }) {
  return <header className="topbar">
    <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Открыть меню"><Icon name="menu" /></button>
    <div className="topbar-context"><span className="eyebrow">РАБОЧАЯ ОБЛАСТЬ</span><strong>{VIEW_TITLES[route]}</strong></div>
    <button className="command-search" onClick={onHelp}><Icon name="search" /><span>Поиск и справка по продукту</span><kbd>⌘ K</kbd></button>
    <div className="topbar-actions">
      <button className={`privacy-pill ${unlocked ? "unlocked" : ""}`} onClick={onVault}><i /><span>{unlocked ? "Контур защищён" : "Контур заблокирован"}</span><Icon name={unlocked ? "shield" : "lock"} /></button>
      <button className="icon-button" aria-label="Уведомления"><Icon name="bell" /><i className="notification-dot" /></button>
      <span className="top-avatar">АД</span>
    </div>
  </header>;
}
