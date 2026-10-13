// OWN-019 AC5: the grader for "Pack It" (sentence-pack.txt), the second brief — a form and a list, where the quiz was
// a timed sequence. Same lab rules as own-018/grade-quiz.mjs: it plays one fixed pattern in headless Chrome over the
// PACKED preview, at phone size, reading only what a person sees, and audits the graph on disk. No API spend.
//
// The play (each check pass/fail; a check whose step was never reached fails):
//   start    "Pack It", "Nothing to pack yet", a text field, and an Add button a press lands on
//   refuse   Add with the field empty, then with "   ": "Type an item first" is shown (and was not before the first
//            press) and the list stays empty. Sentences are read off SHOWN leaves, never innerText (opacity-0 text)
//   add      Passport (Carry-on) → it appears; the field is empty again; Charger, Sunscreen, Hat each appear BELOW the
//            one added before (the brief's "at the bottom of the list")
//   bag      the rows show the bag chosen for them: Passport Carry-on, Sunscreen Suitcase, Hat Backpack — that bag and
//            no other in the row
//   keepbag  Charger, added with no bag chosen right after Passport (Carry-on), shows Carry-on — Carry-on, not the first
//            option, so a form that falls back to its default fails
//   tick     Sunscreen's checkbox → its name is crossed out (a line-through on it) AND greyed (its colour or opacity
//            moves); the press lands on the box
//   count    "1 of 4 packed" after that tick; "2 of 4 packed" after Hat's
//   untick   Hat's checkbox again → no line-through, its colour back, "1 of 4 packed"
//   filter   To pack → Passport, Charger, Hat and not Sunscreen; Packed → Sunscreen only; All → all four
//   active   each filter button looks different (mean colour of its box, from a screenshot) when it is the one chosen
//            than when either other one is — compared with ITSELF, so "All" being shorter than "To pack" proves nothing
//   delete   Charger's delete → Charger gone, the other three there, "1 of 3 packed"
//   reload   after a reload: Passport, Sunscreen, Hat in that order with their bags, Sunscreen crossed and the others
//            not, no Charger, "1 of 3 packed"
// A press is a real CDP mouse press at the element's centre; typing is CDP insertText into the focused field.
//
// Observed (beside the score, not in it):
//   emptyagain  deleting the last three brings "Nothing to pack yet" back
//   refuselater "   " + Add with four items in the list leaves the count at "of 4"
//   found       how each row's checkbox and delete were found (input / role / glyph / position) — read it before
//               believing a red tick or delete
//
//   node grade-pack.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--no-audit]
// Writes <out>/grade.json and screenshots; prints the checks. Exit 0 when every check passes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const target = path.resolve(argv[0] || '');
const TGZ = path.resolve(opt('--tgz', ''));
if (!argv[0] || !fs.existsSync(path.join(TGZ, 'nodegx-preview-0.2.0.tgz'))) throw new Error('usage: node grade-pack.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--no-audit]');

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

const ITEMS = ['Passport', 'Charger', 'Sunscreen', 'Hat'];
const BAGS = { Suitcase: 'suitcase', Backpack: 'backpack', 'Carry-on': 'carry[\\s-]?on' };

const checks = {};
const CHECK_NAMES = ['start', 'refuse', 'add', 'bag', 'keepbag', 'tick', 'count', 'untick', 'filter', 'active', 'delete', 'reload'];
const check = (name, ok, data = {}) => { checks[name] = { ok: !!ok, ...data }; say(`check ${name}`, checks[name]); return ok; };
const observed = {};

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
const bodyText = async () => String(await ev('document.body.innerText')).replace(/\s+/g, ' ');
const waitFor = async (fn, ms, poll = 100) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await sleep(poll); }
  return null;
};
const waitText = (re, ms) => waitFor(async () => re.test(await bodyText()), ms);
const shot = async (name) => fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));

