const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(128);
for (let index = 0; index < ALPHABET.length; index += 1) LOOKUP[ALPHABET.charCodeAt(index)] = index;

export function toBase64(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    output += ALPHABET[a >> 2]! + ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)]!;
    output += b === undefined ? "=" : ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)]!;
    output += c === undefined ? "=" : ALPHABET[c & 63]!;
  }
  return output;
}

export function fromBase64(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, "");
  const output = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let position = 0;
  for (let index = 0; index < clean.length; index += 1) {
    buffer = (buffer << 6) | LOOKUP[clean.charCodeAt(index)]!;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output[position++] = (buffer >> bits) & 255;
    }
  }
  return output.subarray(0, position);
}

export function utf8Encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

// TextDecoder есть не во всех сборках Hermes, поэтому декодируем UTF-8 вручную.
export function utf8Decode(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length;) {
    const byte = bytes[index++]!;
    let code = byte;
    if (byte >= 0xf0) code = ((byte & 7) << 18) | ((bytes[index++]! & 63) << 12) | ((bytes[index++]! & 63) << 6) | (bytes[index++]! & 63);
    else if (byte >= 0xe0) code = ((byte & 15) << 12) | ((bytes[index++]! & 63) << 6) | (bytes[index++]! & 63);
    else if (byte >= 0xc0) code = ((byte & 31) << 6) | (bytes[index++]! & 63);
    output += String.fromCodePoint(code);
  }
  return output;
}

export function decodeJwtSubject(token: string): string | null {
  try {
    const payload = token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(utf8Decode(fromBase64(payload))) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}
