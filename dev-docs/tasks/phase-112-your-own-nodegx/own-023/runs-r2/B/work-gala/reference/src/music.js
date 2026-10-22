// The music, played: each number's score (tunes.js) synthesised with Web Audio, note by note, on the counts the dancers
// are dancing. Nothing here decides anything; it follows G.run. The clock is the dance's own: count c of a number is
// (run.t − start) × bpm ÷ 60, and the game plays 4 counts a second (× the speed), so the music always lands with the steps,
// a skipped number skips its music, and a phrase too long for the music is heard dancing on in silence.
// Applause (the gala only): after each number, as warm as that number's points, and at the curtain call.
import { G } from './state.js';
import { NUMBERS, RULES } from './data.js';
import { score } from './tunes.js';

let ctx = null, master = null, noise = null, cur = null, finaleRun = null;
const stats = { notes: 0, drums: 0, claps: 0, applause: 0, tunes: [] };
export const soundOn = () => G.S.sound !== false;

// the browser lets sound start only from a tap: call this from the buttons that start a run
export function wake() {
  if (!soundOn()) return;
  try {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; build(new AC()); }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}
function build(c) {
  ctx = c; master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setSound(on) { G.S.sound = on; if (on) wake(); else stopTune(); }

/* ---------------- the instruments ---------------- */
// osc: [wave, × frequency, level, detune cents]; a: attack s; d: decay time-constant; s: sustain level; r: release;
// lp: low-pass Hz (lpEnv: where it starts, falling to lp); vib: [Hz, cents]; g: loudness
const STR = [['sawtooth', 1, 0.6, -6], ['sawtooth', 1, 0.6, 6]];
const INS = {
  bell: { osc: [['sine', 1, 1], ['sine', 2, 0.18], ['sine', 4, 0.08]], a: 0.003, d: 0.45, s: 0, r: 0.5, g: 0.3 },
  piano: { osc: [['triangle', 1, 1], ['sine', 2, 0.3]], a: 0.004, d: 0.35, s: 0.2, r: 0.2, g: 0.32 },
  violin: { osc: STR, lp: 2600, a: 0.07, d: 1, s: 0.85, r: 0.18, vib: [5.5, 12], g: 0.24 },
  strings: { osc: STR, lp: 1500, a: 0.2, d: 1, s: 0.9, r: 0.35, g: 0.15 },
  cello: { osc: [['sawtooth', 1, 1]], lp: 800, a: 0.05, d: 1, s: 0.8, r: 0.2, g: 0.3 },
  oboe: { osc: [['sawtooth', 1, 1], ['square', 1, 0.3]], lp: 1500, q: 5, a: 0.05, d: 1, s: 0.85, r: 0.12, vib: [5, 10], g: 0.2 },
  flute: { osc: [['sine', 1, 1], ['triangle', 2, 0.08]], a: 0.05, d: 1, s: 0.85, r: 0.12, vib: [5, 8], g: 0.28 },
  accordion: { osc: [['square', 1, 0.5, -8], ['square', 1, 0.5, 8]], lp: 2200, a: 0.02, d: 1, s: 0.9, r: 0.08, g: 0.1 },
  pluck: { osc: [['square', 1, 1]], lp: 700, lpEnv: 3500, a: 0.003, d: 0.22, s: 0.35, r: 0.1, g: 0.16 },
  brass: { osc: [['sawtooth', 1, 1, -4], ['sawtooth', 1, 1, 4]], lp: 900, lpEnv: 2600, a: 0.012, d: 0.15, s: 0.5, r: 0.08, g: 0.08 },
  rhodes: { osc: [['sine', 1, 1], ['sine', 2, 0.25], ['triangle', 1, 0.2]], a: 0.004, d: 0.6, s: 0.3, r: 0.3, g: 0.2 },
  upright: { osc: [['triangle', 1, 1], ['sine', 2, 0.3]], lp: 1000, a: 0.005, d: 0.3, s: 0.4, r: 0.1, g: 0.5 },
  sub: { osc: [['sine', 1, 1], ['triangle', 2, 0.35]], a: 0.005, d: 0.5, s: 0.6, r: 0.08, g: 0.5 },
  synthbass: { osc: [['sawtooth', 1, 1]], lp: 450, lpEnv: 1600, q: 3, a: 0.004, d: 0.12, s: 0.5, r: 0.05, g: 0.24 },
};
function playNote(e, when, len, out) {
  const I = INS[e.ins], f = 440 * 2 ** ((e.n - 69) / 12), peak = I.g * (e.v ?? 1) * (0.92 + Math.random() * 0.12);
  const off = Math.max(when + len, when + I.a + 0.02), end = off + I.r * 5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(peak, when + I.a);
  g.gain.setTargetAtTime(peak * I.s, when + I.a, I.d); g.gain.setTargetAtTime(0, off, I.r);
  let into = g;
  if (I.lp) {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = I.q || 0.7;
    fl.frequency.setValueAtTime(I.lpEnv || I.lp, when); if (I.lpEnv) fl.frequency.setTargetAtTime(I.lp, when, I.d);
    fl.connect(g); into = fl;
  }
  let vib = null;
  if (I.vib) { vib = ctx.createOscillator(); vib.frequency.value = I.vib[0]; const vg = ctx.createGain(); vg.gain.value = I.vib[1]; vib.connect(vg); vib.vg = vg; vib.start(when); vib.stop(end); }
  for (const [type, mul, lvl, det] of I.osc) {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * mul; o.detune.value = det || 0;
    og.gain.value = lvl; o.connect(og); og.connect(into); if (vib) vib.vg.connect(o.detune); o.start(when); o.stop(end);
  }
  g.connect(out); stats.notes++;
}
function burst(when, { type = 'bandpass', freq, q = 0.8, gain, tau, out }) {
  const s = ctx.createBufferSource(); s.buffer = noise; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, when); g.gain.setTargetAtTime(0, when + 0.002, tau);
  s.connect(fl); fl.connect(g); g.connect(out); s.start(when, Math.random() * 0.5); s.stop(when + tau * 8);
}
function playDrum(e, when, out) {
  const v = e.v ?? 1; stats.drums++;
  if (e.drum === 'kick') {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(45, when + 0.12);
    g.gain.setValueAtTime(0.75 * v, when); g.gain.setTargetAtTime(0, when + 0.01, 0.09); o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.5); return;
  }
  if (e.drum === 'snare') {
    burst(when, { freq: 1800, gain: 0.35 * v, tau: 0.05, out });
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 185; g.gain.setValueAtTime(0.25 * v, when); g.gain.setTargetAtTime(0, when, 0.04);
    o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.3); return;
  }
  if (e.drum === 'clap') { for (const k of [0, 0.011, 0.023]) burst(when + k, { freq: 1100, q: 1, gain: 0.3 * v, tau: k === 0.023 ? 0.07 : 0.008, out }); return; }
  const S = { hat: [7500, 0.18, 0.015], ohat: [7000, 0.13, 0.09], brush: [3500, 0.12, 0.05], crash: [3500, 0.14, 0.5] }[e.drum];
  if (S) burst(when, { type: e.drum === 'brush' ? 'bandpass' : 'highpass', freq: S[0], q: 0.5, gain: S[1] * v, tau: S[2], out });
}

