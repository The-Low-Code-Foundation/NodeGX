/**
 * CG-005 in the shell: the stub Olive behind the REAL route (AC2 hang → timeout, AC3 the mutant's word dropped, AC5 the
 * exam switched and re-run through the doors), the written answers (AC4), and both languages everywhere (AC8).
 */
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const templates = require('../olive-templates.json');
const { createOwl } = require('../owl');
const { createOliveDoors } = require('../olive-route');
const { createStubEngine, DEFAULT_EXAM, ANSWERS } = require('../olive-stub');
const { writtenAnswer } = require('../olive-written');
const { PROBES, ladderOf, withheldRungs, meetsOne, runExam } = require('../exam');
const { checkSlots, blocked } = require('../olive-check');
const { tmp, request, withRelay } = require('./helpers');

const H = { 'x-garden': '1' };
const RUNGS = Object.keys(templates.rungs);
const LANGS = ['fr', 'en'];

async function stubDoors(o = {}) {
  const engine = createStubEngine(o.stub || {});
  const owl = createOwl({ modelPath: o.noModel ? '/nowhere/model.gguf' : __filename, engine, timeoutMs: o.timeoutMs });
  await owl.load();
  const olive = createOliveDoors({ owl, templates, dataDir: tmp('garden-stub-'), header: 'x-garden', prefix: '/__garden/' });
  return { engine, owl, olive };
}

/** One valid slot set per rung and language: the first word of every list, a short text, a digit. */
function firstSlots(rung, L) {
  const out = {};
  for (const [name, spec] of Object.entries(templates.rungs[rung].slots)) {
    if (spec.list) out[name] = templates.lists[spec.list][L][0];
    else if (spec.optional) continue;
    else if (spec.regex) out[name] = '2';
    else out[name] = 'Tulla';
  }
  return out;
}

test('AC8: every rung has a stub answer AND a written answer (except the hint voicing) in both languages, and every exam rung is examined in both', () => {
  assert.deepEqual(Object.keys(ANSWERS).sort(), RUNGS.slice().sort(), 'the stub answers every rung of the table');
  for (const rung of RUNGS) {
    for (const L of LANGS) {
      const slots = firstSlots(rung, L);
      assert.equal(checkSlots(templates, rung, slots, L).ok, true, `${rung} ${L} slots`);
      const s = createStubEngine().answer({ rung, values: slots, lang: L, temperature: templates.rungs[rung].temperature });
      assert.ok(s.value !== undefined || (typeof s.text === 'string' && s.text.length > 0), `${rung} ${L} stub answer`);
      const w = writtenAnswer(templates, rung, slots, L);
      if (rung === 'voice-hint') assert.equal(w, null, 'the hint voicing has no written answer: the written LINE is the hint table');
      else assert.ok(w && (w.value !== undefined || w.text), `${rung} ${L} written answer`);
    }
    const langs = new Set(PROBES.filter((p) => p.rung === rung).map((p) => p.lang));
    assert.deepEqual([...langs].sort(), ['en', 'fr'], `${rung} examined in both languages`);
  }
});

