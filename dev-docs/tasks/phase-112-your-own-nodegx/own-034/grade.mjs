// OWN-034 §5b.1: the habit tracker checklist, B1–B13, the same on every lane's app. One headless Chrome on one profile
// (so the browser's storage survives every reload), driven over CDP the way a person uses the page: real mouse presses
// at an element's centre (refused if `elementFromPoint` lands on something else), typed text, dialogs accepted.
//
// The clock is frozen per day: a `Date` whose now starts at noon (Europe/Paris) on the day and runs on from there,
// injected before any page script with Page.addScriptToEvaluateOnNewDocument (every frame). A new day is a new
// load of the page, as a person coming back the next day gets.
//
//   Mon 2 Nov   B1 empty · B2/B3 add two, in order · B4 empty name adds nothing · B5 tick · B6 reload keeps all ·
//               B7 untick, tick again (run before B6, so it does not depend on saving)
//   Tue 3 Nov   B8 yesterday's tick shows as yesterday, today empty · B9 tick → streak 2
//   Thu 5 Nov   B10 streak broken (0 or none), tick → 1 · B12 the last 7 days per habit (run before B11, so both
//               habits are read) · B11 delete "Read 10 pages", gone after a reload · B13 at 390 px: no sideways
//               scroll, no text cut off, every control tappable (≥ 24 px, a press lands on it)
// A check whose step was never reached fails. Each check says why.
//
// The app differs per lane, so a locator file says where things are (CSS selectors; the four `…Done`/`dayDone` fields
// are page-side functions as source). A locator only finds things: it never computes a streak or a date.
//   {
//     "serve": ".", "page": "index.html"      — a folder to serve on 127.0.0.1 (relative to the locator), or "url"
//     "addInput", "addButton" (null ⇒ Enter), "rows", "rowName", "tick", "remove", "confirmRemove" (in-page, or null)
//     "todayDone": "row => …",  "days": "<cells in a row>", "daysOrder": "oldest-first" | "newest-first",
//     "dayDone": "cell => …",   "streak": "<element whose text holds the number>" (null ⇒ the app shows none)
//   }
//
//   node grade.mjs <locator.json> [--out <dir>]
// Writes <out>/grade.json and one screenshot per day; prints the checks. Exit 0 when all 13 pass.
// Chrome cannot start inside Claude Code's Bash sandbox: run it with the sandbox off.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

if (typeof WebSocket === 'undefined') throw new Error(`this grader needs Node 22 or later (a global WebSocket); this is Node ${process.version}`);
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
if (!argv[0]) throw new Error('usage: node grade.mjs <locator.json> [--out <dir>]');
const LOCFILE = path.resolve(argv[0]);
const LOC = JSON.parse(fs.readFileSync(LOCFILE, 'utf8'));
const OUT = path.resolve(opt('--out', path.join(path.dirname(LOCFILE), 'grade')));
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TZ = 'Europe/Paris';
const DAYS = { mon: '2026-11-02T12:00:00+01:00', tue: '2026-11-03T12:00:00+01:00', thu: '2026-11-05T12:00:00+01:00' };
const A = 'Drink water', B = 'Read 10 pages';
// Thu 5 Nov, oldest first (Fri 30 Oct … Thu 5 Nov): ticked Mon 2, Tue 3 and Thu 5.
const WEEK_A = [false, false, false, true, true, false, true];
const JUNK = /lorem|ipsum|\bundefined\b|\bNaN\b|\[object Object\]|\{\{|habit 1\b|example habit/i;

// ---- the app, served (a file:// page shares one storage with every other file:// page) ----
let server, URL_;
if (LOC.url) URL_ = LOC.url;
else {
  const root = path.resolve(path.dirname(LOCFILE), LOC.serve || '.');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  URL_ = `http://127.0.0.1:${server.address().port}/${LOC.page || 'index.html'}`;
}

// ---- Chrome ----
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'own034-chrome-'));
const port = 59900 + Math.floor(Math.random() * 90);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--use-mock-keychain', '--window-size=1280,900', 'about:blank'
], { stdio: 'ignore' });
let target;
for (let i = 0; i < 80 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!target) throw new Error('Chrome did not start (from Claude Code: is the Bash sandbox off?)');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = {};
const errors = [], dialogs = [];
let loaded = 0;
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pending[d.id]) { pending[d.id](d); delete pending[d.id]; return; }
  if (d.method === 'Page.loadEventFired') loaded++;
  if (d.method === 'Page.javascriptDialogOpening') { dialogs.push(`${d.params.type}: ${d.params.message}`.slice(0, 200)); send('Page.handleJavaScriptDialog', { accept: true }); }
  if (d.method === 'Runtime.exceptionThrown') errors.push(String(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text).slice(0, 300));
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
};
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Emulation.setTimezoneOverride', { timezoneId: TZ });

