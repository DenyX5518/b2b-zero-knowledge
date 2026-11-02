import * as ExpoCrypto from "expo-crypto";

// Hermes не всегда предоставляет Web Crypto. noble-библиотекам и Shamir нужен только CSPRNG,
// поэтому подключаем системный генератор iOS через expo-crypto.
const scope = globalThis as unknown as { crypto?: Partial<Crypto> };
if (typeof scope.crypto?.getRandomValues !== "function") {
  scope.crypto = {
    ...(scope.crypto ?? {}),
    getRandomValues: <T extends ArrayBufferView | null>(array: T) => ExpoCrypto.getRandomValues(array as unknown as Uint8Array) as unknown as T
  };
}
if (typeof scope.crypto?.randomUUID !== "function") {
  scope.crypto!.randomUUID = () => ExpoCrypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`;
}
