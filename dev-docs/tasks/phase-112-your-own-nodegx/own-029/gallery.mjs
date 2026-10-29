// OWN-029 — the results page. Reads runs/<run>/ledger.json and the shots, writes gallery/index.html + gallery/shots/.
//   node gallery.mjs A2-puppy A2-bakery A-running …      (runs shown, in order)
//   --controls R-puppy,…  --learned L-bakery,…            (optional comparison arms)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { s2Section } from './gallery-s2.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1].split(',') : []; };
const RUNS = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const CONTROLS = opt('--controls'), LEARNED = opt('--learned'), CONTROL_SHOTS = opt('--control-shots'), S2_RUNS = opt('--s2-runs');
const S2 = argv.includes('--s2');
const OUT = path.join(HERE, 'gallery'), SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const load = (run) => { const f = path.join(HERE, 'runs', run, 'ledger.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const shot = (run, round, vp = 'desktop') => {
  const src = path.join(HERE, 'runs', run, `r${round}`, 'shots', `pages-home-${vp}.png`);
  if (!fs.existsSync(src)) return null;
  // JPEG at 72: a full-page PNG is ~1.1 MB, the JPEG ~150 KB, and the page reads the same
  const name = `${run}-r${round}-${vp}.jpg`;
  const out = path.join(SHOTS, name);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', src, '--out', out], { stdio: 'ignore' });
  return `shots/${name}`;
};
const spark = (scores, best) => {
  const w = 120, h = 36, max = Math.max(...scores, 1);
  const x = (i) => (scores.length === 1 ? w / 2 : 4 + (i * (w - 8)) / (scores.length - 1)), y = (v) => 4 + (h - 8) * (1 - v / max);
  const pts = scores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="issue score by round: ${scores.join(', ')}"><polyline points="${pts}" fill="none" stroke="var(--signal)" stroke-width="1.5"/>${scores.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === best ? 3.2 : 2}" fill="${i === best ? 'var(--signal)' : 'var(--paper)'}" stroke="var(--signal)" stroke-width="1.2"/>`).join('')}</svg>`;
};
const OPS = { reword: 're-word a line', reask: 're-ask a decision', flip: 'flip to 2nd choice', addSection: 'add a section', dropSection: 'drop a section' };

function runCard(run) {
  const L = load(run);
  if (!L || !L.roundsLog?.length) return '';
  const R = L.roundsLog, best = L.result?.bestRound ?? 0;
  const perLine = L.result.accept === 'constraint';
  const said = (r) => (perLine ? `${(+r.perLine).toFixed(2)} /line · organised ${(+r.org).toFixed(2)}` : `score ${r.score}`);
  const first = R[0], last = R[best];
  const fixedIds = new Set(first.issues.map((i) => i.id).filter((id) => !last.issues.some((j) => j.id === id)));
  const mustShow = L.calls.find((c) => c.key === 'card.mustShow')?.answer?.texts || [];
  const kept = (L.skipped.find((s) => s.key === 'card.photos')?.why || '').replace(/^photo scout \(reviewer vision\): /, '');
  const a = shot(run, 0), b = shot(run, best);
  const builder = L.calls.filter((c) => !c.forced && !c.learned && !c.random).length;
  return `<article class="run" id="${esc(run)}">
  <header class="run-head">
    <p class="eyebrow">${esc(L.brief)}</p>
    <h3>“${esc(L.request)}”</h3>
    <dl class="facts">
      <div><dt>${perLine ? 'defects per line by round' : 'score by round'}</dt><dd>${spark(L.result.scores, best)} <span class="mono">${L.result.scores.join(' → ')}</span></dd></div>
      <div><dt>kept</dt><dd class="mono">round ${best}</dd></div>
      <div><dt>builder calls</dt><dd class="mono">${builder}</dd></div>
      <div><dt>reviewer tokens</dt><dd class="mono">${L.judgements.length}</dd></div>
      <div><dt>free replays</dt><dd class="mono">${L.replays ?? 0}</dd></div>
      <div><dt>minutes</dt><dd class="mono">${L.result.minutes}</dd></div>
    </dl>
    <p class="small"><b>Photos the reviewer kept:</b> ${esc(kept || '—')}. <b>Facts it set itself to show:</b> ${mustShow.length ? mustShow.map((m) => `“${esc(m)}”`).join(', ') : '—'}.</p>
  </header>
  <div class="pair">
    <figure><figcaption>Round 0 <span class="mono">${said(first)}</span></figcaption><div class="frame">${a ? `<img src="${a}" alt="${esc(L.brief)} page, round 0" loading="lazy">` : '<p class="small">no screenshot</p>'}</div></figure>
    <figure><figcaption>Round ${best}, kept <span class="mono">${said(last)}</span></figcaption><div class="frame">${b ? `<img src="${b}" alt="${esc(L.brief)} page, round ${best}" loading="lazy">` : '<p class="small">no screenshot</p>'}</div></figure>
  </div>
  <details><summary>What the agent found in round 0, and what it fixed (${fixedIds.size} of ${first.issues.length})</summary>
    <ul class="issues">${first.issues.map((i) => `<li class="${fixedIds.has(i.id) ? 'fixed' : 'open'}"><span class="chip">${fixedIds.has(i.id) ? 'fixed' : 'still open'}</span> ${esc(i.say)}${i.op ? ` <span class="op">${OPS[i.op] || i.op}</span>` : ''}</li>`).join('')}</ul>
  </details>
  <details><summary>The page in words, as the reviewer read it (round ${best})</summary><pre>${esc((last.words || []).join('\n\n'))}</pre></details>
</article>`;
}

const rows = (runs) => runs.map(load).filter(Boolean);
const sum = (xs, f) => xs.reduce((a, x) => a + (f(x) || 0), 0);
const agent = rows(RUNS);
const ctl = rows(CONTROLS), lrn = rows(LEARNED);
const table = agent.length ? `<div class="tablewrap"><table><thead><tr><th>brief</th><th>round 0</th><th>kept</th><th>rounds</th><th>builder calls</th><th>reviewer</th><th>min</th>${ctl.length ? '<th>random decisions, round 0</th><th>organised: random / model r0</th>' : ''}${lrn.length ? '<th>learned rules: calls / kept</th>' : ''}</tr></thead><tbody>${agent.map((L) => {
  const c = ctl.find((x) => x.brief === L.brief), l = lrn.find((x) => x.brief === L.brief);
  return `<tr><td>${esc(L.brief)}</td><td class="num">${L.result.scores[0]}</td><td class="num"><b>${L.result.bestScore}</b></td><td class="num">${L.result.scores.length}</td><td class="num">${L.calls.filter((x) => !x.forced && !x.learned).length}</td><td class="num">${L.judgements.length}</td><td class="num">${L.result.minutes}</td>${ctl.length ? `<td class="num">${c ? c.result.scores[0] : '—'}</td><td class="num">${c ? `${c.judgements.find((j) => j.key === 'page.organised' && j.round === 0)?.pYes ?? '—'} / ${L.judgements.find((j) => j.key === 'page.organised' && j.round === 0)?.pYes ?? '—'}` : '—'}</td>` : ''}${lrn.length ? `<td class="num">${l ? `${l.calls.filter((x) => !x.forced && !x.learned).length} / ${l.result.bestScore}` : '—'}</td>` : ''}</tr>`;
}).join('')}</tbody></table></div>` : '';

const narrative = fs.existsSync(path.join(HERE, 'gallery-narrative.html')) ? fs.readFileSync(path.join(HERE, 'gallery-narrative.html'), 'utf8') : '';
const html = `<title>The Small Agent</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&display=swap">
<style>
/* Layout: a lab notebook. One reading column; each brief is an entry with its before/after pair side by side. */
:root {
  --paper: #f3f6f5; --ink: #15201c; --muted: #5a6964; --rule: #d3dcd8; --panel: #ffffff;
  --signal: #0d7a69; --warn: #a86a12; --good: #2e7a3a;
  --display: "IBM Plex Sans Condensed", "Arial Narrow", system-ui, sans-serif;
  --body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper: #0e1412; --ink: #e2eae6; --muted: #92a29c; --rule: #25302c; --panel: #141c19; --signal: #3cc0a6; --warn: #e0a64a; --good: #6cc27a; color-scheme: dark } }
:root[data-theme="dark"] { --paper: #0e1412; --ink: #e2eae6; --muted: #92a29c; --rule: #25302c; --panel: #141c19; --signal: #3cc0a6; --warn: #e0a64a; --good: #6cc27a; color-scheme: dark }
body { background: var(--paper); color: var(--ink); font: 16px/1.55 var(--body); }
.wrap { max-width: 1080px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 40px 80px; display: grid; gap: 56px; }
h1, h2, h3 { font-family: var(--display); font-weight: 600; line-height: 1.15; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); letter-spacing: -0.01em; }
h2 { font-size: 1.7rem; }
h3 { font-size: 1.25rem; font-weight: 500; }
p { margin: 0; max-width: 68ch; }
.lede { font-size: 1.15rem; color: var(--ink); }
.eyebrow { font: 500 0.75rem/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--signal); }
.small { font-size: 0.9rem; color: var(--muted); }
.mono, .num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
section { display: grid; gap: 20px; }
/* a grid item's min-width is its content's by default: a wide table would push the column past a phone's width */
.wrap > *, section > * { min-width: 0; }
.stack { display: grid; gap: 14px; }
.tablewrap { overflow-x: auto; border: 1px solid var(--rule); border-radius: 6px; background: var(--panel); }
table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font: 500 0.74rem/1.3 var(--mono); text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
td.num, th.num { text-align: right; }
tr:last-child td { border-bottom: 0; }
.run { display: grid; gap: 18px; padding-top: 28px; border-top: 1px solid var(--rule); }
.run-head { display: grid; gap: 10px; }
.facts { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 4px 0 0; }
.facts div { display: grid; gap: 2px; }
.facts dt { font: 500 0.7rem/1 var(--mono); text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
.facts dd { margin: 0; display: flex; align-items: center; gap: 8px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.pair figure { margin: 0; display: grid; gap: 6px; min-width: 0; }
figcaption { font-size: 0.85rem; color: var(--muted); display: flex; justify-content: space-between; gap: 8px; }
.frame { height: 560px; overflow-y: auto; border: 1px solid var(--rule); border-radius: 4px; background: var(--panel); }
.frame img { display: block; width: 100%; height: auto; }
details { border: 1px solid var(--rule); border-radius: 4px; background: var(--panel); }
summary { cursor: pointer; padding: 10px 14px; font-weight: 600; font-size: 0.95rem; }
summary:focus-visible, a:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }
details > :not(summary) { padding: 0 14px 14px; }
.issues { list-style: none; margin: 0; display: grid; gap: 6px; font-size: 0.9rem; }
.chip { font: 500 0.68rem/1 var(--mono); text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 6px; border-radius: 3px; border: 1px solid currentColor; margin-right: 6px; }
.fixed .chip { color: var(--good); }
.open .chip { color: var(--warn); }
.op { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }
pre { white-space: pre-wrap; font: 0.8rem/1.5 var(--mono); color: var(--ink); margin: 0; max-height: 420px; overflow-y: auto; }
.loop { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
.loop div { border: 1px solid var(--rule); background: var(--panel); border-radius: 4px; padding: 10px; display: grid; gap: 4px; align-content: start; }
.loop b { font: 600 0.95rem/1.2 var(--display); }
.loop span { font-size: 0.82rem; color: var(--muted); }
.findings { display: grid; gap: 12px; counter-reset: f; padding: 0; margin: 0; list-style: none; }
.findings li { display: grid; gap: 4px; padding-left: 0; }
.findings b { font-family: var(--display); font-weight: 600; font-size: 1.05rem; }
@media (max-width: 760px) { .pair { grid-template-columns: 1fr; } .frame { height: 420px; } .loop { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
<div class="wrap">
${narrative}
${S2 ? s2Section({ load, shot, esc }) : ''}
${S2_RUNS.length ? `<section id="s2-runs"><h2>Session 2 pages, before and after review</h2><p class="small">The first run of the new rule on each brief. Each frame scrolls. Left: round 0. Right: the round the agent kept.</p>${S2_RUNS.map((r) => runCard(r)).join('\n')}</section>` : ''}
${table ? `<section id="table"><p class="eyebrow">Session 1 · 28 October 2026</p><h2>Every brief</h2><p class="small">Score is the weighted count of what the critics found (lower is better); the agent keeps a round only when it beats the best so far.</p>${table}</section>` : ''}
${CONTROL_SHOTS.length ? `<section id="control"><h2>The control: random decisions</h2><p>The same harness, the same words from the model, the same reviewer, but every structural choice (which parts, which grounds, how many items, the type pairing) drawn at random. On the defect score the random pages do as well or better, because they have 30–40% fewer parts to find fault with. To the eye it is not close.</p>${CONTROL_SHOTS.map((b) => { const R = load(`R-${b}`), A = load(`A2-${b}`) || load(`A-${b}`); if (!R || !A) return ''; const x = shot(R.run, 0), y = shot(A.run, 0); return `<div class="pair"><figure><figcaption>${esc(b)}: random decisions <span class="mono">score ${R.result.scores[0]}</span></figcaption><div class="frame"><img src="${x}" alt="${esc(b)} page built from random decisions" loading="lazy"></div></figure><figure><figcaption>${esc(b)}: the model's decisions, round 0 <span class="mono">score ${A.result.scores[0]}</span></figcaption><div class="frame"><img src="${y}" alt="${esc(b)} page built from the model's decisions" loading="lazy"></div></figure></div>`; }).join('')}<p class="small">So the defect score is used only to compare rounds of one page. An outline judge (the reviewer reading the page's section list) points the right way, if weakly: well organised, P(yes) 0.52 random, 0.63 the model's first build, 0.67 the kept round.</p></section>` : ''}
<section id="runs"><h2>Session 1 pages, before and after review</h2><p class="small">Each frame scrolls. Left: the first build, what a one-pass harness (OWN-027) would hand over. Right: the round the agent kept.</p>${agent.map((L) => runCard(L.run)).join('\n')}</section>
<p class="small">Made with NodeGX · OWN-029 · <a href="https://nodegx.io" target="_blank" rel="noopener" style="color:var(--signal)">nodegx.io ↗</a></p>
</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`wrote gallery/index.html with ${agent.length} runs, ${fs.readdirSync(SHOTS).length} shots`);
