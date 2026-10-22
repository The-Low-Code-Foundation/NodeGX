// The music of each number, written as notes. Each tune is a public-domain composition (or a traditional song, or a
// groove written for the game), arranged here and played live by music.js with Web Audio. There is no recording to
// license, download or keep in time: the notes are placed on the dance's own counts.
// One count = one eighth note, so a bar is 8 counts. A number's music lasts exactly NUMBERS[id].counts counts; the tune
// loops to fill them and the last bar is always the home chord, so the music ends where the engine says it ends.
// No DOM and no audio here: score(id) is a pure function (tests/music.test.mjs reads it).
import { NUMBERS } from './data.js';

/* ---------------- notation ---------------- */
// a line: "C5:2 r:2 | E5:1 …" — note (or r for a rest) : length in counts; "|" is only there to make bars readable
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const acc = (a) => (a === '#' ? 1 : a === 'b' ? -1 : 0);
export function midi(s) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s); if (!m) throw new Error(`not a note: ${s}`);
  return 12 * (+m[3] + 1) + PC[m[1]] + acc(m[2]);
}
export function parseLine(src) {
  let c = 0; const notes = [];
  for (const tok of src.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [p, d] = tok.split(':'), len = +d; if (!(len > 0)) throw new Error(`no length: ${tok}`);
    if (p !== 'r') notes.push({ c, d: len, n: midi(p) }); c += len;
  }
  return { notes, len: c };
}
// chords: "C | F C | G7" — one bar each between the bars, shared evenly by the chords written in it
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6] };
export function chordOf(s) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(s); if (!m || !QUAL[m[3]]) throw new Error(`not a chord: ${s}`);
  return { name: s, root: (PC[m[1]] + acc(m[2]) + 12) % 12, iv: QUAL[m[3]] };
}
export function parseChords(src) {
  const chords = []; let c = 0;
  for (const bar of src.split('|')) {
    const cs = bar.trim().split(/\s+/).filter(Boolean), d = 8 / cs.length;
    for (const s of cs) { chords.push({ c, d, ...chordOf(s) }); c += d; }
  }
  return { chords, len: c };
}

/* ---------------- the tunes ---------------- */
// len: counts in one time through; home: the chord it ends on; chords repeat to fill len, and so does each part's line.
// parts: { ins, src, oct (semitones), at (counts late, for a round), from (the first time through it plays), v, pan }
// comp / bass: [pattern, instrument] drawn from the chords; drums: a one-bar pattern; swing: how late the off-counts fall
const TWINKLE = `C5:2 C5:2 G5:2 G5:2 | A5:2 A5:2 G5:4 | F5:2 F5:2 E5:2 E5:2 | D5:2 D5:2 C5:4 |
  G5:2 G5:2 F5:2 F5:2 | E5:2 E5:2 D5:4 | G5:2 G5:2 F5:2 F5:2 | E5:2 E5:2 D5:4 |
  C5:2 C5:2 G5:2 G5:2 | A5:2 A5:2 G5:4 | F5:2 F5:2 E5:2 E5:2 | D5:2 D5:2 C5:4`;
const JACQUES = `G4:2 A4:2 B4:2 G4:2 | G4:2 A4:2 B4:2 G4:2 | B4:2 C5:2 D5:4 | B4:2 C5:2 D5:4 |
  D5:1 E5:1 D5:1 C5:1 B4:2 G4:2 | D5:1 E5:1 D5:1 C5:1 B4:2 G4:2 | G4:2 D4:2 G4:4 | G4:2 D4:2 G4:4`;
// Pachelbel: the ground in the cellos, then the same violin line entering three times, a cycle apart (a canon)
const CANON = `r:32 | F#5:4 E5:4 D5:4 C#5:4 B4:4 A4:4 B4:4 C#5:4 | D5:4 C#5:4 B4:4 A4:4 G4:4 F#4:4 G4:4 E4:4 |
  D5:2 F#5:2 A5:2 G5:2 F#5:2 D5:2 F#5:2 E5:2 D5:2 B4:2 D5:2 A5:2 G5:2 B5:2 A5:2 G5:2`;