// The page-side library, sent with every call (a reload clears anything left on window).
const LIB = String.raw`
const ITEMS = ${JSON.stringify(ITEMS)};
const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
const shown = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) <= 0.05) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
const inSelect = (e) => !!e.closest('select, option');
const leaves = (re) => [...document.querySelectorAll('body *')].filter((e) => !inSelect(e) && re.test(own(e)) && re.test(e.textContent.trim()) && shown(e));
const outer = (leaf) => { let b = leaf; while (b.parentElement && b.parentElement !== document.body && b.parentElement.textContent.trim() === leaf.textContent.trim()) b = b.parentElement; return b; };
const exact = (s) => new RegExp('^' + s.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&') + '$', 'i');
const at = (el) => {
  const pre = el.getBoundingClientRect();
  if (pre.top < 0 || pre.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { x, y, left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height, vtop: r.top, vleft: r.left, lands: !!hit && (el.contains(hit) || hit.contains(el) || (hit.tagName === 'LABEL' && hit.control === el) || (el.tagName === 'LABEL' && el.control === hit)) };
};
const field = () => [...document.querySelectorAll('input, textarea')].find((e) => !/^(checkbox|radio|hidden|button|submit|range|color|file)$/i.test(e.type || '') && e.getBoundingClientRect().width > 0 && shown(e.parentElement || e));
const hasItem = (el, name) => [...el.querySelectorAll('*')].some((e) => !inSelect(e) && exact(name).test(own(e)));
const STOP = /pack it\b|nothing to pack|type an item first|\d+\s*(of|\/)\s*\d+\s*(items?\s*)?packed/i;
const row = (name) => {
  const leaf = leaves(exact(name))[0];
  if (!leaf) return null;
  const f = field();
  let r = leaf;
  while (r.parentElement && r.parentElement !== document.body) {
    const p = r.parentElement;
    if (ITEMS.some((o) => o !== name && hasItem(p, o))) break;
    if (f && p.contains(f)) break;
    if (STOP.test(p.textContent)) break;
    if (['all', 'to pack', 'packed'].some((t) => hasItem(p, t))) break;
    r = p;
  }
  return { leaf, row: r };
};
const CHECK_GLYPH = /^(☐|☑|✓|✔|✅|⬜|◻|◯|○|●|check|done|check_box|check_box_outline_blank|check_circle|radio_button_(un)?checked|circle)$/i;
const DEL_GLYPH = /^(×|✕|✖|❌|x|delete|remove|close|clear|trash|🗑|🗑️|delete_outline|delete_forever|cancel|remove_circle(_outline)?|−|-)$/i;
const small = (e) => { const r = e.getBoundingClientRect(); return r.width >= 8 && r.height >= 8 && r.width <= 72 && r.height <= 72; };
const pointer = (e) => getComputedStyle(e).cursor === 'pointer';
const widen = (e, r) => { let b = e; while (b.parentElement && b.parentElement !== r && r.contains(b.parentElement) && b.parentElement.textContent.trim() === b.textContent.trim() && small(b.parentElement)) b = b.parentElement; return b; };
const parts = (name) => {
  const hit = row(name);
  if (!hit) return null;
  const { leaf, row: r } = hit;
  const all = [...r.querySelectorAll('*')];
  let box = null, boxHow = null;
  const cb = all.find((e) => e.matches('input[type=checkbox]') && e.getBoundingClientRect().width > 0);
  if (cb) { box = cb; boxHow = 'input'; }
  if (!box) { const e = all.find((e) => e.getAttribute('role') === 'checkbox' && shown(e)); if (e) { box = e; boxHow = 'role'; } }
  if (!box) { const e = all.find((e) => CHECK_GLYPH.test(own(e)) && shown(e)); if (e) { box = widen(e, r); boxHow = 'glyph'; } }
  let del = null, delHow = null;
  { const e = all.find((e) => e !== box && !(box && box.contains(e)) && shown(e) && (DEL_GLYPH.test(own(e)) || /delete|remove/i.test((e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '')))); if (e) { del = widen(e, r); delHow = 'glyph'; } }
  const lx = leaf.getBoundingClientRect();
  const pressables = all.filter((e) => shown(e) && small(e) && !e.contains(leaf) && !own(e).length && (pointer(e) || e.matches('button, [role=button], svg, img, i')) && ![...e.querySelectorAll('*')].some((c) => own(c).length > 2));
  const topOnly = (list) => list.filter((e) => !list.some((o) => o !== e && o.contains(e)));
  if (!box) { const left = topOnly(pressables).filter((e) => e.getBoundingClientRect().right <= lx.left + 2).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0]; if (left) { box = left; boxHow = 'position-left'; } }
  if (!del) { const right = topOnly(pressables).filter((e) => e !== box && !(box && (box.contains(e) || e.contains(box))) && e.getBoundingClientRect().left >= lx.right - 2).sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0]; if (right) { del = right; delHow = 'position-right'; } }
  let crossed = false;
  for (let e = leaf; e && e !== r.parentElement; e = e.parentElement) if (/line-through/.test(getComputedStyle(e).textDecorationLine)) crossed = true;
  let op = 1;
  for (let e = leaf; e && e !== document.documentElement; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
  const c = getComputedStyle(leaf).color.match(/[\d.]+/g).map(Number);
  const text = r.textContent.replace(/\s+/g, ' ').trim();
  const bags = ${JSON.stringify(Object.entries(BAGS))}.filter(([, re]) => new RegExp(re, 'i').test(text)).map(([b]) => b);
  return { name, text: text.slice(0, 120), bags, crossed, ink: { rgb: c.slice(0, 3), a: (c[3] ?? 1) * op }, vtop: leaf.getBoundingClientRect().top + scrollY, box: box ? { how: boxHow, ...at(box) } : null, del: del ? { how: delHow, ...at(del) } : null };
};
`;
const page = (expr) => ev(`(() => { ${LIB}; return (${expr}); })()`);
const press = async (b) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 }); };
const box = (reSrc) => page(`(() => { const l = leaves(${reSrc})[0]; return l ? { text: l.textContent.trim(), ...at(outer(l)) } : null; })()`);
const parts = (name) => page(`parts(${JSON.stringify(name)})`);
const present = (name) => page(`leaves(exact(${JSON.stringify(name)})).length > 0`);
// A sentence a person can see: a shown leaf holding it (innerText also carries opacity-0 text — Sonnet's
// "Type an item first" sits in the page at opacity 0 until it is needed).
const seen = (re) => page(`leaves(${re}).length > 0`);
const counted = async () => { const m = (await bodyText()).match(/(\d+)\s*(?:of|\/)\s*(\d+)\s*(?:items?\s*)?packed/i); return m ? `${m[1]} of ${m[2]}` : null; };
const ADD = '/^(add|add item|add to list|\\+|＋)$/i';

