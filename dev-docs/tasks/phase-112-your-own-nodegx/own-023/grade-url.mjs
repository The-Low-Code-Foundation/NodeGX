// OWN-023 §5, what a script can grade without knowing how the app was built, over a URL only:
// - console errors, uncaught exceptions and failed requests per route (repo line 23 / O13)
// - horizontal overflow at 390 px on every route it reaches (repo line 22 / O12), with the widest offenders
// - reload persistence of a like (G13): the first control whose name says "like" (not "dislike"), its state read
//   before, after one press, and after a reload. A heuristic and said so: `not reached` when no such control exists
//   or the press changed nothing a script can read; it never guesses a pass.
// Routes are found the way a person's taps can't be guessed: same-origin links (<a href>) from the start page,
// breadth-first, up to --max routes, plus any --routes given. An app that navigates without links is graded on fewer
// routes, and `routes` in the report says which were reached.
// Chrome plumbing as own-018/grade-quiz.mjs (headless, own profile, --use-mock-keychain); phone emulation 390×844.
//   node grade-url.mjs <url> <out-dir> [--max 25] [--routes /a,/b] [--no-press]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [url, outArg, ...rest] = process.argv.slice(2);
if (!url || !outArg) throw new Error('usage: node grade-url.mjs <url> <out-dir> [--max 25] [--routes /a,/b] [--no-press]');
const opt = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const MAX = Number(opt('--max', 25));
const OUT = path.resolve(outArg);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const origin = new URL(url).origin;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'own023-grade-'));
const port = 59400 + Math.floor(Math.random() * 200);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', '--autoplay-policy=no-user-gesture-required', 'about:blank'],
  { stdio: 'ignore' });
let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!target) throw new Error('Chrome did not start');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = {};
let errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; return; }
  if (d.method === 'Runtime.exceptionThrown') errors.push({ kind: 'exception', text: String(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text).slice(0, 300) });
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push({ kind: 'console.error', text: d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300) });
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push({ kind: `log.${d.params.entry.source}`, text: `${d.params.entry.text} ${d.params.entry.url || ''}`.slice(0, 300) });
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
const shot = async (name) => fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
for (const d of ['Runtime', 'Page', 'Log']) await send(`${d}.enable`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });

const settle = async () => { await sleep(2500); };
const go = async (u) => { errors = []; await send('Page.navigate', { url: u }); await settle(); };

const OVERFLOW = `(() => {
  const vw = window.innerWidth;
  const doc = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const off = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.right > vw + 1) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      let p = el.parentElement, clipped = false;
      while (p) { const s = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(s.overflowX)) { if (p.getBoundingClientRect().right <= vw + 1) { clipped = true; break; } } p = p.parentElement; }
      if (!clipped) off.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), text: (el.innerText || '').trim().slice(0, 40), right: Math.round(r.right) });
    }
  }
  off.sort((a, b) => b.right - a.right);
  return { viewport: vw, docWidth: doc, scrollsSideways: doc > vw + 1, offenders: off.slice(0, 5) };
})()`;
const LINKS = `[...document.querySelectorAll('a[href]')].map((a) => a.href)`;

const routes = [];
const queue = [url, ...String(opt('--routes', '')).split(',').filter(Boolean).map((r) => new URL(r, origin).href)];
const seen = new Set();
while (queue.length && routes.length < MAX) {
  const u = queue.shift();
  const key = u.replace(/\/$/, '');
  if (seen.has(key)) continue;
  seen.add(key);
  await go(u);
  const n = routes.length;
  const overflow = await ev(OVERFLOW).catch((e) => ({ error: String(e) }));
  const finalUrl = await ev('location.href');
  await shot(`route-${n}`);
  routes.push({ n, url: u, finalUrl, title: await ev('document.title'), errors: [...errors], overflow });
  for (const l of (await ev(LINKS).catch(() => [])) || []) {
    try { const x = new URL(l); if (x.origin === origin && !/\.(mp3|wav|png|jpe?g|svg|zip|pdf)$/i.test(x.pathname)) queue.push(x.href); } catch {}
  }
}

// G13 heuristic: press the first visible "like" control on the start page, then reload.
let like = { result: 'not reached', why: 'not tried (--no-press)' };
if (!rest.includes('--no-press')) {
  await go(url);
  const FIND = `(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const name = (el) => [el.getAttribute('aria-label'), el.getAttribute('title'), el.innerText].filter(Boolean).join(' ').trim();
    const els = [...document.querySelectorAll('button, [role=button], a, [onclick]')].filter(vis);
    const el = els.find((e) => /(^|\\b)(un)?like(d|s)?\\b|♥|♡|❤|👍|heart/i.test(name(e)) && !/dislike|👎/i.test(name(e)));
    if (!el) return null;
    el.setAttribute('data-own023-like', '1');
    const r = el.getBoundingClientRect();
    return { name: name(el).slice(0, 60), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`;
  const STATE = `(() => { const el = document.querySelector('[data-own023-like]'); if (!el) return null;
    const box = el.closest('li, article, [role=listitem], tr, .card, div') || el.parentElement;
    return { pressed: el.getAttribute('aria-pressed'), name: [el.getAttribute('aria-label'), el.innerText].filter(Boolean).join(' ').trim().slice(0, 60), html: el.innerHTML.slice(0, 200), around: (box?.innerText || '').slice(0, 200) }; })()`;
  const found = await ev(FIND);
  if (!found) like = { result: 'not reached', why: 'no visible control named like/♥ on the start page' };
  else {
    const before = await ev(STATE);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: found.x, y: found.y, button: 'left', clickCount: 1 });
    await sleep(2000);
    const after = await ev(STATE);
    const changed = JSON.stringify(after) !== JSON.stringify(before);
    if (!changed) like = { result: 'not reached', why: 'the press changed nothing a script can read on that control', found, before, after };
    else {
      await send('Page.reload', {});
      await settle();
      const reFound = await ev(FIND);
      const reloaded = reFound ? await ev(STATE) : null;
      // After a reload the first like control is the same one only if the list order held; `unclear` says so.
      const kept = reloaded && JSON.stringify(reloaded) === JSON.stringify(after);
      const reverted = reloaded && JSON.stringify(reloaded) === JSON.stringify(before);
      like = { result: kept ? 'pass' : reverted ? 'fail' : 'unclear', why: kept ? 'after the reload the control reads as it did after the press' : reverted ? 'after the reload the control reads as it did before the press' : 'after the reload the first like control reads as neither (the list may have reordered); look at the shots', found, before, after, reloaded };
      await shot('like-after-reload');
    }
  }
}

const report = {
  url, at: new Date().toISOString(),
  routesReached: routes.length,
  // A missing favicon is a console error a person's Chrome shows too; it is kept, and counted apart.
  console: {
    routesWithErrors: routes.filter((r) => r.errors.length).length,
    notFavicon: routes.flatMap((r) => r.errors).filter((e) => !/favicon\.ico/.test(e.text)).length,
    errors: routes.flatMap((r) => r.errors.map((e) => ({ route: r.n, ...e })))
  },
  overflow390: { routesScrollingSideways: routes.filter((r) => r.overflow?.scrollsSideways).map((r) => r.n) },
  like,
  routes
};
fs.writeFileSync(path.join(OUT, 'grade-url.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ routes: report.routesReached, consoleErrors: report.console.errors.length, notFavicon: report.console.notFavicon, sideways: report.overflow390.routesScrollingSideways, like: like.result }));
ws.close();
chrome.kill();
await sleep(1500); // Chrome is still writing its profile as it exits
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
