/** The exam's grading: a ✅ rung passes when met, a 🎓 rung passes when NOT met; one verdict per rung; results kept. */
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { PROBES, KINDS, met, meetsOne, decided, runExam, readResults, writeResults, verdictOf, withheldRungs } = require('../exam');
const templates = require('../olive-templates.json');
const { checkSlots } = require('../olive-check');
const { tmp } = require('./helpers');

test('every probe names a rung of the table, valid slots, and a measurement (a battery probe or CG-006 §7.1) when asserted', () => {
  // 21 FR-led + 12 EN twins (CG-005 AC8) + rung 9's two + the six promoted moments' 16 (CG-006 s3).
  assert.equal(PROBES.length, 51, `${PROBES.length} probes`);
  assert.equal(new Set(PROBES.map((p) => p.id)).size, PROBES.length, 'no id twice');
  for (const p of PROBES) {
    assert.ok(templates.rungs[p.rung], `${p.id} rung ${p.rung}`);
    assert.equal(checkSlots(templates, p.rung, p.slots, p.lang).ok, true, `${p.id} slots`);
    assert.ok(['pass', 'fail', 'record'].includes(p.mode));
    assert.ok(KINDS.includes(p.expect.kind), `${p.id} kind ${p.expect.kind} is one the exam grades`);
    if (p.mode !== 'record') assert.match(p.from, /^([A-H]\d|CG-006 §7\.1)$/, `${p.id} is a measured probe`);
  }
  // Every 🎓 rung has a probe that asserts its failure; a ✅ rung may carry one 🎓 direction (translate, EN→FR).
  for (const [id, r] of Object.entries(templates.rungs)) if (r.ladder === 'fail') assert.ok(PROBES.some((p) => p.rung === id && (p.mode === 'fail' || p.mode === 'record')), `rung ${id} has a 🎓 probe`);
  // Rung 9 is G1 "no letter e" (ruling 2): asserted as failing, both languages; "under 5 words" (P17/P32) is gone.
  assert.deepEqual(PROBES.filter((p) => p.rung === 'no-letter-e').map((p) => [p.id, p.lang, p.mode, p.expect.kind, p.times]), [['R9-G1-fr', 'fr', 'fail', 'lacks', 3], ['R9-G1-en', 'en', 'fail', 'lacks', 3]]);
  assert.equal(templates.rungs['under-five-words'], undefined);
  assert.ok(!PROBES.some((p) => p.id === 'P17' || p.id === 'P32'));
  assert.ok(PROBES.some((p) => p.rung === 'translate' && p.mode === 'fail' && p.lang === 'en'), 'translate: the EN→FR direction is the recorded failure');
  const rungs = new Set(PROBES.map((p) => p.rung));
  for (const id of Object.keys(templates.rungs)) assert.ok(rungs.has(id), `rung ${id} is examined`);
  assert.ok(PROBES.some((p) => p.lang === 'en'), 'both languages');
});

/** A reply that meets `expect`, and one that does not, built from the expectation itself. */
function fixtures(e) {
  const ok = (v) => ({ ok: true, value: v });
  const txt = (t) => ({ ok: true, text: t });
  switch (e.kind) {
    case 'ok': return [[txt('x')], [{ ok: false, reason: 'must-contain' }]];
    case 'equals': return [[ok(e.value)], [ok('__nope__')]];
    case 'items': return [[ok(Array(e.n).fill('a'))], [ok(['a'])]];
    case 'contains': return [[txt('… ' + e.any[0] + ' …')], [txt('zzz')]];
    case 'containsAll': return [[txt(e.all.join(' '))], [txt('zzz')]];
    case 'lacks': return [[txt('zzz')], [txt('zz ' + ((e.letters || [])[0] || (e.words || [])[0]) + ' zz')]];
    case 'wordsAtMost': return [[txt('a')], [txt('a '.repeat(e.n + 1))]];
    case 'lines': return [[txt(Array(e.n).fill('a').join('\n'))], [txt('a')]];
    case 'identical': return [[ok('P'), ok('P')], [ok('P'), ok('Q')]];
    case 'distinct': return [[ok('P'), ok('Q'), ok('R')], [ok('P'), ok('P'), ok('P')]];
    default: return null;
  }
}