const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || ''));
  return r.result?.result?.value;
};

// Everything the checks read goes through these, in the page.
const fn = (src) => (src ? `(${src})` : 'null');
const PRELUDE = `const L = ${JSON.stringify(LOC)};
  const todayDone = ${fn(LOC.todayDone)}, dayDone = ${fn(LOC.dayDone)};
  const seen = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const rows = () => [...document.querySelectorAll(L.rows)].filter(seen);
  const nameOf = (r) => ((L.rowName ? r.querySelector(L.rowName) : r)?.innerText || '').trim();
  const rowOf = (n) => rows().find((r) => L.rowName ? nameOf(r) === n : nameOf(r).includes(n));
  const cells = (r) => { const c = [...r.querySelectorAll(L.days)].filter(seen); return L.daysOrder === 'newest-first' ? c.reverse() : c; };`;
const page = (body) => ev(`(() => { ${PRELUDE} ${body} })()`);
const names = () => page(`return rows().map(nameOf);`);
const isDone = (n) => page(`const r = rowOf(${JSON.stringify(n)}); return r ? todayDone(r) : null;`);
const week = (n) => page(`const r = rowOf(${JSON.stringify(n)}); return r ? cells(r).map(dayDone) : null;`);
const streak = (n) => page(`const r = rowOf(${JSON.stringify(n)}); if (!r) return 'no row'; if (!L.streak) return null;
  const el = r.querySelector(L.streak); if (!seen(el)) return null; const m = el.innerText.match(/-?\\d+/); return m ? Number(m[0]) : null;`);

const press = async (finder, what) => {
  const at = await page(`const el = ${finder}; if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y); return { x, y, lands: !!hit && (hit === el || el.contains(hit)) };`);
  if (!at) throw new Error(`nothing to press: ${what}`);
  if (!at.lands) throw new Error(`a press on ${what} would land on something else`);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
    if (type === 'mousePressed') await sleep(60);
  }
  await sleep(400);
};
const inRow = (n, sel) => `rowOf(${JSON.stringify(n)})?.querySelector(${JSON.stringify(sel)})`;
const tick = (n) => press(inRow(n, LOC.tick), `${n}'s tick`);
const add = async (text) => {
  await press(`document.querySelector(L.addInput)`, 'the name field');
  // Clear whatever is there (macOS: a Meta+A key selects nothing headless; the editing command does).
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65, commands: ['selectAll'] });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (text) await send('Input.insertText', { text });
  await sleep(150);
  if (LOC.addButton) await press(`document.querySelector(L.addButton)`, 'the add button');
  else {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await sleep(400);
  }
};

