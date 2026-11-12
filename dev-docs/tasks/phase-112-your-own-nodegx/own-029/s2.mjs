// OWN-029 s2 — the accept rule, paired. Per brief, K1/K2 (accept by constraint) and W1/W2 (accept by the s1 sum)
// replay the SAME round-0 decisions from S0-<brief>, so they start from one structure; the words of round 0 are
// sampled afresh in each run, which gives the spread. Reads round 0 and the kept round: defects per line, organised,
// suits, the rounds kept, and which new critics (S13 repeated list, S14 prices) fired.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const load = (r) => { const f = path.join(HERE, 'runs', r, 'ledger.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const shape = (L) => JSON.stringify(L.roundsLog[0].sections.map((x) => [x.kind, x.bits, x.band]));
const at = (L, round) => { const x = L.roundsLog.find((r) => r.round === round); return { perLine: x.perLine, org: x.org, suits: x.suits, sum: x.sum, lines: x.lines }; };
const f2 = (v) => (v == null ? '  -  ' : String(+v.toFixed(2)).padEnd(5));
const arms = { K: [], W: [] };
for (const b of ['puppy', 'bakery', 'running', 'jazz', 'pottery', 'plumber']) {
  const src = load(`S0-${b}`);
  if (!src) continue;
  console.log(`\n== ${b}  (source S0 r0: per line ${f2(src.roundsLog[0].perLine)} organised ${f2(src.roundsLog[0].org)})`);
  for (const arm of ['K', 'W']) for (const k of [1, 2]) {
    const L = load(`${arm}${k}-${b}`);
    if (!L?.result) continue;
    const paired = shape(L) === shape(src);
    const r0 = at(L, 0), kept = at(L, L.result.bestRound);
    const keptRounds = L.roundsLog.filter((r) => r.kept && r.round > 0).length, tried = L.roundsLog.length - 1;
    const fired = [...new Set(L.roundsLog.flatMap((r) => r.issues.map((i) => i.id.split('|')[0])).filter((id) => /^S1[34]/.test(id)))];
    console.log(`  ${arm}${k} ${paired ? '' : '(NOT paired) '}r0 /line ${f2(r0.perLine)} org ${f2(r0.org)} → kept r${L.result.bestRound} /line ${f2(kept.perLine)} org ${f2(kept.org)} suits ${f2(kept.suits)} lines ${kept.lines}  kept ${keptRounds}/${tried}  ${L.result.minutes} min  ${fired.join(' ')}`);
    if (paired) arms[arm].push({ b, r0, kept, dOrg: kept.org - r0.org, dLine: kept.perLine - r0.perLine, orgFell: kept.org < r0.org - 0.1 });
  }
}
const mean = (xs, k) => (xs.length ? +(xs.reduce((a, x) => a + (typeof k === 'function' ? k(x) : x[k] ?? 0), 0) / xs.length).toFixed(3) : null);
console.log('\nmeans over paired runs');
for (const [arm, xs] of Object.entries(arms)) console.log(`  ${arm} (${xs.length} runs)  r0 /line ${mean(xs, (x) => x.r0.perLine)} org ${mean(xs, (x) => x.r0.org)}  →  kept /line ${mean(xs, (x) => x.kept.perLine)} org ${mean(xs, (x) => x.kept.org)} suits ${mean(xs, (x) => x.kept.suits)}  | Δorg ${mean(xs, 'dOrg')} Δ/line ${mean(xs, 'dLine')}  organisation fell >0.1 in ${xs.filter((x) => x.orgFell).length}`);
