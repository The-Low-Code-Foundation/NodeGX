/**
 * Bytes as text — read from `packages/noodl-runtime/src/nodes/std-library/crypto/encoding.ts` on
 * 2026-10-01 (NSP-013). What Hash and Random Bytes share: the three renderings (:83-104) and the
 * UTF-8 bytes of a string (:77-79). `btoa` and `TextEncoder` are globals on every target this
 * runs on (Node 16+, every browser); a target in another language has its own.
 */

/** :17 */
export type ByteEncoding = 'hex' | 'base64' | 'base64url';

/** :77-79 — `new TextEncoder().encode(text)`: a non-string is converted the way WebIDL converts it, `String(value)`. */
export function utf8Bytes(text: unknown): Uint8Array {
  return new TextEncoder().encode(text as string);
}

/** :81-85 */
export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/** :87-95 — chunked, as the runtime's is */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as number[]);
  }
  return btoa(binary);
}

/** :97-99 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** :109-114 — an encoding not in the list THROWS with this message, which a node's `Error` then carries. */
export function encodeBytes(bytes: Uint8Array, encoding: unknown): string {
  if (encoding === 'hex') return bytesToHex(bytes);
  if (encoding === 'base64') return bytesToBase64(bytes);
  if (encoding === 'base64url') return bytesToBase64Url(bytes);
  throw new Error(`Unknown encoding "${String(encoding)}". Use hex, base64 or base64url.`);
}

/** The enum's values, in the order the two nodes offer them (hash.ts :88-94, randombytes.ts :57-63). */
export const ENCODING_VALUES = ['hex', 'base64', 'base64url'] as const;
