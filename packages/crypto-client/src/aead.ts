import sodium from "libsodium-wrappers-sumo";
import { fromBase64, toBase64, utf8 } from "./encoding.js";

export type CipherEnvelope = {
  version: 1;
  suite: "XCHACHA20-POLY1305-IETF";
  keyEpoch: number;
  nonce: string;
  aad: string;
  ciphertext: string;
};

export async function encryptXChaCha20(
  plaintext: Uint8Array,
  key: Uint8Array,
  context: Record<string, string | number>,
  keyEpoch = 1
): Promise<CipherEnvelope> {
  await sodium.ready;
  if (key.byteLength !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) throw new Error("XChaCha20 key must contain 32 bytes");
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const aad = utf8(JSON.stringify({ ...context, keyEpoch, suite: "XCHACHA20-POLY1305-IETF" }));
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, aad, null, nonce, key);
  return { version: 1, suite: "XCHACHA20-POLY1305-IETF", keyEpoch, nonce: toBase64(nonce), aad: toBase64(aad), ciphertext: toBase64(ciphertext) };
}

export async function decryptXChaCha20(envelope: CipherEnvelope, key: Uint8Array): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, fromBase64(envelope.ciphertext), fromBase64(envelope.aad), fromBase64(envelope.nonce), key);
}

export async function generateContentKey(): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
}