let clockScript = null;
const open = async (day) => {
  if (clockScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: clockScript });
  const at = Date.parse(DAYS[day]);
  const r = await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const Real = Date, offset = ${at} - Real.now();
    function Frozen(...a) { if (!new.target) return new Real(Real.now() + offset).toString(); return a.length ? new Real(...a) : new Real(Real.now() + offset); }
    Frozen.prototype = Real.prototype; Frozen.now = () => Real.now() + offset; Frozen.parse = Real.parse; Frozen.UTC = Real.UTC;
    globalThis.Date = Frozen; })();` });
  clockScript = r.result.identifier;
  const before = loaded;
  await send('Page.navigate', { url: URL_ });
  for (let i = 0; i < 100 && loaded === before; i++) await sleep(100);
  // An app may draw after load (NodeGX does): wait for its name field.
  for (let i = 0; i < 100; i++) { if (await page(`return seen(document.querySelector(L.addInput));`).catch(() => false)) break; await sleep(150); }
  await sleep(500);
};
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.result.data, 'base64')); };

// ---- the checks ----
const checks = [];
const check = async (idn, what, body) => {
  const errs = errors.length;
  let pass = false, why;
  try { why = await body(); pass = why === true || (typeof why === 'object' && why?.pass === true); if (typeof why === 'object') why = why.why; }
  catch (e) { why = `step failed: ${e.message}`; }
  if (errors.length > errs) { pass = false; why = `${why === true ? '' : why + '; '}page error: ${errors.slice(errs).join(' | ')}`; }
  checks.push({ id: idn, what, pass, why: why === true ? 'ok' : why });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${idn} ${what}${pass ? '' : ` — ${why}`}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const res = (pass, why) => ({ pass, why });

await open('mon');
await check('B1', 'starts empty and says so, no placeholder text', async () => {
  const s = await page(`const t = document.body.innerText; const input = document.querySelector(L.addInput);
    return { rows: rows().length, says: /no habits|nothing (here|yet)|add (your|a) first|get started|start by adding|empty/i.test(t),
      asks: seen(input) && !!(input.placeholder || input.getAttribute('aria-label') || input.labels?.length), junk: (t.match(${JUNK}) || [])[0] || null };`);
  return res(s.rows === 0 && (s.says || s.asks) && !s.junk, JSON.stringify(s));
});
await check('B2', `adding "${A}" shows it`, async () => { await add(A); const n = await names(); return res(same(n, [A]), `rows: ${JSON.stringify(n)}`); });
await check('B3', `adding "${B}" shows both, in the order added`, async () => { await add(B); const n = await names(); return res(same(n, [A, B]), `rows: ${JSON.stringify(n)}`); });
await check('B4', 'an empty name adds nothing', async () => { await add(''); const n = await names(); return res(same(n, [A, B]), `rows: ${JSON.stringify(n)}`); });
await check('B5', `ticking "${A}" shows it done`, async () => { await tick(A); const d = await isDone(A); return res(d === true, `done today: ${d}`); });
await shot('mon');
await check('B7', 'unticking works, and ticking again works', async () => {
  await tick(A); const off = await isDone(A); await tick(A); const on = await isDone(A);
  return res(off === false && on === true, `after untick: ${off}, after tick: ${on}`);
});
await check('B6', 'after a reload, both habits and the tick are still there', async () => {
  await open('mon'); const n = await names(), d = await isDone(A);
  return res(same(n, [A, B]) && d === true, `rows: ${JSON.stringify(n)}, ${A} done today: ${d}`);
});

await open('tue');
await check('B8', "Tue: yesterday's tick shows as yesterday, today is empty", async () => {
  const w = await week(A), d = await isDone(A);
  return res(Array.isArray(w) && w.length >= 2 && w.at(-2) === true && w.at(-1) === false && d === false, `${A} days: ${JSON.stringify(w)}, done today: ${d}`);
});
await check('B9', `Tue: after ticking today, ${A}'s streak is 2`, async () => { await tick(A); const s = await streak(A); return res(s === 2, `streak: ${s}`); });
await shot('tue');