test('🔴 every expectation kind the PROBES use is GRADED both ways — a kind the grader does not know can never pass a 🎓 probe vacuously', async () => {
  for (const p of PROBES) {
    const f = fixtures(p.expect);
    assert.ok(f, `${p.id}: a fixture for ${p.expect.kind}`);
    assert.deepEqual([met(p.expect, f[0]), met(p.expect, f[1])], [true, false], `${p.id} (${p.expect.kind}) tells a met reply from a not-met one`);
  }
  assert.deepEqual([...new Set(PROBES.map((p) => p.expect.kind))].sort(), ['containsAll', 'contains', 'distinct', 'equals', 'identical', 'items', 'lacks', 'lines', 'ok'].sort());
  // A kind the exam does not grade: the 🎓 probe does NOT pass (before CG-005 it passed whatever she said), nor ✅.
  const bogus = [{ id: 'X1', from: 'G1', rung: 'no-letter-e', lang: 'fr', slots: {}, mode: 'fail', expect: { kind: 'bogus' } }, { id: 'X2', from: 'A2', rung: 'say-thanks', lang: 'fr', slots: {}, mode: 'pass', expect: { kind: 'bogus' } }];
  const r = await runExam({ ask: async () => ({ ok: true, text: 'Un chat.' }), probes: bogus });
  assert.deepEqual(r.probes.map((x) => x.pass), [false, false]);
  assert.equal(meetsOne({ kind: 'bogus' }, { ok: true, text: 'x' }), false);
});

test('🔴 a RECORDED probe on a 🎓 rung is graded the 🎓 way (before CG-005 it was graded pass = met, and a rung she OBEYS was offered)', async () => {
  const probe = { id: 'T9', from: '—', rung: 'count-tulips', lang: 'en', slots: { list: templates.lists.flowerlists.en[0] }, times: 1, mode: 'record', expect: { kind: 'equals', value: 4 } };
  const right = await runExam({ ask: async () => ({ ok: true, value: 4 }), probes: [probe] });
  const wrong = await runExam({ ask: async () => ({ ok: true, value: 6 }), probes: [probe] });
  assert.deepEqual([right.probes[0].met, right.probes[0].pass, right.rungs['count-tulips'].pass], [true, false, false], 'she counted right: the 🎓 lesson does not show, the rung is withheld');
  assert.deepEqual([wrong.probes[0].met, wrong.probes[0].pass, wrong.rungs['count-tulips'].pass], [false, true, true]);
});

test('the MIXED rung (define, CG-006 E9) is offered only when its recorded definitions DISAGREE', async () => {
  assert.equal(verdictOf('define'), 'mixed');
  assert.deepEqual(Object.keys(templates.rungs).filter((id) => verdictOf(id) === 'mixed'), ['define']);
  const mine = PROBES.filter((p) => p.rung === 'define');
  assert.deepEqual(mine.map((p) => p.mode), ['record', 'record', 'record', 'record']);
  const run = (right) => runExam({ ask: async (q) => ({ ok: true, text: right(q.slots.word) ? 'une grosse pierre, un oiseau, arroser, de l eau, a stone' : 'un petit chapeau' }), probes: mine });
  const some = await run((w) => /rocher|rock/.test(w));
  const all = await run(() => true);
  const none = await run(() => false);
  assert.deepEqual([some.rungs.define.pass, all.rungs.define.pass, none.rungs.define.pass], [true, false, false]);
  assert.equal(some.rungs.define.verdict, 'mixed');
  assert.deepEqual([withheldRungs(some), withheldRungs(all)], [[], ['define']]);
  // An ungraded kind in the set cannot fake the disagreement.
  const fake = mine.map((p) => ({ ...p })).concat([{ id: 'X9', from: '—', rung: 'define', lang: 'fr', slots: { word: 'un rocher' }, times: 1, mode: 'record', expect: { kind: 'bogus' } }]);
  const faked = await runExam({ ask: async () => ({ ok: true, text: 'une grosse pierre, un oiseau, arroser, de l eau, a stone' }), probes: fake });
  assert.equal(faked.rungs.define.pass, false);
});

