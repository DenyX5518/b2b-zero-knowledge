import { DEMO_ACCOUNT, REALTIME_LABELS, VIEW_TITLES } from "../../../shared/config/constants.js";
import { Icon } from "../../../shared/ui/Icon.jsx";

export function Topbar({ route, unlocked, realtimeState, onVault, onMenu, onHelp, onSync }) {
  const [syncLabel, syncTone] = REALTIME_LABELS[realtimeState] || REALTIME_LABELS.offline;
  return <header className="topbar">
    <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Открыть меню"><Icon name="menu" /></button>
    <div className="topbar-context"><span className="eyebrow">Рабочая область</span><strong>{VIEW_TITLES[route]}</strong></div>
    <button className="command-search" onClick={onHelp}><Icon name="search" /><span>Поиск и справка по продукту</span><kbd>Ctrl K</kbd></button>
    <div className="topbar-actions">
      {unlocked && <button className={`sync-pill ${syncTone}`} onClick={onSync} title="Состояние синхронизации с backend"><Icon name="sync" /><span>{syncLabel}</span></button>}
      <button className={`privacy-pill ${unlocked ? "unlocked" : ""}`} onClick={onVault}><i /><span>{unlocked ? "Контур защищён" : "Контур заблокирован"}</span><Icon name={unlocked ? "shield" : "lock"} /></button>
      <span className="top-avatar" title={DEMO_ACCOUNT.name}>{DEMO_ACCOUNT.initials}</span>
    </div>
  </header>;
}
