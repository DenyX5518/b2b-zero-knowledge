import { useEffect, useState } from "react";
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

export function DocumentViewer({ document, onClose }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

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

  let body = <div className="modal-loading">Локальная расшифровка…</div>;
  if (error) body = <div className="empty-state result-denied">{error}</div>;
  if (preview?.kind === "text") body = <div className="editor-canvas"><div className="editor-page"><textarea readOnly value={document.content} /></div></div>;
  if (preview?.kind === "pdf") body = <div className="protected-viewer" data-watermark={`Алия Даулетова · ${new Date().toLocaleString("ru-RU")}`}><iframe className="pdf-frame" src={`${preview.objectUrl}#toolbar=0&navpanes=0`} title="PDF viewer" /></div>;
  if (preview?.kind === "docx") body = <div className="protected-viewer" data-watermark="Алия Даулетова · protected"><div className="office-docx" dangerouslySetInnerHTML={{ __html: sanitizeOfficeHtml(preview.html) }} /></div>;
  if (preview?.kind === "xlsx") body = <div className="protected-viewer" data-watermark="Алия Даулетова · protected"><div className="sheet-preview"><table><tbody>{preview.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{String(cell ?? "")}</td>)}</tr>)}</tbody></table></div></div>;

  return <Modal wide onClose={onClose}>
    <ModalHeader title={document.title} description={`Версия ${document.version} · download=false · print=false`} onClose={onClose} />
    <div className="modal-body"><div className="doc-editor-meta"><span className={`status-pill ${document.statusTone}`}>{document.status}</span><span className="status-pill green"><Icon name="shield" /> локальная расшифровка</span></div>{body}</div>
    <footer className="modal-actions"><button className="button" onClick={onClose}>Закрыть</button></footer>
  </Modal>;
}
