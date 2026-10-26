import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64, sha256 } from "./format.js";

describe("shared format helpers", () => {
  it("round-trips binary values through base64", () => {
    const source = new Uint8Array([0, 1, 127, 128, 254, 255]);
    expect(base64ToBytes(bytesToBase64(source))).toEqual(source);
  });

  it("produces a stable SHA-256 digest", async () => {
    await expect(sha256("kontur")).resolves.toBe("6ae41a5406c94d9f24e3dcd65141cb239884c9a4edf600253ef0758b73e85b8e");
  });
});
