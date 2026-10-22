// Older saves keep opening (change 001): a save from before the settings, and a save that still points at a costume or a
// step a grown-up has since removed. mend() repairs both without losing the rest of the plan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mend, fresh } from '../src/state.js';
import { simulate } from '../src/engine.js';

// a save exactly as the game wrote it before change 001 (no `at`), from season 2
function oldSave() {
  const s = JSON.parse(JSON.stringify(fresh())); delete s.at;
  s.season = 2; s.school.stars = 64; s.school.name = 'Les Étoiles';
  s.plan.order = ['accueil', 'G1', 'M1', 'P1', 'entracte', 'P2', 'M2', 'G2', 'final'];
  s.plan.numbers.G1.A[0] = { x: -4, z: 2 };
  s.plan.numbers.G1.blocks.push({ id: 'b', name: 'Le final', moves: ['plie', 'tourne'] }); s.plan.numbers.G1.chain.push('b');
  s.plan.snack = 'fruits'; s.plan.numbers.P1.costume.color = '#4f7cff';
  return s;
}

test('18. An old save opens with its running order, formations, dances, costumes and snack untouched', () => {
  const s = mend(oldSave());
  assert.deepEqual(s.plan.order, ['accueil', 'G1', 'M1', 'P1', 'entracte', 'P2', 'M2', 'G2', 'final']);
  assert.deepEqual(s.plan.numbers.G1.A[0], { x: -4, z: 2 });
  assert.equal(s.plan.numbers.G1.blocks[1].name, 'Le final');
  assert.equal(s.plan.snack, 'fruits'); assert.equal(s.plan.numbers.P1.costume.color, '#4f7cff');
  assert.equal(s.school.stars, 64); assert.equal(s.school.name, 'Les Étoiles');
  assert.equal(s.at, 0, 'an old save counts as older than any newer copy');
});

test('18. A save that uses a costume or a step a grown-up has removed still opens and still plays', () => {
  const s = oldSave();
  s.plan.numbers.P1.costume.outfit = 'new3'; s.plan.numbers.P1.costume.shoes = 'gone'; s.plan.numbers.P1.costume.acc = 'gone';
  s.plan.numbers.G1.blocks[0].moves.splice(1, 0, 'new2'); s.plan.hair.petits = 'gone';
  const m = mend(s);
  assert.equal(m.plan.numbers.P1.costume.outfit, 'tutu', 'back to the number\'s own costume');
  assert.equal(m.plan.numbers.P1.costume.shoes, 'demi'); assert.equal(m.plan.numbers.P1.costume.acc, 'noeud');
  assert.ok(!m.plan.numbers.G1.blocks[0].moves.includes('new2'));
  assert.equal(m.plan.hair.petits, 'chignon');
  assert.doesNotThrow(() => simulate({ plan: m.plan, school: m.school, season: m.season, mode: 'gala', seed: m.seed }));
});

test('13. A save carrying a rude school name or block name opens with the default names instead', () => {
  const s = oldSave(); s.school.name = 'École de m3rde'; s.plan.numbers.G1.blocks[1].name = 'p u t a i n';
  const m = mend(s);
  assert.equal(m.school.name, ''); assert.equal(m.plan.numbers.G1.blocks[1].name, 'B');
});
