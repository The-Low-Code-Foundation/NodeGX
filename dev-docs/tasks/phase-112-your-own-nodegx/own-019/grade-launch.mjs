// OWN-019 AC5b: the grader for "Launch" (sentence-launch.txt), the third brief — a landing page whose look is the
// agent's own choice, with a toggle, an accordion, a validated form, a faked network call and a kept state. Same lab
// rules as grade-pack.mjs: it plays one fixed pattern in headless Chrome over the PACKED preview, at phone size,
// reading only what a person sees, and audits the graph on disk. No API spend.
//
// The play (each check pass/fail; a check whose step was never reached fails). One check per sentence of the brief:
//   hero      "Driftwood", a headline and a pitch (two more shown sentences of 3+ words above the button), and a
//             "Join the waitlist" button a press lands on
//   scroll    the name field is out of the viewport; pressing "Join the waitlist" brings it (and the email field) in
//   features  "Plan the week in one sitting", "See what's left at a glance", "Quiet by default", each with at least
//             two sentences in its own section
//   pricing   Monthly → "€6 a month" (and no "€60 a year"); Yearly → "€60 a year" and "Two months free" (and no
//             "€6 a month"); Monthly again → back. Pressing the word, else the switch between the words
//   faq       three questions (shown lines ending "?" above the form); tap Q2 → new text appears; tap Q3 → new text
//             appears AND Q2's text is gone
//   refuse    empty name + ada@example.com, then Ada + "ada@nowhere": "Please check your name and email" (not shown
//             before the first press), and nothing sent: no "Sending…", no "You're in"
//   sending   Ada + ada@example.com → "Sending…" shown within 1000 ms of the press and the outcome not before 500 ms
//             (a timed read, polled every 50 ms, as the quiz's CARRYOVER was)
//   joined    "You're in, Ada — we'll write to ada@example.com" within 4 s, and "Sending…" gone
//   fail      Bob + bob@fail.test → "Something went wrong — please try again", no "You're in", and the fields still
//             hold Bob / bob@fail.test (played BEFORE the join)
//   reload    after a reload: "You're on the list, Ada", a "Not you?" link, and no name/email field shown
//   notyou    "Not you?" → both fields shown and empty, "You're on the list" gone
//   The look, measured not judged (Richard judges the screenshots):
//   font      the font Chrome actually PAINTS body text in (CSS.getPlatformFontsForNode) is not a browser/system
//             default and not Inter (the template's own font token)
//   palette   ≥3 distinct chosen colours (≥ 32 apart) in shown text, backgrounds or gradients: not a pure grey and
//             not one of the template's own colour tokens (nodegx-project-contract/tokens.ts, read at grade time)
//   scale     ≥3 distinct font sizes in shown text
//   contrast  every feature sentence ≥ 4.5:1 against the background painted behind it (read from a screenshot)
//   phone     no sideways scroll and no shown text past the right edge at 390 wide
//   gaps      at 1280: no row with a hole between its parts' ink (render-measure's row-gap; s5 LAPTOPGAPS, R39)
//   align     at 1280: no section centred by its heading with a part off that centre (alignment-drift)
//   laptop    at 1280×800 the layout differs: two feature titles side by side, or ≥2 pairs of long text lines side by
//             side (phone has none)
// A press is a real CDP mouse press at the element's centre, its target re-read just before; typing is CDP insertText
// into the focused field, then a settle. Text is read from text nodes whose element is SHOWN (no display:none,
// visibility:hidden, opacity ≤ .05, zero size, or clipped away by an overflow ancestor — a closed accordion's answer).
//
//   node grade-launch.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--no-audit]
// Writes <out>/grade.json, step screenshots and full-page phone.png / laptop.png; prints the checks. Exit 0 when every
// check passes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
// s5 LAPTOPGAPS (R39): the render measure itself, so this grader and render_report read a laptop page the same way.
const rm = createRequire(import.meta.url)('../../../../packages/nodegx-render-measure/src/index.js');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const target = path.resolve(argv[0] || '');
const TGZ = path.resolve(opt('--tgz', ''));
if (!argv[0] || !fs.existsSync(path.join(TGZ, 'nodegx-preview-0.2.0.tgz'))) throw new Error('usage: node grade-launch.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--no-audit]');

const findApp = (dir, depth = 0) => {
  if (fs.existsSync(path.join(dir, 'nodegx.project.json'))) return dir;
  if (depth > 3) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === 'home' || e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'grade') continue;
    const hit = findApp(path.join(dir, e.name), depth + 1);
    if (hit) return hit;
  }
  return null;
};
const APP = findApp(target);
if (!APP) throw new Error(`no nodegx.project.json under ${target}`);
const OUT = path.resolve(opt('--out', path.join(fs.existsSync(path.join(target, 'work')) ? target : APP, 'grade')));
fs.mkdirSync(OUT, { recursive: true });
const LABHOME = fs.mkdtempSync(path.join(OUT, 'home-'));
const env = { ...process.env, HOME: LABHOME, npm_config_cache: path.join(LABHOME, '.npm'), TMPDIR: LABHOME };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }));

// The template's own colour tokens: a page wearing only these never chose a look.
const DEFAULT_COLOURS = [...fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../packages/nodegx-project-contract/tokens.ts'), 'utf8').matchAll(/#([0-9a-f]{6})\b/gi)]
  .map((m) => [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)));
