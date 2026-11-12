// Sound, made in the browser (no files): chimes for spells, a thump for hits, a fanfare for a win, a low hum in a dark
// room and a music-box tune in a won one. `?mute=1` or the setting turns it all off. Starts on the first tap (browsers
// keep audio asleep until then).
let ctx = null, master = null, musicGain = null, music = null;
let muted = false;

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.6;
}
export function wake() {
  if (ctx) return ctx.state === 'suspended' && ctx.resume();
  try {
    ctx = new AudioContext();
  } catch {
    return;
  }
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.6;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(master);
}

function tone(freq, { at = 0, dur = 0.3, type = 'sine', vol = 0.3, attack = 0.005, slide = 0, out = master } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noise({ at = 0, dur = 0.3, vol = 0.3, from = 2000, to = 200 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
export function sfx(name) {
  if (!ctx || muted) return;
  switch (name) {
    case 'click': tone(1200, { dur: 0.06, type: 'triangle', vol: 0.12 }); break;
    case 'charge': tone(N(72), { dur: 0.5, type: 'triangle', vol: 0.15, slide: 2 }); break;
    case 'cast': [76, 79, 84, 88].forEach((n, i) => tone(N(n), { at: i * 0.05, dur: 0.5, type: 'triangle', vol: 0.18 })); noise({ dur: 0.4, vol: 0.06, from: 8000, to: 2000 }); break;
    case 'zap': tone(N(88), { dur: 0.25, type: 'sine', vol: 0.2, slide: 0.5 }); noise({ dur: 0.25, vol: 0.12, from: 5000, to: 600 }); break;
    case 'brilliant': [84, 88, 91, 96].forEach((n, i) => tone(N(n), { at: i * 0.07, dur: 0.6, type: 'sine', vol: 0.18 })); break;
    case 'hurt': tone(160, { dur: 0.25, type: 'sawtooth', vol: 0.18, slide: 0.5 }); noise({ dur: 0.25, vol: 0.25, from: 1500, to: 100 }); break;
    case 'creature': tone(110, { dur: 0.4, type: 'square', vol: 0.08, slide: 0.7 }); tone(117, { dur: 0.4, type: 'square', vol: 0.06, slide: 0.65 }); break;
    case 'wrong': tone(N(64), { dur: 0.18, type: 'triangle', vol: 0.15 }); tone(N(60), { at: 0.15, dur: 0.3, type: 'triangle', vol: 0.15 }); break;
    case 'potion': [72, 76, 79].forEach((n, i) => tone(N(n), { at: i * 0.08, dur: 0.4, type: 'sine', vol: 0.18 })); break;
    case 'knockout': [67, 64, 60, 55].forEach((n, i) => tone(N(n), { at: i * 0.18, dur: 0.5, type: 'triangle', vol: 0.16 })); break;
    case 'win': [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.6], [84, 0.72]].forEach(([n, a]) => tone(N(n), { at: a, dur: 0.6, type: 'triangle', vol: 0.2 })); tone(N(48), { dur: 1.2, type: 'sine', vol: 0.2 }); break;
    case 'sweep': for (let i = 0; i < 16; i++) tone(N(72 + [0, 4, 7, 11, 12, 16, 19, 23][i % 8] + (i >= 8 ? 12 : 0)), { at: i * 0.09, dur: 0.9, type: 'sine', vol: 0.12 }); break;
    case 'reward': [79, 84, 88, 91].forEach((n, i) => tone(N(n), { at: i * 0.1, dur: 0.8, type: 'sine', vol: 0.15 })); break;
  }
}

// Background music: 'dark' (a slow low drone with drips) or 'bright' (a music-box tune), or null.
export function playMusic(kind) {
  if (!ctx) return;
  if (music?.kind === kind) return;
  music?.stop();
  music = null;
  if (!kind) return;
  let timer = null, step = 0, stopped = false;
  const voice = ctx.createGain();
  voice.gain.value = 0;
  voice.connect(musicGain);
  voice.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
  if (kind === 'dark') {
    const oscs = [55, 55 * 1.5, 55 * 2.02].map((f) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.value = 0.12;
      o.connect(g).connect(voice);
      o.start();
      return o;
    });
    const drip = () => {
      if (stopped) return;
      tone(N(84 + Math.floor(Math.random() * 6)), { dur: 0.25, type: 'sine', vol: 0.05, slide: 0.6, out: voice });
      timer = setTimeout(drip, 1500 + Math.random() * 3000);
    };
    drip();
    music = { kind, stop: () => ((stopped = true), clearTimeout(timer), voice.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8), oscs.forEach((o) => o.stop(ctx.currentTime + 1))) };
  } else {
    // A little waltz in F major, round and round.
    const tune = [65, 69, 72, 77, 76, 72, 74, 72, 69, 70, 72, 69, 65, 67, 69, 72, 70, 67, 65, 64, 65, 69, 72, 77];
    const bass = [41, 48, 41, 48, 43, 50, 36, 43];
    const tick = () => {
      if (stopped) return;
      tone(N(tune[step % tune.length] + 12), { dur: 0.9, type: 'sine', vol: 0.09, out: voice });
      tone(N(tune[step % tune.length] + 24), { dur: 0.4, type: 'sine', vol: 0.025, out: voice });
      if (step % 3 === 0) tone(N(bass[Math.floor(step / 3) % bass.length] + 12), { dur: 1.2, type: 'triangle', vol: 0.06, out: voice });
      step++;
      timer = setTimeout(tick, 330);
    };
    tick();
    music = { kind, stop: () => ((stopped = true), clearTimeout(timer), voice.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)) };
  }
}

// A piano-ish note (MIDI number), for Maestro Fig's piano and the ball's tunes: a struck triangle with a soft octave
// above, fading like a string. `at` is seconds from now.
export function note(midi, { at = 0, dur = 1.1, vol = 0.2 } = {}) {
  if (!ctx || muted) return;
  tone(N(midi), { at, dur, type: 'triangle', vol, attack: 0.004 });
  tone(N(midi), { at, dur: dur * 1.3, type: 'sine', vol: vol * 0.6, attack: 0.004 });
  tone(N(midi + 12), { at, dur: dur * 0.5, type: 'sine', vol: vol * 0.18, attack: 0.002 });
}
// A soft tick on the beat (the dance), louder on the first beat of a bar.
export function tick(strong = false) {
  if (!ctx || muted) return;
  noise({ dur: 0.05, vol: strong ? 0.12 : 0.06, from: 6000, to: 3000 });
}
