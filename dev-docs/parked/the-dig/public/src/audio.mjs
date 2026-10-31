// Every sound is made up on the spot with WebAudio (no files): picks on rock, the rifle's crack and its echo,
// the bow, the crawlers, the portal, and the low hum that grows as you near a room someone planted for you.
let ctx = null, master = null, echo = null, hum = null, humGain = null;
let muted = new URLSearchParams(location.search).has('mute');

export function unlockAudio() {
  if (ctx || muted) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    // A cave echo: a feedback delay through a low-pass.
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    echo.connect(lp);
    lp.connect(fb);
    fb.connect(echo);
    lp.connect(master);
    // The hum: two detuned low sines, silent until a room is near.
    humGain = ctx.createGain();
    humGain.gain.value = 0;
    humGain.connect(master);
    for (const f of [55, 55.7, 110.3]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(humGain);
      o.start();
    }
    hum = true;
  } catch {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.7;
}
export const isMuted = () => muted;

function noise(dur) {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  return s;
}

function env(node, gain, a, d, { wet = 0.25 } = {}) {
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  node.connect(g);
  g.connect(master);
  if (wet) {
    const w = ctx.createGain();
    w.gain.value = wet;
    g.connect(w);
    w.connect(echo);
  }
  return t + a + d;
}

function filtered(src, type, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f);
  return f;
}

export const sfx = {
  dig(hard = 0.7) {
    if (!ctx || muted) return;
    const n = noise(0.08);
    env(filtered(n, 'bandpass', 900 + 900 * hard, 2), 0.25, 0.003, 0.07, { wet: 0.1 });
    n.start();
  },
  break() {
    if (!ctx || muted) return;
    const n = noise(0.25);
    env(filtered(n, 'lowpass', 1200), 0.5, 0.005, 0.22);
    n.start();
  },
  place() {
    if (!ctx || muted) return;
    const n = noise(0.1);
    env(filtered(n, 'lowpass', 500), 0.45, 0.004, 0.09, { wet: 0.1 });
    n.start();
  },
  torch() {
    if (!ctx || muted) return;
    const n = noise(0.5);
    env(filtered(n, 'highpass', 2500), 0.12, 0.05, 0.4, { wet: 0 });
    n.start();
  },
  step() {
    if (!ctx || muted) return;
    const n = noise(0.06);
    env(filtered(n, 'lowpass', 380), 0.18, 0.002, 0.05, { wet: 0.05 });
    n.start();
  },
  rifle() {
    if (!ctx || muted) return;
    const n = noise(0.9);
    env(filtered(n, 'lowpass', 3200), 1.2, 0.001, 0.5, { wet: 0.9 });
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(140, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    env(o, 0.9, 0.001, 0.35, { wet: 0.5 });
    n.start();
    o.start();
    o.stop(ctx.currentTime + 0.4);
  },
  bolt() {
    if (!ctx || muted) return;
    for (const dt of [0, 0.18]) {
      const n = noise(0.05);
      const f = filtered(n, 'bandpass', 2600, 4);
      const g = ctx.createGain();
      g.gain.value = 0.3;
      f.connect(g);
      g.connect(master);
      n.start(ctx.currentTime + dt);
    }
  },
  draw() {
    if (!ctx || muted) return;
    const n = noise(0.5);
    env(filtered(n, 'bandpass', 600, 6), 0.08, 0.3, 0.2, { wet: 0 });
    n.start();
  },
  bow() {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.15);
    env(filtered(o, 'lowpass', 900), 0.35, 0.002, 0.2, { wet: 0.2 });
    o.start();
    o.stop(ctx.currentTime + 0.25);
  },
  thunk() {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(180, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
    env(o, 0.35, 0.002, 0.12, { wet: 0.2 });
    o.start();
    o.stop(ctx.currentTime + 0.2);
  },
  growl(dist = 10) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 60 + Math.random() * 30;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 18 + Math.random() * 10;
    const lg = ctx.createGain();
    lg.gain.value = 25;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const g = Math.max(0.03, 0.4 - dist * 0.012);
    env(filtered(o, 'lowpass', 500), g, 0.1, 0.6, { wet: 0.6 });
    o.start();
    lfo.start();
    o.stop(ctx.currentTime + 0.8);
    lfo.stop(ctx.currentTime + 0.8);
  },
  hit() {
    if (!ctx || muted) return;
    const n = noise(0.12);
    env(filtered(n, 'bandpass', 400, 1), 0.5, 0.002, 0.1, { wet: 0.2 });
    n.start();
  },
  hurt() {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(260, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
    env(filtered(o, 'lowpass', 1200), 0.2, 0.002, 0.16, { wet: 0 });
    o.start();
    o.stop(ctx.currentTime + 0.2);
  },
  chime() {
    if (!ctx || muted) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g);
      g.connect(master);
      const w = ctx.createGain();
      w.gain.value = 0.4;
      g.connect(w);
      w.connect(echo);
      o.start(t);
      o.stop(t + 1);
    });
  },
  portal() {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 1.2);
    env(o, 0.3, 0.2, 1.1, { wet: 0.8 });
    o.start();
    o.stop(ctx.currentTime + 1.5);
  },
  soft() {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.frequency.value = 660;
    env(o, 0.08, 0.01, 0.4, { wet: 0.2 });
    o.start();
    o.stop(ctx.currentTime + 0.5);
  }
};

// 0 (nothing near) … 1 (standing in the room).
export function setHum(level) {
  if (!hum || muted) return;
  humGain.gain.setTargetAtTime(Math.min(0.22, level * 0.22), ctx.currentTime, 0.4);
}