/* ---------------- applause ---------------- */
// warmth 0..1: how many hands and how loud; secs: how long
export function applause(warmth, secs) {
  if (!ctx || ctx.state !== 'running' || !soundOn()) return;
  const t0 = ctx.currentTime + 0.05, w = Math.max(0.15, Math.min(1, warmth)), n = Math.min(160, Math.round(secs * (12 + 30 * w)));
  const bed = ctx.createBufferSource(); bed.buffer = noise; bed.loop = true; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 2200; bf.Q.value = 0.4;
  const bg = ctx.createGain(); bg.gain.setValueAtTime(0, t0); bg.gain.linearRampToValueAtTime(0.05 * w, t0 + 0.4); bg.gain.setValueAtTime(0.05 * w, t0 + secs * 0.6); bg.gain.linearRampToValueAtTime(0, t0 + secs);
  bed.connect(bf); bf.connect(bg); bg.connect(master); bed.start(t0); bed.stop(t0 + secs + 0.1);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), at = t0 + u * secs, fade = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    burst(at, { freq: 1100 + Math.random() * 1600, q: 1.2, gain: (0.05 + Math.random() * 0.08) * w * fade, tau: 0.012 + Math.random() * 0.01, out: master });
  }
  stats.claps += n; stats.applause++;
}

