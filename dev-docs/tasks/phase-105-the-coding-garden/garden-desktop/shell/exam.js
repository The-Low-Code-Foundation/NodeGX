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
 */
'use strict';

const fs = require('fs');
const path = require('path');

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
  // B5 does NOT reproduce: the battery saw 7 words 3/3 (2026-09-27 readout); the contract test saw "Merci à Pip !" and
  // "Merci, Pip." ×3 the same day — 4/4 obeyed. Recorded, not asserted: the exam's rung verdict still decides whether
  // rung 9 is offered on a machine (CG-005's gate), and CG-006 owns the redesign of the rung.
  { id: 'P17', from: 'B5', rung: 'under-five-words', lang: 'fr', slots: { to: 'Pip' }, times: 3, mode: 'record', expect: { kind: 'wordsAtMost', n: 4 } },
  { id: 'P18', from: 'H1', rung: 'tall-tales', lang: 'fr', slots: { question: "Quelle est la capitale de l'Australie ?" }, times: 3, mode: 'fail', expect: { kind: 'contains', any: ['connais que le jardin', 'ne connais que', "n'en connais que", 'only know the garden'] } },
  { id: 'P19', from: 'A7', rung: 'translate', lang: 'fr', slots: { note: 'Les tulipes ont soif.' }, mode: 'pass', expect: { kind: 'contains', any: ['thirsty'] } },
  { id: 'P20', from: 'A8', rung: 'translate', lang: 'en', slots: { note: 'Biscuit the cat is hungry.' }, mode: 'fail', expect: { kind: 'contains', any: ['faim'] } },
  { id: 'P21', from: 'A5', rung: 'poem', lang: 'fr', slots: { flower: 'Tulla' }, mode: 'pass', expect: { kind: 'lines', n: 2 } },
  { id: 'P22', from: '—', rung: 'voice-hint', lang: 'fr', slots: { key: 'hintWet', b: 'Pip' }, mode: 'record', expect: { kind: 'contains', any: ['flaque', 'tulipe', 'arros'] } },
  { id: 'P23', from: '—', rung: 'words-to-blocks', lang: 'en', slots: { route: 'Go forward two squares then turn left.' }, mode: 'record', expect: { kind: 'equals', value: ['avancer', 'avancer', 'gauche'] } }
];

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
  for (const p of probes) {
    const replies = [];
    const times = p.times || DEFAULT_TIMES;
    const t1 = now();
    while (replies.length < times && !decided(p.expect, replies, times)) {
      replies.push(await ask({ rung: p.rung, slots: p.slots, lang: p.lang, shape: p.shape, temperature: p.temperature, options: p.options }));
    }
    const ms = now() - t1;
    const wasMet = met(p.expect, replies);
    const pass = p.mode === 'fail' ? !wasMet : wasMet;
    const row = { id: p.id, from: p.from, rung: p.rung, lang: p.lang, mode: p.mode, met: wasMet, pass, ms, replies: replies.map((r) => ({ ok: r.ok, value: r.value, text: r.text, reason: r.reason, fallback: r.fallback, ms: r.ms })) };
    out.push(row);
    if (timings) timings.line({ event: 'exam-probe', id: p.id, rung: p.rung, ms, samples: replies.length, pass });
    log(`exam ${p.id} ${p.rung} ${p.mode} ${pass ? 'PASS' : 'FAIL'} ${ms} ms ${JSON.stringify(row.replies.map((r) => r.value !== undefined ? r.value : r.text !== undefined ? r.text : r.reason)).slice(0, 160)}`);
  }
  // One verdict per rung: every asserted probe of the rung behaved as the ladder expects. Recorded probes are kept
  // beside it and count only when the rung has no asserted probe (voice-hint).
  const rungs = {};
  for (const row of out) {
    const r = (rungs[row.rung] = rungs[row.rung] || { ladder: row.mode === 'fail' ? 'fail' : 'pass', probes: [], pass: true, asserted: 0 });
    r.probes.push(row.id);
    if (row.mode === 'record') continue;
    r.asserted++;
    if (!row.pass) r.pass = false;
  }
  for (const [name, r] of Object.entries(rungs)) {
    if (r.asserted === 0) r.pass = out.filter((x) => x.rung === name).every((x) => x.pass);
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

module.exports = { PROBES, met, meetsOne, decided, runExam, readResults, writeResults, resultsPath, RESULTS_FILE, DEFAULT_TIMES };
