import { DocumentRow } from "../../../entities/document/ui/DocumentRow.jsx";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { LockedGate } from "../../../shared/ui/LockedGate.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

export function DocumentsPage({ unlocked, onUnlock, documents, onOpen, onNew }) {
  if (!unlocked) return <div className="view"><PageHeading eyebrow="ДОКУМЕНТООБОРОТ" title="Документы" description="Внутренний viewer без передачи plaintext провайдеру." /><LockedGate feature="Документы" onUnlock={onUnlock} /></div>;
  return <div className="view">
    <PageHeading eyebrow="ДОКУМЕНТООБОРОТ" title="Документы" description="Версии и файлы шифруются отдельно; скачивание и печать управляются политиками."><button className="button primary" onClick={onNew}><Icon name="plus" /> Новый документ</button></PageHeading>
    <div className="toolbar"><label className="toolbar-search"><Icon name="search" /><input type="search" placeholder="Поиск по названию" /></label><span className="toolbar-spacer" /><span className="status-pill green"><Icon name="shield" /> E2EE включено</span></div>
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Документ</th><th>Статус</th><th>Классификация</th><th>Владелец</th><th>Изменён</th></tr></thead><tbody>{documents.map((document) => <DocumentRow document={document} onOpen={onOpen} key={document.id} />)}</tbody></table></div>
  </div>;
}
