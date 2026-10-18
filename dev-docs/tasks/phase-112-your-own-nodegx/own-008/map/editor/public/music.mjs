// Background music for the map: an original, ominous march in G minor, played the way a 90s game
// console would — a square-wave lead, a triangle bass, a noise snare and a thumping kick, all made
// with Web Audio, nothing downloaded. (It is not John Williams' Imperial March: that melody is
// copyrighted. Put a track you own in editor/music/ and it plays instead.)
//
// Browsers only start sound after a click or a key, so start() is called from the first gesture.

const BPM = 104;
const SIXTEENTH = 60 / BPM / 4;

// The melody, bar by bar: [note, length in sixteenths]; 'R' is a rest. 16 sixteenths a bar.
const MELODY = [
  [['G4', 4], ['D4', 3], ['D4', 1], ['G4', 4], ['Bb4', 4]],
  [['A4', 3], ['G4', 1], ['F4', 4], ['G4', 8]],
  [['Bb4', 4], ['C5', 3], ['Bb4', 1], ['A4', 4], ['F4', 4]],
  [['G4', 6], ['F#4', 2], ['G4', 8]],
  [['D5', 4], ['C5', 3], ['Bb4', 1], ['A4', 4], ['D5', 4]],
  [['Eb5', 6], ['D5', 2], ['C5', 4], ['Bb4', 4]],
  [['A4', 3], ['Bb4', 1], ['C5', 4], ['D4', 4], ['F#4', 4]],
  [['G4', 12], ['R', 4]]
];
// The bass: each bar's root, played root–fifth on the beats.
const ROOTS = ['G2', 'D2', 'Eb2', 'D2', 'G2', 'C2', 'D2', 'G2'];

const NAMES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function freq(note) {
  const m = /^([A-G][b#]?)(\d)$/.exec(note);
  const midi = (Number(m[2]) + 1) * 12 + NAMES[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Music {
  constructor() {
    this.on = localStorage.getItem('map-music') !== 'off';
    this.playing = false;
    this.track = null; // an <audio> for a file in editor/music/, when there is one
  }

  /** Looks for a track of the person's own in editor/music/. */
  async findTrack() {
    try {
      const files = await (await fetch('/api/music')).json();
      if (files.length) {
        this.track = new Audio(`/music/${encodeURIComponent(files[0])}`);
        this.track.loop = true;
        this.track.volume = 0.45;
        this.trackName = files[0];
      }
    } catch {
      /* no server list: the chiptune it is */
    }
  }

  toggle() {
    this.on = !this.on;
    localStorage.setItem('map-music', this.on ? 'on' : 'off');
    if (this.on) this.start();
    else this.stop();
    return this.on;
  }

  start() {
    if (!this.on || this.playing) return;
    this.playing = true;
    if (this.track) {
      this.track.play().catch(() => (this.playing = false));
      return;
    }
    this.ctx ??= new AudioContext();
    this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.noise ??= this.noiseBuffer();
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.playing = false;
    if (this.track) this.track.pause();
    clearInterval(this.timer);
    if (this.master) {
      const m = this.master;
      m.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      setTimeout(() => m.disconnect(), 300);
      this.master = null;
    }
  }

  /** Schedules every sixteenth that falls in the next 150 ms (the usual Web Audio look-ahead). */
  schedule() {
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % (MELODY.length * 16);
      this.nextTime += SIXTEENTH;
    }
  }

  playStep(step, t) {
    const bar = Math.floor(step / 16);
    const pos = step % 16;
    // The lead: a note starts on this sixteenth if the bar's running total reaches it.
    let at = 0;
    for (const [note, len] of MELODY[bar]) {
      if (at === pos && note !== 'R') this.tone('square', freq(note), t, len * SIXTEENTH * 0.92, 0.09);
      at += len;
    }
    // The bass on every beat, root then fifth.
    if (pos % 4 === 0) {
      const root = freq(ROOTS[bar]);
      this.tone('triangle', pos % 8 === 0 ? root : root * 1.5, t, SIXTEENTH * 3.2, 0.22);
    }
    // Drums: kick on 1 and 3, snare on 2 and 4, a snare roll into every fourth bar.
    if (pos === 0 || pos === 8) this.kick(t);
    if (pos === 4 || pos === 12) this.snare(t, 0.16);
    if (bar % 4 === 3 && pos >= 12) this.snare(t, 0.08 + (pos - 12) * 0.02);
  }

  tone(type, f, t, dur, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.16);
  }

  snare(t, vol) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + 0.1);
  }

  noiseBuffer() {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
}
