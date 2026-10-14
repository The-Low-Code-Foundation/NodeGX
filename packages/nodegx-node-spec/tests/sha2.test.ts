/**
 * OWN-002: the package's own SHA-2 (src/sha2.ts) against Node's crypto — every length from 0 to
 * 300 bytes (that crosses every padding boundary: 55/56/64 for SHA-256, 111/112/128 for the
 * 512 family), the standard's vectors, and a 100 KB message.
 */
import { createHash, createHmac, randomBytes } from 'crypto';

import { sha256, sha384, sha512 } from '../src/sha2';
import { digestBytes, hmacBytes } from '../src/world';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const node = (alg: string, b: Uint8Array) => createHash(alg).update(b).digest('hex');

describe('sha2', () => {
  test('the standard vectors', () => {
    expect(hex(sha256(Buffer.from('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hex(sha256(new Uint8Array(0)))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hex(sha512(Buffer.from('abc')))).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
    );
    expect(hex(sha384(Buffer.from('abc')))).toBe('cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7');
  });

  test('every length from 0 to 300 bytes agrees with Node, all three algorithms', () => {
    for (let n = 0; n <= 300; n++) {
      const b = new Uint8Array(randomBytes(n));
      expect(hex(sha256(b))).toBe(node('sha256', b));
      expect(hex(sha384(b))).toBe(node('sha384', b));
      expect(hex(sha512(b))).toBe(node('sha512', b));
    }
  });

  test('a 100 KB message', () => {
    const b = new Uint8Array(randomBytes(100 * 1024));
    expect(hex(sha256(b))).toBe(node('sha256', b));
    expect(hex(sha512(b))).toBe(node('sha512', b));
  });

  test("the world's digestBytes is this implementation, by WebCrypto's names, and refuses the rest as before", () => {
    const b = Buffer.from('The quick brown fox jumps over the lazy dog');
    expect(hex(digestBytes('SHA-256', b))).toBe(node('sha256', b));
    expect(hex(digestBytes('SHA-384', b))).toBe(node('sha384', b));
    expect(hex(digestBytes('SHA-512', b))).toBe(node('sha512', b));
    expect(() => digestBytes('SHA-1', b)).toThrow('Unrecognized algorithm name: SHA-1');
  });

  test("NSP-022 — the world's hmacBytes agrees with Node's createHmac: keys of every length across the block (0 excepted), all three digests", () => {
    for (const [alg, name, block] of [['SHA-256', 'sha256', 64], ['SHA-384', 'sha384', 128], ['SHA-512', 'sha512', 128]] as const) {
      for (const keyLength of [1, 5, block - 1, block, block + 1, 200]) {
        for (const dataLength of [0, 1, 55, 56, 64, 111, 112, 128, 300]) {
          const key = new Uint8Array(randomBytes(keyLength));
          const data = new Uint8Array(randomBytes(dataLength));
          expect(hex(hmacBytes(alg, key, data))).toBe(createHmac(name, key).update(data).digest('hex'));
        }
      }
    }
    // RFC 4231 test case 2
    expect(hex(hmacBytes('SHA-256', Buffer.from('Jefe'), Buffer.from('what do ya want for nothing?')))).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
    expect(() => hmacBytes('SHA-1', Buffer.from('k'), Buffer.from('m'))).toThrow('Unrecognized algorithm name: SHA-1');
    expect(() => hmacBytes('SHA-256', new Uint8Array(0), Buffer.from('m'))).toThrow('Zero-length key is not supported');
  });
});