test('AC4: the written answers cover EVERY list value of a keyed rung, ✅ right and 🎓 canned wrong', () => {
  for (const [rung, w] of Object.entries(templates.written)) {
    if (rung === '_about') continue;
    for (const L of LANGS) {
      const a = w[L];
      if (!a.by) continue;
      // Every combination of the keyed slots' list values has an answer (or the table's `else`).
      const lists = a.by.map((slot) => templates.lists[templates.rungs[rung].slots[slot].list][L]);
      const combos = lists.reduce((acc, l) => acc.flatMap((c) => l.map((x) => c.concat([x]))), [[]]);
      for (const c of combos) {
        const values = Object.fromEntries(a.by.map((slot, i) => [slot, c[i]]));
        const got = writtenAnswer(templates, rung, values, L);
        assert.ok(got && (got.value !== undefined || got.text), `${rung} ${L} ${c.join('|')}`);
      }
    }
  }
  const W = (rung, v, L = 'fr') => writtenAnswer(templates, rung, v, L);
  // ✅ right:
  assert.deepEqual(W('words-to-blocks', { route: templates.lists.routes.fr[1] }).value, ['avancer', 'gauche', 'arroser']);
  assert.equal(W('maths-seeds', { a: '2', b: '3' }).value, 5);
  assert.equal(W('is-it-a', { thing: 'une rose', kind: 'une fleur' }).value, 'oui');
  assert.equal(W('is-it-a', { thing: 'a rock', kind: 'a flower' }, 'en').value, 'no');
  assert.equal(W('what-wants', { line: templates.lists.lines.en[0] }, 'en').value, 'kibble');
  // 🎓 the readout's mistakes:
  assert.deepEqual(W('count-in-words', { route: 'Avance de trois cases.' }).value, ['avancer']);
  assert.equal(W('count-tulips', { list: templates.lists.flowerlists.fr[0] }).value, 6, '4 tulips, she says 6');
  assert.equal(W('maths', { a: '14', b: '9' }).value, 14);
  assert.match(W('no-letter-e', {}).text, /e/, 'rung 9: she uses an e anyway');
  assert.match(W('no-letter-e', {}, 'en').text, /e/);
  assert.deepEqual(W('sort-words', { words: templates.lists.word_triples.fr[0] }).value, ['tulipe', 'arrosoir', 'chat'], 'not sorted: the program sorts');
  // ✅ the promoted moments' written answers are right:
  assert.match(W('narrate-run', { trace: templates.lists.traces.en[0] }, 'en').text, /puddle/);
  assert.match(W('letter', { who: 'Biscuit', object: 'kibble' }, 'en').text, /kibble/);
  // 🎓 mixed: some definitions right, some made up.
  assert.match(W('define', { word: 'un rocher' }).text, /pierre/);
  assert.doesNotMatch(W('define', { word: 'une chouette' }).text, /oiseau/);
  assert.match(W('tall-tales', { question: templates.lists.questions_tall.en[0] }, 'en').text, /Sydney/);
});

test('AC3: the mutant stub’s blocklisted word never leaves the route — the voiced hint and a sentence come back as refusals', async () => {
  const { olive, engine } = await stubDoors({ stub: { mutant: true } });
  await withRelay(olive, async (port) => {
    for (const L of LANGS) {
      const r = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'voice-hint', slots: { key: 'hintWet', b: 'Pip' }, lang: L } });
      assert.deepEqual({ ok: r.body.ok, fallback: r.body.fallback, reason: r.body.reason, text: r.body.text }, { ok: false, fallback: true, reason: 'blocklist', text: undefined }, `voice-hint ${L}`);
      const n = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'name-one', slots: { thing: templates.lists.things_one[L][0] }, lang: L } });
      assert.equal(n.body.reason, 'blocklist', `name-one ${L}`);
    }
    // Known-firing beside it: the stub DID produce the word (the route saw it and refused it).
    const raw = engine.answer({ rung: 'voice-hint', values: { key: 'hintWet', b: 'Pip' }, lang: 'fr', temperature: 0.5 });
    assert.ok(blocked(raw.text, 'fr'), `the mutant answer carries a listed word: ${raw.text}`);
    // And the clean stub's line is served as text.
    engine.set({ mutant: false });
    const ok = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'voice-hint', slots: { key: 'hintWet', b: 'Pip' }, lang: 'fr' } });
    assert.equal(ok.body.ok, true);
    assert.equal(ok.body.text, 'Hou hou ! ' + templates.hints.hintWet.fr.replace(/\{b\}/g, 'Pip'));
  });
});

test('AC2: a rung that hangs times out through the route (fallback, reason timeout); the stub is deterministic otherwise', async () => {
  const { olive } = await stubDoors({ stub: { hang: ['count-tulips'] }, timeoutMs: 80 });
  await withRelay(olive, async (port) => {
    const r = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'count-tulips', slots: { list: templates.lists.flowerlists.fr[0] }, lang: 'fr' } });
    assert.deepEqual({ ok: r.body.ok, fallback: r.body.fallback, reason: r.body.reason }, { ok: false, fallback: true, reason: 'timeout' });
    assert.ok(r.body.ms >= 80 && r.body.ms < 2000, `${r.body.ms} ms`);
    const a = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'maths', slots: { a: '14', b: '9' }, lang: 'fr' } });
    const b = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'maths', slots: { a: '14', b: '9' }, lang: 'fr' } });
    assert.deepEqual([a.body.value, b.body.value], [14, 14], 'the readout: 14 + 9 → 14, every time');
  });
});

