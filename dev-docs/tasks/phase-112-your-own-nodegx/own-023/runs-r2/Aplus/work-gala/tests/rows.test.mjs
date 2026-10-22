// The rows a grown-up may change (applyRows): a rename, a price, the starting stars reach the rules and the new school.
// Its own file: node --test runs each file in its own process, so these changes don't leak into the other tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRows, MOVES, OUTFITS, START, EDITABLE } from '../src/data.js';
import { defaultSchool, defaultPlan } from '../src/plan.js';
import { simulate } from '../src/engine.js';

test('a renamed step, a cheaper costume and 50 starting stars reach the game; an unknown table is refused', () => {
  applyRows({ moves: { plie: { fr: 'Plié royal', en: 'Royal plié' } }, outfits: { fee: { price: 20 } }, start: { stars: 50 } });
  assert.equal(MOVES.plie.fr, 'Plié royal'); assert.equal(MOVES.plie.c, 4, 'the other fields stay');
  assert.equal(OUTFITS.fee.price, 20); assert.equal(START.stars, 50); assert.equal(defaultSchool().stars, 50);
  assert.throws(() => applyRows({ spells: { x: {} } }), /no table "spells"/);
  assert.ok(EDITABLE.includes('moves') && EDITABLE.includes('start'));
});
test('a rule changed by a grown-up changes the verdict: plié at difficulty 3 makes the little ones fall', () => {
  const plan = defaultPlan(), school = defaultSchool();
  const before = simulate({ plan, school, season: 1, mode: 'try', seed: 3 }).perf.P1.slips.length;
  applyRows({ moves: { plie: { d: 3 } } });
  const after = simulate({ plan, school, season: 1, mode: 'try', seed: 3 }).perf.P1.slips.length;
  assert.ok(after > before, `${before} → ${after}`);
});
