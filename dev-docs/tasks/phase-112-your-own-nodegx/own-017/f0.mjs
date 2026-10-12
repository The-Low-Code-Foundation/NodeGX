// Median pitch (Hz) of a WAV's voiced 40 ms frames, by autocorrelation over 70–400 Hz: tells two voices apart
// (OWN-017's voice edit). Usage: node f0.mjs <file.wav> …
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  const b = fs.readFileSync(f);
  let off = 12, rate = 24000, data;
  while (off + 8 <= b.length) { const id = b.toString('latin1', off, off + 4), len = b.readUInt32LE(off + 4);
    if (id === 'fmt ') rate = b.readUInt32LE(off + 12); if (id === 'data' && !data) data = b.subarray(off + 8, off + 8 + len); off += 8 + len + (len % 2); }
  const x = Array.from({ length: data.length >> 1 }, (_, i) => data.readInt16LE(i * 2));
  const win = Math.round(rate * 0.04), f0s = [];
  for (let s = 0; s + win <= x.length; s += win >> 1) {
    const fr = x.slice(s, s + win); const e = fr.reduce((a, v) => a + v * v, 0);
    if (Math.sqrt(e / win) < 1500) continue;
    let best = 0, bestLag = 0;
    for (let lag = Math.floor(rate / 400); lag <= Math.ceil(rate / 70); lag++) {
      let c = 0; for (let i = 0; i + lag < win; i++) c += fr[i] * fr[i + lag];
      if (c > best) { best = c; bestLag = lag; }
    }
    if (best / e > 0.5) f0s.push(rate / bestLag);
  }
  f0s.sort((a, b) => a - b);
  console.log(JSON.stringify({ file: f.split('/').slice(-2).join('/'), voicedFrames: f0s.length, medianHz: Math.round(f0s[f0s.length >> 1]), q: [0.1, 0.25, 0.5, 0.75, 0.9].map((p) => Math.round(f0s[Math.floor(p * (f0s.length - 1))])) }));
}
