import { useState } from "react";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

const permissions = ["Просмотр документов", "Редактирование", "Передача", "Скачивание", "Печать", "Подписание", "Создание комнат", "Управление участниками", "Операции с ключами"];

export function AccessPage() {
  const [switches, setSwitches] = useState([true, true, true, false, false, true, true, true, false]);
  return <div className="view">
    <PageHeading eyebrow="ПОЛИТИКИ ДОСТУПА" title="Роли и права" description="Backend повторно проверяет каждое действие; UI объясняет принятое решение." />
    <section className="access-grid">
      <aside className="role-list-panel"><div className="role-list-head"><strong>Роли организации</strong></div>{["Администратор", "Руководитель", "Офицер ИБ", "Юрист", "Сотрудник"].map((role, index) => <button className={`role-button ${index === 1 ? "active" : ""}`} key={role}><span><strong>{role}</strong><small>политика организации</small></span><b>›</b></button>)}</aside>
      <div className="permission-panel"><header className="permission-head"><div><h2>Руководитель</h2><p>Изменения требуют step-up MFA и записываются в audit log.</p></div><button className="button small">Сохранить</button></header><section className="permission-group"><div className="permission-group-title">Разрешения</div>{permissions.map((item, index) => <div className="permission-row" key={item}><span><strong>{item}</strong><small>Проверяется серверной policy layer</small></span><span className="source-pill">Наследуется от роли</span><button className={`switch ${switches[index] ? "on" : ""}`} onClick={() => setSwitches((value) => value.map((entry, position) => position === index ? !entry : entry))} aria-pressed={switches[index]} /></div>)}</section></div>
    </section>
  </div>;
}
