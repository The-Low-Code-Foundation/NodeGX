/**
 * Olive's exam (P105 CG-004): ~20 canned probes trimmed from `tpl-012-olive-exam/battery.mjs`, each with the answer
 * the 2026-09-27 readout gave, run on first launch and on demand (`POST /__garden/olive/exam`), one pass/fail per rung,
 * the results kept in the app data (`olive-exam.json`) for the Grown-ups page and for CG-005's gate.
 *
 * The ladder (TPL-012 §2.6) is built on BOTH columns of the readout: a ✅ rung passes when Olive does what the
 * readout said she does; a 🎓 rung passes when she FAILS the way the readout said she fails (the child's lesson is the
 * failure). `mode`: 'pass' = asserted; 'fail' = the failure is asserted; 'record' = measured and kept, never asserted
 * (a probe the battery did not run).
 *
 * `runExam({ask, ...})` takes the route's own ask function, so the exam goes through every check the game's asks go
 * through. Plain Node.
 *
 * `from`: an ASSERTED probe is one somebody measured on the real model — a battery probe id (A1–H9, the 2026-09-27
 * readout) or `CG-006 §7.1` (the moment and rung-9 probes run on CPU and Metal, 2026-09-28). A probe nobody measured is
 * `record`.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const templates = require('./olive-templates.json');

const RESULTS_FILE = 'olive-exam.json';
const DEFAULT_TIMES = 3;

/** id, rung, request, mode, expect, from (the battery probe it is trimmed from). Repeats: `times`. */
const PROBES = [
  { id: 'P01', from: 'A2', rung: 'say-thanks', lang: 'fr', slots: { to: 'Mamie Rose', deed: 'arrosé ses trois tulipes' }, mode: 'pass', expect: { kind: 'ok' } },
  { id: 'P02', from: 'A9', rung: 'say-thanks', lang: 'en', slots: { to: 'Mamie Rose', deed: 'watered her three tulips' }, mode: 'pass', expect: { kind: 'ok' } },
  { id: 'P03', from: 'B3', rung: 'name-three', lang: 'fr', slots: { thing: 'un chat roux' }, mode: 'pass', expect: { kind: 'items', n: 3 } },
  { id: 'P04', from: 'F1', rung: 'name-one', lang: 'fr', slots: { thing: 'une tulipe' }, temperature: 0, times: 3, mode: 'pass', expect: { kind: 'identical' } },
  { id: 'P05', from: 'F2', rung: 'name-one', lang: 'fr', slots: { thing: 'une tulipe' }, temperature: 1.2, times: 3, mode: 'pass', expect: { kind: 'distinct', atLeast: 2 } },
  { id: 'P06', from: 'D1', rung: 'words-to-blocks', lang: 'fr', slots: { route: 'Avance de deux cases puis tourne à gauche.' }, mode: 'pass', expect: { kind: 'equals', value: ['avancer', 'avancer', 'gauche'] } },
  { id: 'P07', from: 'D2', rung: 'words-to-blocks', lang: 'fr', slots: { route: "Avance d'une case, tourne à gauche, et arrose la tulipe." }, mode: 'pass', expect: { kind: 'equals', value: ['avancer', 'gauche', 'arroser'] } },
  { id: 'P08', from: 'D4', rung: 'words-to-blocks', lang: 'fr', slots: { route: 'Tourne à droite, avance, arrose.' }, mode: 'pass', expect: { kind: 'equals', value: ['droite', 'avancer', 'arroser'] } },
  { id: 'P09', from: 'D3', rung: 'count-in-words', lang: 'fr', slots: { route: 'Avance de trois cases.' }, mode: 'fail', expect: { kind: 'equals', value: ['avancer', 'avancer', 'avancer'] } },
  { id: 'P10', from: 'C5', rung: 'what-wants', lang: 'fr', slots: { line: "Biscuit miaule : « J'ai tellement faim, ma gamelle est vide, apporte-moi des croquettes ! »" }, mode: 'pass', expect: { kind: 'equals', value: 'croquettes' } },
  { id: 'P11', from: 'C6', rung: 'what-wants', lang: 'fr', slots: { line: 'Sami dit : « Peux-tu porter cette enveloppe à Mamie Rose ? »' }, mode: 'pass', expect: { kind: 'equals', value: 'lettre' } },
  { id: 'P12', from: 'C1', rung: 'is-it-a', lang: 'fr', slots: { thing: 'une rose', kind: 'une fleur' }, mode: 'pass', expect: { kind: 'equals', value: 'oui' } },
  { id: 'P13', from: 'C1', rung: 'is-it-a', lang: 'fr', slots: { thing: 'un chat', kind: 'une fleur' }, mode: 'pass', expect: { kind: 'equals', value: 'non' } },
  { id: 'P14', from: 'E2', rung: 'count-tulips', lang: 'fr', slots: { list: 'tulipe, tulipe, rose, tulipe, marguerite, tulipe, rose' }, mode: 'fail', expect: { kind: 'equals', value: 4 } },
  { id: 'P15', from: 'E3', rung: 'maths-seeds', lang: 'fr', slots: { a: '2', b: '3' }, mode: 'pass', expect: { kind: 'equals', value: 5 } },
  { id: 'P16', from: 'E5', rung: 'maths', lang: 'fr', slots: { a: '14', b: '9' }, mode: 'fail', expect: { kind: 'equals', value: 23 } },
  // Rung 9 is G1 "no letter e" (Richard's ruling 2, 2026-09-28): she broke it 3/3 FR and 3/3 EN on CPU and Metal
  // (CG-006 §7.1). "Under 5 words" (P17/P32 until s3) was obeyed 6/6 and is retired; G2 "never mention water" was kept
  // 3/3 and is dropped. 🎓: the rung passes when she BREAKS the rule (a reply with an e).
  { id: 'R9-G1-fr', from: 'G1', rung: 'no-letter-e', lang: 'fr', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', letters: ['e'] } },
  { id: 'R9-G1-en', from: 'CG-006 §7.1', rung: 'no-letter-e', lang: 'en', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', letters: ['e'] } },
  { id: 'P18', from: 'H1', rung: 'tall-tales', lang: 'fr', slots: { question: "Quelle est la capitale de l'Australie ?" }, times: 3, mode: 'fail', expect: { kind: 'contains', any: ['connais que le jardin', 'ne connais que', "n'en connais que", 'only know the garden'] } },
  { id: 'P19', from: 'A7', rung: 'translate', lang: 'fr', slots: { note: 'Les tulipes ont soif.' }, mode: 'pass', expect: { kind: 'contains', any: ['thirsty'] } },
  { id: 'P20', from: 'A8', rung: 'translate', lang: 'en', slots: { note: 'Biscuit the cat is hungry.' }, mode: 'fail', expect: { kind: 'contains', any: ['faim'] } },
  { id: 'P21', from: 'A5', rung: 'poem', lang: 'fr', slots: { flower: 'Tulla' }, mode: 'pass', expect: { kind: 'lines', n: 2 } },
  { id: 'P22', from: '—', rung: 'voice-hint', lang: 'fr', slots: { key: 'hintWet', b: 'Pip' }, mode: 'record', expect: { kind: 'contains', any: ['flaque', 'tulipe', 'arros'] } },
  { id: 'P23', from: '—', rung: 'words-to-blocks', lang: 'en', slots: { route: 'Go forward two squares then turn left.' }, mode: 'record', expect: { kind: 'equals', value: ['avancer', 'avancer', 'gauche'] } },
  // CG-005 AC8: every rung examined in BOTH languages. The 2026-09-27 readout was taken in French; these English twins are
  // RECORDED (one sample each, the tablet's exam time), never asserted, until a contract run on the real model says what
  // she does in English — then each moves to the FR probe's mode. The rung verdicts stay on the asserted FR probes.
  { id: 'P24', from: '—', rung: 'name-three', lang: 'en', slots: { thing: 'a ginger cat' }, times: 1, mode: 'record', expect: { kind: 'items', n: 3 } },
  { id: 'P25', from: '—', rung: 'name-one', lang: 'en', slots: { thing: 'a tulip' }, temperature: 0, times: 2, mode: 'record', expect: { kind: 'identical' } },
  { id: 'P26', from: '—', rung: 'count-in-words', lang: 'en', slots: { route: 'Go forward three squares.' }, times: 1, mode: 'record', expect: { kind: 'equals', value: ['avancer', 'avancer', 'avancer'] } },
  { id: 'P27', from: '—', rung: 'what-wants', lang: 'en', slots: { line: 'Biscuit meows: "I\'m so hungry, my bowl is empty, bring me some kibble!"' }, times: 1, mode: 'record', expect: { kind: 'equals', value: 'kibble' } },
  { id: 'P28', from: '—', rung: 'is-it-a', lang: 'en', slots: { thing: 'a rose', kind: 'a flower' }, times: 1, mode: 'record', expect: { kind: 'equals', value: 'yes' } },
  { id: 'P29', from: '—', rung: 'count-tulips', lang: 'en', slots: { list: 'tulip, tulip, rose, tulip, daisy, tulip, rose' }, times: 1, mode: 'record', expect: { kind: 'equals', value: 4 } },
  { id: 'P30', from: '—', rung: 'maths-seeds', lang: 'en', slots: { a: '2', b: '3' }, times: 1, mode: 'record', expect: { kind: 'equals', value: 5 } },
  { id: 'P31', from: '—', rung: 'maths', lang: 'en', slots: { a: '14', b: '9' }, times: 1, mode: 'record', expect: { kind: 'equals', value: 23 } },
  { id: 'P33', from: '—', rung: 'tall-tales', lang: 'en', slots: { question: 'What is the capital of Australia?' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['only know the garden', 'only know about the garden'] } },
  { id: 'P34', from: '—', rung: 'poem', lang: 'en', slots: { flower: 'Tulla' }, times: 1, mode: 'record', expect: { kind: 'lines', n: 2 } },
  { id: 'P35', from: '—', rung: 'voice-hint', lang: 'en', slots: { key: 'hintWet', b: 'Pip' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['puddle', 'tulip', 'water'] } },
  // CG-006 §4's moments promoted to rungs 13–18 (s3), each probe as measured in CG-006 §7.1 (CPU and Metal agreed on
  // every decision). The EN twins nobody measured (E5-en, E9-en) are recorded, one sample.
  // 13 — E3 explain my program (✅).
  { id: 'E3-fr', from: 'CG-006 §7.1', rung: 'explain-program', lang: 'fr', slots: { program: 'avancer, avancer, gauche, arroser' }, mode: 'pass', expect: { kind: 'containsAll', all: ['avance', 'gauche', 'arros'] } },
  { id: 'E3-en', from: 'CG-006 §7.1', rung: 'explain-program', lang: 'en', slots: { program: 'forward, forward, turn left, water' }, mode: 'pass', expect: { kind: 'containsAll', all: ['forward', 'left', 'water'] } },
  // The round trip is lossy: does "avancer, avancer" come back as "deux fois"? Recorded: the lesson either way.
  { id: 'E3-count', from: '—', rung: 'explain-program', lang: 'fr', slots: { program: 'avancer, avancer, gauche, arroser' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['deux'] } },
  // 14 — E4 Olive narrates the run (✅).
  { id: 'E4-fr', from: 'CG-006 §7.1', rung: 'narrate-run', lang: 'fr', slots: { trace: "avancé, avancé, tourné à droite, arrosé l'herbe, une flaque" }, mode: 'pass', expect: { kind: 'contains', any: ['flaque'] } },
  { id: 'E4-en', from: 'CG-006 §7.1', rung: 'narrate-run', lang: 'en', slots: { trace: 'moved, moved, turned right, watered the grass, a puddle' }, mode: 'pass', expect: { kind: 'contains', any: ['puddle'] } },
  // 15 — E5 name my trick (✅: a one-word name comes back; how apt it is, is recorded).
  { id: 'E5-fr', from: 'CG-006 §7.1', rung: 'name-trick', lang: 'fr', slots: { body: 'avancer, avancer, gauche, arroser, droite' }, mode: 'pass', expect: { kind: 'ok' } },
  { id: 'E5-apt', from: '—', rung: 'name-trick', lang: 'fr', slots: { body: 'avancer, avancer, gauche, arroser, droite' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['arros', 'rang', 'tulip', 'pluie', 'goutte'] } },
  { id: 'E5-en', from: '—', rung: 'name-trick', lang: 'en', slots: { body: 'forward, forward, turn left, water, turn right' }, times: 1, mode: 'record', expect: { kind: 'ok' } },
  // 16 — E8 🎓 sort these words: reliably wrong (0/3 FR and EN, both paths), so the program sorts. The input is in
  // neither order, so a copy of it is not a sort.
  { id: 'E8-fr', from: 'CG-006 §7.1', rung: 'sort-words', lang: 'fr', slots: { words: 'tulipe, arrosoir, chat' }, mode: 'fail', expect: { kind: 'equals', value: ['arrosoir', 'chat', 'tulipe'] } },
  { id: 'E8-en', from: 'CG-006 §7.1', rung: 'sort-words', lang: 'en', slots: { words: 'tulip, bucket, cat' }, mode: 'fail', expect: { kind: 'equals', value: ['bucket', 'cat', 'tulip'] } },
  // 17 — E9 🎓 Olive's dictionary: MIXED by design (the rung's `verdict: 'mixed'`): offered when her definitions
  // DISAGREE — some right, some made up. Recorded; the rung verdict reads the set. `arroser`, not `arros`: the headword
  // "arrosoir" itself contains "arros", so the old expectation met whenever she repeated the word.
  { id: 'E9-arrosoir', from: 'CG-006 §7.1', rung: 'define', lang: 'fr', slots: { word: 'un arrosoir' }, mode: 'record', expect: { kind: 'contains', any: ['arroser', "l'eau", 'l’eau', 'de l eau'] } },
  { id: 'E9-chouette', from: 'CG-006 §7.1', rung: 'define', lang: 'fr', slots: { word: 'une chouette' }, mode: 'record', expect: { kind: 'contains', any: ['oiseau'] } },
  { id: 'E9-rocher', from: 'CG-006 §7.1', rung: 'define', lang: 'fr', slots: { word: 'un rocher' }, mode: 'record', expect: { kind: 'contains', any: ['pierre', 'caillou'] } },
  { id: 'E9-en', from: '—', rung: 'define', lang: 'en', slots: { word: 'a rock' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['stone'] } },
  // 18 — E10 the letter generator (✅, with the rung's must-contain on the object: the data is the truth).
  { id: 'E10-fr', from: 'CG-006 §7.1', rung: 'letter', lang: 'fr', slots: { who: 'Biscuit', object: 'croquettes' }, mode: 'pass', expect: { kind: 'contains', any: ['croquettes'] } },
  { id: 'E10-en', from: 'CG-006 §7.1', rung: 'letter', lang: 'en', slots: { who: 'Biscuit', object: 'kibble' }, mode: 'pass', expect: { kind: 'contains', any: ['kibble'] } }
];

/**
 * The rung's ladder comes from the rung TABLE, not from a probe's mode. A recorded probe on a 🎓 rung is graded the
 * 🎓 way: she passes the rung when she FAILS the probe. (Until CG-005 a recorded probe was graded `pass = met` on every
 * rung, so rung 9 — "under 5 words", which she OBEYS 6 runs in 6 — came out `pass` and was OFFERED, the opposite of
 * what CG-004 §7 finding (a) says the gate does.)
 */
function ladderOf(rung) {
  const r = templates.rungs[rung];
  return r && r.ladder === 'fail' ? 'fail' : 'pass';
}

/**
 * A rung whose table entry says `verdict: 'mixed'` (define, CG-006 E9) is graded on its RECORDED probes as a set: it
 * passes when they DISAGREE (at least one met and one not) — "some of her answers are right, some made up" is the
 * lesson; all right or all wrong and the lesson does not show.
 */
function verdictOf(rung) {
  const r = templates.rungs[rung];
  return r && r.verdict === 'mixed' ? 'mixed' : 'ladder';
}

/**
 * Every expectation kind `meetsOne`/`met` grade. 🔴 A probe of any other kind can never pass (runExam): before CG-005
 * a kind `meetsOne` did not know fell to its `default: false`, so a 🎓 probe of it "failed as designed" whatever
 * Olive said — a vacuous pass. `exam.test.js` also grades every kind the PROBES use both ways.
 */
const KINDS = Object.freeze(['ok', 'equals', 'items', 'contains', 'wordsAtMost', 'lines', 'containsAll', 'lacks', 'identical', 'distinct']);

function fold(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Does ONE reply meet `expect`? (`identical` and `distinct` read the whole set instead.)
 */
function meetsOne(expect, x) {
  if (!x || !x.ok) return false;
  const got = x.value !== undefined ? x.value : x.text;
  switch (expect.kind) {
    case 'ok':
      return true;
    case 'equals':
      return JSON.stringify(got) === JSON.stringify(expect.value);
    case 'items':
      return Array.isArray(x.value) && x.value.length === expect.n && x.value.every((s) => typeof s === 'string' && s.trim());
    case 'contains': {
      const f = fold(got);
      return expect.any.some((a) => f.includes(fold(a)));
    }
    case 'wordsAtMost':
      return String(x.text || '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length <= expect.n;
    case 'lines':
      return String(x.text || '').split('\n').filter((l) => l.trim()).length === expect.n;
    // CG-006's kinds (lane B's EXAM_KIND_PATCH, cg006Probes.ts at ba8a8a6d6, taken verbatim): without them the default
    // below graded every reply "not met", so a 🎓 probe of these kinds passed whatever Olive said.
    case 'containsAll': {
      const f = fold(got);
      return expect.all.every((a) => f.includes(fold(a)));
    }
    case 'lacks': {
      const f = fold(got);
      if ((expect.letters || []).some((l) => f.includes(fold(l)))) return false;
      const ws = new Set(f.split(/\s+/).flatMap((w) => w.split(/['’]/)).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean));
      return !(expect.words || []).some((w) => ws.has(fold(w)));
    }
    default:
      return false;
  }
}

const SET_KINDS = new Set(['identical', 'distinct']);

/**
 * Did the replies meet `expect`? (Not "did the probe pass": a 🎓 probe passes when this is false.)
 *
 * The bar is the readout's own: a ✅ line there was "most of the time" (C1 16/18, D3 2 of 3 one-avancer), never
 * "every time". So a per-reply expectation is met when the MAJORITY of the samples meet it — 2 of 3 — and a 🎓 rung
 * passes when she fails 2 of 3. One sample graded one way then the other on the same afternoon (P15 on CPU: 3, then 5;
 * P07: right on Metal 3/3, wrong once on CPU; P02/P21 at temperature 0.8 once each), which is exactly what a single
 * sample of a sampled model does. `identical`/`distinct` read the whole set (the temperature dial).
 */
function met(expect, replies) {
  if (!replies.length) return false;
  const got = (x) => (x.ok ? (x.value !== undefined ? x.value : x.text) : undefined);
  if (expect.kind === 'identical') return replies.every((x) => x.ok) && new Set(replies.map((x) => JSON.stringify(got(x)))).size === 1;
  if (expect.kind === 'distinct') {
    // "Surprise me" at temperature 1.2: at least `atLeast` DIFFERENT answers among the ones that passed the checks.
    // A reply the cap refused (a two-word name, 1 in 3 on 2026-09-27) is the product's fallback, not a sameness.
    const okOnes = replies.filter((x) => x.ok).map((x) => JSON.stringify(got(x)));
    return okOnes.length >= expect.atLeast && new Set(okOnes).size >= expect.atLeast;
  }
  const yes = replies.filter((x) => meetsOne(expect, x)).length;
  return yes * 2 > replies.length;
}

/** Sample until the majority verdict cannot change, at most `times` (3 by default): 2 met → met, 2 not met → not. */
function decided(expect, replies, times) {
  if (SET_KINDS.has(expect.kind)) return replies.length >= times;
  const yes = replies.filter((x) => meetsOne(expect, x)).length;
  const no = replies.length - yes;
  const need = Math.floor(times / 2) + 1;
  return yes >= need || no >= need;
}

/**
 * @param {{ ask: (req: object) => Promise<object>, probes?: object[], timings?: {line: Function}|null, log?: Function,
 *   now?: () => number }} o
 * @returns {Promise<{at: string, ms: number, probes: object[], rungs: object, passed: number, failed: number}>}
 */
async function runExam({ ask, probes = PROBES, timings = null, log = () => {}, now = () => Date.now() }) {
  const t0 = now();
  const out = [];
  const graded = new Set(); // the ids of the probes whose kind the exam knows
  for (const p of probes) {
    const replies = [];
    const times = p.times || DEFAULT_TIMES;
    const t1 = now();
    while (replies.length < times && !decided(p.expect, replies, times)) {
      replies.push(await ask({ rung: p.rung, slots: p.slots, lang: p.lang, shape: p.shape, temperature: p.temperature, options: p.options }));
    }
    const ms = now() - t1;
    const wasMet = met(p.expect, replies);
    const known = KINDS.includes(p.expect && p.expect.kind);
    if (known) graded.add(p.id);
    const pass = known && (p.mode === 'fail' || (p.mode === 'record' && ladderOf(p.rung) === 'fail') ? !wasMet : wasMet);
    const row = { id: p.id, from: p.from, rung: p.rung, lang: p.lang, mode: p.mode, met: wasMet, pass, ms, replies: replies.map((r) => ({ ok: r.ok, value: r.value, text: r.text, reason: r.reason, fallback: r.fallback, ms: r.ms })) };
    out.push(row);
    if (timings) timings.line({ event: 'exam-probe', id: p.id, rung: p.rung, ms, samples: replies.length, pass });
    log(`exam ${p.id} ${p.rung} ${p.mode} ${pass ? 'PASS' : 'FAIL'} ${ms} ms ${JSON.stringify(row.replies.map((r) => r.value !== undefined ? r.value : r.text !== undefined ? r.text : r.reason)).slice(0, 160)}`);
  }
  // One verdict per rung: every asserted probe of the rung behaved as the ladder expects. Recorded probes are kept
  // beside it and count only when the rung has no asserted probe (voice-hint), or when the rung is graded as a mixed set.
  const rungs = {};
  for (const row of out) {
    const r = (rungs[row.rung] = rungs[row.rung] || { ladder: ladderOf(row.rung), probes: [], pass: true, asserted: 0 });
    r.probes.push(row.id);
    if (row.mode === 'record') continue;
    r.asserted++;
    if (!row.pass) r.pass = false;
  }
  for (const [name, r] of Object.entries(rungs)) {
    if (verdictOf(name) === 'mixed') {
      // An unknown kind is never "not met" here either: it would fake the disagreement.
      const set = out.filter((x) => x.rung === name && x.mode === 'record' && graded.has(x.id));
      const yes = set.filter((x) => x.met).length;
      r.verdict = 'mixed';
      r.pass = (r.asserted === 0 || r.pass) && yes > 0 && yes < set.length;
    } else if (r.asserted === 0) r.pass = out.filter((x) => x.rung === name).every((x) => x.pass);
  }
  const asserted = out.filter((x) => x.mode !== 'record');
  return { at: new Date().toISOString(), ms: now() - t0, probes: out, rungs, passed: asserted.filter((x) => x.pass).length, failed: asserted.filter((x) => !x.pass).length };
}

function resultsPath(dataDir) {
  return path.join(dataDir, RESULTS_FILE);
}

function readResults(dataDir) {
  try {
    return JSON.parse(fs.readFileSync(resultsPath(dataDir), 'utf8'));
  } catch {
    return null;
  }
}

function writeResults(dataDir, results) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(resultsPath(dataDir), JSON.stringify(results, null, 2));
}

/**
 * CG-005 AC5 — the exam gate: the rungs this machine's exam FAILED. A rung the exam has not graded (no results yet: the
 * first-launch exam still running, or no model at all — AC4, the ladder runs on written lines) is not withheld; only a
 * measured failure withholds. The page reads the same rule from `status.exam.rungs` (cg005Olive.ts `withheldRungs`).
 */
function withheldRungs(results) {
  const out = [];
  const rungs = results && results.rungs && typeof results.rungs === 'object' ? results.rungs : {};
  for (const [id, r] of Object.entries(rungs)) if (r && r.pass === false) out.push(id);
  return out.sort();
}

module.exports = { PROBES, KINDS, met, meetsOne, decided, runExam, readResults, writeResults, resultsPath, RESULTS_FILE, DEFAULT_TIMES, ladderOf, verdictOf, withheldRungs };
