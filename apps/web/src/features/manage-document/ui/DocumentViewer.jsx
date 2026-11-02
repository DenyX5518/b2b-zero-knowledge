import { useEffect, useState } from "react";
import { DEMO_ACCOUNT, DOCUMENT_STATUSES } from "../../../shared/config/constants.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { Modal, ModalHeader } from "../../../shared/ui/Modal.jsx";

function sanitizeOfficeHtml(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((node) => node.remove());
  parsed.querySelectorAll("*").forEach((node) => [...node.attributes].forEach((attribute) => {
    if (attribute.name.startsWith("on") || attribute.name === "style" || ["src", "href"].includes(attribute.name)) node.removeAttribute(attribute.name);
  }));
  return parsed.body.innerHTML;
}

const draftOf = (document) => ({ title: document.title, content: document.content, status: document.status });

export function DocumentViewer({ document, onClose, onSave }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => draftOf(document));
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  // Файлы DOCX/XLSX/PDF в zero-knowledge режиме только просматриваются: их правка требует trusted OnlyOffice.
  const editable = !document.fileManifest && document.canEdit !== false;
  const dirty = draft.title.trim() !== document.title || draft.content.trim() !== document.content || draft.status !== document.status;
  const history = [...(document.history || [])].reverse();

  useEffect(() => {
    let active = true;
    let objectUrl;
    (async () => {
      if (!document.fileManifest) { setPreview({ kind: "text" }); return; }
      try {
        const { createOfficePreview, decryptFile, fromBase64 } = await import("@kontur/crypto-client");
        const decrypted = await decryptFile(document.fileManifest, fromBase64(document.fileKey));
        const file = new File([decrypted.blob], decrypted.name, { type: decrypted.blob.type });
        const result = await createOfficePreview(file);
        if (result.kind === "pdf") objectUrl = result.objectUrl;
        if (active) setPreview(result);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Ошибка расшифровки");
      }
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [document]);

  const startEditing = () => { setDraft(draftOf(document)); setSaveError(""); setEditing(true); };
  const cancelEditing = () => { setDraft(draftOf(document)); setSaveError(""); setEditing(false); };
  const close = () => {
    if (editing && dirty && !window.confirm("Закрыть без сохранения? Изменения будут потеряны.")) return;
    onClose();
  };
  const save = async (changes = draft) => {
    setSaving(true);
    setSaveError("");
    try {
      await onSave(document.id, changes);
      setEditing(false);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Не удалось сохранить документ");
    } finally {
      setSaving(false);
    }
  };
  const restore = (version) => save({ title: version.title, content: version.content, status: version.status });

  // Глобальный Escape закрывает модалку; во время правки перехватываем его раньше, чтобы не потерять текст.
  useEffect(() => {
    if (!editing) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!dirty || window.confirm("Отменить несохранённые изменения?")) cancelEditing();
    };
    addEventListener("keydown", onKeyDown, true);
    return () => removeEventListener("keydown", onKeyDown, true);
  });

  let body = <div className="modal-loading">Локальная расшифровка…</div>;
  if (error) body = <div className="empty-state result-denied">{error}</div>;
  if (preview?.kind === "text") body = <div className={`editor-canvas ${editing ? "editing" : ""}`}><div className="editor-page">
    {editing ? <textarea autoFocus value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Текст документа…" /> : <textarea readOnly value={document.content} />}
  </div></div>;
  if (preview?.kind === "pdf") body = <div className="protected-viewer" data-watermark={`${DEMO_ACCOUNT.name} · ${new Date().toLocaleString("ru-RU")}`}><iframe className="pdf-frame" src={`${preview.objectUrl}#toolbar=0&navpanes=0`} title="PDF viewer" /></div>;
  if (preview?.kind === "docx") body = <div className="protected-viewer" data-watermark={`${DEMO_ACCOUNT.name} · protected`}><div className="office-docx" dangerouslySetInnerHTML={{ __html: sanitizeOfficeHtml(preview.html) }} /></div>;
  if (preview?.kind === "xlsx") body = <div className="protected-viewer" data-watermark={`${DEMO_ACCOUNT.name} · protected`}><div className="sheet-preview"><table><tbody>{preview.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{String(cell ?? "")}</td>)}</tr>)}</tbody></table></div></div>;

  return <Modal wide onClose={close}>
    <ModalHeader title={editing ? "Редактирование документа" : document.title} description={`Версия ${document.version} · ${editing ? "сохранение создаст новую зашифрованную версию" : "download=false · print=false"}`} onClose={close} />
    <div className="modal-body">
      {editing ? <div className="doc-edit-fields">
        <div className="field"><label>Название</label><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={160} /></div>
        <div className="field"><label>Статус</label><div className="segmented">{DOCUMENT_STATUSES.map(([status]) => <button type="button" key={status} className={draft.status === status ? "active" : ""} onClick={() => setDraft({ ...draft, status })}>{status}</button>)}</div></div>
      </div> : <div className="doc-editor-meta">
        <span className={`status-pill ${document.statusTone}`}>{document.status}</span>
        <span className="status-pill green"><Icon name="shield" /> локальная расшифровка</span>
        {document.editor && <span className="status-pill gray"><Icon name="edit" /> изменил {document.editor}, {document.updated}</span>}
      </div>}
      {body}
      {!editing && !editable && preview && <div className="doc-readonly-note"><Icon name="info" /><span>{document.fileManifest ? "Файлы DOCX, XLSX и PDF в zero-knowledge режиме только просматриваются: для правки нужен trusted OnlyOffice внутри периметра заказчика." : "Документ утверждён и закрыт для изменений политикой организации."}</span></div>}
      {saveError && <div className="result-denied modal-error">{saveError}</div>}
      {!editing && history.length > 0 && <section className="version-history">
        <h3>История версий</h3>
        <div className="version-row current"><b>v{document.version}</b><span><strong>{document.title}</strong><small>{document.status} · {document.updated} · {document.editor || document.owner}</small></span><span className="status-pill green">текущая</span></div>
        {history.map((version) => <div className="version-row" key={version.version}><b>v{version.version}</b><span><strong>{version.title}</strong><small>{version.status} · {version.updated} · {version.author}</small></span>{editable && <button className="button small" disabled={saving} onClick={() => restore(version)}>Восстановить</button>}</div>)}
      </section>}
    </div>
    <footer className="modal-actions">
      {editing ? <>
        <button className="button" onClick={cancelEditing} disabled={saving}>Отмена</button>
        <button className="button primary" onClick={() => save()} disabled={saving || !dirty || !draft.content.trim()}><Icon name="lock" /> {saving ? "Шифрование…" : `Сохранить как v${document.version + 1}`}</button>
      </> : <>
        {editable && preview?.kind === "text" && <button className="button" onClick={startEditing}><Icon name="edit" /> Редактировать</button>}
        <button className="button" onClick={close}>Закрыть</button>
      </>}
    </footer>
  </Modal>;
}
