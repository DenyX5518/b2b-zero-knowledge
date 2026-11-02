import { useState } from "react";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

const permissions = ["Просмотр документов", "Редактирование", "Передача", "Скачивание", "Печать", "Подписание", "Создание комнат", "Управление участниками", "Операции с ключами"];

const roles = {
  "Администратор": [true, true, true, true, false, true, true, true, true],
  "Руководитель": [true, true, true, false, false, true, true, true, false],
  "Офицер ИБ": [true, false, false, false, false, false, true, true, true],
  "Юрист": [true, true, true, false, false, true, false, false, false],
  "Сотрудник": [true, true, false, false, false, false, false, false, false]
};

export function AccessPage({ onSave }) {
  const [activeRole, setActiveRole] = useState("Руководитель");
  const [matrix, setMatrix] = useState(roles);
  const switches = matrix[activeRole];
  const toggle = (index) => setMatrix((current) => ({ ...current, [activeRole]: current[activeRole].map((entry, position) => position === index ? !entry : entry) }));

  return <div className="view">
    <PageHeading eyebrow="Политики доступа" title="Роли и права" description="Backend повторно проверяет каждое действие; UI объясняет принятое решение." />
    <section className="access-grid">
      <aside className="role-list-panel">
        <div className="role-list-head"><strong>Роли организации</strong></div>
        {Object.keys(roles).map((role) => <button className={`role-button ${role === activeRole ? "active" : ""}`} key={role} onClick={() => setActiveRole(role)}><span><strong>{role}</strong><small>{matrix[role].filter(Boolean).length} из {permissions.length} разрешений</small></span><b>›</b></button>)}
      </aside>
      <div className="permission-panel">
        <header className="permission-head"><div><h2>{activeRole}</h2><p>Изменения требуют step-up MFA и записываются в audit log.</p></div><button className="button small primary" onClick={() => onSave(activeRole)}>Сохранить</button></header>
        <section className="permission-group">
          <div className="permission-group-title">Разрешения</div>
          {permissions.map((item, index) => <div className="permission-row" key={item}><span><strong>{item}</strong><small>Проверяется серверной policy layer</small></span><span className="source-pill">Наследуется от роли</span><button className={`switch ${switches[index] ? "on" : ""}`} onClick={() => toggle(index)} aria-pressed={switches[index]} aria-label={item} /></div>)}
        </section>
      </div>
    </section>
  </div>;
}