const SHANTY = `A4:2 A4:1 A4:1 A4:2 A4:1 A4:1 | A4:2 D4:2 F4:2 A4:2 | G4:2 G4:1 G4:1 G4:2 G4:1 G4:1 | G4:2 C4:2 E4:2 G4:2 |
  A4:2 A4:1 A4:1 A4:2 A4:1 A4:1 | A4:2 B4:2 C5:2 D5:2 | C5:2 A4:2 G4:2 E4:2 | D4:4 D4:4`;
const ODE_A = 'E5:2 E5:2 F5:2 G5:2 | G5:2 F5:2 E5:2 D5:2 | C5:2 C5:2 D5:2 E5:2';
const ODE = `${ODE_A} | E5:3 D5:1 D5:4 | ${ODE_A} | D5:3 C5:1 C5:4 |
  D5:2 D5:2 E5:2 C5:2 | D5:2 E5:1 F5:1 E5:2 C5:2 | D5:2 E5:1 F5:1 E5:2 D5:2 | C5:2 D5:2 G4:4 | ${ODE_A} | D5:3 C5:1 C5:4`;
const SWAN = `F#5:12 B4:1 C#5:1 D5:1 E5:1 | F#5:6 D5:2 | F#5:6 D5:2 | F#5:6 B4:2 | D5:2 B4:2 G4:2 D5:2 | B4:8 | r:8`;
const KING = `B3:1 C#4:1 D4:1 E4:1 F#4:1 D4:1 F#4:2 | F4:1 C#4:1 F4:2 E4:1 C4:1 E4:2 |
  B3:1 C#4:1 D4:1 E4:1 F#4:1 D4:1 F#4:1 B4:1 | A4:1 F#4:1 D4:1 F#4:1 A4:4 |
  F#4:1 G#4:1 A#4:1 B4:1 C#5:1 A#4:1 C#5:2 | D5:1 A#4:1 D5:2 C#5:1 A#4:1 C#5:2 |
  F#4:1 G#4:1 A#4:1 B4:1 C#5:1 A#4:1 C#5:1 F#5:1 | E5:1 C#5:1 A#4:1 C#5:1 E5:4`;
const STREET = `r:8 | r:4 E5:1 G5:1 A5:2 | r:8 | r:4 A5:1 G5:1 E5:2 | r:8 | r:4 E5:1 G5:1 A5:1 C6:1 | B5:4 G#5:4 | E5:8`;
const DISCO = `A5:2 G5:1 A5:1 r:1 E5:1 G5:2 | F#5:2 E5:1 D5:1 r:2 A4:2 | A5:2 G5:1 A5:1 r:1 E5:1 C6:2 | B5:1 A5:1 F#5:2 r:4 |
  A5:2 C6:2 A5:2 G5:2 | G#5:4 E5:4 | A5:1 C6:1 B5:1 A5:1 G5:1 E5:1 G5:2 | G#5:2 B5:2 E6:4`;