const FEATURES = ['Plan the week in one sitting', "See what's left at a glance", 'Quiet by default'];
const checks = {};
const CHECK_NAMES = ['hero', 'scroll', 'features', 'pricing', 'faq', 'refuse', 'sending', 'joined', 'fail', 'reload', 'notyou', 'font', 'palette', 'scale', 'contrast', 'phone', 'laptop', 'gaps', 'align'];
const check = (name, ok, data = {}) => { checks[name] = { ok: !!ok, ...data }; say(`check ${name}`, checks[name]); return ok; };
const observed = {};
const found = {};

// The brief's sentences, with the typography a person can't tell apart (’ for ', – or - for —, ... for …).
const AP = "['’]";
const DASH = '\\s*[—–-]\\s*';
const RE = {
  name: /\bDriftwood\b/i,
  joinHero: /^join (the )?wait\s?list$/i,
  monthly: /€\s*6\s+a\s+month/i,
  yearly: /€\s*60\s+a\s+year/i,
  free: /two months free/i,
  nag: /please check your name and email/i,
  sending: /sending\s*(…|\.\.\.)/i,
  joined: new RegExp(`you${AP}re in, ada${DASH}we${AP}ll write to ada@example\\.com`, 'i'),
  anyJoined: new RegExp(`you${AP}re in`, 'i'),
  failed: new RegExp(`something went wrong${DASH}please try again`, 'i'),
  onList: new RegExp(`you${AP}re on the list, ada\\b`, 'i'),
  anyOnList: new RegExp(`you${AP}re on the list`, 'i'),
  notYou: /^not you\??$/i
};
const reSrc = (re) => re.toString();

// ---------------------------------------------------------------- the preview, from the tarball
const preview = spawn('npx', ['-y', `--package=${path.join(TGZ, 'nodegx-preview-0.2.0.tgz')}`, 'noodl-preview', APP, '--port', '0', '--no-watch'], { env, cwd: LABHOME, stdio: ['ignore', 'pipe', 'pipe'] });
let previewLog = '';
const url = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`preview printed no URL in 120 s: ${previewLog.slice(-600)}`)), 120000);
  const on = (d) => { previewLog += d; const m = previewLog.match(/http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?/); if (m) { clearTimeout(t); resolve(m[0]); } };
  preview.stdout.on('data', on);
  preview.stderr.on('data', on);
  preview.on('exit', (c) => reject(new Error(`preview exited ${c}: ${previewLog.slice(-600)}`)));
});
say('preview', { url, app: APP });

// ---------------------------------------------------------------- Chrome
const profile = fs.mkdtempSync(path.join(OUT, 'chrome-'));
const port = 59600 + Math.floor(Math.random() * 300);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', 'about:blank'],
  { stdio: 'ignore' });
let pageTarget;
for (let i = 0; i < 60 && !pageTarget; i++) {
  await sleep(250);
  try { pageTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = {};
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; return; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(String(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text).slice(0, 300));
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
const waitFor = async (fn, ms, poll = 100) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await sleep(poll); }
  return null;
};