test('the dial on the stub: temperature 0 gives one name, "surprise me" (1.2) gives three different ones; say-thanks twice gives two lines', async () => {
  const { olive } = await stubDoors();
  await withRelay(olive, async (port) => {
    const ask = (body) => request(port, 'POST', '/__garden/olive', { headers: H, body }).then((r) => r.body);
    for (const L of LANGS) {
      const thing = templates.lists.things_one[L][0];
      const same = [await ask({ rung: 'name-one', slots: { thing }, lang: L, temperature: 0 }), await ask({ rung: 'name-one', slots: { thing }, lang: L, temperature: 0 })];
      assert.equal(new Set(same.map((x) => x.value)).size, 1, `${L} same every time`);
      const wild = [];
      for (let i = 0; i < 3; i++) wild.push(await ask({ rung: 'name-one', slots: { thing }, lang: L, temperature: 1.2 }));
      assert.equal(new Set(wild.map((x) => x.value)).size, 3, `${L} surprise me`);
      const slots = firstSlots('say-thanks', L);
      const t1 = await ask({ rung: 'say-thanks', slots, lang: L });
      const t2 = await ask({ rung: 'say-thanks', slots, lang: L });
      assert.ok(t1.ok && t2.ok && t1.text !== t2.text, `${L} two thank-yous differ: ${t1.text} / ${t2.text}`);
    }
  });
});

test('AC5: the exam through the doors withholds a rung the stub fails, and offers it again after a re-run that passes', async () => {
  const { olive, engine } = await stubDoors({ stub: { exam: { 'words-to-blocks': 'fail' } } });
  await withRelay(olive, async (port) => {
    const first = await request(port, 'POST', '/__garden/olive/exam', { headers: H });
    assert.equal(first.status, 200);
    assert.deepEqual(withheldRungs(first.body), ['words-to-blocks']);
    const s1 = await request(port, 'GET', '/__garden/olive/status');
    assert.deepEqual(withheldRungs(s1.body.exam), ['words-to-blocks'], 'status carries the verdicts the page gates on');
    const wrong = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'words-to-blocks', slots: { route: templates.lists.routes.fr[0] }, lang: 'fr' } });
    assert.deepEqual(wrong.body.value, ['droite'], 'the switched stub is wrong on purpose');
    // The switch (what the drive's POST /__stub/set does), then a re-run on the SAME doors.
    engine.set({ exam: { 'words-to-blocks': 'pass' } });
    const second = await request(port, 'POST', '/__garden/olive/exam', { headers: H });
    assert.deepEqual(withheldRungs(second.body), [], 'offered again; since rung 9 is "no letter e" nothing else is withheld');
    const s2 = await request(port, 'GET', '/__garden/olive/status');
    assert.deepEqual(withheldRungs(s2.body.exam), []);
    assert.notEqual(s2.body.exam.at, s1.body.exam.at, 'the kept results are the re-run');
  });
  assert.deepEqual(DEFAULT_EXAM, {});
});

test('🔴 the exam gate on rung 9 and the six promoted rungs: each is offered ONLY when its probes behave as its column says, and withheld when they do not', async () => {
  assert.equal(ladderOf('no-letter-e'), 'fail');
  assert.equal(ladderOf('voice-hint'), 'pass');
  const { olive } = await stubDoors();
  const r = await olive.runExam();
  assert.equal(r.failed, 0, 'every asserted probe behaves as the ladder says on the default stub (the readout)');
  assert.deepEqual(withheldRungs(r), [], 'nothing withheld on the readout');
  assert.deepEqual(r.rungs['no-letter-e'], { ladder: 'fail', probes: ['R9-G1-fr', 'R9-G1-en'], pass: true, asserted: 2 });
  assert.deepEqual(r.rungs.define, { ladder: 'fail', probes: ['E9-arrosoir', 'E9-chouette', 'E9-rocher', 'E9-en'], pass: true, asserted: 0, verdict: 'mixed' });
  // Each one switched to what would break its lesson (✅ wrong, 🎓 right, mixed all right) → withheld, alone.
  const switched = {};
  for (const rung of ['no-letter-e', 'explain-program', 'narrate-run', 'name-trick', 'sort-words', 'define', 'letter']) {
    const { olive: o } = await stubDoors({ stub: { exam: { [rung]: 'fail' } } });
    switched[rung] = withheldRungs(await o.runExam());
  }
  assert.deepEqual(switched, { 'no-letter-e': ['no-letter-e'], 'explain-program': ['explain-program'], 'narrate-run': ['narrate-run'], 'name-trick': ['name-trick'], 'sort-words': ['sort-words'], define: ['define'], letter: ['letter'] });
});

