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
 *
 * P106 IG-006 (rulings R6/R7) re-cut the exam to what ships: the three BLOCKS (say, read, is it a…?) and the five
 * LESSONS (count the tulips, 14 + 9, no letter e, tall tales, the direction), plus the hint voicing. The thirteen other
 * rungs and their probes went with their palette entries. `read` and `is it a…?` are SCORED (a count of right samples,
 * AC4), not graded per probe.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const templates = require('./olive-templates.json');

const RESULTS_FILE = 'olive-exam.json';
const DEFAULT_TIMES = 3;

/**
 * The things on each request's plot that `read` chooses from (IG-006): the request's own objects IN THE ORDER THE ENGINE
 * SENDS THEM (the world's things, first seen first) — the grammar enum. The note names ONE of them. Mamie's note plot:
 * red, yellow; the rock and the flowers: red tulip, rock; Sami's: the letter (a stone beside it here, so there is a
 * choice). Measured 2026-09-29 on Metal: with the sign's options the other way round ([rock, red tulip]) she answered
 * "rock" 3 runs in 3 in English — a first-option pull when the note names a kind ("the tulips"), not the option itself.
 */
const READ_OPTIONS = {
  fr: [['tulipe rouge', 'tulipe jaune'], ['tulipe rouge', 'rocher'], ['lettre', 'pierre']],
  en: [['red tulip', 'yellow tulip'], ['red tulip', 'rock'], ['letter', 'stone']]
};
const READ_ANSWER = { fr: ['tulipe rouge', 'tulipe rouge', 'lettre'], en: ['red tulip', 'red tulip', 'letter'] };

/**
 * `is it a…?` on TPL-012's C1 table (six questions, three samples each = 18; the readout 16/18), as the engine asks it:
 * "Devant Pip il y a {thing}. Est-ce {kind} ?" with the thing the ENGINE names. `all`: every sample is taken (no early
 * majority stop), so the rung's score is counted over the 18 (IG-006 AC4).
 */
const IS_IT_A = [
  ['une rose', 'une fleur', 'oui', 'a rose', 'a flower', 'yes'],
  ['une tulipe rouge', 'une tulipe', 'oui', 'a red tulip', 'a tulip', 'yes'],
  ['un chat', 'une fleur', 'non', 'a cat', 'a flower', 'no'],
  ['un pissenlit', 'une tulipe', 'non', 'a dandelion', 'a tulip', 'no'],
  ['un rocher', 'une plante', 'non', 'a rock', 'a plant', 'no'],
  ['un arrosoir', 'un animal', 'non', 'a watering can', 'an animal', 'no']
];

