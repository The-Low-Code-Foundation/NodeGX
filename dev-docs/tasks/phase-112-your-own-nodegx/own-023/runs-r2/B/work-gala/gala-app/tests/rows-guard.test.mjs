// The grown-ups' rule book (scripts/gala/rows.js): what a change may say, and that the cloud functions enforce the very
// same text. `node --test tests/` from gala-app/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(APP, 'scripts/gala/rows.js'), 'utf8');
const rows = {}; new Function('exports', SRC)(rows);
const { checkChange, buildOverrides } = rows;
const between = (text) => { const a = text.indexOf('// ---- CHECKCHANGE BEGIN ----'), b = text.indexOf('// ---- CHECKCHANGE END ----'); return a < 0 || b < 0 ? null : text.slice(a, b); };

const ok = (t, id, f) => { const r = checkChange(t, id, f); assert.equal(r.ok, true, `${t}:${id} ${JSON.stringify(f)} → ${r.message}`); return r; };
const no = (t, id, f, why) => { const r = checkChange(t, id, f); assert.equal(r.ok, false, `${t}:${id} ${JSON.stringify(f)} should be refused`); if (why) assert.match(r.message, why); return r; };
const NEW_STEP = { fr: 'Saut du chat botté', en: 'Puss in boots leap', c: 4, d: 2, a: 1, b: 2, dx: 0, dz: 0, st: 'classique jazz', icon: '🐱', like: 'sautChat' };
const NEW_COSTUME = { fr: 'Licorne', en: 'Unicorn', min: 5, price: 30, icon: '🦄', themes: ['lucioles', 'lumiere'], like: 'fee' };

test('what the grown-ups asked for is accepted', () => {
  assert.deepEqual(ok('moves', 'plie', { fr: '  Plié   royal ', en: 'Royal plié' }).fields, { fr: 'Plié royal', en: 'Royal plié' });
  ok('moves', 'pirouette', { d: 3 });
  ok('outfits', 'fee', { price: 20 });
  ok('outfits', 'cygne', { price: 0, min: 3 });
  ok('start', 'start', { stars: 80 });
  ok('moves', 'x01', NEW_STEP);
  ok('outfits', 'x20', NEW_COSTUME);
  for (const name of ['Technique', 'Contretemps', 'Pas de bourrée', 'L’envolée', 'Grand jeté (bis)', 'Step 2!']) ok('moves', 'kick', { fr: name });
});

