// The engine's tests: the opening plan is wrong in the ways round 1 taught, and every season can be solved by hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, judgeSpacing, judgeMusic, routineInfo, danceOf, analyseLoge, againstWall, changeTime } from '../src/engine.js';
import { defaultPlan, defaultSchool, addSeasonNumbers, oneBlock, migrateNumber } from '../src/plan.js';
import { CLS, NUMBERS, MOVES, hm } from '../src/data.js';

const solveY1 = (plan) => {
  plan.interval = 1200;
  plan.numbers.G1.A = [[-4.5, 1.5], [-2.5, 1.5], [-0.5, 1.5], [1.5, 1.5], [3.5, 1.5], [-3.5, 3.5], [-1.5, 3.5], [0.5, 3.5]].map(([x, z]) => ({ x, z }));
  Object.assign(plan.numbers.G1, oneBlock(['plie', 'bras', 'arabesque', 'descente', 'remonte', 'reverence'], 15));
  plan.cakeG = 1850; plan.bottles = 4; plan.snack = 'fruits';
  return plan;
};

test('the opening plan: late, the little ones up past bedtime, hands touching, the music, no cake for the seniors', () => {
  const r = simulate({ plan: defaultPlan(), school: defaultSchool(), season: 1 });
  assert.ok(r.order.late > 0); assert.ok(r.order.sleepy > 0);
  assert.ok(r.perf.G1.spacing.collide.length > 0); assert.equal(r.perf.G1.music.diff, 32);
  assert.ok(r.perf.G1.info.links.some((l) => l.gap === 2));
  assert.equal(r.gouter.cakeOut, 'grandes'); assert.equal(r.ok, false);
});
test('season 1 solved: a perfect evening earns the bonus', () => {
  const r = simulate({ plan: solveY1(defaultPlan()), school: defaultSchool(), season: 1 });
  assert.equal(r.order.ok, true, JSON.stringify({ late: r.order.late, sleepy: r.order.sleepy }));
  for (const p of Object.values(r.perf)) { assert.ok(p.spacing.ok, p.id); assert.ok(p.music.ok, p.id); }
  assert.ok(r.gouter.ok); assert.ok(r.allOk); assert.ok(r.pts.some(([k]) => k === 'perfect'));
});
test('a rehearsal never slips; a gala rolls the dice and is the same for the same seed', () => {
  const plan = solveY1(defaultPlan()), school = defaultSchool();
  const reh = simulate({ plan, school, season: 1 }); assert.ok(Object.values(reh.perf).every((p) => p.slips.length === 0));
  const a = simulate({ plan, school, season: 1, mode: 'gala', seed: 5 }), b = simulate({ plan, school, season: 1, mode: 'gala', seed: 5 });
  assert.deepEqual(Object.values(a.perf).map((p) => p.slips.length), Object.values(b.perf).map((p) => p.slips.length));
});
test('too few hair stations delay the curtain; a make-up table fixes it', () => {
  const school = defaultSchool(); school.furniture = school.furniture.filter((f) => f.id !== 'miroir');
  const r = simulate({ plan: solveY1(defaultPlan()), school, season: 1 });
  assert.ok(r.order.startLate > 0);
  school.furniture.push({ id: 'coiffeuse', c: 7, r: 0, rot: 0 });
  assert.equal(simulate({ plan: solveY1(defaultPlan()), school, season: 1 }).order.startLate, 0);
});
test('a mirror facing the wall does nothing; turned round it counts', () => {
  const school = defaultSchool(); school.furniture = [{ id: 'miroir', c: 3, r: 0, rot: 2 }];
  assert.equal(analyseLoge(school, 24).postesRaw, 0);
  school.furniture[0].rot = 0; assert.equal(analyseLoge(school, 24).postesRaw, 1);
  assert.equal(againstWall({ id: 'miroir', c: 9, r: 3, rot: 1 }, 10), true);
});
test('furniture changes costume changes: a screen and a shoe shelf make it quicker, a crowded room slower', () => {
  const prev = { outfit: 'tutu', shoes: 'demi', acc: 'aucun' }, next = { outfit: 'fee', shoes: 'pointes', acc: 'ailes' };
  const bare = changeTime(prev, next, { shoes: 0, railCap: 8, totalDancers: 24, screen: 0, clutter: false });
  const good = changeTime(prev, next, { shoes: 1, railCap: 24, totalDancers: 24, screen: 1, clutter: false });
  assert.ok(good.min < bare.min);
});
test('a phrase that travels drifts off the stage over its repeats', () => {
  const np = { ...defaultPlan().numbers.G2, moves: ['chasseD', 'plie', 'bras', 'plie', 'bras', 'plie'], repeats: 15 };
  const sp = judgeSpacing(np, CLS.grandes, { halfW: 5.5, depth: 5 }, routineInfo(np.moves, 'classique'));
  assert.ok(sp.offstage.length > 0);
});
test('changing places: two dancers crossing on the same line bump', () => {
  const np = { ...defaultPlan().numbers.G2, moves: ['echange', 'plie', 'bras', 'bras', 'plie'], repeats: 15 };
  np.B = np.A.map((p) => ({ ...p })); [np.B[0], np.B[1]] = [{ ...np.A[1] }, { ...np.A[0] }];
  const sp = judgeSpacing(np, CLS.grandes, { halfW: 5.5, depth: 5 }, routineInfo(np.moves, 'classique'));
  assert.ok(sp.bump.some((b) => (b.i === 0 && b.j === 1)));
});
test('season 2: parents late with 30 min; doors at 45 min seats everyone', () => {
  const plan = addSeasonNumbers(solveY1(defaultPlan()), 2), school = defaultSchool();
  assert.ok(simulate({ plan, school, season: 2 }).parking.lateCars > 0);
  plan.parking.doors = 45; assert.equal(simulate({ plan, school, season: 2 }).parking.lateCars, 0);
});
test('season 3: the teens join, the evening needs reordering and can still be perfect', () => {
  const plan = addSeasonNumbers(solveY1(defaultPlan()), 3), school = defaultSchool();
  assert.ok(plan.order.includes('A1') && plan.order.includes('A2'));
  assert.equal(simulate({ plan, school, season: 3 }).order.ok, false);
  plan.start = hm(19, 45); plan.interval = 600;
  plan.order = ['accueil', 'P1', 'A1', 'M1', 'P2', 'G1', 'entracte', 'M2', 'A2', 'G2', 'final'];
  school.furniture.push({ id: 'coiffeuse', c: 7, r: 0, rot: 0 });
  plan.cakeG = 2600; plan.bottles = 5; plan.parking.doors = 45;
  const r = simulate({ plan, school, season: 3 });
  assert.equal(r.order.ok, true, JSON.stringify({ late: r.order.late, sleepy: r.order.sleepy, yawns: r.order.yawns, waits: r.order.waits.map((w) => [w.id, w.wait]), startLate: r.order.startLate }));
});