// The page-side library, sent with every call (a reload clears anything left on window).
const LIB = String.raw`
const FEATURES = ${JSON.stringify(FEATURES)};
const clippedAway = (e) => {
  const r = e.getBoundingClientRect();
  for (let x = e.parentElement; x && x !== document.documentElement; x = x.parentElement) {
    const s = getComputedStyle(x);
    if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    const c = x.getBoundingClientRect();
    // Scrollers clip only what scrolls out of them, and a person scrolls; a closed accordion clips to (near) nothing.
    const scrolls = /auto|scroll/.test(s.overflowY + s.overflowX) && (x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1);
    if (scrolls) continue;
    const w = Math.min(r.right, c.right) - Math.max(r.left, c.left), h = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top);
    if (w < 2 || h < 2) return true;
  }
  return false;
};
const shownCache = new Map();
const shown = (e) => {
  if (shownCache.has(e)) return shownCache.get(e);
  let ok = true;
  for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) <= 0.05) { ok = false; break; } }
  if (ok) { const r = e.getBoundingClientRect(); ok = r.width > 0 && r.height > 0 && !clippedAway(e); }
  shownCache.set(e, ok);
  return ok;
};
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const own = (e) => norm([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''));
// What a person can read in an element: its text nodes whose element is shown.
const vtext = (el) => {
  const out = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.textContent.trim() && n.parentElement && !n.parentElement.closest('script,style,select,option') && shown(n.parentElement)) out.push(n.textContent);
  return norm(out.join(' '));
};
// The deepest shown element whose readable text matches: a sentence split over spans still counts.
const seenEl = (re) => {
  if (!re.test(vtext(document.body))) return null;
  let el = document.body;
  for (;;) { const c = [...el.children].find((k) => re.test(vtext(k))); if (!c) return el; el = c; }
};
const seen = (re) => !!seenEl(re);
const leaves = (re) => [...document.querySelectorAll('body *')].filter((e) => !e.closest('script,style,select,option') && re.test(own(e)) && shown(e));
const outer = (leaf) => { let b = leaf; while (b.parentElement && b.parentElement !== document.body && norm(b.parentElement.textContent) === norm(leaf.textContent)) b = b.parentElement; return b; };
const exact = (s) => new RegExp('^' + s.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]") + '$', 'i');
const at = (el, scroll = true) => {
  const pre = el.getBoundingClientRect();
  if (scroll && (pre.top < 0 || pre.bottom > innerHeight)) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { x, y, left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height, vtop: r.top, vbottom: r.bottom, lands: !!hit && (el.contains(hit) || hit.contains(el) || (hit.tagName === 'LABEL' && hit.control === el) || (el.tagName === 'LABEL' && el.control === hit)) };
};
const inView = (el) => { const r = el.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1 && r.height > 0; };
// The page's scroller: the document, or the tallest element that scrolls (a NodeGX page may scroll inside a box).
// The grader's own scrolls are instant: a page's 'scroll-behavior: smooth' (L1, s4) turns 'scrollTop = y' into a glide,
// and a press or a screenshot taken mid-glide reads the wrong place.
const scroller = () => {
  const d = document.scrollingElement;
  if (d.scrollHeight > innerHeight + 2) return d;
  return [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return /auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2; }).sort((a, b) => b.clientHeight - a.clientHeight)[0] || d;
};
const textInputs = () => [...document.querySelectorAll('input, textarea')].filter((e) => !/^(checkbox|radio|hidden|button|submit|range|color|file|reset|image)$/i.test(e.type || '') && shown(e));
const labelOf = (e) => {
  const bits = [e.placeholder, e.getAttribute('aria-label'), e.name, e.id, e.autocomplete, e.type];
  if (e.labels) for (const l of e.labels) bits.push(l.textContent);
  // The nearest shown text just above the field, in the same form block.
  const r = e.getBoundingClientRect();
  const above = leaves(/\S/).filter((l) => { const lr = l.getBoundingClientRect(); return lr.bottom <= r.top + 2 && r.top - lr.bottom < 40 && lr.left < r.right && lr.right > r.left; }).sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
  if (above) bits.push(own(above));
  return bits.filter(Boolean).join(' | ');
};
const fields = () => {
  const ins = textInputs();
  let email = ins.find((e) => e.type === 'email') || ins.find((e) => /e-?mail/i.test(labelOf(e)));
  let name = ins.find((e) => e !== email && /name/i.test(labelOf(e)) && !/e-?mail/i.test(labelOf(e)));
  let how = 'label';
  if ((!name || !email) && ins.length >= 2) { how = 'order'; name = name || ins.find((e) => e !== email); email = email || ins.find((e) => e !== name); }
  return name && email ? { name, email, how } : null;
};
const joinButtons = () => leaves(/^join\b[\w\s!→›»-]*$/i).map(outer);
const formJoin = () => {
  const f = fields();
  if (!f) return null;
  const et = f.email.getBoundingClientRect().top, nt = f.name.getBoundingClientRect().top;
  const top = Math.min(et, nt);
  const c = joinButtons().filter((b) => b.getBoundingClientRect().top >= top - 5).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  return c[0] || null;
};
const heroJoin = () => leaves(${reSrc(RE.joinHero)}).map(outer).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] || null;
`;
const page = (expr) => ev(`(() => { ${LIB}; return (${expr}); })()`);
// A press is held 100 ms, as a finger is: pressed and released in the same instant, a button's focus-scroll lands on
// top of the smooth scroll its click started and cancels it (L1, s4: "Join the waitlist" stopped 2–201 px down; held
// 120 ms, or tapped by touch, it reaches the form) — a fault no person can make.
const press = async (b) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(100);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
};
const seen = (re) => page(`seen(${reSrc(re)})`);
const text = () => page(`vtext(document.body)`);
const shot = async (name) => fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));

// The whole page, slice by slice down its scroller, stitched in the page's own canvas (a NodeGX page may scroll inside
// a box, which captureBeyondViewport never sees). Scrolling through also wakes any reveal-on-scroll animation.
const scrollThrough = async () => {
  const h = await page(`(() => { const s = scroller(); return { h: s.scrollHeight, v: s === document.scrollingElement ? innerHeight : s.clientHeight }; })()`);
  for (let y = 0; y < h.h; y += Math.max(200, h.v - 100)) { await page(`(() => { scroller().scrollTo({ top: ${y}, behavior: 'instant' }); return true; })()`); await sleep(250); }
  await page(`(() => { scroller().scrollTo({ top: 0, behavior: 'instant' }); return true; })()`);
  await sleep(400);
};
const fullShot = async (name) => {
  const g = await page(`(() => { const s = scroller(); const r = s === document.scrollingElement ? { top: 0, height: innerHeight } : s.getBoundingClientRect(); return { h: s.scrollHeight, v: s === document.scrollingElement ? innerHeight : s.clientHeight, top: Math.max(0, r.top), w: innerWidth, vh: innerHeight }; })()`);
  const step = g.v;
  const slices = [];
  for (let y = 0; y < Math.min(g.h, 16000); y += step) {
    await page(`(() => { scroller().scrollTo({ top: ${y}, behavior: 'instant' }); return true; })()`);
    await sleep(300);
    const real = await page(`scroller().scrollTop`);
    const png = (await send('Page.captureScreenshot', { format: 'png' })).result.data;
    slices.push({ y: real, png });
    if (real + step >= g.h) break;
  }
  await page(`(() => { scroller().scrollTo({ top: 0, behavior: 'instant' }); return true; })()`);
  // Stitch: the header above the scroller from the first slice, then each slice's scroller part at its scroll offset.
  const data = await ev(`(async () => {
    const g = ${JSON.stringify(g)}; const ys = ${JSON.stringify(slices.map((s) => s.y))}; const pngs = ${JSON.stringify(slices.map((s) => s.png))};
    const imgs = await Promise.all(pngs.map(async (b) => { const i = new Image(); i.src = 'data:image/png;base64,' + b; await i.decode(); return i; }));
    const k = imgs[0].width / g.w;
    const c = document.createElement('canvas'); c.width = imgs[0].width; c.height = Math.round((g.top + ys[ys.length - 1] + g.v) * k);
    const x = c.getContext('2d');
    if (g.top > 0) x.drawImage(imgs[0], 0, 0, c.width, g.top * k, 0, 0, c.width, g.top * k);
    imgs.forEach((im, i) => x.drawImage(im, 0, g.top * k, c.width, g.v * k, 0, (g.top + ys[i]) * k, c.width, g.v * k));
    return c.toDataURL('image/png').split(',')[1];
  })()`);
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
};