const type = async (text) => {
  const f = await page(`(() => { const f = field(); if (!f) return null; return at(f); })()`);
  if (!f) return { ok: false, why: 'no text field' };
  await press(f);
  await page(`(() => { const f = field(); f.focus(); f.select && f.select(); return true; })()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (text) await send('Input.insertText', { text });
  return { ok: (await page(`field().value`)) === text, value: await page(`field().value`) };
};
const fieldValue = () => page(`(field() || {}).value ?? null`);

// Choose a bag the way a person would: a select's option (the control's face is drawn over an opacity-0 <select>), or
// else the word pressed in the form — never the same word in a list row.
const chooseBag = async (bag) => {
  const re = BAGS[bag];
  const sel = await page(`(() => {
    const re = new RegExp(${JSON.stringify(re)}, 'i');
    const s = [...document.querySelectorAll('select')].find((s) => s.getBoundingClientRect().width > 0 && [...s.options].some((o) => re.test(o.textContent)));
    if (!s) return null;
    const pos = at(s);
    return pos;
  })()`);
  if (sel) {
    await press(sel);
    await sleep(150);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    const set = await page(`(() => {
      const re = new RegExp(${JSON.stringify(re)}, 'i');
      const s = [...document.querySelectorAll('select')].find((s) => s.getBoundingClientRect().width > 0 && [...s.options].some((o) => re.test(o.textContent)));
      const o = [...s.options].find((o) => re.test(o.textContent));
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value);
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new Event('change', { bubbles: true }));
      return s.options[s.selectedIndex]?.textContent;
    })()`);
    return { how: 'select', chosen: set, lands: sel.lands };
  }
  const b = await page(`(() => {
    const re = new RegExp('^' + ${JSON.stringify(re)} + '$', 'i');
    const f = field();
    const inForm = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { if (f && x.contains(f)) return true; if (ITEMS.some((o) => hasItem(x, o))) return false; } return true; };
    const l = leaves(re).filter(inForm)[0];
    return l ? at(outer(l)) : null;
  })()`);
  if (!b) return { how: null, why: `no "${bag}" to choose in the form` };
  await press(b);
  await sleep(150);
  return { how: 'press', lands: b.lands };
};

const addItem = async (name, bag) => {
  const chose = bag ? await chooseBag(bag) : null;
  const typed = await type(name);
  const add = await box(ADD);
  if (!add) return { ok: false, why: 'no Add button', chose, typed };
  await press(add);
  const appeared = await waitFor(() => present(name), 4000);
  await sleep(200);
  return { ok: appeared !== null, appearedMs: appeared, chose, typed, fieldAfter: await fieldValue() };
};

// Mean colour of an element's box, from a screenshot of it.
const meanColour = async (b) => {
  if (!b) return null;
  const clip = { x: b.left + 1, y: b.top + 1, width: Math.max(4, b.width - 2), height: Math.max(4, b.height - 2), scale: 1 };
  const png = (await send('Page.captureScreenshot', { format: 'png', clip })).result?.data;
  if (!png) return null;
  return ev(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${png}'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    let r = 0, gg = 0, bb = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
    return [Math.round(r / n), Math.round(gg / n), Math.round(bb / n)];
  })()`);
};
const dist = (a, b) => (a && b ? Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])) : null);
const inkMoved = (a, b) => !!a && !!b && (Math.hypot(...a.rgb.map((v, i) => v - b.rgb[i])) >= 40 || a.a - b.a >= 0.15 || b.a - a.a >= 0.15);
const FILTERS = { All: '/^all$/i', 'To pack': '/^to[\\s-]?pack$/i', Packed: '/^packed$/i' };
const pressFilter = async (name) => { const b = await box(FILTERS[name]); if (!b) return false; await press(b); await sleep(500); return true; };
const filterLooks = async () => { const o = {}; for (const [k, re] of Object.entries(FILTERS)) o[k] = await meanColour(await box(re)); return o; };
const visibleSet = async () => { const o = {}; for (const n of ITEMS) o[n] = await present(n); return o; };