/* ---------------- round 2½: blocks and a chain, try-outs that roll the dice, twisted ankles ---------------- */
test('a dance is blocks in a chain: read flat, and the music judged on the sum of the chain', () => {
  const np = { ...defaultPlan().numbers.G1, blocks: [{ id: 'a', name: 'Intro', moves: ['plie', 'bras', 'tourne', 'bras'] }, { id: 'b', name: 'Sauts', moves: ['plie', 'plie', 'plie', 'plie'] }], chain: [] };
  const len = (id) => np.blocks.find((b) => b.id === id).moves.reduce((s, m) => s + MOVES[m].c, 0);
  assert.equal(len('a'), 24); assert.equal(len('b'), 16);
  np.chain = [...Array(10).fill('a'), ...Array(15).fill('b')];
  const d = danceOf(np), info = routineInfo(d.moves, 'classique', false), m = judgeMusic('G1', d, info);
  assert.equal(d.moves.length, 10 * 4 + 15 * 4); assert.equal(d.chainLen, 25); assert.equal(d.mostRepeated, 15); assert.equal(d.blocksUsed, 2);
  assert.equal(m.have, 480); assert.ok(m.ok); assert.deepEqual(m.parts, [...Array(10).fill(24), ...Array(15).fill(16)]);
  np.chain.push('a'); const over = judgeMusic('G1', danceOf(np), routineInfo(danceOf(np).moves, 'classique', false));
  assert.equal(over.diff, 24); assert.equal(over.stopsIn, 26, 'the music stops in the 26th block of the chain');
});
test('an older save (one phrase × repeats) becomes one block chained as often: the same dance, the same verdicts', () => {
  const plan = solveY1(defaultPlan()), old = JSON.parse(JSON.stringify(plan));
  for (const np of Object.values(old.numbers)) { const b = np.blocks[0]; np.moves = b.moves; np.repeats = np.chain.length; delete np.blocks; delete np.chain; }
  for (const id of Object.keys(old.numbers)) old.numbers[id] = migrateNumber(old.numbers[id]);
  const a = simulate({ plan, school: defaultSchool(), season: 1 }), b = simulate({ plan: old, school: defaultSchool(), season: 1 });
  assert.deepEqual(Object.values(b.perf).map((p) => [p.id, p.total, p.music.have]), Object.values(a.perf).map((p) => [p.id, p.total, p.music.have]));
});
test('a try-out rolls the dice (each seed its own), the general rehearsal does not; a hard step for the little ones goes wrong', () => {
  const plan = solveY1(defaultPlan()), school = defaultSchool();
  Object.assign(plan.numbers.P1, oneBlock(['fouette', 'grandJete', 'reception', 'plie', 'plie', 'plie', 'plie'], 9));
  const slipsOf = (mode, seed) => simulate({ plan, school, season: 1, mode, seed }).perf.P1.slips;
  assert.equal(slipsOf('rehearsal', 1).length, 0);
  const tries = Array.from({ length: 6 }, (_, k) => slipsOf('try', 100 + k));
  assert.ok(tries.every((s) => s.length > 0), JSON.stringify(tries.map((s) => s.length)));
  assert.notDeepEqual(tries[0], tries[1]);
  const all = tries.flat(), d = danceOf(plan.numbers.P1);
  assert.ok(all.some((s) => s.kind === 'ankle'), 'someone twists an ankle somewhere in six tries');
  for (const s of all.filter((x) => x.kind === 'ankle')) assert.ok(MOVES[d.moves[s.k]].d > CLS.petits.exp, 'an ankle only on a step above their level');
  for (const s of tries[0]) if (s.kind === 'ankle') assert.ok(!tries[0].some((x) => x.i === s.i && x.k > s.k), 'after the ankle she dances no more');
});