const fieldInfo = () => page(`(() => { const f = fields(); if (!f) return null; return { how: f.how, name: { value: f.name.value, label: labelOf(f.name), inView: inView(f.name) }, email: { value: f.email.value, label: labelOf(f.email), inView: inView(f.email) } }; })()`);
const typeInto = async (which, value) => {
  const f = await page(`(() => { const f = fields(); return f ? at(f.${which}) : null; })()`);
  if (!f) return { ok: false, why: 'no name/email fields' };
  await press(f);
  await page(`(() => { const e = fields().${which}; e.focus(); e.select && e.select(); return true; })()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (value) await send('Input.insertText', { text: value });
  await sleep(350); // typing can mount or unmount a message line and move the button a person then taps
  const v = await page(`fields().${which}.value`);
  return { ok: v === value, value: v };
};
const fill = async (name, email) => ({ name: await typeInto('name', name), email: await typeInto('email', email) });
const pressJoin = async () => {
  const b = await page(`(() => { const b = formJoin(); return b ? { text: norm(b.textContent), ...at(b) } : null; })()`);
  if (!b) return null;
  await press(b);
  return b;
};
// Poll the screen every ~50 ms after a press: when each sentence was first and last seen.
const watch = async (ms, res) => {
  const t0 = Date.now();
  const first = {}, last = {};
  while (Date.now() - t0 < ms) {
    const got = await page(`[${res.map((r) => `seen(${reSrc(r)})`).join(',')}]`);
    const t = Date.now() - t0;
    got.forEach((g, i) => { if (g) { if (first[i] === undefined) first[i] = t; last[i] = t; } });
    await sleep(40);
  }
  return res.map((_, i) => ({ first: first[i] ?? null, last: last[i] ?? null }));
};

// WCAG contrast.
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
// The colour painted behind an element: the commonest pixel in a screenshot of its box (text is the minority).
const paintedBehind = async (b) => {
  const clip = { x: b.left, y: b.top, width: Math.max(4, b.width), height: Math.max(4, b.height), scale: 1 };
  const png = (await send('Page.captureScreenshot', { format: 'png', clip })).result?.data;
  if (!png) return null;
  return ev(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${png}'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    const n = new Map();
    for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 2) + ',' + (d[i + 1] >> 2) + ',' + (d[i + 2] >> 2); n.set(k, (n.get(k) || 0) + 1); }
    const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map((v) => Number(v) * 4 + 2);
    return top;
  })()`);
};

