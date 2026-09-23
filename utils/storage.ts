function xorBytes(data: Uint8Array, key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  if (keyBytes.length === 0) {
    throw new Error("Storage encryption key is empty");
  }

  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function binaryToBytes(binary: string): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function encodeStorage(json: string, key: string): string {
  const bytes = new TextEncoder().encode(json);
  return btoa(bytesToBinary(xorBytes(bytes, key)));
}

export function decodeStorage(payload: string, key: string): string {
  const xored = binaryToBytes(atob(payload));
  return new TextDecoder().decode(xorBytes(xored, key));
}