await open('thu');
await check('B10', 'Thu: the streak has broken (0 or none); after ticking, it is 1', async () => {
  const before = await streak(A); await tick(A); const after = await streak(A);
  return res((before === 0 || before === null) && after === 1, `before: ${before}, after: ${after}`);
});
await check('B12', 'Thu: the last 7 days for each habit, done days marked', async () => {
  const wa = await week(A), wb = await week(B);
  return res(same(wa, WEEK_A) && same(wb, Array(7).fill(false)), `${A}: ${JSON.stringify(wa)} (want ${JSON.stringify(WEEK_A)}), ${B}: ${JSON.stringify(wb)}`);
});
await shot('thu');
await check('B11', `Thu: deleting "${B}" removes it, and it stays gone after a reload`, async () => {
  await press(inRow(B, LOC.remove), `${B}'s delete`);
  if (LOC.confirmRemove) await press(`document.querySelector(L.confirmRemove)`, 'the confirm');
  const n1 = await names(); await open('thu'); const n2 = await names();
  return res(same(n1, [A]) && same(n2, [A]), `after delete: ${JSON.stringify(n1)}, after reload: ${JSON.stringify(n2)}`);
});

// The phone's width is the one set here, never the page's `innerWidth`: with `mobile: true` (as on a real phone)
// `innerWidth` grows to the content, 486 on a page 486 px wide, so `scrollWidth > innerWidth` can never fire.
const PHONE_W = 390;
await send('Emulation.setDeviceMetricsOverride', { width: PHONE_W, height: 844, deviceScaleFactor: 2, mobile: true });
await open('thu');
await check('B13', 'phone (390 px): nothing cut off, no sideways scroll, every control tappable', async () => {
  const s = await page(`const W = ${PHONE_W}, out = [];
    if (document.documentElement.scrollWidth > W + 1) out.push('scrolls sideways: ' + document.documentElement.scrollWidth + ' > ' + W);
    for (const el of document.body.querySelectorAll('*')) {
      if (!seen(el) || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      // A 1×1 box is the screen-reader-only pattern (.sr-only: clipped on purpose, never seen); D·code 1's form label
      // failed B13 as "cut off" on a phone shot with nothing cut off.
      if (r.width <= 1 && r.height <= 1) continue;
      if (r.right > W + 1 || r.left < -1) out.push('off screen: ' + el.innerText.trim().slice(0, 30));
      else if (cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) out.push('cut off: ' + el.innerText.trim().slice(0, 30));
    }
    const controls = [['the name field', document.querySelector(L.addInput)], ...(L.addButton ? [['the add button', document.querySelector(L.addButton)]] : [])];
    for (const r of rows()) { controls.push([nameOf(r) + "'s tick", r.querySelector(L.tick)], [nameOf(r) + "'s delete", r.querySelector(L.remove)]); }
    const small = [];
    for (const [what, el] of controls) {
      if (!seen(el)) { out.push('not shown: ' + what); continue; }
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (r.width < 24 || r.height < 24) out.push('too small: ' + what + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
      else if (r.width < 44 || r.height < 44) small.push(what);
      if (!hit || !(hit === el || el.contains(hit))) out.push('a tap would miss: ' + what);
      if (r.left < -1 || r.right > W + 1) out.push('off screen: ' + what);
    }
    scrollTo(0, 0);
    return { out, tested: controls.map((c) => c[0]), under44: small };`);
  return res(s.out.length === 0, s.out.length ? s.out.join('; ') : `ok; tested ${s.tested.join(', ')}${s.under44.length ? `; under 44 px (not failed): ${s.under44.join(', ')}` : ''}`);
});
await shot('phone');

checks.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
const passed = checks.filter((c) => c.pass).length;
const report = { app: LOC.app || LOCFILE, locator: LOC, url: URL_, timezone: TZ, days: DAYS, passed, of: checks.length, checks, dialogs, errors, at: new Date().toISOString() };
fs.writeFileSync(path.join(OUT, 'grade.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${passed}/${checks.length}  →  ${path.join(OUT, 'grade.json')}`);
try { ws.close(); } catch {}
chrome.kill();
server?.close();
await sleep(500);
fs.rmSync(profile, { recursive: true, force: true });
process.exit(passed === checks.length ? 0 : 1);