/* ---------------- following the run ---------------- */
function stopTune() {
  if (!cur) return; const bus = cur.bus; cur = null;
  if (ctx) { bus.gain.setTargetAtTime(0, ctx.currentTime, 0.04); setTimeout(() => bus.disconnect(), 500); }
}
const numberNow = (run) => run.res.order.items.find((it) => it.kind === 'number' && run.t >= it.start && run.t < it.end && (run.mode !== 'try' || it.id === run.tryId));
// once a frame, after the run has stepped
export function tick() {
  const run = G.run, live = !!(run && !run.done && soundOn() && ctx && ctx.state === 'running' && G.speed <= 2);
  const it = live ? numberNow(run) : null;
  if (cur && cur.it !== it) {
    const done = cur.lastC >= cur.sc.counts - 1, P = run && run.res.perf[cur.it.id];
    stopTune();
    if (done && live && run.mode === 'gala' && P) applause(P.total / P.max, 2.5 + 2.5 * (P.total / P.max));
  }
  if (live && run.mode === 'gala' && finaleRun !== run && run.t >= run.res.finalStart && run.t < run.res.finalEnd) { finaleRun = run; applause(0.4 + run.res.parents.satisfaction / 170, 7); }
  if (!it) return;
  const N = NUMBERS[it.id], c = (run.t - it.start) * N.bpm / 60, cps = RULES.countsPerSec * G.speed, now = ctx.currentTime;
  if (!cur) {
    const bus = ctx.createGain(); bus.connect(master);
    cur = { it, sc: score(it.id), bus, pans: {}, i: 0, upTo: Math.max(0, c - 0.6), lastC: c }; stats.tunes.push(it.id);
  }
  const ev = cur.sc.events;
  if (c < cur.lastC - 0.5 || c > cur.upTo + 2) { cur.i = 0; cur.upTo = c; } // a jump: carry on from here, no backlog
  while (cur.i < ev.length && ev[cur.i].c < cur.upTo - 1e-6) cur.i++;
  const horizon = c + cps * 0.15;
  while (cur.i < ev.length && ev[cur.i].c < horizon) {
    const e = ev[cur.i++], when = now + (e.c - c) / cps; if (when < now - 0.16) continue;
    const at = Math.max(now, when);
    if (e.drum) playDrum(e, at, cur.bus);
    else {
      const pan = e.pan || 0; let out = cur.pans[pan];
      if (!out) { out = cur.pans[pan] = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if (out.pan) out.pan.value = pan; out.connect(cur.bus); }
      playNote(e, at, e.d / cps, out);
    }
  }
  cur.upTo = horizon; cur.lastC = c;
}
export const musicState = () => ({ ctx: ctx ? ctx.state : 'none', on: soundOn(), playing: cur ? cur.it.id : null, ...stats, tunes: stats.tunes.slice() });

// render `secs` seconds of a number's music from count `fromC`, offline, and measure it (the drive's ear: silent? clipping?)
export async function renderOffline(id, fromC = 0, secs = 6) {
  const keep = [ctx, master, noise], cps = RULES.countsPerSec, pans = {};
  build(new OfflineAudioContext(2, 44100 * secs, 44100));
  try {
    for (const e of score(id).events) {
      const at = (e.c - fromC) / cps; if (at < 0 || at >= secs) continue;
      if (e.drum) { playDrum(e, at, master); continue; }
      const pan = e.pan || 0; if (!pans[pan]) { pans[pan] = ctx.createStereoPanner(); pans[pan].pan.value = pan; pans[pan].connect(master); }
      playNote(e, at, e.d / cps, pans[pan]);
    }
    const buf = await ctx.startRendering(), L = buf.getChannelData(0); let peak = 0, sum = 0, quiet = 0;
    for (let i = 0; i < L.length; i++) { const a = Math.abs(L[i]); peak = Math.max(peak, a); sum += a * a; }
    for (let w = 0; w < secs * 4; w++) { let m = 0; for (let i = w * 11025; i < (w + 1) * 11025; i++) m = Math.max(m, Math.abs(L[i])); if (m < 0.01) quiet++; }
    return { id, fromC, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / L.length).toFixed(3), silentQuarterSeconds: quiet };
  } finally { [ctx, master, noise] = keep; }
}