test('rude words are refused, however they are spelled', () => {
  for (const name of ['Fuck', 'f.u.c.k', 'FUUUCK yeah', 'sh!t step', 'Merde', 'Connasse', 'Pas de p u t a i n', 'Le saut de salope', 'Bitch', 'Gros con', 'Caca boudin', 'nique ta mère', 'Wanker', 'Encule'])
    no('moves', 'plie', { en: name }, /isn't a word for this game/);
});

test('markup, emoji and odd characters cannot reach the screen', () => {
  for (const name of ['<b>Plié</b>', '<img src=x onerror=alert(1)>', 'a & b', 'say "hi"', 'Plié 🖕', '`code`', 'a‮b', 'x'.repeat(25), '   ', '123', ''])
    no('moves', 'plie', { fr: name });
  no('moves', 'plie', { fr: 42 });
  no('moves', 'plie', { fr: ['Plié'] });
});

test('numbers stay inside the game: whole, and in range', () => {
  for (const d of [0, 4, 2.5, '2', -1, NaN, Infinity, null]) no('moves', 'plie', { d });
  for (const price of [-5, 201, 1e9, '20']) no('outfits', 'fee', { price });
  for (const stars of [-1, 301, 1e6, 3.5]) no('start', 'start', { stars });
  no('outfits', 'fee', { min: 0 }); no('outfits', 'fee', { min: 16 });
});

test('only the allowed tables, rows and fields', () => {
  no('rules', 'start', { hallCloses: 0 }, /can change/);
  no('classes', 'petits', { n: 99 }); no('parking', 'start', { lotLength: 1 }); no('constructor', 'x', { a: 1 });
  no('moves', '__proto__', { fr: 'Plié' }); no('moves', 'constructor', { fr: 'Plié' }); no('moves', 'toString', { fr: 'Plié' });
  no('moves', 'plie', { c: 8 }, /can't change c/);
  no('moves', 'plie', { swap: true }); no('moves', 'plie', {}); no('moves', 'plie', null); no('moves', 'plie', [1]);
  no('outfits', 'tutu', { price: 10 }, /free/);
  no('start', 'start', { stars: 50, more: 1 });
});

test('a new step or costume is complete, uses the grown-ups’ ids, and is based on something the game can draw', () => {
  no('moves', 'x21', NEW_STEP); no('moves', 'x00', NEW_STEP); no('moves', 'mine', NEW_STEP);
  no('hairs', 'x01', { fr: 'Crête', en: 'Mohawk', min: 3, price: 10 }, /only be added/);
  const { icon, ...noIcon } = NEW_STEP; no('moves', 'x02', noIcon, /needs icon/);
  no('moves', 'x02', { ...NEW_STEP, c: 6 }); no('moves', 'x02', { ...NEW_STEP, a: 3 }); no('moves', 'x02', { ...NEW_STEP, dx: 2 });
  no('moves', 'x02', { ...NEW_STEP, like: 'echange' }); no('moves', 'x02', { ...NEW_STEP, st: 'ballet' }); no('moves', 'x02', { ...NEW_STEP, icon: '🖕' });
  no('outfits', 'x02', { ...NEW_COSTUME, themes: ['nope'] }); no('outfits', 'x02', { ...NEW_COSTUME, like: 'x01' });
  no('moves', 'x02', { ...NEW_STEP, swap: true });
});

test('the saved changes reach the rules: a renamed step, a harder step, a new step danced, a new costume worn', async () => {
  const data = await import('../gala-rules/src/data.js');
  const { defaultPlan, defaultSchool } = await import('../gala-rules/src/plan.js');
  const { simulate } = await import('../gala-rules/src/engine.js');
  const saved = [
    { table: 'moves', rowId: 'plie', fields: { fr: 'Plié royal', d: 3 } },
    { table: 'moves', rowId: 'x01', fields: NEW_STEP },
    { table: 'outfits', rowId: 'x01', fields: NEW_COSTUME },
    { table: 'start', rowId: 'start', fields: { stars: 75 } },
    { table: 'moves', rowId: 'gone', fields: { fr: 'Old' } }, // not a row: skipped
    { table: 'moves', rowId: 'plie', fields: { fr: '<script>' } }, // refused again here
    { get: (k) => ({ table: 'outfits', rowId: 'fee', fields: JSON.stringify({ price: 5 }) })[k] }, // a Noodl record, fields as text
  ];
  const { over, skipped } = buildOverrides(saved, data);
  assert.equal(skipped.length, 2, skipped.join('\n'));
  data.applyRows(over);
  assert.equal(data.MOVES.plie.fr, 'Plié royal'); assert.equal(data.MOVES.plie.en, 'Plié'); assert.equal(data.MOVES.plie.d, 3);
  assert.equal(data.MOVES.x01.like, 'sautChat'); assert.equal(data.OUTFITS.x01.en, 'Unicorn'); assert.equal(data.OUTFITS.fee.price, 5);
  assert.equal(defaultSchool().stars, 75);
  const plan = defaultPlan();
  plan.numbers.P1.blocks[0].moves = ['x01', 'reception', 'plie', 'bras', 'tourne', 'plie', 'reverence'];
  plan.numbers.P1.costume.outfit = 'x01';
  const day = simulate({ plan, school: { ...defaultSchool(), owned: { 'outfit:x01': true } }, season: 1, mode: 'try', seed: 3 });
  assert.ok(day.perf.P1, 'the little ones dance their number with the new step');
});

test('the cloud functions enforce the very same rule book', () => {
  const mine = between(SRC);
  assert.ok(mine, 'scripts/gala/rows.js has its markers');
  const dir = join(APP, 'components', '__cloud__');
  const found = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(join(d, e.name)); else if (e.name === 'nodes.json') found.push(join(d, e.name)); } };
  if (existsSync(dir)) walk(dir);
  const copies = found.flatMap((f) => JSON.stringify(JSON.parse(readFileSync(f, 'utf8'))).includes('CHECKCHANGE BEGIN')
    ? [[f, JSON.parse(readFileSync(f, 'utf8'))]] : []);
  assert.ok(copies.length >= 1, 'Grown-ups/Save Change carries the rule book');
  for (const [f, nodes] of copies) {
    const scripts = JSON.stringify(nodes).match(/"functionScript":"((?:[^"\\]|\\.)*)"/g).map((m) => JSON.parse(m.slice('"functionScript":'.length)));
    const theirs = scripts.map(between).find(Boolean);
    assert.equal(theirs, mine, `${f} carries a different rule book from scripts/gala/rows.js`);
  }
});
