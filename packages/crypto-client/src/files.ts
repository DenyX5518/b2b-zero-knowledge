import { decryptXChaCha20, encryptXChaCha20, type CipherEnvelope } from "./aead.js";

export type EncryptedFileManifest = {
  version: 1;
  fileId: string;
  encryptedName: CipherEnvelope;
  mime: string;
  size: number;
  chunkSize: number;
  chunks: CipherEnvelope[];
};

export async function encryptFile(file: File, key: Uint8Array, fileId: string, keyEpoch = 1, chunkSize = 1024 * 1024): Promise<EncryptedFileManifest> {
  const chunks: CipherEnvelope[] = [];
  for (let offset = 0, index = 0; offset < file.size; offset += chunkSize, index += 1) {
    const bytes = new Uint8Array(await file.slice(offset, Math.min(offset + chunkSize, file.size)).arrayBuffer());
    chunks.push(await encryptXChaCha20(bytes, key, { domain: "file-chunk", fileId, chunk: index, size: file.size }, keyEpoch));
  }
  const encryptedName = await encryptXChaCha20(new TextEncoder().encode(file.name), key, { domain: "file-name", fileId }, keyEpoch);
  return { version: 1, fileId, encryptedName, mime: file.type || "application/octet-stream", size: file.size, chunkSize, chunks };
}

export async function decryptFile(manifest: EncryptedFileManifest, key: Uint8Array): Promise<{ name: string; blob: Blob }> {
  const name = new TextDecoder().decode(await decryptXChaCha20(manifest.encryptedName, key));
  const chunks: Uint8Array[] = [];
  for (const envelope of manifest.chunks) chunks.push(await decryptXChaCha20(envelope, key));
  return { name, blob: new Blob(chunks as BlobPart[], { type: manifest.mime }) };
}
