// OWN-029 — the paired copy experiment. P1 and P2 replay the SAME round-0 decisions (from an A run), so the page's
// structure is identical and only the words differ: per line (P1) or one call per section (P2). Reads the critics'
// word issues per line of copy, the reviewer's mean P(sound), and the builder calls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const load = (r) => { const f = path.join(HERE, 'runs', r, 'ledger.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const WORDS = new Set(['S2', 'S5', 'S6', 'S9', 'S11', 'J1', 'J2', 'C', 'M']);
const row = (L) => {
  const x = L.roundsLog[0];
  const lines = x.words.join('\n').split('\n').filter((l) => /^\s*-|^\s+\d\./.test(l)).length;
  const w = x.issues.filter((i) => WORDS.has(i.id.split('|')[0])).reduce((a, i) => a + i.weight, 0);
  const sound = x.sections.map((s) => s.pSound).filter((p) => p != null);
  return { lines, wordIssues: +w.toFixed(1), perLine: +(w / lines).toFixed(3), sound: +(sound.reduce((a, b) => a + b, 0) / sound.length).toFixed(3), calls: L.calls.filter((c) => !c.forced && !c.learned && !c.random).length, decisions: L.decisionsFrom?.decisions };
};
const out = [];
for (const b of ['puppy', 'bakery', 'running', 'jazz', 'pottery', 'plumber']) {
  const p1 = load(`P1-${b}`), p2 = load(`P2-${b}`);
  if (!p1 || !p2) continue;
  // the pairing holds only when every decision replayed: a source run on an older harness asks some look questions
  // with other option lists (another signature), and those are sampled afresh in each arm
  const shape = (L) => JSON.stringify(L.roundsLog[0].sections.map((x) => [x.kind, x.bits, x.band]));
  const same = shape(p1) === shape(p2);
  if (!same) { console.log(`${b.padEnd(8)} NOT paired (structure differs: ${p1.calls.filter((c) => c.conf && !c.forced).length} decisions re-sampled) — left out`); continue; }
  out.push({ brief: b, P1: row(p1), P2: row(p2) });
}
for (const r of out) console.log(r.brief.padEnd(8), 'per line', JSON.stringify(r.P1), '\n         deck    ', JSON.stringify(r.P2));
const mean = (k, arm) => +(out.reduce((a, r) => a + r[arm][k], 0) / out.length).toFixed(3);
console.log('\nmeans  per line: issues/line', mean('perLine', 'P1'), 'sound', mean('sound', 'P1'), 'calls', mean('calls', 'P1'), '| deck: issues/line', mean('perLine', 'P2'), 'sound', mean('sound', 'P2'), 'calls', mean('calls', 'P2'));
