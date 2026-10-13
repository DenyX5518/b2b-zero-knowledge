import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { applyEncryptedYjsUpdate, createDeviceKeyPair, createRecoveryShares, decryptFile, deriveUnlockKey, encodeEncryptedYjsUpdate, encryptFile, generateContentKey, recoverSecret, unwrapKeyForDevice, wrapKeyForDevice } from "./index.js";

describe("client-side cryptographic boundaries", () => {
  it("restores a 256-bit organization secret with any two of three Shamir shares", async () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const shares = await createRecoveryShares(secret, 3, 2);
    expect(shares).toHaveLength(3);
    await expect(recoverSecret([shares[0], shares[2]])).resolves.toEqual(secret);
    await expect(recoverSecret([shares[0]])).rejects.toThrow(/requires 2 shares/);
  });

  it("wraps a content key for one device", async () => {
    const pair = await createDeviceKeyPair();
    const key = await generateContentKey();
    const wrapped = await wrapKeyForDevice(key, pair.publicKey);
    await expect(unwrapKeyForDevice(wrapped, pair)).resolves.toEqual(key);
  });

  it("derives a deterministic 256-bit unlock key with Argon2id", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const profile = { memoryKiB: 1024, iterations: 1, parallelism: 1, hashLength: 32 };
    const first = await deriveUnlockKey("correct horse battery staple", salt, profile);
    const second = await deriveUnlockKey("correct horse battery staple", salt, profile);
    expect(first).toEqual(second);
    expect(first).toHaveLength(32);
  });

  it("encrypts a file in authenticated chunks and restores its name and bytes", async () => {
    const key = await generateContentKey();
    const file = new File([new TextEncoder().encode("classified attachment")], "board-note.pdf", { type: "application/pdf" });
    const manifest = await encryptFile(file, key, "file-1", 2, 8);
    expect(manifest.chunks.length).toBeGreaterThan(1);
    expect(JSON.stringify(manifest)).not.toContain("classified attachment");
    const restored = await decryptFile(manifest, key);
    expect(restored.name).toBe("board-note.pdf");
    expect(await restored.blob.text()).toBe("classified attachment");
  });

  it("encrypts and applies a Yjs update without server-side plaintext", async () => {
    const source = new Y.Doc();
    source.getText("body").insert(0, "Секретный документ");
    const target = new Y.Doc();
    const key = await generateContentKey();
    const envelope = await encodeEncryptedYjsUpdate(source, key, "doc-1", 4);
    expect(envelope.ciphertext).not.toContain("Секретный");
    await applyEncryptedYjsUpdate(target, envelope, key);
    expect(target.getText("body").toString()).toBe("Секретный документ");
  });
});
