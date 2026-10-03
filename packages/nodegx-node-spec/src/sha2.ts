/**
 * SHA-2 (FIPS 180-4), in plain TypeScript, so the world's DIGEST (world.ts) is the same bytes in a
 * page as in Node, and the package imports nothing from Node. Phase 112, OWN-002.
 *
 * No BigInt: the runtime, the cloud viewer and the backend contract compile this package's source
 * under their own TypeScript targets, and one of them is below ES2020, where a BigInt literal is a
 * compile error (measured 2026-10-03 on noodl-runtime's node-spec suite). SHA-512 and SHA-384 run on
 * 32-bit word pairs; SHA-256 on 32-bit words.
 *
 * The round constants and initial hash values below were GENERATED once from the first primes (the
 * fractional parts of their cube roots and square roots, as the standard defines them, by exact
 * integer roots on BigInt in a one-off script) and pinned as literals; nothing was typed by hand, and
 * tests/sha2.test.ts grades every length from 0 to 300 bytes, the standard's vectors and a 100 KB
 * message against Node's `crypto`, so a wrong constant cannot hide.
 *
 * Fast enough for the Hash node's conformance runs (short inputs); not written for throughput.
 */

// GENERATED from the first primes (see the header) — do not edit; sha2.test.ts grades every value against Node.
const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];
const H256 = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];
/** 64-bit words as (hi, lo) pairs. */
const K512 = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];
const H512 = [
  0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
  0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179
];
const H384 = [
  0xcbbb9d5d, 0xc1059ed8, 0x629a292a, 0x367cd507, 0x9159015a, 0x3070dd17, 0x152fecd8, 0xf70e5939,
  0x67332667, 0xffc00b31, 0x8eb44a87, 0x68581511, 0xdb0c2e0d, 0x64f98fa7, 0x47b5481d, 0xbefa4fa4
];

const rotr32 = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

