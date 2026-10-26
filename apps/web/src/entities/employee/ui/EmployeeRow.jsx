export function EmployeeRow({ employee }) {
  const [initials, name, email, department, role, devices, state] = employee;
  return <tr>
    <td><div className="employee-name"><span className="avatar">{initials}</span><span><strong>{name}</strong><small>{email}</small></span></div></td>
    <td>{department}</td>
    <td><span className="role-pill">{role}</span></td>
    <td><span className="device-state"><i className={state === "warn" ? "warn" : ""} />{devices}</span></td>
    <td><span className={`status-pill ${state === "warn" ? "amber" : "green"}`}>{state === "warn" ? "Проверка" : "Активен"}</span></td>
  </tr>;
}