test('met(): each kind', () => {
  const ok = (v) => ({ ok: true, value: v });
  const txt = (t) => ({ ok: true, text: t });
  assert.equal(met({ kind: 'equals', value: ['avancer', 'gauche'] }, [ok(['avancer', 'gauche'])]), true);
  assert.equal(met({ kind: 'equals', value: 5 }, [ok(4)]), false);
  assert.equal(met({ kind: 'equals', value: 5 }, [{ ok: false, reason: 'timeout' }]), false);
  assert.equal(met({ kind: 'items', n: 3 }, [ok(['a', 'b', 'c'])]), true);
  assert.equal(met({ kind: 'items', n: 3 }, [ok(['a', '', 'c'])]), false);
  assert.equal(met({ kind: 'identical' }, [ok('Pipette'), ok('Pipette'), ok('Pipette')]), true);
  assert.equal(met({ kind: 'identical' }, [ok('Pipette'), ok('Fleur'), ok('Pipette')]), false);
  assert.equal(met({ kind: 'distinct', atLeast: 2 }, [ok('Fleur'), ok('Rosalbe'), ok('Nectar')]), true);
  assert.equal(met({ kind: 'distinct', atLeast: 2 }, [ok('Fleur'), ok('Fleur'), ok('Fleur')]), false);
  assert.equal(met({ kind: 'distinct', atLeast: 2 }, [{ ok: false, reason: 'cap' }, ok('Blancs'), ok('Pomporelle')]), true, 'a cap refusal beside two different names is still variety');
  assert.equal(met({ kind: 'distinct', atLeast: 2 }, [{ ok: false, reason: 'cap' }, { ok: false, reason: 'cap' }, ok('Pomporelle')]), false);
  assert.equal(met({ kind: 'contains', any: ['thirsty'] }, [txt('The tulips are thirsty.')]), true);
  assert.equal(met({ kind: 'contains', any: ['faim'] }, [txt('Le biscuit est le chat qui est en honte.')]), false);
  assert.equal(met({ kind: 'wordsAtMost', n: 4 }, [txt("Merci ! Je suis là pour t'aider. 🌻🐱")]), false);
  assert.equal(met({ kind: 'wordsAtMost', n: 4 }, [txt('Merci Pip !')]), true);
  assert.equal(met({ kind: 'lines', n: 2 }, [txt('Une\nDeux')]), true);
  assert.equal(met({ kind: 'lines', n: 2 }, [txt('Une seule')]), false);
  assert.equal(met({ kind: 'ok' }, [txt('x'), txt('y')]), true);
  assert.equal(met({ kind: 'ok' }, [txt('x'), { ok: false }]), false);
  assert.equal(met({ kind: 'wordsAtMost', n: 4 }, [txt('Merci Pip !'), txt("Merci ! Je suis là pour t'aider."), txt('Merci !')]), true, 'majority of three obeyed: met (the 🎓 rung fails to teach)');
  assert.equal(met({ kind: 'wordsAtMost', n: 4 }, [txt("Merci ! Je suis là pour t'aider."), txt('Merci !'), txt("Merci, je suis là pour toi Pip")]), false, 'two of three over the rule: not met (the 🎓 rung passes)');
  assert.equal(met({ kind: 'equals', value: 5 }, [ok(5), ok(4), ok(5)]), true, '2 of 3');
  assert.equal(met({ kind: 'equals', value: 5 }, [ok(5), ok(4)]), false, '1 of 2 is not a majority');
  assert.equal(decided({ kind: 'equals', value: 5 }, [ok(5), ok(5)], 3), true, 'two met: the third sample is not needed');
  assert.equal(decided({ kind: 'equals', value: 5 }, [ok(5), ok(4)], 3), false, 'one each: the third decides');
  assert.equal(decided({ kind: 'equals', value: 5 }, [ok(4), ok(4)], 3), true);
  assert.equal(decided({ kind: 'identical' }, [ok(5), ok(5)], 3), false, 'a set kind always takes every sample');
  assert.equal(met({ kind: 'equals', value: 5 }, []), false);
});

