import { argon2id } from "hash-wasm";

export type Argon2idProfile = {
  memoryKiB: number;
  iterations: number;
  parallelism: number;
  hashLength: number;
};

export const INTERACTIVE_ARGON2ID: Argon2idProfile = {
  memoryKiB: 64 * 1024,
  iterations: 3,
  parallelism: 1,
  hashLength: 32
};

export async function deriveUnlockKey(
  passphrase: string,
  salt: Uint8Array,
  profile: Argon2idProfile = INTERACTIVE_ARGON2ID
): Promise<Uint8Array> {
  if (salt.byteLength < 16) throw new Error("Argon2id salt must contain at least 128 bits");
  if (passphrase.length < 8) throw new Error("Passphrase must contain at least 8 characters");
  const result = await argon2id({
    password: new TextEncoder().encode(passphrase.normalize("NFKC")),
    salt,
    parallelism: profile.parallelism,
    iterations: profile.iterations,
    memorySize: profile.memoryKiB,
    hashLength: profile.hashLength,
    outputType: "binary"
  });
  return new Uint8Array(result);
}
