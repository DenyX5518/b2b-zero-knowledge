import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { argon2idAsync } from "@noble/hashes/argon2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import { combine, split } from "shamir-secret-sharing";
import { ORG_ID } from "../config/constants";
import { fromBase64, toBase64, utf8Decode, utf8Encode } from "./encoding";

const SUITE = "XCHACHA20-POLY1305-IETF";

export type CipherEnvelope = { version: 1; suite: typeof SUITE; keyEpoch: number; nonce: string; aad: string; ciphertext: string };

// Тот же профиль, что и в @kontur/crypto-client (64 MiB, 3 прохода): ключ совпадает с web-клиентом.
export async function deriveUnlockKey(passphrase: string, onProgress?: (value: number) => void): Promise<Uint8Array> {
  if (passphrase.length < 8) throw new Error("Кодовая фраза должна содержать минимум 8 символов.");
  const salt = sha256(utf8Encode(`kontur-argon2id-salt:${ORG_ID}`));
  return argon2idAsync(utf8Encode(passphrase.normalize("NFKC")), salt, { t: 3, m: 64 * 1024, p: 1, dkLen: 32, asyncTick: 24, onProgress });
}

// Формат совместим с libsodium crypto_aead_xchacha20poly1305_ietf_*: ciphertext || tag.
export function encryptXChaCha20(plaintext: Uint8Array, key: Uint8Array, context: Record<string, string | number>, keyEpoch = 1): CipherEnvelope {
  const nonce = randomBytes(24);
  const aad = utf8Encode(JSON.stringify({ ...context, keyEpoch, suite: SUITE }));
  const ciphertext = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
  return { version: 1, suite: SUITE, keyEpoch, nonce: toBase64(nonce), aad: toBase64(aad), ciphertext: toBase64(ciphertext) };
}

export function decryptXChaCha20(envelope: Pick<CipherEnvelope, "nonce" | "aad" | "ciphertext">, key: Uint8Array): Uint8Array {
  return xchacha20poly1305(key, fromBase64(envelope.nonce), fromBase64(envelope.aad)).decrypt(fromBase64(envelope.ciphertext));
}

export function generateContentKey(): Uint8Array {
  return randomBytes(32);
}

export function sealJson(payload: unknown, key: Uint8Array, schema: string): CipherEnvelope {
  return encryptXChaCha20(utf8Encode(JSON.stringify(payload)), key, { tenant: ORG_ID, schema });
}

export function openJson<T>(envelope: CipherEnvelope, key: Uint8Array): T {
  return JSON.parse(utf8Decode(decryptXChaCha20(envelope, key))) as T;
}

export function sha256Hex(value: string): string {
  return bytesToHex(sha256(utf8Encode(value)));
}

export async function createRecoveryShares(secret: Uint8Array, total = 3, threshold = 2): Promise<Uint8Array[]> {
  return split(secret, total, threshold);
}

export async function recoverSecret(shares: Uint8Array[]): Promise<Uint8Array> {
  return combine(shares);
}