test('AC4 in the route: no model → every rung falls back at once with reason no-model, in both languages', async () => {
  const { olive, engine } = await stubDoors({ noModel: true });
  await withRelay(olive, async (port) => {
    for (const rung of RUNGS) {
      for (const L of LANGS) {
        const r = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung, slots: firstSlots(rung, L), lang: L } });
        assert.deepEqual({ ok: r.body.ok, fallback: r.body.fallback, reason: r.body.reason }, { ok: false, fallback: true, reason: 'no-model' }, `${rung} ${L}`);
      }
    }
  });
  assert.equal(engine.calls.length, 0);
});

test('CG-006’s kinds: `lacks` and `containsAll` grade replies (before, every reply was "not met", so a 🎓 probe of them passed vacuously)', async () => {
  const t = (x) => ({ ok: true, text: x });
  assert.equal(meetsOne({ kind: 'lacks', letters: ['e'] }, t('Mrci Pip')), true);
  assert.equal(meetsOne({ kind: 'lacks', letters: ['e'] }, t('Merci Pip')), false);
  assert.equal(meetsOne({ kind: 'lacks', words: ['eau'] }, t("Pas d'eau ici")), false, 'an elided word still counts');
  assert.equal(meetsOne({ kind: 'lacks', words: ['eau'] }, t('Beau temps')), true, 'a word inside a word does not');
  assert.equal(meetsOne({ kind: 'containsAll', all: ['Mamie', 'tulipes'] }, t('Merci Mamie pour les tulipes')), true);
  assert.equal(meetsOne({ kind: 'containsAll', all: ['Mamie', 'tulipes'] }, t('Merci Mamie')), false);
  // The vacuous 🎓 pass is gone: Olive OBEYING "no letter e" now fails the 🎓 probe.
  const probe = { id: 'G1', from: 'G1', rung: 'no-letter-e', lang: 'fr', slots: {}, mode: 'fail', expect: { kind: 'lacks', letters: ['e'] } };
  const obeyed = await runExam({ ask: async () => t('Mrci Pip !'), probes: [probe] });
  const ignored = await runExam({ ask: async () => t('Merci Pip !'), probes: [probe] });
  assert.deepEqual([obeyed.probes[0].pass, ignored.probes[0].pass], [false, true]);
});

test('IG-001 (P106 s1): a scripted answer by rung beats the table — a shaped rung takes it as its value, prose as its text — and the route still checks it', async () => {
  const { engine, olive } = await stubDoors({ stub: { answers: { 'is-it-a': 'no' } } });
  const yesNo = { properties: { answer: { enum: ['yes', 'no'] } } };
  assert.deepEqual(engine.answer({ rung: 'is-it-a', values: { thing: 'a tulip', kind: 'a flower' }, lang: 'en', schema: yesNo }), { value: 'no' });
  engine.set({ answers: { 'is-it-a': 'yes', poem: 'Tulla the tulip' } });
  assert.deepEqual(engine.answer({ rung: 'is-it-a', values: { thing: 'a tulip', kind: 'a flower' }, lang: 'en', schema: yesNo }), { value: 'yes' });
  assert.deepEqual(engine.answer({ rung: 'poem', values: { flower: 'Tulla' }, lang: 'en' }), { text: 'Tulla the tulip' });
  assert.deepEqual(engine.snapshot().answers, { 'is-it-a': 'yes', poem: 'Tulla the tulip' });
  assert.deepEqual(engine.set({ delayFor: { poem: 20 } }).delayFor, { poem: 20 });
  engine.set({ delayFor: {} });
  // Through the real route: the scripted reply arrives as the answer, in both shapes.
  await withRelay(olive, async (port) => {
    const said = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'poem', slots: { flower: 'Tulla' }, lang: 'en' } });
    assert.equal(said.body.ok, true);
    assert.equal(said.body.text, 'Tulla the tulip');
    const no = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'is-it-a', slots: { thing: templates.lists.things_ahead.en[0], kind: templates.lists.kinds.en[0] }, lang: 'en' } });
    assert.equal(no.body.ok, true);
    assert.equal(no.body.value, 'yes');
  });
  // Cleared: the table answers again.
  engine.set({ answers: {} });
  assert.notDeepEqual(engine.answer({ rung: 'poem', values: { flower: 'Tulla' }, lang: 'en' }), { text: 'Tulla the tulip' });
});