let fatal = null;
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');
  await send('CSS.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  const loaded = await waitFor(() => seen(RE.name), 30000);
  await sleep(1200);
  await shot('1-top');
  await scrollThrough();

  // hero
  const hero = await page(`(() => {
    const b = heroJoin();
    if (!b) return { button: null };
    const bt = b.getBoundingClientRect().top + scroller().scrollTop;
    const name = leaves(${reSrc(RE.name)})[0];
    const above = leaves(/\\S/).filter((l) => l.getBoundingClientRect().top + scroller().scrollTop < bt && own(l).split(' ').length >= 3 && !/^\\s*Driftwood\\s*$/i.test(own(l))).map((l) => own(l).slice(0, 80));
    return { button: { text: norm(b.textContent), ...at(b, false) }, nameShown: !!name, nameTop: name ? name.getBoundingClientRect().top : null, above };
  })()`);
  check('hero', loaded !== null && hero.button && hero.nameShown && hero.above?.length >= 2, { name: hero.nameShown, lines: hero.above, button: hero.button?.text ?? null });

  // the look, at phone size, on the fresh page
  const look = await page(`(() => {
    const els = [...document.querySelectorAll('body *')].filter((e) => !e.closest('script,style') && shown(e));
    const cols = [];
    const parse = (s) => (s.match(/rgba?\\([^)]*\\)/g) || []).map((c) => c.match(/[\\d.]+/g).map(Number)).filter((c) => (c[3] ?? 1) >= 0.2).map((c) => c.slice(0, 3));
    const sizes = new Set();
    for (const e of els) {
      const s = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (own(e)) { cols.push(...parse(s.color)); sizes.add(Math.round(parseFloat(s.fontSize))); }
      if (r.width * r.height >= 100) { cols.push(...parse(s.backgroundColor)); if (s.backgroundImage !== 'none') cols.push(...parse(s.backgroundImage)); }
    }
    const seenCols = [];
    for (const c of cols) if (!seenCols.some((h) => h.join() === c.join())) seenCols.push(c);
    const se = document.scrollingElement;
    const past = leaves(/\\S/).filter((l) => l.getBoundingClientRect().right > innerWidth + 2).map((l) => own(l).slice(0, 40));
    return { cols: seenCols, sizes: [...sizes].sort((a, b) => a - b), overflow: { scrollWidth: se.scrollWidth, innerWidth, past } };
  })()`);
  // Chosen = not the template's own colour tokens (q6's quiz showed exactly two colours, #64748b and #2563eb, both
  // defaults) and not a pure grey; tinted neutrals (a cream, a warm near-black) are a choice and count.
  const near = (a, b, d) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < d;
  const chosen = [];
  for (const c of look.cols) {
    if (Math.max(...c) - Math.min(...c) < 6 || DEFAULT_COLOURS.some((d) => near(c, d, 12))) continue;
    if (!chosen.some((h) => near(h, c, 32))) chosen.push(c);
  }
  check('palette', chosen.length >= 3, { chosen, defaultsSeen: look.cols.filter((c) => DEFAULT_COLOURS.some((d) => near(c, d, 12))) });
  check('scale', look.sizes.length >= 3, { sizes: look.sizes });
  check('phone', look.overflow.scrollWidth <= look.overflow.innerWidth + 1 && look.overflow.past.length === 0, look.overflow);

  // features (two sentences each, in the title's own section) and the font painted in them
  const feats = await page(`(() => FEATURES.map((t) => {
    const leaf = leaves(exact(t))[0];
    if (!leaf) return { title: t, found: false };
    let s = leaf;
    // Climb to the title's own section: stop below the first box that also holds another feature's title.
    while (s.parentElement && s.parentElement !== document.body && !FEATURES.some((o) => o !== t && new RegExp(exact(o).source.slice(1, -1), 'i').test(vtext(s.parentElement)))) s = s.parentElement;
    const rest = vtext(s).replace(new RegExp(exact(t).source.slice(1, -1), 'i'), '').trim();
    const sentences = rest.split(/(?<=[.!?…])\\s+/).filter((x) => x.split(' ').length >= 3);
    const body = leaves(/\\S/).filter((l) => s.contains(l) && l !== leaf && own(l).split(' ').length >= 4);
    body.forEach((l, i) => l.setAttribute('data-grade-body', t.slice(0, 4) + i));
    return { title: t, found: true, sentences: sentences.length, text: rest.slice(0, 200), body: body.map((l) => ({ text: own(l).slice(0, 60), ...at(l, false), colour: getComputedStyle(l).color })) };
  }))()`);
  check('features', feats.every((f) => f.found && f.sentences >= 2), { features: feats.map((f) => ({ title: f.title, found: f.found, sentences: f.sentences, text: f.text })) });

  // font: what Chrome actually painted the feature sentences in
  const painted = {};
  const doc = await send('DOM.getDocument', { depth: -1 });
  const q = await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector: '[data-grade-body]' });
  for (const nodeId of q.result?.nodeIds || []) {
    const f = await send('CSS.getPlatformFontsForNode', { nodeId });
    for (const pf of f.result?.fonts || []) { const k = `${pf.familyName}${pf.isCustomFont ? ' (web)' : ''}`; painted[k] = (painted[k] || 0) + pf.glyphCount; }
  }
  const declared = await page(`(() => { const l = document.querySelector('[data-grade-body]'); return l ? getComputedStyle(l).fontFamily : getComputedStyle(document.body).fontFamily; })()`);
  const top = Object.entries(painted).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  // Inter is the project template's own --font-family token (POL-006, nodegx-project-contract/tokens.ts): painted in
  // Inter means the look was never chosen, whether or not Inter is installed on this Mac.
  const DEFAULT_FACES = /^(inter|times|times new roman|helvetica|helvetica neue|arial|\.?sf ns.*|system font|\.applesystemuifont|sf pro.*|-apple-system|lucida grande|verdana|tahoma|courier|courier new|dejavu.*|liberation.*|roboto|noto sans|segoe ui)$/i;
  check('font', !!top && !DEFAULT_FACES.test(top.replace(/ \(web\)$/, '')), { painted, declared });

  // contrast of every feature sentence against what is painted behind it
  const cons = [];
  for (const f of feats) for (const b of f.body || []) {
    const pos = await page(`(() => { const l = [...document.querySelectorAll('[data-grade-body]')].find((e) => own(e).startsWith(${JSON.stringify(b.text.slice(0, 30))})); if (!l) return null; let op = 1; for (let e = l; e && e !== document.documentElement; e = e.parentElement) op *= Number(getComputedStyle(e).opacity); return { ...at(l), colour: getComputedStyle(l).color, op }; })()`);
    if (!pos) continue;
    await sleep(150);
    const bg = await paintedBehind(pos);
    const c = pos.colour.match(/[\d.]+/g).map(Number);
    const a = (c[3] ?? 1) * pos.op;
    const fg = c.slice(0, 3).map((v, i) => Math.round(v * a + (bg ? bg[i] : 255) * (1 - a)));
    cons.push({ text: b.text.slice(0, 40), fg, bg, ratio: bg ? ratio(fg, bg) : null });
  }
  check('contrast', cons.length >= 3 && cons.every((x) => x.ratio !== null && x.ratio >= 4.5), { min: cons.length ? Math.min(...cons.map((x) => x.ratio ?? 0)) : null, lines: cons });

  await page(`(() => { scroller().scrollTo({ top: 0, behavior: 'instant' }); return true; })()`);
  await sleep(300);
  await fullShot('phone');

  // scroll: the form is out of view, then "Join the waitlist" brings it in
  await page(`(() => { scroller().scrollTo({ top: 0, behavior: 'instant' }); return true; })()`);
  await sleep(400);
  const before = await fieldInfo();
  const hb = await page(`(() => { const b = heroJoin(); return b ? { text: norm(b.textContent), ...at(b) } : null; })()`);
  let scrolled = null;
  if (hb && before) {
    await press(hb);
    scrolled = await waitFor(async () => { const f = await fieldInfo(); return f && f.name.inView && f.email.inView; }, 3000);
    await sleep(300);
  }
  const afterScroll = await fieldInfo();
  await shot('2-after-join-the-waitlist');
  check('scroll', !!hb?.lands && before && !before.name.inView && scrolled !== null, { lands: hb?.lands ?? null, before: before && { name: before.name.inView, email: before.email.inView }, after: afterScroll && { name: afterScroll.name.inView, email: afterScroll.email.inView }, ms: scrolled, fields: afterScroll && { how: afterScroll.how, name: afterScroll.name.label, email: afterScroll.email.label } });
  found.fields = afterScroll && { how: afterScroll.how, name: afterScroll.name.label, email: afterScroll.email.label };

  // pricing: press the word, else the switch between the words
  const priceState = async () => ({ monthly: await seen(RE.monthly), yearly: await seen(RE.yearly), free: await seen(RE.free) });
  const pressPeriod = async (word) => {
    const want = word === 'Monthly' ? (s) => s.monthly && !s.yearly && !s.free : (s) => s.yearly && s.free && !s.monthly;
    const w = await page(`(() => { const l = leaves(/^${word}$/i)[0]; return l ? at(outer(l)) : null; })()`);
    if (w) { await press(w); await sleep(600); if (want(await priceState())) return 'word'; }
    const sw = await page(`(() => {
      const m = leaves(/^monthly$/i)[0], y = leaves(/^yearly$/i)[0];
      const cand = [...document.querySelectorAll('[role=switch], input[type=checkbox], button, [role=button]')].filter((e) => shown(e));
      let s = cand.find((e) => e.getAttribute('role') === 'switch' || e.type === 'checkbox');
      if (!s && m && y) {
        const a = m.getBoundingClientRect(), b = y.getBoundingClientRect();
        s = [...document.querySelectorAll('body *')].filter((e) => shown(e) && !own(e) && !e.contains(m) && !e.contains(y)).find((e) => { const r = e.getBoundingClientRect(); return r.width >= 20 && r.width <= 90 && r.height >= 12 && r.height <= 60 && r.left >= Math.min(a.right, b.right) - 4 && r.right <= Math.max(a.left, b.left) + 4 && Math.abs((r.top + r.bottom) / 2 - (a.top + a.bottom) / 2) < 30; });
      }
      return s ? at(s) : null;
    })()`);
    if (sw) { await press(sw); await sleep(600); if (want(await priceState())) return 'switch'; }
    return null;
  };
  const p0 = await priceState();
  const pm1 = await pressPeriod('Monthly');
  const s1 = await priceState();
  const py = await pressPeriod('Yearly');
  const s2 = await priceState();
  await shot('3-yearly');
  const pm2 = await pressPeriod('Monthly');
  const s3 = await priceState();
  found.toggle = [pm1, py, pm2];
  check('pricing', !!pm1 && !!py && !!pm2, { start: p0, monthly: s1, yearly: s2, monthlyAgain: s3, how: found.toggle });

  // faq: three questions above the form
  const qs = await page(`(() => {
    const f = fields();
    const formTop = f ? f.name.getBoundingClientRect().top + scroller().scrollTop : Infinity;
    const q = leaves(/\\?$/).filter((l) => own(l).length >= 10 && l.getBoundingClientRect().top + scroller().scrollTop < formTop).map((l) => ({ text: own(l), top: l.getBoundingClientRect().top + scroller().scrollTop }));
    return q.sort((a, b) => a.top - b.top).slice(-3).map((x) => x.text);
  })()`);
  found.faq = qs;
  const readable = () => page(`leaves(/\\S/).filter((l) => own(l).length >= 15).map((l) => own(l))`);
  const pressQ = async (t) => { const b = await page(`(() => { const l = leaves(exact(${JSON.stringify(t)}))[0]; return l ? at(outer(l)) : null; })()`); if (!b) return null; await press(b); await sleep(900); return b; };
  let faq = { questions: qs };
  if (qs.length === 3) {
    const t0 = await readable();
    const b2 = await pressQ(qs[1]);
    const t1 = await readable();
    const a2 = t1.filter((x) => !t0.includes(x) && !qs.includes(x));
    await shot('4-faq-q2');
    const b3 = await pressQ(qs[2]);
    const t2 = await readable();
    const a3 = t2.filter((x) => !t1.includes(x) && !qs.includes(x));
    const a2still = a2.filter((x) => t2.includes(x));
    await shot('5-faq-q3');
    faq = { questions: qs, lands: [b2?.lands ?? null, b3?.lands ?? null], q2opened: a2, q3opened: a3, q2stillOpen: a2still };
  }
  check('faq', qs.length === 3 && faq.lands.every(Boolean) && faq.q2opened.length > 0 && faq.q3opened.length > 0 && faq.q2stillOpen.length === 0, faq);

  // refuse: empty name, then a non-email; the line not there before the first press
  const nagBefore = await seen(RE.nag);
  const r1fill = await fill('', 'ada@example.com');
  const j1 = await pressJoin();
  const w1 = await watch(1500, [RE.nag, RE.sending, RE.anyJoined]);
  const r2fill = await fill('Ada', 'ada@nowhere');
  const j2 = await pressJoin();
  const w2 = await watch(1500, [RE.nag, RE.sending, RE.anyJoined]);
  await shot('6-refused');
  const refusedOk = (w) => w[0].first !== null && w[1].first === null && w[2].first === null;
  found.join = j1 && { text: j1.text, lands: j1.lands };
  check('refuse', !nagBefore && !!j1?.lands && refusedOk(w1) && refusedOk(w2), { nagBefore, emptyName: { typed: r1fill, nag: w1[0].first, sending: w1[1].first, joined: w1[2].first }, notAnEmail: { typed: r2fill, nag: w2[0].first, sending: w2[1].first, joined: w2[2].first } });

  // fail: Bob at fail.test, before anyone has joined
  const ffill = await fill('Bob', 'bob@fail.test');
  const jf = await pressJoin();
  // Bob joining, not any "You're in": a mutant that wrongly let "ada@nowhere" in leaves its line on screen until the
  // press replaces it, and the first poll (≈2 ms) reads it.
  const wf = await watch(4000, [RE.sending, RE.failed, new RegExp(`you${AP}re in, bob`, 'i')]);
  const kept = await fieldInfo();
  await shot('7-failed');
  observed.failSending = wf[0];
  check('fail', !!jf && wf[1].first !== null && wf[2].first === null && kept?.name.value === 'Bob' && kept?.email.value === 'bob@fail.test', { typed: ffill, sending: wf[0], failed: wf[1], joined: wf[2], fieldsAfter: kept && { name: kept.name.value, email: kept.email.value } });

  // sending → joined, timed
  const jfill = await fill('Ada', 'ada@example.com');
  const jj = await pressJoin();
  const wj = await watch(4500, [RE.sending, RE.joined, RE.failed]);
  await shot('8-joined');
  const outcomeAt = wj[1].first;
  check('sending', !!jj && wj[0].first !== null && wj[0].first <= 1000 && outcomeAt !== null && outcomeAt >= 500, { typed: jfill, sending: wj[0], joinedAt: outcomeAt });
  const sendingGone = !(await seen(RE.sending));
  check('joined', outcomeAt !== null && sendingGone, { joined: wj[1], sendingGone, failedShown: wj[2], text: (await text()).match(/you.re in[^.]{0,80}/i)?.[0] ?? null });

  // reload: the joined state where the form was
  await send('Page.reload', { ignoreCache: true });
  await waitFor(() => seen(RE.name), 30000);
  await sleep(1200);
  await scrollThrough();
  const onList = await seen(RE.onList);
  const nyb = await page(`(() => { const l = leaves(${reSrc(RE.notYou)})[0]; return l ? at(outer(l)) : null; })()`);
  const formGone = await page(`!fields() && textInputs().length === 0`);
  await shot('9-after-reload');
  check('reload', onList && !!nyb && formGone, { onList, notYou: !!nyb, formGone, text: (await text()).match(/you.re on the list[^.]{0,40}/i)?.[0] ?? null });

  // not you
  let nyOk = false, nyData = { notYou: !!nyb };
  if (nyb) {
    await press(await page(`(() => { const l = leaves(${reSrc(RE.notYou)})[0]; return l ? at(outer(l)) : null; })()`) || nyb);
    await sleep(800);
    const f = await fieldInfo();
    const still = await seen(RE.anyOnList);
    nyData = { lands: nyb.lands, fields: f && { name: f.name.value, email: f.email.value }, onListStill: still };
    nyOk = nyb.lands && !!f && f.name.value === '' && f.email.value === '' && !still;
    await shot('10-not-you');
    // observed: is the forgetting kept over another reload?
    await send('Page.reload', { ignoreCache: true });
    await waitFor(() => seen(RE.name), 30000);
    await sleep(1200);
    await scrollThrough();
    observed.notyouKept = { onList: await seen(RE.anyOnList), form: !!(await fieldInfo()) };
  }
  check('notyou', nyOk, nyData);

  // laptop
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.reload', { ignoreCache: true });
  await waitFor(() => seen(RE.name), 30000);
  await sleep(1200);
  await scrollThrough();
  const sideBySide = `(() => {
    const ls = leaves(/\\S/).filter((l) => own(l).length >= 20).map((l) => { const r = l.getBoundingClientRect(); return { t: r.top + scroller().scrollTop, b: r.bottom + scroller().scrollTop, l: r.left, r: r.right }; });
    let n = 0;
    for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) { const a = ls[i], b = ls[j]; if (Math.min(a.b, b.b) - Math.max(a.t, b.t) > 4 && (a.r <= b.l + 2 || b.r <= a.l + 2)) n++; }
    const ft = FEATURES.map((t) => { const l = leaves(exact(t))[0]; if (!l) return null; const r = l.getBoundingClientRect(); return { top: Math.round(r.top + scroller().scrollTop), left: Math.round(r.left) }; });
    const featsRow = ft.filter(Boolean).some((a, i, all) => all.some((b, j) => j !== i && Math.abs(a.top - b.top) < 30 && Math.abs(a.left - b.left) > 50));
    return { pairs: n, features: ft, featsRow };
  })()`;
  const lap = await page(sideBySide);
  // s5 LAPTOPGAPS (R39, Richard on RL1's rows): render-measure's own measure at 1280, judged by its own summarise.
  //   gaps   no `row-gap` — two parts of one row with a hole between their ink (RL1's number given a fifth of the page)
  //   align  no `alignment-drift` — a section centred by its heading with a part off that centre (L1's price)
  const lay = rm.summarise({ desktop: { ...(await ev(rm.measureExpression([], []))), requested: { width: 1280, height: 800 }, consoleErrors: [] } }).findings;
  const rowGaps = lay.filter((f) => f.code === rm.RenderFinding.RowGap).map((f) => f.evidence);
  const drifts = lay.filter((f) => f.code === rm.RenderFinding.AlignmentDrift).map((f) => f.evidence);
  await fullShot('laptop');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.reload', { ignoreCache: true });
  await waitFor(() => seen(RE.name), 30000);
  await sleep(1000);
  await scrollThrough();
  const ph = await page(sideBySide);
  // s5: +1, not +2 — RL1's laptop page is two-column (hero beside its card, a number column beside each feature) and
  // read 1 pair to the phone's 0; +2 failed a layout that plainly adapts.
  check('laptop', lap.featsRow || lap.pairs >= ph.pairs + 1, { laptop: lap, phone: ph });
  check('gaps', rowGaps.length === 0, { rowGaps: rowGaps.map((g) => `${g.left} | ${g.gap}px of ${g.rowWidth} | ${g.right}`) });
  check('align', drifts.length === 0, { drifts: drifts.map((d) => `"${d.text}" ${d.offBy}px off "${d.centredText}"`) });
} catch (e) {
  fatal = String(e.message || e);
  say('stopped', { why: fatal });
  try { await shot('x-stopped'); } catch {}
}
observed.found = found;
for (const n of CHECK_NAMES) if (!checks[n]) checks[n] = { ok: false, notReached: true };
const chromeGone = new Promise((r) => chrome.once('exit', r));
chrome.kill();
preview.kill();
await Promise.race([chromeGone, sleep(5000)]);

