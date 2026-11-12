// The grown-ups' settings file (change 001): what it may change, the limits it keeps, and that nothing in it can break the
// game. Its own file: applySettings() changes the rows in place, and node --test gives each file its own process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOVES, OUTFITS, NAMES, START, CLS } from '../src/data.js';
import { defaultPlan, defaultSchool } from '../src/plan.js';
import { simulate, routineInfo, isOwned, changeTime } from '../src/engine.js';
import { G } from '../src/state.js';
import { moveName, dancerName } from '../src/i18n.js';
import { SETTINGS_V, DEFAULTS, sanitize, toRows, applySettings, check, withField, newRow } from '../src/settings.js';

const file = (rows) => ({ v: SETTINGS_V, rows });

test('15. When someone loads a broken or made-up file, nothing throws and only the valid part is kept', () => {
  for (const bad of [null, undefined, 42, 'garbage', [1, 2], { v: 99 }, { rows: 'x' }, { v: 1, rows: { spells: { x: {} } } }, { v: 1, rows: { moves: 'x' } },
    { v: 1, rows: { moves: { plie: 'x', nope: { fr: 'Nope' }, __proto__: { fr: 'x' } } } }, { v: 1, rows: { start: [] } }, { v: 1, rows: { names: { petits: 'Lou' } } }])
    assert.doesNotThrow(() => { const r = sanitize(bad); assert.equal(r.file.v, SETTINGS_V); assert.equal(typeof r.file.rows, 'object'); }, JSON.stringify(bad));
  const r = sanitize({ v: 1, rows: { spells: { x: {} }, moves: { plie: { fr: 'Plié doux', c: 'huit', zap: 1 }, nope: { fr: 'x' } }, start: { stars: 40, gold: 9 } } });
  assert.deepEqual(r.file.rows, { moves: { plie: { fr: 'Plié doux' } }, start: { stars: 40 } });
  assert.ok(r.dropped >= 5, `dropped ${r.dropped}`);
  assert.doesNotThrow(() => applySettings({ v: 1, rows: { spells: { x: {} } } }), 'an unknown table is filtered before applyRows');
});

test('14. When someone types a number that is too big, below zero or not a number, it is refused with a reason', () => {
  assert.deepEqual(check('outfits', 'fee', 'price', 20), { ok: true, value: 20 });
  assert.equal(check('outfits', 'fee', 'price', -5).why, 'range');
  assert.equal(check('outfits', 'fee', 'price', 100000).why, 'range');
  assert.equal(check('outfits', 'fee', 'price', 'abc').why, 'nan');
  assert.equal(check('outfits', 'fee', 'price', 2.5).why, 'whole');
  assert.equal(check('moves', 'plie', 'd', 4).why, 'range');
  assert.equal(check('start', 'start', 'stars', -1).why, 'range');
  assert.equal(check('start', 'start', 'stars', '120').value, 120, 'a typed number is read as a number');
  assert.equal(check('outfits', 'justaucorps', 'price', 10).why, 'field', 'a free costume has no price to change');
  const r = sanitize(file({ outfits: { fee: { price: -5, min: 99 }, cygne: { price: NaN }, robe: { price: Infinity } }, start: { stars: 1e12 } }));
  assert.deepEqual(r.file.rows, {});
});

test('13. When someone types a rude word as a name, it is refused, and a file can\'t bring one in either', () => {
  assert.equal(check('moves', 'plie', 'fr', 'merde').why, 'rude');
  assert.equal(check('names', 'petits', 0, 'c0nnard').why, 'rude');
  assert.equal(check('moves', 'plie', 'fr', '').why, 'empty');
  assert.equal(check('moves', 'plie', 'fr', 'x'.repeat(40)).why, 'long');
  const names = [...NAMES.petits]; names[0] = 'Louna'; names[1] = 'Pütain';
  const r = sanitize(file({ moves: { plie: { fr: 'putain', en: 'Soft plié' } }, names: { petits: names }, classes: { petits: { fr: 'Les nuls' } } }));
  assert.deepEqual(r.file.rows.moves, { plie: { en: 'Soft plié' } });
  assert.equal(r.file.rows.names.petits[0], 'Louna');
  assert.equal(r.file.rows.names.petits[1], DEFAULTS.names.petits[1], 'a rude dancer name falls back to her own name');
  assert.equal(r.file.rows.classes, undefined);
});

test('17. When a name in a file contains web code or a link, it is left out', () => {
  const r = sanitize(file({ moves: { plie: { fr: '<img src=x onerror=alert(1)>', en: 'www.example.com' } }, outfits: { fee: { icon: '<b>' } } }));
  assert.deepEqual(r.file.rows, {});
});

test('9. When I put a field back to default, it leaves the file, and the game\'s own value is kept safe', () => {
  const f = file({ moves: { plie: { fr: 'Plié royal', d: 2 } } });
  const g = withField(f, 'moves', 'plie', 'fr', undefined);
  assert.deepEqual(g.rows, { moves: { plie: { d: 2 } } });
  assert.deepEqual(withField(g, 'moves', 'plie', 'd', undefined).rows, {}, 'an empty row and an empty table are tidied away');
  assert.deepEqual(f.rows.moves.plie, { fr: 'Plié royal', d: 2 }, 'the old file is not changed');
});