export const TUNES = {
  P1: {
    title: { fr: 'Ah ! vous dirai-je, maman', en: 'Twinkle, Twinkle, Little Star' },
    by: { fr: 'chanson traditionnelle ; Mozart en a écrit douze variations', en: 'traditional; Mozart wrote twelve variations on it' },
    len: 96, home: 'C', chords: 'C | F C | F C | G C | C G7 | C G | C G7 | C G | C | F C | F C | G C',
    comp: ['alberti', 'piano'],
    parts: [{ ins: 'bell', src: TWINKLE }, { ins: 'bell', src: TWINKLE, oct: 12, from: 1, v: 0.45, pan: 0.3 }],
  },
  P2: {
    title: { fr: 'Frère Jacques', en: 'Frère Jacques' },
    by: { fr: 'chanson traditionnelle, en canon à trois voix', en: 'traditional, sung as a round in three voices' },
    len: 64, home: 'G', chords: 'G', comp: ['stride', 'piano'], bass: ['oompah', 'upright'], drums: 'brush', swing: 0.3,
    parts: [
      { ins: 'piano', src: JACQUES, pan: -0.3 }, { ins: 'flute', src: JACQUES, at: 16, pan: 0.3 },
      { ins: 'bell', src: JACQUES, oct: 12, at: 32, v: 0.6 },
    ],
  },
  M1: {
    title: { fr: 'Canon en ré', en: 'Canon in D' },
    by: { fr: 'Johann Pachelbel, fin du XVIIᵉ siècle', en: 'Johann Pachelbel, late 1600s' },
    len: 128, home: 'D', chords: 'D A | Bm F#m | G D | G A', comp: ['pad', 'strings'],
    parts: [
      { ins: 'cello', src: 'D3:4 A2:4 B2:4 F#2:4 G2:4 D2:4 G2:4 A2:4' },
      { ins: 'violin', src: CANON, pan: -0.35 }, { ins: 'violin', src: CANON, at: 32, pan: 0.35 }, { ins: 'violin', src: CANON, at: 64, v: 0.8 },
    ],
  },
  M2: {
    title: { fr: 'Chant de marins', en: 'Sea shanty' },
    by: { fr: 'air traditionnel anglais', en: 'traditional English air' },
    len: 64, home: 'Dm', chords: 'Dm | Dm | C | C | Dm | Dm | Am C | Dm', comp: ['stride', 'accordion'], bass: ['oompah', 'upright'], drums: 'march', swing: 0.2,
    parts: [{ ins: 'accordion', src: SHANTY }, { ins: 'flute', src: SHANTY, oct: 12, from: 2, v: 0.6, pan: 0.3 }],
  },
  G1: {
    title: { fr: 'Ode à la joie', en: 'Ode to Joy' },
    by: { fr: 'Ludwig van Beethoven, 1824', en: 'Ludwig van Beethoven, 1824' },
    len: 128, home: 'C', chords: 'C | G | C | G | C | G | C | G C | G C | G C | G7 | D7 G | C | G | C | G C',
    comp: ['arp', 'piano'], bass: ['halves', 'cello'],
    parts: [{ ins: 'violin', src: ODE }, { ins: 'flute', src: ODE, oct: 12, from: 1, v: 0.5, pan: 0.3 }],
  },
  G2: {
    title: { fr: 'Le Lac des cygnes', en: 'Swan Lake' },
    by: { fr: 'Piotr Ilitch Tchaïkovski, 1876', en: 'Pyotr Ilyich Tchaikovsky, 1876' },
    len: 64, home: 'Bm', chords: 'Bm | Bm | Bm | Bm | Bm | G | Bm | Em F#', comp: ['harp', 'bell'], bass: ['halves', 'cello'],
    parts: [{ ins: 'oboe', src: SWAN }, { ins: 'strings', src: SWAN, oct: -12, from: 2, v: 0.8, pan: -0.3 }],
  },
  A1: {
    title: { fr: 'Rythme de rue', en: 'Street beat' },
    by: { fr: 'écrit pour le jeu', en: 'written for the game' },
    len: 64, home: 'Am7', chords: 'Am7 | Am7 | Dm7 | Dm7 | Fmaj7 | Fmaj7 | E7 | E7', comp: ['rhodes', 'rhodes'], bass: ['boom', 'sub'], drums: 'boombap', swing: 0.2,
    parts: [{ ins: 'pluck', src: STREET, from: 1 }],
  },
  A2: {
    title: { fr: 'Dans l’antre du roi de la montagne', en: 'In the Hall of the Mountain King' },
    by: { fr: 'Edvard Grieg, 1875, en version hip-hop', en: 'Edvard Grieg, 1875, as hip-hop' },
    len: 64, home: 'Bm', chords: 'Bm | Bm | Bm | Bm | F# | F# | F# | F#7', bass: ['b808', 'sub'], drums: 'battle',
    parts: [{ ins: 'pluck', src: KING }, { ins: 'brass', src: KING, oct: 12, from: 2, v: 0.7, pan: 0.3 }],
  },
  F1: {
    title: { fr: 'Groove disco', en: 'Disco groove' },
    by: { fr: 'écrit pour le jeu', en: 'written for the game' },
    len: 64, home: 'Am', chords: 'Am7 | D7 | Am7 | D7 | Fmaj7 | E7 | Am7 | E7', comp: ['stabs', 'brass'], bass: ['octaves', 'synthbass'], drums: 'disco',
    parts: [{ ins: 'violin', src: DISCO, from: 1 }],
  },
};

