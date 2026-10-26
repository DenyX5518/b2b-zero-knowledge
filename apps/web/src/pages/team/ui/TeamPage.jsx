import { EmployeeRow } from "../../../entities/employee/ui/EmployeeRow.jsx";
import { employees } from "../../../shared/model/demo-data.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

export function TeamPage({ onDevices }) {
  return <div className="view">
    <PageHeading eyebrow="ОРГАНИЗАЦИЯ" title="Сотрудники" description="Учётные записи связаны с конкретными сотрудниками и доверенными устройствами."><button className="button" onClick={onDevices}><Icon name="fingerprint" /> Устройства</button><button className="button primary"><Icon name="plus" /> Добавить сотрудника</button></PageHeading>
    <div className="summary-strip"><article className="summary-card"><small>Всего сотрудников</small><strong>248</strong></article><article className="summary-card"><small>Активные сегодня</small><strong>192</strong></article><article className="summary-card"><small>Требуют внимания</small><strong>1</strong></article></div>
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Сотрудник</th><th>Подразделение</th><th>Роль</th><th>Устройства</th><th>Статус</th></tr></thead><tbody>{employees.map((employee) => <EmployeeRow employee={employee} key={employee[2]} />)}</tbody></table></div>
  </div>;
}
