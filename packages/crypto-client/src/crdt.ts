import * as Y from "yjs";
import { decryptXChaCha20, encryptXChaCha20, type CipherEnvelope } from "./aead.js";

export async function encodeEncryptedYjsUpdate(document: Y.Doc, key: Uint8Array, documentId: string, keyEpoch: number): Promise<CipherEnvelope> {
  const update = Y.encodeStateAsUpdate(document);
  return encryptXChaCha20(update, key, { domain: "document-crdt", documentId }, keyEpoch);
}

export async function applyEncryptedYjsUpdate(document: Y.Doc, envelope: CipherEnvelope, key: Uint8Array, origin = "remote-encrypted-update"): Promise<void> {
  const update = await decryptXChaCha20(envelope, key);
  Y.applyUpdate(document, update, origin);
}