test('3. When I rename a dance step, the new name is what the game calls it, in French and in English', () => {
  applySettings(file({ moves: { plie: { fr: 'Plié royal', en: 'Royal plié' } } }));
  G.lang = 'fr'; assert.equal(moveName('plie'), 'Plié royal');
  G.lang = 'en'; assert.equal(moveName('plie'), 'Royal plié');
  G.lang = 'fr';
  assert.equal(MOVES.plie.c, 4, 'the step keeps its other fields');
  assert.equal(DEFAULTS.moves.plie.fr, 'Plié', 'the default is remembered for "back to default"');
});

test('4. When I make a step harder, a dance that uses it has more chance of a slip', () => {
  const plan = defaultPlan(), school = defaultSchool();
  const before = simulate({ plan, school, season: 1, mode: 'rehearsal', seed: 1 }).perf.P1.ex.expected;
  applySettings(file({ moves: { plie: { d: 3 } } }));
  const after = simulate({ plan, school, season: 1, mode: 'rehearsal', seed: 1 }).perf.P1.ex.expected;
  assert.equal(MOVES.plie.d, 3);
  assert.ok(after > before * 3, `${before} → ${after}`);
});

test('5. When I change what a costume costs, the game asks that price', () => {
  applySettings(file({ outfits: { fee: { price: 12 } } }));
  assert.equal(OUTFITS.fee.price, 12);
  assert.equal(isOwned(defaultSchool(), 'outfit', 'fee'), false, 'still to buy');
});

test('6. When I set the starting stars, a new school starts with that many', () => {
  applySettings(file({ start: { stars: 77 } }));
  assert.equal(START.stars, 77); assert.equal(defaultSchool().stars, 77);
});

test('7. When I add a new costume, the game knows it: its price, the time to put it on, the dances it suits', () => {
  const { id, row } = newRow('outfits', file({}));
  assert.equal(id, 'new1');
  const f = file({ outfits: { [id]: { ...row, fr: 'Licorne', en: 'Unicorn', icon: '🦄', price: 25, min: 3, themes: ['lucioles'], look: 'fee' } } });
  assert.deepEqual(sanitize(f).file, f, 'a good new costume is kept whole');
  applySettings(f);
  assert.equal(OUTFITS.new1.fr, 'Licorne'); assert.equal(OUTFITS.new1.price, 25);
  const plan = defaultPlan(), school = defaultSchool(); school.owned['outfit:new1'] = true; plan.numbers.P1.costume.outfit = 'new1';
  const R = simulate({ plan, school, season: 1, mode: 'rehearsal', seed: 1 });
  assert.ok(R.perf.P1.wow.src.includes('costume'), 'it suits the fireflies');
  assert.equal(changeTime(plan.numbers.P2.costume, plan.numbers.P1.costume, { shoes: 0, railCap: 99, totalDancers: 1 }).lines[0][1], 3);
});

test('8. When I add a new step, the game knows it: its counts, its difficulty, its styles, and a dance can use it', () => {
  const f = file({ moves: { new1: { fr: 'Le papillon', en: 'Butterfly', icon: '🦋', c: 8, d: 2, a: 1, b: 1, st: 'classique contemporain', like: 'bras' } } });
  assert.deepEqual(sanitize(f).file, f);
  applySettings(f);
  assert.equal(MOVES.new1.c, 8);
  assert.equal(routineInfo(['plie', 'new1'], 'classique').phrase, 12);
  const plan = defaultPlan(); plan.numbers.G1.blocks[0].moves.push('new1');
  const R = simulate({ plan, school: defaultSchool(), season: 1, mode: 'try', seed: 2 });
  assert.ok(R.perf.G1.dance.moves.includes('new1'));
  // a half-made new step is completed from the template rather than left broken
  const half = sanitize(file({ moves: { new2: { fr: 'Saut de puce', d: 9 } } })).file.rows.moves.new2;
  for (const k of ['fr', 'en', 'icon', 'c', 'd', 'a', 'b', 'st', 'like']) assert.ok(half[k] !== undefined, k);
  assert.equal(half.fr, 'Saut de puce'); assert.equal(half.d, 1);
  // only new1…new12: no other new ids
  assert.deepEqual(sanitize(file({ moves: { hack: { fr: 'x' }, new99: { fr: 'y' } } })).file.rows, {});
});

test('13. Dancer names, class names and dance names can be changed, and are kind', () => {
  const names = [...DEFAULTS.names.petits]; names[0] = 'Louna';
  applySettings(file({ names: { petits: names }, classes: { petits: { fr: 'Les bébés' } } }));
  assert.equal(dancerName('petits', 0), 'Louna'); assert.equal(CLS.petits.fr, 'Les bébés'); assert.equal(CLS.petits.n, 6);
});

test('15. An older settings file (the bare rows, with no version) still opens', () => {
  const r = sanitize({ moves: { plie: { fr: 'Plié ancien' } }, start: { stars: 45 } });
  assert.deepEqual(r.file, { v: SETTINGS_V, rows: { moves: { plie: { fr: 'Plié ancien' } }, start: { stars: 45 } } });
  assert.deepEqual(toRows(r.file), { moves: { plie: { fr: 'Plié ancien' } }, start: { stars: 45 } });
});
