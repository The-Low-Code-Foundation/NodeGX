// The grown-ups' page logic (scripts/gala/editing.js): the rows it shows, the change a row sends, new steps and costumes.
// Everything it prepares must pass the rule book (scripts/gala/rows.js), or a grown-up would meet a refusal for
// something the page itself offered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => { const m = {}; new Function('exports', readFileSync(join(APP, 'scripts/gala', f), 'utf8'))(m); return m; };
const E = load('editing.js'), { checkChange } = load('rows.js');
const d = await import('../gala-rules/src/data.js');
const passes = (c) => { const r = checkChange(c.table, c.rowId, c.fields); assert.equal(r.ok, true, `${c.table}:${c.rowId} ${JSON.stringify(c.fields)} → ${r.message}`); };

test('every table the grown-ups may change is listed, with the game’s own values', () => {
  const rows = E.rowsToEdit([], d);
  assert.equal(rows.start[0].stars, 30);
  assert.equal(rows.moves.length, Object.keys(d.MOVES).length);
  const plie = rows.moves.find((r) => r.rowId === 'plie');
  assert.equal(plie.fr, 'Plié'); assert.equal(plie.changed, false); assert.deepEqual(plie.editable, ['fr', 'en', 'd']);
  assert.equal(rows.outfits.find((r) => r.rowId === 'tutu').showPrice, false, 'a free costume has no price to change');
  assert.equal(rows.outfits.find((r) => r.rowId === 'fee').showPrice, true);
  for (const t of ['hairs', 'shoes', 'accs']) assert.ok(rows[t].length > 0);
  assert.equal(new Set(Object.values(rows).flat().map((r) => r.id)).size, Object.values(rows).flat().length, 'row ids are unique across lists');
});

test('saved changes show on their rows; the grown-ups’ own steps and costumes join the lists', () => {
  const saved = [
    { get: (k) => ({ table: 'moves', rowId: 'plie', fields: { fr: 'Plié royal', d: 3, id: 'abc' } })[k] },
    { table: 'start', rowId: 'start', fields: { stars: 80 } },
    { table: 'outfits', rowId: 'x01', fields: { fr: 'Licorne', en: 'Unicorn', min: 5, price: 30, icon: '🦄', themes: [], like: 'fee' } },
  ];
  const rows = E.rowsToEdit(saved, d);
  const plie = rows.moves.find((r) => r.rowId === 'plie');
  assert.equal(plie.fr, 'Plié royal'); assert.equal(plie.en, 'Plié'); assert.equal(plie.d, 3); assert.equal(plie.changed, true);
  assert.equal(rows.start[0].stars, 80);
  const licorne = rows.outfits.find((r) => r.rowId === 'x01');
  assert.ok(licorne.isNew); assert.equal(licorne.price, 30);
  assert.equal(E.freeId(saved, 'outfits'), 'x02'); assert.equal(E.freeId(saved, 'moves'), 'x01');
});

test('a row sends only what differs from the game, and undoes itself when nothing does', () => {
  const rows = E.rowsToEdit([], d);
  const plie = rows.moves.find((r) => r.rowId === 'plie');
  const c = E.changeFromRow(plie, { fr: ' Plié  royal ', en: 'Plié', d: '2' });
  assert.deepEqual(c, { action: 'save', key: 'moves:plie', table: 'moves', rowId: 'plie', fields: { fr: 'Plié royal', d: 2 } });
  passes(c);
  assert.equal(E.changeFromRow(plie, { fr: 'Plié', en: 'Plié', d: '1' }).action, 'remove');
  const fee = rows.outfits.find((r) => r.rowId === 'fee');
  passes(E.changeFromRow(fee, { price: '12', min: '6' }));
  passes(E.changeFromRow(rows.start[0], { stars: '75' }));
  const pricey = E.changeFromRow(fee, { price: 'lots' });
  assert.equal(checkChange(pricey.table, pricey.rowId, pricey.fields).ok, false, 'a price that isn’t a number is refused');
});

test('every new step and costume the page can compose passes the rule book', () => {
  const ch = E.choices(d);
  assert.equal(ch.icons.length, E.ICONS.length);
  for (const { Value: icon } of ch.icons) for (const { Value: like } of ch.steps) {
    const s = E.newStep({ fr: 'Pas neuf', en: 'New step', d: '2', like, icon }, d);
    passes({ table: 'moves', rowId: 'x01', fields: s.fields });
  }
  for (const { Value: like } of ch.outfits) {
    const c = E.newCostume({ fr: 'Costume neuf', en: 'New costume', min: '4', price: '25', like, icon: '🦄' }, d);
    passes({ table: 'outfits', rowId: 'x20', fields: c.fields });
  }
  assert.ok(E.newStep({ fr: 'a', en: 'b', d: '1', like: 'nope', icon: '🦄' }, d).error);
  const rows = E.rowsToEdit([{ table: 'moves', rowId: 'x03', fields: E.newStep({ fr: 'Pas neuf', en: 'New step', d: '2', like: 'kick', icon: '🦊' }, d).fields }], d);
  const mine = rows.moves.find((r) => r.rowId === 'x03');
  const edit = E.changeFromRow(mine, { d: '3', fr: 'Pas du renard' });
  assert.equal(edit.fields.like, 'kick'); assert.equal(edit.fields.d, 3); passes(edit);
});