/** id, rung, request, mode, expect, from (the battery probe it is trimmed from). Repeats: `times`; `all`: no early stop. */
const PROBES = [
  // say — the thank-you (rung 1 of TPL-012; the block `say … to …`).
  { id: 'P01', from: 'A2', rung: 'say-thanks', lang: 'fr', slots: { to: 'Mamie Rose', deed: 'arrosé ses trois tulipes' }, mode: 'pass', expect: { kind: 'ok' } },
  { id: 'P02', from: 'A9', rung: 'say-thanks', lang: 'en', slots: { to: 'Mamie Rose', deed: 'watered her three tulips' }, mode: 'pass', expect: { kind: 'ok' } },
  // read — the three requests' notes, each with the objects on its plot (C5/C6: pick the named object, 6/6). The FR
  // three stand on C5/C6 (measured in French); the EN twins are recorded until a run on the real model says otherwise.
  ...[0, 1, 2].map((i) => ({ id: `RD${i + 1}-fr`, from: 'C5', rung: 'read', lang: 'fr', slots: { note: templates.lists.notes_read.fr[i] }, options: READ_OPTIONS.fr[i], times: 1, mode: 'pass', expect: { kind: 'equals', value: READ_ANSWER.fr[i] } })),
  ...[0, 1, 2].map((i) => ({ id: `RD${i + 1}-en`, from: '—', rung: 'read', lang: 'en', slots: { note: templates.lists.notes_read.en[i] }, options: READ_OPTIONS.en[i], times: 1, mode: 'record', expect: { kind: 'equals', value: READ_ANSWER.en[i] } })),
  // is it a…? — C1's six, three samples each (asserted, FR); the EN twins one sample each (recorded).
  ...IS_IT_A.map((q, i) => ({ id: `IA${i + 1}-fr`, from: 'C1', rung: 'is-it-a', lang: 'fr', slots: { thing: q[0], kind: q[1] }, times: 3, all: true, mode: 'pass', expect: { kind: 'equals', value: q[2] } })),
  ...IS_IT_A.map((q, i) => ({ id: `IA${i + 1}-en`, from: '—', rung: 'is-it-a', lang: 'en', slots: { thing: q[3], kind: q[4] }, times: 1, mode: 'record', expect: { kind: 'equals', value: q[5] } })),
  // The five lessons (R7), each on the failure the readout measured.
  // count the tulips — 4 in the list; she says 6, 7, 7 (E2).
  { id: 'P14', from: 'E2', rung: 'count-tulips', lang: 'fr', slots: { list: 'tulipe, tulipe, rose, tulipe, marguerite, tulipe, rose' }, mode: 'fail', expect: { kind: 'equals', value: 4 } },
  { id: 'P29', from: '—', rung: 'count-tulips', lang: 'en', slots: { list: 'tulip, tulip, rose, tulip, daisy, tulip, rose' }, times: 1, mode: 'record', expect: { kind: 'equals', value: 4 } },
  // 14 + 9 — she says 14, three times (E5).
  { id: 'P16', from: 'E5', rung: 'maths', lang: 'fr', slots: { a: '14', b: '9' }, mode: 'fail', expect: { kind: 'equals', value: 23 } },
  { id: 'P31', from: '—', rung: 'maths', lang: 'en', slots: { a: '14', b: '9' }, times: 1, mode: 'record', expect: { kind: 'equals', value: 23 } },
  // no letter e — G1 (Richard's ruling 2): she broke it 3/3 FR and 3/3 EN on CPU and Metal (CG-006 §7.1).
  { id: 'R9-G1-fr', from: 'G1', rung: 'no-letter-e', lang: 'fr', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', letters: ['e'] } },
  { id: 'R9-G1-en', from: 'CG-006 §7.1', rung: 'no-letter-e', lang: 'en', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', letters: ['e'] } },
  // tall tales — the fence does not hold (H1): she answers a question about the world.
  { id: 'P18', from: 'H1', rung: 'tall-tales', lang: 'fr', slots: { question: "Quelle est la capitale de l'Australie ?" }, times: 3, mode: 'fail', expect: { kind: 'contains', any: ['connais que le jardin', 'ne connais que', "n'en connais que", 'only know the garden'] } },
  { id: 'P33', from: '—', rung: 'tall-tales', lang: 'en', slots: { question: 'What is the capital of Australia?' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['only know the garden', 'only know about the garden'] } },
  // the direction — FR → EN works (A7), EN → FR is wobbly (A8).
  { id: 'P19', from: 'A7', rung: 'translate', lang: 'fr', slots: { note: 'Les tulipes ont soif.' }, mode: 'pass', expect: { kind: 'contains', any: ['thirsty'] } },
  { id: 'P20', from: 'A8', rung: 'translate', lang: 'en', slots: { note: 'Biscuit the cat is hungry.' }, mode: 'fail', expect: { kind: 'contains', any: ['faim'] } },
  // The hint voicing (not a block, not a lesson): recorded.
  { id: 'P22', from: '—', rung: 'voice-hint', lang: 'fr', slots: { key: 'hintWet', b: 'Pip' }, mode: 'record', expect: { kind: 'contains', any: ['flaque', 'tulipe', 'arros'] } },
  { id: 'P35', from: '—', rung: 'voice-hint', lang: 'en', slots: { key: 'hintWet', b: 'Pip' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['puddle', 'tulip', 'water'] } }
];

/**
 * IG-006 AC4: the two blocks built on Olive's passing column are graded on a COUNT of samples, not per probe — `read`
 * picks the named object in at least 5 of its 6 samples (the three notes, FR and EN), `is it a…?` answers right in at
 * least 15 of C1's 18 (FR). The rung passes on the count; the probes still carry their own rows.
 */
const SCORED = Object.freeze({
  read: { probes: /^RD\d-(fr|en)$/, min: 5, of: 6 },
  'is-it-a': { probes: /^IA\d-fr$/, min: 15, of: 18 }
});

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
    while (replies.length < times && (p.all || !decided(p.expect, replies, times))) {
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
    // IG-006 AC4: a scored rung passes on its count of right samples, over the probes the score names.
    const sc = SCORED[name];
    if (sc) {
      const byId = new Map(probes.map((q) => [q.id, q]));
      let met = 0;
      let of = 0;
      for (const row of out) {
        if (row.rung !== name || !sc.probes.test(row.id)) continue;
        const q = byId.get(row.id);
        for (const reply of row.replies) {
          of++;
          if (meetsOne(q.expect, reply)) met++;
        }
      }
      if (of > 0) {
        r.score = { met, of, min: sc.min };
        r.pass = met >= sc.min;
      }
    }
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

module.exports = { PROBES, SCORED, READ_OPTIONS, IS_IT_A, KINDS, met, meetsOne, decided, runExam, readResults, writeResults, resultsPath, RESULTS_FILE, DEFAULT_TIMES, ladderOf, verdictOf, withheldRungs };
