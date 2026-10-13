import { combine, split } from "shamir-secret-sharing";
import { fromBase64, toBase64 } from "./encoding.js";

export type RecoveryShare = {
  version: 1;
  threshold: number;
  total: number;
  encodedShare: string;
};

export async function createRecoveryShares(secret: Uint8Array, total = 3, threshold = 2): Promise<RecoveryShare[]> {
  if (secret.byteLength < 32) throw new Error("Recovery secret must contain at least 256 bits");
  if (threshold < 2 || total < threshold) throw new Error("Invalid recovery quorum");
  const shares = await split(secret, total, threshold);
  return shares.map((share) => ({ version: 1, threshold, total, encodedShare: toBase64(share) }));
}

export async function recoverSecret(shares: RecoveryShare[]): Promise<Uint8Array> {
  if (!shares.length) throw new Error("At least one recovery share is required");
  const threshold = shares[0].threshold;
  if (shares.length < threshold) throw new Error(`Recovery requires ${threshold} shares`);
  if (shares.some((share) => share.version !== 1 || share.threshold !== threshold)) throw new Error("Incompatible recovery shares");
  return combine(shares.map((share) => fromBase64(share.encodedShare)));
}