/* ---------------- from chords to accompaniment ---------------- */
// each pattern turns one chord (lasting d counts) into notes; positions are counts from the chord's start
const tonesOf = (ch) => { let r = 48 + ch.root; if (r < 55) r += 12; return ch.iv.map((i) => r + i); };
const bassOf = (ch) => 36 + ch.root;
const COMP = {
  alberti: (ch, d) => { const [a, b, c] = tonesOf(ch); return Array.from({ length: d }, (_, i) => ({ c: i, d: 1, n: [a, c, b, c][i % 4], v: 0.4 })); },
  arp: (ch, d) => { const t = tonesOf(ch), s = [t[0], t[1], t[2], t[0] + 12, t[2], t[1]]; return Array.from({ length: d }, (_, i) => ({ c: i, d: 1.5, n: s[i % 6], v: 0.35 })); },
  harp: (ch, d) => { const t = tonesOf(ch).slice(0, 3), s = [t[0] - 12, t[1] - 12, t[2] - 12, t[0], t[1], t[2], t[0] + 12, t[2]]; return Array.from({ length: d }, (_, i) => ({ c: i, d: 2, n: s[i % 8], v: 0.3 })); },
  pad: (ch, d) => tonesOf(ch).map((n) => ({ c: 0, d, n, v: 0.3 })),
  stride: (ch, d) => [2, 6].filter((p) => p < d).flatMap((p) => tonesOf(ch).map((n) => ({ c: p, d: 1.5, n, v: 0.3 }))),
  rhodes: (ch, d) => [[0, 3], [6, 2]].filter(([p]) => p < d).flatMap(([p, l]) => tonesOf(ch).map((n) => ({ c: p, d: l, n, v: 0.35 }))),
  stabs: (ch, d) => [1, 3, 5, 7].filter((p) => p < d).flatMap((p) => tonesOf(ch).map((n) => ({ c: p, d: 0.6, n: n + 12, v: 0.3 }))),
};
const BASS = {
  halves: (ch, d) => [0, 4].filter((p) => p < d).map((p) => ({ c: p, d: Math.min(4, d - p), n: bassOf(ch), v: 0.8 })),
  oompah: (ch, d) => [[0, 0], [4, 7]].filter(([p]) => p < d).map(([p, k]) => ({ c: p, d: 2, n: bassOf(ch) + k, v: 0.8 })),
  boom: (ch, d) => [[0, 2], [3, 1], [5, 2]].filter(([p]) => p < d).map(([p, l]) => ({ c: p, d: l, n: bassOf(ch), v: 0.9 })),
  b808: (ch, d) => [[0, 3], [3, 1], [4, 2], [7, 1]].filter(([p]) => p < d).map(([p, l]) => ({ c: p, d: l, n: bassOf(ch) - 12 * (bassOf(ch) > 42), v: 0.9 })),
  octaves: (ch, d) => Array.from({ length: d }, (_, i) => ({ c: i, d: 0.9, n: bassOf(ch) + (i % 2) * 12, v: 0.7 })),
};
// one bar of drums: [sound, count, loudness]
const eight = (s, a, b) => Array.from({ length: 8 }, (_, i) => [s, i, i % 2 ? b : a]);
export const DRUMS = {
  brush: [...eight('brush', 0.5, 0.3), ['kick', 0, 0.5], ['kick', 4, 0.4]],
  march: [...eight('hat', 0.35, 0.2), ['kick', 0, 0.9], ['kick', 4, 0.8], ['snare', 2, 0.6], ['snare', 6, 0.6]],
  boombap: [...eight('hat', 0.4, 0.22), ['kick', 0, 1], ['kick', 3, 0.7], ['kick', 5, 0.85], ['snare', 2, 0.9], ['snare', 6, 0.9]],
  battle: [...Array.from({ length: 16 }, (_, i) => ['hat', i / 2, i % 2 ? 0.15 : 0.32]), ['kick', 0, 1], ['kick', 3, 0.8], ['kick', 4, 0.9], ['snare', 2, 1], ['snare', 6, 1], ['snare', 7.5, 0.3]],
  disco: [['kick', 0, 1], ['kick', 2, 1], ['kick', 4, 1], ['kick', 6, 1], ['clap', 2, 0.8], ['clap', 6, 0.8], ...[1, 3, 5, 7].map((i) => ['ohat', i, 0.4]), ...[0, 2, 4, 6].map((i) => ['hat', i, 0.2])],
};

