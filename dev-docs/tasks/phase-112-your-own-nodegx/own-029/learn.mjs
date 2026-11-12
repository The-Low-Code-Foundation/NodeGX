// OWN-029 — the harness learns its own rules. Reads every run's ledger and finds the decisions the model answered the
// SAME way, confidently, every time it was asked them. Those become script rules (rules.json): the next run answers
// them without a model call. "When the answer comes out of a script, the script answers it" (OWN-027 §3 rule 4) —
// but here the script finds out which answers those are by watching the model.
//
//   node learn.mjs [--min-runs 3] [--min-p 0.9] [--min-briefs 2]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? Number(argv[i + 1]) : d; };
const MIN_RUNS = opt('--min-runs', 3), MIN_P = opt('--min-p', 0.9), MIN_BRIEFS = opt('--min-briefs', 2);
// the general form of a question: the section's occurrence number dropped, so "hero#0|align" and "hero#1|align" are
// one question; a look question keeps its role and its options.
export const ruleKey = (sig) => sig.replace(/#\d+\|/, '|');
const seen = {};
for (const run of fs.readdirSync(path.join(HERE, 'runs'))) {
  const f = path.join(HERE, 'runs', run, 'ledger.json');
  if (!fs.existsSync(f)) continue;
  const L = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (L.randomDecisions || L.learnedRules) continue; // only the model's own answers teach
  for (const c of L.calls) {
    if (!c.conf || c.forced || c.random || c.hinted || !c.answer) continue;
    const k = ruleKey(c.sig), v = Object.values(c.answer)[0];
    (seen[k] = seen[k] || []).push({ run, brief: L.brief, v, p: c.conf.dist[v] });
  }
}
const rules = {}, near = [];
for (const [k, xs] of Object.entries(seen)) {
  const runs = new Set(xs.map((x) => x.run)), briefs = new Set(xs.map((x) => x.brief));
  const vals = new Set(xs.map((x) => x.v));
  const minP = Math.min(...xs.map((x) => x.p ?? 0));
  const row = { answer: [...vals][0], times: xs.length, runs: runs.size, briefs: [...briefs], minP: +minP.toFixed(3) };
  if (vals.size === 1 && runs.size >= MIN_RUNS && briefs.size >= MIN_BRIEFS && minP >= MIN_P) rules[k] = row;
  else if (runs.size >= 2) near.push({ k, vals: [...vals], runs: runs.size, briefs: briefs.size, minP: row.minP });
}
fs.writeFileSync(path.join(HERE, 'rules.json'), JSON.stringify({ learnedAt: new Date().toISOString(), MIN_RUNS, MIN_P, MIN_BRIEFS, rules }, null, 1));
console.log(`${Object.keys(rules).length} rules learned from ${Object.keys(seen).length} questions`);
for (const [k, r] of Object.entries(rules)) console.log(`  ${k} → ${r.answer}  (${r.times}×, ${r.runs} runs, briefs ${r.briefs.join('/')}, min p ${r.minP})`);
console.log(`not (yet) rules, asked in 2+ runs: ${near.length}`);
for (const n of near.slice(0, 40)) console.log(`  ${n.k}: ${n.vals.join(' | ')} (${n.runs} runs, ${n.briefs} briefs, min p ${n.minP})`);
