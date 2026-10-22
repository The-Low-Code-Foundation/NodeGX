// The music's tests: every number has a tune, every line fills its bars, and the score ends exactly where the music does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TUNES, score, parseLine, parseChords, midi } from '../src/tunes.js';
import { NUMBERS } from '../src/data.js';

test('notes are read as MIDI numbers', () => {
  assert.equal(midi('A4'), 69); assert.equal(midi('C4'), 60); assert.equal(midi('F#5'), 78); assert.equal(midi('Bb3'), 58);
});

test('every number has a tune, and every line and chord chart fits the tune exactly', () => {
  for (const id of Object.keys(NUMBERS)) {
    const T = TUNES[id]; assert.ok(T, `${id} has no tune`);
    assert.equal(T.len % 8, 0, `${id}: whole bars`);
    const ch = parseChords(T.chords).len; assert.equal(T.len % ch, 0, `${id}: the chords (${ch}) repeat to fill ${T.len}`);
    for (const p of T.parts) { const L = parseLine(p.src).len; assert.equal(T.len % L, 0, `${id} ${p.ins}: a line of ${L} counts in a tune of ${T.len}`); }
  }
});

test('the score plays from the first count to the last bar, which is the home chord, and nothing sounds after the music ends', () => {
  for (const id of Object.keys(NUMBERS)) {
    const s = score(id), N = NUMBERS[id], ev = s.events;
    assert.equal(s.counts, N.counts);
    assert.ok(ev.some((e) => e.c === 0), `${id}: something on count 0`);
    for (const e of ev) {
      assert.ok(e.c >= 0 && e.c <= N.counts - 8, `${id}: an event at ${e.c}`);
      if (e.d) assert.ok(e.c + e.d <= N.counts + 1e-9, `${id}: a note at ${e.c} rings past the end`);
    }
    const last = ev.filter((e) => e.c === s.endC && !e.drum);
    assert.ok(last.length >= 3 && last.every((e) => e.d === 8), `${id}: the last bar is a held chord`);
    assert.ok(ev.filter((e) => e.c < s.endC).every((e) => e.c + (e.d || 0) <= s.endC + 0.31), `${id}: the tune stops for the last chord`);
  }
});

test('the round enters voice by voice, and the canon only once its ground has played', () => {
  const p2 = score('P2').events.filter((e) => e.ins === 'flute'); assert.equal(Math.min(...p2.map((e) => e.c)), 16);
  const m1 = score('M1').events.filter((e) => e.ins === 'violin'); assert.equal(Math.min(...m1.map((e) => e.c)), 32);
});
