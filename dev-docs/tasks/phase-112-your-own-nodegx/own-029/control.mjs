// OWN-029 — the control, scored three ways: the raw defect score, defects per line of copy, and the reviewer's
// outline judgements (organised, suits). Arms: Q (the model's decisions, v4) against R4 (random decisions, v4).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const load = (r) => { const f = path.join(HERE, 'runs', r, 'ledger.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const look = (L, round) => {
  const x = L.roundsLog[round];
  const lines = x.words.join('\n').split('\n').filter((l) => /^\s*-|^\s+\d\./.test(l)).length;
  const defects = x.issues.filter((i) => !i.id.startsWith('Q|')).reduce((a, i) => a + i.weight, 0);
  const j = (k) => L.judgements.find((g) => g.key === k && g.round === round)?.pYes;
  return { score: x.score, perLine: +(defects / lines).toFixed(2), organised: j('page.organised'), suits: j('page.suits'), lines };
};
const rows = [];
for (const b of ['puppy', 'bakery', 'running', 'jazz', 'pottery', 'plumber']) {
  const q = load(`Q-${b}`), r = load(`R4-${b}`);
  if (!q || !r) continue;
  rows.push({ b, rnd: look(r, 0), q0: look(q, 0), qk: look(q, q.result.bestRound) });
}
const f = (o) => `score ${String(o.score).padEnd(6)} /line ${String(o.perLine).padEnd(5)} organised ${String(o.organised).padEnd(5)} suits ${o.suits}`;
for (const r of rows) console.log(`${r.b.padEnd(8)} random   ${f(r.rnd)}\n         model r0 ${f(r.q0)}\n         kept     ${f(r.qk)}`);
const m = (k, a) => +(rows.reduce((s, r) => s + (r[a][k] ?? 0), 0) / rows.length).toFixed(3);
for (const k of ['score', 'perLine', 'organised', 'suits']) console.log(`mean ${k.padEnd(9)} random ${m(k, 'rnd')}  model r0 ${m(k, 'q0')}  kept ${m(k, 'qk')}`);
const wins = (k, better) => rows.filter((r) => better(r.q0[k], r.rnd[k])).length;
console.log(`model r0 beats random: organised ${wins('organised', (a, b) => a > b)}/${rows.length}, suits ${wins('suits', (a, b) => a > b)}/${rows.length}, per line ${wins('perLine', (a, b) => a < b)}/${rows.length}, raw score ${wins('score', (a, b) => a < b)}/${rows.length}`);
