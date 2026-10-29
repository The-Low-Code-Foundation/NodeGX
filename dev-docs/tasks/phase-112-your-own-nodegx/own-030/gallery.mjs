// OWN-030 — the blind gallery (§4). Per brief, the four lanes' desktop and phone shots under the letters A–D, in an
// order shuffled per brief from a recorded seed. The key (which letter is which lane) goes to runs/blind-key.json
// and never onto the page. Reveal later with --reveal, which prints the key beside the letters.
//   node gallery.mjs [--seed 30] [--briefs puppy,bakery,…]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SEED = Number(opt('--seed', 30));
const BRIEFS = opt('--briefs', 'puppy,bakery,running,jazz,pottery,plumber').split(',');
const LANES = ['graph', 'emit', 'guided', 'bare'];
const OUT = path.join(HERE, 'gallery'), SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// xorshift, the generator lm.mjs uses for its random arm
const rnd = (() => { let x = SEED >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; })();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// JPEG names carry no lane: the file name is the brief and the letter
const jpg = (lane, brief, vp, letter) => {
  const src = path.join(HERE, 'runs', `${lane}-${brief}`, 'look', `${vp}.png`);
  if (!fs.existsSync(src)) return null;
  const name = `${brief}-${letter}-${vp}.jpg`;
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70', ...(vp === 'desktop' ? ['--resampleWidth', '1000'] : []), src, '--out', path.join(SHOTS, name)], { stdio: 'ignore' });
  return `shots/${name}`;
};
const request = (b) => { try { return JSON.parse(fs.readFileSync(path.join(HERE, '../own-029/runs', `G-${b}`, 'ledger.json'), 'utf8')).request; } catch { return ''; } };

const key = {};
const cards = BRIEFS.map((b) => {
  const order = shuffle(LANES);
  key[b] = Object.fromEntries(order.map((lane, i) => ['ABCD'[i], lane]));
  const figs = order.map((lane, i) => {
    const L = 'ABCD'[i], d = jpg(lane, b, 'desktop', L), p = jpg(lane, b, 'phone', L);
    return `<figure class="page" id="${b}-${L}"><figcaption><b>${L}</b></figcaption>
  <div class="views"><div class="frame desk">${d ? `<img src="${d}" alt="page ${L}, desktop" loading="lazy">` : '<p class="small">no screenshot</p>'}</div>
  <div class="frame phone">${p ? `<img src="${p}" alt="page ${L}, phone" loading="lazy">` : '<p class="small">no screenshot</p>'}</div></div></figure>`;
  }).join('\n');
  return `<section class="brief" id="${b}"><p class="eyebrow">${esc(b)}</p><h2>“${esc(request(b))}”</h2>
<div class="grid">${figs}</div></section>`;
}).join('\n');
fs.writeFileSync(path.join(HERE, 'runs', 'blind-key.json'), JSON.stringify({ seed: SEED, key }, null, 1));

const html = `<title>Four Ways to Build</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root { --paper:#f4f4f1; --ink:#1b1c1a; --muted:#62645e; --rule:#d8d9d3; --panel:#fff; --signal:#3a5bd9;
  --body: system-ui, -apple-system, "Segoe UI", sans-serif; --mono: ui-monospace, "SF Mono", Menlo, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper:#121311; --ink:#e7e8e3; --muted:#9a9c95; --rule:#2b2d29; --panel:#1a1b19; --signal:#8aa2ff; color-scheme: dark } }
:root[data-theme="dark"] { --paper:#121311; --ink:#e7e8e3; --muted:#9a9c95; --rule:#2b2d29; --panel:#1a1b19; --signal:#8aa2ff; color-scheme: dark }
body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.55 var(--body); }
.wrap { max-width:1240px; margin:0 auto; padding:40px max(16px, env(safe-area-inset-left, 0px)) 80px; display:grid; gap:56px; }
h1 { font-size:clamp(2rem,4.5vw,3rem); line-height:1.1; margin:0; text-wrap:balance; }
h2 { font-size:1.15rem; font-weight:500; margin:0; max-width:70ch; }
p { margin:0; max-width:68ch; }
.eyebrow { font:500 .75rem/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--signal); }
.small { font-size:.9rem; color:var(--muted); }
.brief { display:grid; gap:16px; border-top:1px solid var(--rule); padding-top:28px; }
.grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:20px; }
.page { margin:0; display:grid; gap:8px; min-width:0; }
figcaption b { font:600 1.4rem/1 var(--mono); }
.views { display:grid; grid-template-columns:minmax(0,3fr) minmax(0,1fr); gap:8px; }
.frame { height:520px; overflow-y:auto; border:1px solid var(--rule); border-radius:4px; background:var(--panel); }
.frame img { display:block; width:100%; height:auto; }
@media (max-width:900px) { .grid { grid-template-columns:1fr; } }
@media (max-width:520px) { .views { grid-template-columns:1fr; } .frame { height:420px; } }
</style>
<div class="wrap">
<header style="display:grid;gap:14px">
  <p class="eyebrow">OWN-030 · blind · <a href="https://nodegx.io" target="_blank" rel="noopener" style="color:var(--signal)">nodegx.io ↗</a></p>
  <h1>Four ways to build the same page</h1>
  <p>The same 2B model on a laptop and the same request, built four different ways. The letters are shuffled for each brief, so A is not the same way twice. Each frame scrolls: the desktop page on the left, the phone page on the right.</p>
  <p><b>For each brief, rank A–D from best (1) to worst (4)</b> as the first draft you would rather start from. Which letter is which way is revealed after you rank.</p>
</header>
${cards}
<p class="small">OWN-030 · <a href="https://nodegx.io" target="_blank" rel="noopener" style="color:var(--signal)">nodegx.io ↗</a></p>
</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`wrote gallery/index.html (${BRIEFS.length} briefs); key in runs/blind-key.json (seed ${SEED})`);
if (argv.includes('--reveal')) console.log(JSON.stringify(key, null, 1));