/* ---------------- the score: every note of one number, on its counts ---------------- */
// events: { c, d, n, ins, v, pan } for notes and { c, drum, v } for drums, sorted by c; nothing at or after `counts`
export function score(id) {
  const T = TUNES[id], counts = NUMBERS[id].counts, endC = counts - 8, ev = [];
  const add = (e) => {
    if (e.c < 0 || e.c >= endC) return;
    if (e.d) e.d = Math.min(e.d, endC - e.c);
    if (T.swing && Number.isInteger(e.c) && e.c % 2 === 1) e.c += T.swing;
    ev.push(e);
  };
  const ch = parseChords(T.chords), lines = T.parts.map((p) => parseLine(p.src));
  for (let k = 0; k * T.len < endC; k++) {
    const base = k * T.len;
    T.parts.forEach((p, j) => {
      if (k < (p.from || 0)) return; const L = lines[j];
      for (let r = 0; r * L.len < T.len; r++) for (const x of L.notes) add({ c: base + (p.at || 0) + r * L.len + x.c, d: x.d, n: x.n + (p.oct || 0), ins: p.ins, v: p.v ?? 1, pan: p.pan || 0 });
    });
    for (let r = 0; r * ch.len < T.len; r++) for (const cd of ch.chords) {
      const at = base + r * ch.len + cd.c;
      if (T.comp) for (const x of COMP[T.comp[0]](cd, cd.d)) add({ ...x, c: at + x.c, ins: T.comp[1], pan: -0.15 });
      if (T.bass) for (const x of BASS[T.bass[0]](cd, cd.d)) add({ ...x, c: at + x.c, ins: T.bass[1], pan: 0 });
    }
    if (T.drums) {
      for (let b = 0; b * 8 < T.len; b++) for (const [s, p, v] of DRUMS[T.drums]) add({ c: base + b * 8 + p, drum: s, v });
      if (k > 0) add({ c: base, drum: 'crash', v: 0.6 });
    }
  }
  // the last bar: everyone lands on the home chord together
  const home = chordOf(T.home), lead = lines[0].notes, avg = lead.reduce((s, x) => s + x.n, 0) / lead.length + (T.parts[0].oct || 0);
  let top = home.root; while (top + 12 <= avg + 6) top += 12;
  ev.push({ c: endC, d: 8, n: top, ins: T.parts[0].ins, v: 0.8, pan: 0 });
  for (const n of tonesOf(home)) ev.push({ c: endC, d: 8, n, ins: T.comp ? T.comp[1] : 'strings', v: 0.25, pan: 0 });
  ev.push({ c: endC, d: 8, n: bassOf(home), ins: T.bass ? T.bass[1] : 'cello', v: 0.6, pan: 0 });
  if (T.drums) ev.push({ c: endC, drum: 'kick', v: 0.7 }, { c: endC, drum: 'crash', v: 0.6 });
  ev.sort((a, b) => a.c - b.c);
  return { id, counts, endC, events: ev };
}