let fatal = null;
const found = {};
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  const loaded = await waitText(/Pack It/i, 30000);
  await sleep(800);
  await shot('1-start');
  const emptyShown = await seen('/nothing to pack yet/i');
  const nagAtStart = await seen('/type an item first/i');
  const add0 = await box(ADD);
  const f0 = await page(`(() => { const f = field(); return f ? at(f) : null; })()`);
  check('start', loaded !== null && emptyShown && !!f0 && add0?.lands, { title: loaded !== null, empty: emptyShown, field: !!f0, add: add0?.text ?? null, lands: add0?.lands ?? null });
  if (!add0 || !f0) throw new Error('no Add button or no text field');

  // refuse: empty, then spaces
  // The message is not there before the press (an always-on hint is not the app answering the press).
  const refusal = async () => ({ nag: await seen('/type an item first/i'), empty: await seen('/nothing to pack yet/i'), count: await counted() });
  await press(add0);
  await sleep(600);
  const r1 = await refusal();
  await type('   ');
  await press(await box(ADD));
  await sleep(600);
  const r2 = await refusal();
  await shot('2-refused');
  const refusedOk = (r) => r.nag && r.empty && !/ of 1$/.test(r.count || '');
  check('refuse', !nagAtStart && refusedOk(r1) && refusedOk(r2), { nagAtStart, empty: r1, spaces: r2 });

  // add four
  const adds = {};
  adds.Passport = await addItem('Passport', 'Carry-on');
  adds.Charger = await addItem('Charger', null); // no choice: Carry-on stays chosen (not a default — a form that resets fails)
  adds.Sunscreen = await addItem('Sunscreen', 'Suitcase');
  adds.Hat = await addItem('Hat', 'Backpack');
  await shot('3-four-added');
  const rows = {};
  for (const n of ITEMS) rows[n] = await parts(n);
  for (const n of ITEMS) found[n] = { box: rows[n]?.box?.how ?? null, del: rows[n]?.del?.how ?? null };
  const appended = ITEMS.every((n) => rows[n]) && ITEMS.every((n, i) => i === 0 || rows[n].vtop > rows[ITEMS[i - 1]].vtop + 2);
  check('add', ITEMS.every((n) => adds[n].ok && adds[n].fieldAfter === '') && appended,
    { adds: Object.fromEntries(ITEMS.map((n) => [n, { ok: adds[n].ok, fieldAfter: adds[n].fieldAfter, chose: adds[n].chose, typed: adds[n].typed?.ok }])), order: ITEMS.map((n) => rows[n]?.vtop ?? null) });
  if (!ITEMS.every((n) => rows[n])) throw new Error(`not every item reached the list: ${JSON.stringify(Object.fromEntries(ITEMS.map((n) => [n, !!rows[n]])))}`);
  const only = (n, b) => rows[n].bags.length === 1 && rows[n].bags[0] === b;
  check('bag', only('Passport', 'Carry-on') && only('Sunscreen', 'Suitcase') && only('Hat', 'Backpack'), { rows: ITEMS.map((n) => ({ name: n, bags: rows[n].bags, text: rows[n].text })) });
  check('keepbag', only('Charger', 'Carry-on'), { charger: rows.Charger.bags });

  // refuse later (observed): spaces with four in the list
  await type('   ');
  await press(await box(ADD));
  await sleep(600);
  observed.refuselater = { count: await counted(), ok: (await counted()) === '0 of 4' };
  await type('');

  // tick Sunscreen. Every press reads its row again first: a person taps where the box IS — pk1's "Type an item
  // first" line mounts and unmounts above the list, and a press at the coordinates read before it missed the box.
  const sBefore = await parts('Sunscreen');
  if (!sBefore?.box) throw new Error('no checkbox found in the Sunscreen row');
  await press(sBefore.box);
  await sleep(500);
  const sAfter = await parts('Sunscreen');
  const c1 = await counted();
  await shot('4-ticked');
  check('tick', sBefore.box.lands && !sBefore.crossed && sAfter?.crossed && inkMoved(sBefore.ink, sAfter.ink),
    { how: sBefore.box.how, lands: sBefore.box.lands, crossed: [sBefore.crossed, sAfter?.crossed], ink: [sBefore.ink, sAfter?.ink] });
  // tick Hat
  const hBefore = await parts('Hat');
  if (!hBefore?.box) throw new Error('no checkbox found in the Hat row');
  await press(hBefore.box);
  await sleep(500);
  const hTicked = await parts('Hat');
  const c2 = await counted();
  check('count', c1 === '1 of 4' && c2 === '2 of 4', { afterSunscreen: c1, afterHat: c2 });
  // untick Hat
  await press((await parts('Hat'))?.box || hTicked.box);
  await sleep(500);
  const hAfter = await parts('Hat');
  const c3 = await counted();
  check('untick', hTicked?.crossed && hAfter && !hAfter.crossed && !inkMoved(hBefore.ink, hAfter.ink) && c3 === '1 of 4',
    { crossed: [hBefore.crossed, hTicked?.crossed, hAfter?.crossed], ink: [hBefore.ink, hAfter?.ink], count: c3 });

  // filters, and how each looks chosen vs not
  const looks = {};
  const sets = {};
  for (const f of ['To pack', 'Packed', 'All']) {
    if (!(await pressFilter(f))) { sets[f] = null; continue; }
    sets[f] = await visibleSet();
    looks[f] = await filterLooks();
    await shot(`5-filter-${f.replace(/\s/g, '')}`);
  }
  const want = { 'To pack': { Passport: true, Sunscreen: false, Charger: true, Hat: true }, Packed: { Passport: false, Sunscreen: true, Charger: false, Hat: false }, All: { Passport: true, Sunscreen: true, Charger: true, Hat: true } };
  check('filter', Object.keys(want).every((f) => sets[f] && ITEMS.every((n) => sets[f][n] === want[f][n])), { seen: sets });
  const diffs = {};
  for (const f of Object.keys(FILTERS)) {
    const others = Object.keys(FILTERS).filter((o) => o !== f);
    diffs[f] = others.map((o) => dist(looks[f]?.[f], looks[o]?.[f]));
  }
  check('active', Object.values(diffs).every((d) => d.every((x) => x !== null && x >= 20)), { chosenVsNot: diffs, looks });

  // delete Charger
  const ch = await parts('Charger');
  if (!ch?.del) throw new Error('no delete found in the Charger row');
  await press(ch.del);
  await sleep(600);
  const afterDel = await visibleSet();
  const c4 = await counted();
  await shot('6-deleted');
  check('delete', ch.del.lands && !afterDel.Charger && afterDel.Passport && afterDel.Sunscreen && afterDel.Hat && c4 === '1 of 3', { how: ch.del.how, lands: ch.del.lands, seen: afterDel, count: c4 });

  // reload
  await send('Page.reload', { ignoreCache: true });
  await waitText(/Pack It/i, 30000);
  await sleep(1000);
  await shot('7-after-reload');
  const kept = {};
  for (const n of ITEMS) kept[n] = await parts(n);
  const c5 = await counted();
  const r = (n) => kept[n];
  check('reload', r('Passport') && r('Sunscreen') && r('Hat') && !r('Charger') &&
    r('Passport').vtop < r('Sunscreen').vtop && r('Sunscreen').vtop < r('Hat').vtop &&
    r('Passport').bags.join() === 'Carry-on' && r('Sunscreen').bags.join() === 'Suitcase' && r('Hat').bags.join() === 'Backpack' &&
    r('Sunscreen').crossed && !r('Passport').crossed && !r('Hat').crossed && c5 === '1 of 3',
    { rows: ITEMS.map((n) => (kept[n] ? { name: n, bags: kept[n].bags, crossed: kept[n].crossed, vtop: kept[n].vtop } : { name: n, gone: true })), count: c5 });

  // empty again (observed)
  for (const n of ['Passport', 'Sunscreen', 'Hat']) {
    const p = await parts(n);
    if (p?.del) { await press(p.del); await sleep(500); }
  }
  await shot('8-emptied');
  observed.emptyagain = { ok: await seen('/nothing to pack yet/i'), text: (await bodyText()).slice(0, 160) };
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
  const storage = [];
  for (const c of comps) {
    for (const n of c.nodes) {
      census[n.type] = (census[n.type] || 0) + 1;
      const params = JSON.stringify(n.parameters || {});
      if (/javascript|^Expression$|^Function$|Script/i.test(n.type)) js.push({ component: c.name, type: n.type, calls: ['localStorage', 'filter(', 'splice', 'push(', 'JSON.parse'].filter((w) => params.includes(w)), chars: params.length });
      if (/stor|persist|^Array$|Object|Collection/i.test(n.type) || /persist/i.test(params)) storage.push({ component: c.name, type: n.type });
    }
  }
  audit = {
    components: comps.length,
    nodes: Object.values(census).reduce((a, b) => a + b, 0),
    census,
    list: { forEach: census['For Each'] || 0, repeater: census['Repeater'] || 0 },
    customComponentsPlaced: Object.keys(census).filter((t) => t.startsWith('/')),
    componentsWithInputs: comps.filter((c) => c.nodes.some((n) => n.type === 'Component Inputs')).map((c) => c.name),
    controls: Object.fromEntries(Object.entries(census).filter(([t]) => /checkbox|select|radio|text ?input|button/i.test(t))),
    javascript: { count: js.length, nodes: js },
    storage
  };
  try {
    const mcpRequire = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../packages/noodl-mcp/package.json'));
    const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
    const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
    const transport = new StdioClientTransport({ command: 'npx', args: ['-y', `--package=${path.join(TGZ, 'nodegx-mcp-0.2.0.tgz')}`, 'noodl-mcp', APP], cwd: LABHOME, env, stderr: 'ignore' });
    const client = new Client({ name: 'own019-grade', version: '0' });
    await client.connect(transport);
    const text = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const v = text(await client.callTool({ name: 'validate_project', arguments: {} }, undefined, { timeout: 120000 }));
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
console.log(`OBSERVED emptyagain: ${observed.emptyagain?.ok ?? '—'}  refuselater: ${observed.refuselater?.ok ?? '—'}  found: ${JSON.stringify(found)}`);
if (audit) console.log('AUDIT', JSON.stringify({ components: audit.components, nodes: audit.nodes, list: audit.list, custom: audit.customComponentsPlaced, inputs: audit.componentsWithInputs, controls: audit.controls, js: audit.javascript.count, jsCalls: audit.javascript.nodes.flatMap((n) => n.calls), storage: audit.storage.map((s) => s.type), validate: audit.validate }));
process.exit(passed === CHECK_NAMES.length ? 0 : 1);
