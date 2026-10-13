import sodium from "libsodium-wrappers-sumo";
import { fromBase64, toBase64 } from "./encoding.js";

export type DeviceKeyPair = { publicKey: string; privateKey: string };

export async function createDeviceKeyPair(): Promise<DeviceKeyPair> {
  await sodium.ready;
  const pair = sodium.crypto_box_keypair();
  return { publicKey: toBase64(pair.publicKey), privateKey: toBase64(pair.privateKey) };
}

export async function wrapKeyForDevice(contentKey: Uint8Array, devicePublicKey: string): Promise<string> {
  await sodium.ready;
  return toBase64(sodium.crypto_box_seal(contentKey, fromBase64(devicePublicKey)));
}

export async function unwrapKeyForDevice(envelope: string, pair: DeviceKeyPair): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_box_seal_open(fromBase64(envelope), fromBase64(pair.publicKey), fromBase64(pair.privateKey));
}
