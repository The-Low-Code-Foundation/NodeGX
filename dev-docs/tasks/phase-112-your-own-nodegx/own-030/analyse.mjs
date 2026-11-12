// OWN-030 — the per-run and per-lane tables (RESULTS §2, §3), from the ledgers and look/checks.json.
//   node analyse.mjs            prints both tables as markdown
// Cost, fairly: graph runs are paired (--decisions-from S0-<brief>), so their ledgers hold only what they asked
// afresh. The decisions they replayed were paid for by S0, so graph's cost adds S0's round-0 decision calls (every
// call that is not words: decks, copy and list rows are asked afresh). code-guided reuses the card and the section
// list, so its cost adds S0's card.* and sections calls. emit costs graph's calls and nothing more; it is not counted
// again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BRIEFS = ['puppy', 'bakery', 'running', 'jazz', 'pottery', 'plumber'];
const LANES = ['graph', 'emit', 'guided', 'bare'];
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const isWords = (k) => /\.(deck|copy|list\.rows)/.test(k);
const sum = (xs, f) => xs.reduce((a, x) => a + (f(x) || 0), 0);
const med = (xs) => { const v = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
const f = (v, d = 2) => (v == null ? '—' : typeof v === 'number' ? String(+v.toFixed(d)) : v);

const rows = [];
for (const b of BRIEFS) {
  const S0 = read(path.join(HERE, '../own-029/runs', `S0-${b}`, 'ledger.json'));
  const G = read(path.join(HERE, '../own-029/runs', `G-${b}`, 'ledger.json'));
  const s0dec = S0 ? S0.calls.filter((c) => c.round === 0 && !isWords(c.key)) : [];
  const s0card = S0 ? S0.calls.filter((c) => c.round === 0 && (/^card\./.test(c.key) || c.key === 'sections')) : [];
  for (const lane of LANES) {
    const checks = read(path.join(HERE, 'runs', `${lane}-${b}`, 'look', 'checks.json'));
    const r = { brief: b, lane, checks };
    if (lane === 'graph' && G) {
      const calls = [...G.calls, ...s0dec];
      Object.assign(r, { minutes: G.result?.minutes, builder: calls.length, reviewer: G.judgements.length, tokIn: sum(calls, (c) => c.tokensIn), tokOut: sum(calls, (c) => c.tokensOut),
        kept: G.result?.bestRound, perLine: G.result?.kept?.perLine, shape: G.result?.kept?.shape, org: G.result?.kept?.org,
        broken: G.roundsLog.find((x) => x.round === G.result?.bestRound)?.sections.filter((s) => !s.staged).length || 0,
        sound: (() => { const x = G.roundsLog.find((q) => q.round === G.result?.bestRound); const ps = x?.sections.map((s) => s.pSound).filter((p) => p != null) || []; return ps.length ? sum(ps, (p) => p) / ps.length : null; })() });
    }
    if (lane === 'emit' && G) Object.assign(r, { minutes: 0, builder: 0, reviewer: 0, tokIn: 0, tokOut: 0, note: 'graph’s answers, transpiled' });
    if (lane === 'guided' || lane === 'bare') {
      const L = read(path.join(HERE, 'runs', `${lane}-${b}`, 'site', 'ledger.json'));
      if (L) {
        const extra = lane === 'guided' ? s0card : [];
        const best = L.rounds.find((x) => x.round === L.result?.bestRound) || L.rounds[0];
        Object.assign(r, { minutes: L.result?.minutes, builder: L.calls.length + extra.length, reviewer: L.judgements.length,
          tokIn: sum(L.calls, (c) => c.tokensIn) + sum(extra, (c) => c.tokensIn), tokOut: sum(L.calls, (c) => c.tokensOut) + sum(extra, (c) => c.tokensOut),
          kept: L.result?.bestRound, perLine: L.result?.perLine, broken: (best?.broken || []).length,
          sound: (() => { const js = L.judgements.filter((j) => j.round === (L.result?.bestRound ?? 0) && /\.sound$/.test(j.key)).map((j) => j.pYes).filter((p) => p != null); return js.length ? sum(js, (p) => p) / js.length : null; })() });
      }
    }
    rows.push(r);
  }
}
const ck = (r, vp, k) => { const c = r.checks?.[vp]; if (!c) return null; const v = c[k]; return Array.isArray(v) ? v.length : typeof v === 'boolean' ? (v ? 1 : 0) : v; };
console.log('## per run\n');
console.log('| brief | lane | min | builder calls | reviewer | tokens in / out | kept round | defects/line | reviewer "sounds real" | broken | blank | phone overflow px | small text | low contrast (d/p) | clipped | broken images |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.brief} | ${r.lane} | ${f(r.minutes, 1)} | ${f(r.builder, 0)} | ${f(r.reviewer, 0)} | ${f(r.tokIn, 0)} / ${f(r.tokOut, 0)} | ${f(r.kept, 0)} | ${f(r.perLine)} | ${f(r.sound)} | ${f(r.broken, 0)} | ${f(ck(r, 'desktop', 'blank'), 0)} | ${f(ck(r, 'phone', 'overflowX'), 0)} | ${f(ck(r, 'phone', 'smallText'), 0)} | ${f(ck(r, 'desktop', 'lowContrast'), 0)} / ${f(ck(r, 'phone', 'lowContrast'), 0)} | ${f(ck(r, 'phone', 'clipped'), 0)} | ${f(ck(r, 'desktop', 'brokenImages'), 0)} |`);
// the defect score is not in this table: it is valid only between rounds of one page (OWN-029 §3), never across lanes
console.log('\n## per lane (medians over the briefs; "runs with" counts)\n');
console.log('| lane | min | builder calls | tokens out | "sounds real" | runs broken | runs with phone overflow | runs with low contrast | runs with broken images |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const lane of LANES) {
  const xs = rows.filter((r) => r.lane === lane);
  const n = (p) => xs.filter(p).length;
  console.log(`| ${lane} | ${f(med(xs.map((r) => r.minutes)), 1)} | ${f(med(xs.map((r) => r.builder)), 0)} | ${f(med(xs.map((r) => r.tokOut)), 0)} | ${f(med(xs.map((r) => r.sound)))} | ${n((r) => r.broken > 0 || ck(r, 'desktop', 'blank'))} | ${n((r) => ck(r, 'phone', 'overflowX') > 1)} | ${n((r) => ck(r, 'desktop', 'lowContrast') + ck(r, 'phone', 'lowContrast') > 0)} | ${n((r) => ck(r, 'desktop', 'brokenImages') > 0)} |`);
}
