import { useState } from "react";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { Modal, ModalHeader } from "../../../shared/ui/Modal.jsx";

export function NewDocumentModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({ title, content, file });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать документ");
      setBusy(false);
    }
  };

  return <Modal wide onClose={onClose}>
    <ModalHeader title="Новый защищённый документ" description="Текст или файл шифруется до сохранения." onClose={onClose} />
    <form onSubmit={submit}>
      <div className="modal-body">
        <div className="field"><label>Название</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Можно оставить пустым для файла" /></div>
        <div className="field"><label>Текстовый документ</label><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Введите текст либо выберите файл…" /></div>
        <label className="file-drop"><Icon name="upload" /><span><strong>Добавить DOCX, XLSX или PDF</strong><small>Автономный стенд — до 700 КБ; API — до 100 МБ</small></span><input type="file" accept=".docx,.xlsx,.pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        {file && <div className="demo-hint">Выбран: <strong>{file.name}</strong></div>}
        {error && <div className="result-denied modal-error">{error}</div>}
      </div>
      <footer className="modal-actions"><button className="button" type="button" onClick={onClose}>Отмена</button><button className="button primary" disabled={busy}><Icon name="lock" /> {busy ? "Шифрование…" : "Создать"}</button></footer>
    </form>
  </Modal>;
}
