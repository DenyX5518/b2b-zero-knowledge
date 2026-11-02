import { Icon } from "../../../shared/ui/Icon.jsx";

export function DocumentRow({ document, onOpen }) {
  return <tr className="clickable-row" onClick={() => onOpen(document)}>
    <td><div className="doc-name"><span className={`doc-icon ${document.type}`}><Icon name="file" /></span><span><strong>{document.title}</strong><small>Версия {document.version} · {document.fileManifest ? "файл только на этом устройстве" : document.syncedVersion === document.version ? "синхронизирован" : "ожидает синхронизации"}</small></span></div></td>
    <td><span className={`status-pill ${document.statusTone}`}>{document.status}</span></td>
    <td><span className="classification"><i className={document.classificationTone} />{document.classification}</span></td>
    <td>{document.owner}</td>
    <td>{document.updated}</td>
  </tr>;
}
