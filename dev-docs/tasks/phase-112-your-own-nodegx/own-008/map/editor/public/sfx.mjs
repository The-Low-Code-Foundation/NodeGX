// The battle's sound effects, synthesised with Web Audio (nothing downloaded): the blaster "pew"
// of an X-wing and of a TIE fighter, the deeper crack of a turbolaser, and the boom of an
// explosion. Fainter with distance from the camera; silent beyond earshot; a few at a time at most,
// so a busy battle does not turn into noise. Started by the first click or key, like the music.

const RANGE = { xwing: 520, tie: 520, turbolaser: 900, boom: 1100, hit: 60 };
const MAX_PER_WINDOW = { xwing: 2, tie: 2, turbolaser: 2, boom: 3, hit: 3 };

export class Sfx {
  constructor() {
    this.on = localStorage.getItem('map-sfx') !== 'off';
    this.recent = {};
  }

  start() {
    if (!this.on) return;
    this.ctx ??= new AudioContext();
    this.ctx.resume();
    if (!this.out) {
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.6;
      this.out.connect(this.ctx.destination);
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = n;
    }
  }

  toggle() {
    this.on = !this.on;
    localStorage.setItem('map-sfx', this.on ? 'on' : 'off');
    if (this.on) this.start();
    else this.ctx?.suspend();
    return this.on;
  }

  /** One sound of `kind`, `distance` world units from the camera; `size` scales an explosion. */
  play(kind, distance, size = 16) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const att = 1 - distance / RANGE[kind];
    if (!(att > 0.04)) return;
    const now = this.ctx.currentTime;
    const recent = (this.recent[kind] ?? []).filter((t) => now - t < 0.12);
    if (recent.length >= MAX_PER_WINDOW[kind]) return;
    recent.push(now);
    this.recent[kind] = recent;
    const v = att * att;
    if (kind === 'xwing') this.blaster(now, 'sawtooth', 1500, 240, 0.17, 0.05 * v);
    else if (kind === 'tie') this.blaster(now, 'square', 1100, 150, 0.2, 0.035 * v, 38);
    else if (kind === 'turbolaser') this.blaster(now, 'sawtooth', 720, 85, 0.38, 0.07 * v);
    else if (kind === 'hit') this.thud(now, 0.2 * v); // a bolt on your own shields, in the cockpit
    else this.boom(now, 0.3 * v * Math.min(1.5, size / 16));
  }

  /** A falling tone through a low-pass: the "pew". `wobble` Hz adds the TIE's warble. */
  blaster(t, type, f0, f1, dur, vol, wobble = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (wobble) {
      const lfo = this.ctx.createOscillator();
      const depth = this.ctx.createGain();
      lfo.frequency.value = wobble;
      depth.gain.value = f0 * 0.08;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** A short crackle of noise and a low knock: a bolt soaking into the shields. */
  thud(t, vol) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.18);
    f.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 0.22);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.25);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(vol * 1.4, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(og).connect(this.out);
    o.start(t);
    o.stop(t + 0.3);
  }

  /** Rumbling noise falling in pitch, under a short low thump. */
  boom(t, vol) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(90, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 1.05);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(vol * 1.2, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(og).connect(this.out);
    o.start(t);
    o.stop(t + 0.5);
  }
}
