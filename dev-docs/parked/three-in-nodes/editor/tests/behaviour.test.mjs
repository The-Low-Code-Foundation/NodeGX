// The behaviour sentences, graded in Node on the model alone: each one writes real nodes and wires, reads back as the
// same sentence, travels with a duplicate, leaves nothing behind when taken off, and undoes in one step.
//   node --test tests/behaviour.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneModel } from '../core/model.mjs';
import { T3, addSentence, removeSentence, readBehaviour, setKeys, setFollow } from '../public/behaviour.mjs';

const K = 'Pages/Home';
function fresh() {
  const m = new SceneModel();
  const nodes = [
    { id: 'page', type: 'Page', children: ['layout'] },
    { id: 'layout', type: 'Group', parent: 'page', children: ['scene'] },
    { id: 'scene', type: T3.scene, parent: 'layout', children: ['player', 'coin'] },
    { id: 'player', type: T3.body, parent: 'scene', label: 'Player', parameters: { body: 'moves', name: 'Player' }, children: ['ball'] },
    { id: 'ball', type: T3.mesh, parent: 'player', parameters: { shape: 'sphere' } },
    { id: 'coin', type: T3.body, parent: 'scene', label: 'Coin', parameters: { body: 'ghost' }, children: ['ring'] },
    { id: 'ring', type: T3.mesh, parent: 'coin', parameters: { shape: 'torus' } }
  ];
  m.load([{ key: K, legacyName: '/Pages/Home', path: 'Pages/Home', revision: 'r0', files: { component: {}, nodes: { nodes }, connections: { connections: [] } } }]);
  return m;
}
const words = (m, id) => readBehaviour(m, K, m.node(K, id)).sentences.map((s) => s.words);
const roles = (m) => m.nodes(K).filter((n) => n.metadata?.scene).map((n) => `${n.metadata.scene.role}${n.metadata.scene.for ? `@${n.metadata.scene.for}` : ''}`).sort();

test('"When something touches it → add 1 to the score" writes a Counter, its text and a Text beside the Scene, and reads back', () => {
  const m = fresh();
  assert.equal(addSentence(m, K, 'scene', 'coin', 'touched', 'score'), true);
  assert.deepEqual(words(m, 'coin'), ['When something touches it → add 1 to the score']);
  assert.deepEqual(roles(m), ['score', 'score-label', 'score-text']);
  const score = m.nodes(K).find((n) => n.metadata?.scene?.role === 'score');
  assert.ok(m.wires(K).some((w) => w.fromId === 'coin' && w.fromProperty === 'onHit' && w.toId === score.id && w.toProperty === 'increase'));
  const label = m.nodes(K).find((n) => n.metadata?.scene?.role === 'score-label');
  assert.equal(label.parent, 'layout');
  assert.ok(m.node(K, 'layout').children.indexOf(label.id) < m.node(K, 'layout').children.indexOf('scene'), 'the score sits above the scene');
  assert.equal(m.node(K, 'coin').parameters.name, 'coin', 'touching needs a Name: it was given one');
});

test('"move somewhere new" is two Expressions that belong to the object; a duplicate gets its own, and shares the score', () => {
  const m = fresh();
  addSentence(m, K, 'scene', 'coin', 'touched', 'score');
  addSentence(m, K, 'scene', 'coin', 'touched', 'spot');
  assert.deepEqual(words(m, 'coin'), ['When something touches it → add 1 to the score', 'When something touches it → move somewhere new']);
  assert.ok(m.wireInto(K, 'coin', 'jumpX') && m.wireInto(K, 'coin', 'jumpZ'), 'its Jump To X and Z are wired from the graph');
  assert.ok(!m.wireInto(K, 'coin', 'x') && !m.wireInto(K, 'coin', 'z'), 'its start, X and Z, stays where the person put it');
  const copy = m.duplicate(K, 'coin');
  assert.deepEqual(words(m, copy), words(m, 'coin'), 'the copy says the same sentences');
  assert.deepEqual(roles(m), ['score', 'score-label', 'score-text', `spot-x@${copy}`, 'spot-x@coin', `spot-z@${copy}`, 'spot-z@coin'].sort());
  const score = m.nodes(K).find((n) => n.metadata?.scene?.role === 'score');
  assert.equal(m.wires(K).filter((w) => w.toId === score.id && w.toProperty === 'increase').length, 2, 'both coins count into the one score');
  assert.notEqual(m.node(K, copy).parameters.name, 'coin', 'the copy has a Name of its own');
});

test('taking sentences off leaves nothing behind; deleting an object takes its own helpers and keeps the shared score', () => {
  const m = fresh();
  addSentence(m, K, 'scene', 'coin', 'touched', 'score');
  addSentence(m, K, 'scene', 'coin', 'touched', 'spot');
  const copy = m.duplicate(K, 'coin');
  m.removeNode(K, copy);
  assert.deepEqual(roles(m), ['score', 'score-label', 'score-text', 'spot-x@coin', 'spot-z@coin']);
  assert.ok(!m.wires(K).some((w) => w.fromId === copy || w.toId === copy));
  removeSentence(m, K, 'coin', 'touched', 'spot');
  removeSentence(m, K, 'coin', 'touched', 'score');
  assert.deepEqual(roles(m), []);
  assert.deepEqual(m.wires(K), []);
  assert.deepEqual(words(m, 'coin'), []);
});

test('the arrow keys push it, it goes back to the start when it falls, and the camera follows it', () => {
  const m = fresh();
  setKeys(m, K, 'player', true);
  addSentence(m, K, 'scene', 'player', 'fell', 'start');
  const cam = setFollow(m, K, 'scene', 'player', true);
  const b = readBehaviour(m, K, m.node(K, 'player'));
  assert.equal(b.keys, true);
  assert.equal(b.followed, true);
  assert.deepEqual(b.sentences.map((s) => s.words), ['When it falls off → go back to the start']);
  assert.deepEqual(b.others, []);
  assert.equal(m.node(K, cam).parent, 'scene');
  assert.equal(m.node(K, cam).parameters.follow, 'Player');
  setKeys(m, K, 'player', false);
  assert.equal(readBehaviour(m, K, m.node(K, 'player')).keys, false);
  assert.ok(!m.nodes(K).some((n) => n.type === T3.keys), 'the Keys node goes when nothing uses it');
});

test('a sentence undoes in one step; a wire no sentence made is shown as it is', () => {
  const m = fresh();
  const before = JSON.stringify(m.comp(K).files);
  addSentence(m, K, 'scene', 'coin', 'touched', 'score');
  m.undo();
  assert.equal(JSON.stringify(m.comp(K).files), before);
  const v = m.addNode(K, { type: 'Variable2', label: 'hits', parameters: { name: 'hits' } });
  m.connect(K, 'coin', 'onHitName', v, 'value');
  assert.deepEqual(readBehaviour(m, K, m.node(K, 'coin'), (n) => n.label).others, ['HitName → hits · value']);
});

test('copies of copies are numbered from the original: Coin 2, Coin 3, ids coin-2, coin-3', () => {
  const m = fresh();
  const a = m.duplicate(K, 'coin');
  const b = m.duplicate(K, a);
  assert.deepEqual([m.node(K, a).label, m.node(K, b).label], ['Coin 2', 'Coin 3']);
  assert.deepEqual([a, b], ['coin-2', 'coin-3']);
});