export function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const h = H256.slice();
  const w = new Array<number>(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(off + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr32(w[t - 15], 7) ^ rotr32(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr32(w[t - 2], 17) ^ rotr32(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[t] + w[t]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((x, i) => ov.setUint32(i * 4, x));
  return out;
}

/* ---- 64-bit words as (hi, lo) pairs of uint32, in a flat Uint32Array: word i is [2i] (hi), [2i + 1] (lo). */

/** x = (hi, lo) rotated right by n (0 < n < 64); writes into out[o], out[o + 1]. */
function rotr64(hi: number, lo: number, n: number, out: Uint32Array, o: number): void {
  if (n >= 32) { const t = hi; hi = lo; lo = t; n -= 32; }
  if (n === 0) { out[o] = hi; out[o + 1] = lo; return; }
  out[o] = ((hi >>> n) | (lo << (32 - n))) >>> 0;
  out[o + 1] = ((lo >>> n) | (hi << (32 - n))) >>> 0;
}
/** x >>> n for n < 32. */
function shr64(hi: number, lo: number, n: number, out: Uint32Array, o: number): void {
  out[o] = hi >>> n;
  out[o + 1] = ((lo >>> n) | (hi << (32 - n))) >>> 0;
}

const tmp = new Uint32Array(8); // scratch for the sigma functions

function sha512Core(data: Uint8Array, init: readonly number[], outBytes: number): Uint8Array {
  const padded = new Uint8Array(((data.length + 17 + 127) >> 7) << 7);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLen = data.length * 8; // < 2^53 bits: the top 64 bits of the 128-bit length are zero
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const h = Uint32Array.from(init);
  const w = new Uint32Array(160);
  for (let off = 0; off < padded.length; off += 128) {
    for (let t = 0; t < 16; t++) { w[2 * t] = view.getUint32(off + t * 8); w[2 * t + 1] = view.getUint32(off + t * 8 + 4); }
    for (let t = 16; t < 80; t++) {
      // s0 = rotr1 ^ rotr8 ^ shr7 of w[t-15]; s1 = rotr19 ^ rotr61 ^ shr6 of w[t-2]
      const aH = w[2 * (t - 15)], aL = w[2 * (t - 15) + 1];
      rotr64(aH, aL, 1, tmp, 0); rotr64(aH, aL, 8, tmp, 2); shr64(aH, aL, 7, tmp, 4);
      const s0H = (tmp[0] ^ tmp[2] ^ tmp[4]) >>> 0, s0L = (tmp[1] ^ tmp[3] ^ tmp[5]) >>> 0;
      const bH = w[2 * (t - 2)], bL = w[2 * (t - 2) + 1];
      rotr64(bH, bL, 19, tmp, 0); rotr64(bH, bL, 61, tmp, 2); shr64(bH, bL, 6, tmp, 4);
      const s1H = (tmp[0] ^ tmp[2] ^ tmp[4]) >>> 0, s1L = (tmp[1] ^ tmp[3] ^ tmp[5]) >>> 0;
      // w[t] = w[t-16] + s0 + w[t-7] + s1
      let lo = (w[2 * (t - 16) + 1] + s0L) >>> 0;
      let carry = lo < s0L ? 1 : 0;
      let hi = (w[2 * (t - 16)] + s0H + carry) >>> 0;
      const l2 = (lo + w[2 * (t - 7) + 1]) >>> 0; carry = l2 < lo ? 1 : 0; lo = l2;
      hi = (hi + w[2 * (t - 7)] + carry) >>> 0;
      const l3 = (lo + s1L) >>> 0; carry = l3 < lo ? 1 : 0; lo = l3;
      hi = (hi + s1H + carry) >>> 0;
      w[2 * t] = hi; w[2 * t + 1] = lo;
    }
    let aH = h[0], aL = h[1], bH = h[2], bL = h[3], cH = h[4], cL = h[5], dH = h[6], dL = h[7];
    let eH = h[8], eL = h[9], fH = h[10], fL = h[11], gH = h[12], gL = h[13], hH = h[14], hL = h[15];
    for (let t = 0; t < 80; t++) {
      rotr64(eH, eL, 14, tmp, 0); rotr64(eH, eL, 18, tmp, 2); rotr64(eH, eL, 41, tmp, 4);
      const S1H = (tmp[0] ^ tmp[2] ^ tmp[4]) >>> 0, S1L = (tmp[1] ^ tmp[3] ^ tmp[5]) >>> 0; // >>> 0: the carry tests below compare unsigned
      const chH = ((eH & fH) ^ (~eH & gH)) >>> 0, chL = ((eL & fL) ^ (~eL & gL)) >>> 0;
      // t1 = h + S1 + ch + K[t] + w[t]
      let lo = (hL + S1L) >>> 0; let carry = lo < S1L ? 1 : 0; let hi = (hH + S1H + carry) >>> 0;
      let l = (lo + chL) >>> 0; carry = l < lo ? 1 : 0; lo = l; hi = (hi + chH + carry) >>> 0;
      l = (lo + K512[2 * t + 1]) >>> 0; carry = l < lo ? 1 : 0; lo = l; hi = (hi + K512[2 * t] + carry) >>> 0;
      l = (lo + w[2 * t + 1]) >>> 0; carry = l < lo ? 1 : 0; lo = l; hi = (hi + w[2 * t] + carry) >>> 0;
      const t1H = hi, t1L = lo;
      rotr64(aH, aL, 28, tmp, 0); rotr64(aH, aL, 34, tmp, 2); rotr64(aH, aL, 39, tmp, 4);
      const S0H = (tmp[0] ^ tmp[2] ^ tmp[4]) >>> 0, S0L = (tmp[1] ^ tmp[3] ^ tmp[5]) >>> 0;
      const majH = ((aH & bH) ^ (aH & cH) ^ (bH & cH)) >>> 0, majL = ((aL & bL) ^ (aL & cL) ^ (bL & cL)) >>> 0;
      const t2L = (S0L + majL) >>> 0; const t2H = (S0H + majH + (t2L < S0L ? 1 : 0)) >>> 0;
      hH = gH; hL = gL; gH = fH; gL = fL; fH = eH; fL = eL;
      eL = (dL + t1L) >>> 0; eH = (dH + t1H + (eL < dL ? 1 : 0)) >>> 0;
      dH = cH; dL = cL; cH = bH; cL = bL; bH = aH; bL = aL;
      aL = (t1L + t2L) >>> 0; aH = (t1H + t2H + (aL < t1L ? 1 : 0)) >>> 0;
    }
    const add = (i: number, xH: number, xL: number) => { const lo = (h[2 * i + 1] + xL) >>> 0; h[2 * i] = (h[2 * i] + xH + (lo < xL ? 1 : 0)) >>> 0; h[2 * i + 1] = lo; };
    add(0, aH, aL); add(1, bH, bL); add(2, cH, cL); add(3, dH, dL); add(4, eH, eL); add(5, fH, fL); add(6, gH, gL); add(7, hH, hL);
  }
  const full = new Uint8Array(64);
  const ov = new DataView(full.buffer);
  for (let i = 0; i < 16; i++) ov.setUint32(i * 4, h[i]);
  return full.slice(0, outBytes);
}

export const sha512 = (data: Uint8Array): Uint8Array => sha512Core(data, H512, 64);
export const sha384 = (data: Uint8Array): Uint8Array => sha512Core(data, H384, 48);
