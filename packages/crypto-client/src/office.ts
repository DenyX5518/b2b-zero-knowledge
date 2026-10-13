import { renderAsync } from "docx-preview";
import readXlsxFile from "read-excel-file";

export type OfficePreview =
  | { kind: "pdf"; objectUrl: string }
  | { kind: "docx"; html: string; warnings: string[] }
  | { kind: "xlsx"; rows: Array<Array<string | number | boolean | Date | null>> }
  | { kind: "unsupported"; reason: string };

export async function createOfficePreview(file: File): Promise<OfficePreview> {
  const lower = file.name.toLocaleLowerCase();
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    return { kind: "pdf", objectUrl: URL.createObjectURL(file) };
  }
  if (lower.endsWith(".docx")) {
    if (typeof document === "undefined") return { kind: "unsupported", reason: "DOCX preview requires a browser DOM" };
    const container = document.createElement("div");
    await renderAsync(file, container, undefined, { inWrapper: false, ignoreWidth: true, ignoreHeight: true, useBase64URL: true });
    return { kind: "docx", html: container.innerHTML, warnings: [] };
  }
  if (lower.endsWith(".xlsx")) {
    const rows = await readXlsxFile(file);
    return { kind: "xlsx", rows: rows as Array<Array<string | number | boolean | Date | null>> };
  }
  return { kind: "unsupported", reason: "Поддерживаются DOCX, XLSX и PDF" };
}