test('runExam: a ✅ probe passes when met; a 🎓 probe passes only when the model fails as the ladder says; verdict per rung', async () => {
  const probes = [
    { id: 'T1', from: 'D1', rung: 'words-to-blocks', lang: 'fr', slots: { route: templates.lists.routes.fr[0] }, mode: 'pass', expect: { kind: 'equals', value: ['avancer', 'avancer', 'gauche'] } },
    { id: 'T2', from: 'D3', rung: 'count-in-words', lang: 'fr', slots: { route: 'Avance de trois cases.' }, mode: 'fail', expect: { kind: 'equals', value: ['avancer', 'avancer', 'avancer'] } },
    { id: 'T3', from: 'E5', rung: 'maths', lang: 'fr', slots: { a: '14', b: '9' }, mode: 'fail', expect: { kind: 'equals', value: 23 } },
    { id: 'T4', from: '—', rung: 'voice-hint', lang: 'fr', slots: { key: 'hintWet', b: 'Pip' }, mode: 'record', expect: { kind: 'contains', any: ['flaque'] } }
  ];
  const answers = { 'words-to-blocks': { ok: true, value: ['avancer', 'avancer', 'gauche'] }, 'count-in-words': { ok: true, value: ['avancer'] }, maths: { ok: true, value: 23 }, 'voice-hint': { ok: true, text: 'Oh non, une flaque !' } };
  const lines = [];
  let asks = 0;
  const r = await runExam({ ask: async (q) => (asks++, answers[q.rung]), probes, timings: { line: (l) => lines.push(l) } });
  assert.equal(asks, 8, 'a deterministic answer decides each probe on its second sample: 4 probes × 2');
  assert.deepEqual(r.probes.map((p) => [p.id, p.met, p.pass]), [
    ['T1', true, true],
    ['T2', false, true], // Olive gave one avancer: the lesson holds
    ['T3', true, false], // Olive got 14 + 9 right: the 🎓 rung cannot teach
    ['T4', true, true]
  ]);
  assert.equal(r.passed, 2);
  assert.equal(r.failed, 1);
  assert.deepEqual(r.rungs['words-to-blocks'], { ladder: 'pass', probes: ['T1'], pass: true, asserted: 1 });
  assert.deepEqual(r.rungs['count-in-words'], { ladder: 'fail', probes: ['T2'], pass: true, asserted: 1 });
  assert.deepEqual(r.rungs.maths, { ladder: 'fail', probes: ['T3'], pass: false, asserted: 1 });
  assert.deepEqual(r.rungs['voice-hint'], { ladder: 'pass', probes: ['T4'], pass: true, asserted: 0 });
  assert.equal(lines.filter((l) => l.event === 'exam-probe').length, 4);
  const dir = tmp('garden-exam-');
  writeResults(dir, r);
  assert.deepEqual(readResults(dir).rungs, r.rungs);
  assert.equal(readResults(tmp('garden-exam-')), null);
});

test('a fallback reply never meets an expectation, so a ✅ rung fails on a timeout and a 🎓 rung "passes" (the ladder still holds)', async () => {
  const probes = [
    { id: 'T1', from: 'D1', rung: 'words-to-blocks', lang: 'fr', slots: { route: templates.lists.routes.fr[0] }, mode: 'pass', expect: { kind: 'equals', value: ['avancer', 'avancer', 'gauche'] } },
    { id: 'T2', from: 'E5', rung: 'maths', lang: 'fr', slots: { a: '14', b: '9' }, mode: 'fail', expect: { kind: 'equals', value: 23 } }
  ];
  const r = await runExam({ ask: async () => ({ ok: false, fallback: true, reason: 'timeout' }), probes });
  assert.deepEqual(r.probes.map((p) => p.pass), [false, true]);
  assert.equal(r.probes[0].replies[0].reason, 'timeout');
});
