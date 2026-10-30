// Runs public/app.js against a stand-in for the browser and the running tool, and prints each day's page as text.
// A check while building: no browser could be started here.
import fs from 'node:fs';
import vm from 'node:vm';

const base = process.argv[2] ?? 'http://127.0.0.1:4477';
const els = {};
const el = (sel) => (els[sel] ??= { sel, innerHTML: '', textContent: '', dataset: {}, setAttribute() {}, addEventListener() {} });
const document = { querySelector: el, querySelectorAll: () => [], title: '' };
const code = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8').replace(/^start\(\);\s*$/m, 'globalThis.__play = play; globalThis.__start = start;');
const ctx = vm.createContext({ document, history: { replaceState() {} }, location: { search: '' }, URLSearchParams, fetch: (p) => fetch(base + p), console, JSON, Math, String, Object, Date, encodeURIComponent });
vm.runInContext(code, ctx);
await ctx.__start();
const { people } = await (await fetch(base + '/api/app')).json();
for (const p of people) {
  await ctx.__play(p.id);
  const html = el('#day').innerHTML;
  const text = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<dl>[\s\S]*?<\/dl>/g, '').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
  console.log(`\n######## ${p.name}: ${html.length} characters of page${html.includes('class="error"') ? ' — SHOWS AN ERROR' : ''}`);
  if (process.argv[3] === p.email) console.log(text);
}