// ---------------------------------------------------------------- the audit
let audit = null;
if (!argv.includes('--no-audit')) {
  const comps = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'nodes.json') comps.push({ name: path.relative(path.join(APP, 'components'), dir), nodes: JSON.parse(fs.readFileSync(p, 'utf8')).nodes || [] });
    }
  };
  walk(path.join(APP, 'components'));
  const census = {};
  const js = [];
  for (const c of comps) {
    for (const n of c.nodes) {
      census[n.type] = (census[n.type] || 0) + 1;
      const params = JSON.stringify(n.parameters || {});
      if (/javascript|^Expression$|^Function$|Script/i.test(n.type)) js.push({ component: c.name, type: n.type, calls: ['localStorage', 'setTimeout', 'fetch(', 'scrollIntoView', 'fail.test'].filter((w) => params.includes(w)), chars: params.length });
    }
  }
  const fontsDir = path.join(APP, 'fonts');
  audit = {
    components: comps.length,
    nodes: Object.values(census).reduce((a, b) => a + b, 0),
    census,
    customComponentsPlaced: Object.keys(census).filter((t) => t.startsWith('/')),
    componentsWithInputs: comps.filter((c) => c.nodes.some((n) => n.type === 'Component Inputs')).map((c) => c.name),
    javascript: { count: js.length, nodes: js },
    fontFiles: fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : []
  };
  try {
    const mcpRequire = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../packages/noodl-mcp/package.json'));
    const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
    const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
    const transport = new StdioClientTransport({ command: 'npx', args: ['-y', `--package=${path.join(TGZ, 'nodegx-mcp-0.2.0.tgz')}`, 'noodl-mcp', APP], cwd: LABHOME, env, stderr: 'ignore' });
    const client = new Client({ name: 'own019-grade', version: '0' });
    await client.connect(transport);
    const txt = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const v = txt(await client.callTool({ name: 'validate_project', arguments: {} }, undefined, { timeout: 120000 }));
    let parsed = null;
    try { parsed = JSON.parse(v); } catch {}
    audit.validate = parsed ? { errors: parsed.errorCount ?? parsed.summary?.errors ?? parsed.errors?.length, warnings: parsed.warningCount ?? parsed.summary?.warnings ?? parsed.warnings?.length, raw: v.slice(0, 600) } : { raw: v.slice(0, 600) };
    await client.close();
  } catch (e) {
    audit.validate = { failed: String(e.message || e).slice(0, 300) };
  }
}

const passed = CHECK_NAMES.filter((n) => checks[n].ok).length;
const result = { app: APP, at: new Date().toISOString(), score: `${passed}/${CHECK_NAMES.length}`, passed, stopped: fatal, checks, observed, pageErrors: errors.slice(0, 10), audit };
fs.writeFileSync(path.join(OUT, 'grade.json'), JSON.stringify(result, null, 2) + '\n');
for (const d of [profile, LABHOME]) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch {}
console.log(`\nSCORE ${result.score}  ${CHECK_NAMES.map((n) => `${checks[n].ok ? '✓' : '✗'}${n}`).join(' ')}${fatal ? `  (stopped: ${fatal})` : ''}`);
console.log(`OBSERVED ${JSON.stringify(observed)}`);
if (audit) console.log('AUDIT', JSON.stringify({ components: audit.components, nodes: audit.nodes, custom: audit.customComponentsPlaced, inputs: audit.componentsWithInputs, js: audit.javascript.count, jsCalls: audit.javascript.nodes.flatMap((n) => n.calls), fonts: audit.fontFiles, validate: audit.validate }));
process.exit(passed === CHECK_NAMES.length ? 0 : 1);
