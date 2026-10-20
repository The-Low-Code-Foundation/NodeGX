// OWN-019 s4 — the grader for "your own editor" (sentence-editor.txt, Richard's bonus): a second session on a
// finished Capital Quiz (seeded with q6, 12/12) adds an editor whose changes are kept ON THIS COMPUTER for every
// browser, and the quiz plays them. Same lab rules as grade-quiz.mjs / grade-launch.mjs: the PACKED preview, headless
// Chrome at phone size, CDP presses at an element's centre, text read off shown leaves.
//
// The edit (browser A, a fresh profile): title "Capital Quiz" → "Europe Quiz"; question 1 → "What is the capital of
// Spain?" with Seville, Madrid, Valencia (in that order) and Madrid right; 10 seconds → 15; the right colour →
// #2563eb, the wrong colour → #f97316. Fields are found by the values the editor shows today, so the grader never
// guesses the agent's layout; the right-answer marker by what it is (radio, select, a field holding the answer, …).
//
//   editbutton  "Edit quiz" on the start screen, a press lands on it
//   loads       the editor shows what the quiz plays today ("What is the capital of Portugal?", Lisbon/Porto/Coimbra,
//               10, the title) within 5 s
//   saved       Save → "Saved" shown within 5 s
//   plays       the same browser, reloaded: the start screen says "Europe Quiz"
//   shared      ANOTHER browser (a fresh profile, nothing in its storage): "Europe Quiz"
//   question    there, Start → "What is the capital of Spain?"
//   order       its answers read Seville, Madrid, Valencia top to bottom (or left to right)
//   seconds     the countdown starts at 15
//   rightanswer tapping Madrid paints it the right colour (#2563eb), not the wrong one
//   rightcolour question 2 (unchanged): tapping Sydney paints Canberra #2563eb
//   wrongcolour … and Sydney #f97316
//   unchanged   question 2 is still Australia, Sydney / Canberra / Melbourne
//   restart     everything stopped (preview, and the backend if the app has one) and started again: a third fresh
//               browser plays "Europe Quiz" and "What is the capital of Spain?"
// Colours are an element's own painted background (the first ancestor with one, from the answer's label), within 40
// of the hex, polled for 900 ms after the tap (a colour may fade in).
//
//   node grade-editor.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--home <dir>]
// --home: the HOME the app's backend was made under (default <round-root>/home): a backend lives in ~/.noodl/backends.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { kitTarball, hasTarball } from '../own-018/kit-tarball.mjs';
// OWN-019 s7 (NODE20): the grader talks CDP over Node's global WebSocket (Node ≥ 22). A lane started from a shell
// whose PATH found /usr/local/bin/node (v20) graded nothing: say so before a preview starts.
if (typeof WebSocket === 'undefined') throw new Error(`this grader needs Node 22 or later (a global WebSocket); this is Node ${process.version} at ${process.execPath}`);

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const target = path.resolve(argv[0] || '');
const TGZ = path.resolve(opt('--tgz', ''));
if (!argv[0] || !hasTarball(TGZ, 'nodegx-preview')) throw new Error('usage: node grade-editor.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--home <dir>]');
const findApp = (dir, depth = 0) => {
  if (fs.existsSync(path.join(dir, 'nodegx.project.json'))) return dir;
  if (depth > 3) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || ['home', 'node_modules', 'grade', 'calls'].includes(e.name) || e.name.startsWith('.')) continue;
    const hit = findApp(path.join(dir, e.name), depth + 1);
    if (hit) return hit;
  }
  return null;
};
const ROUND_APP = findApp(target);
if (!ROUND_APP) throw new Error(`no nodegx.project.json under ${target}`);
const ROUND_HOME = path.resolve(opt('--home', path.join(target, 'home')));
const OUT = path.resolve(opt('--out', path.join(fs.existsSync(path.join(target, 'work')) ? target : ROUND_APP, 'grade')));
fs.mkdirSync(OUT, { recursive: true });
const LABHOME = fs.mkdtempSync(path.join(OUT, 'home-'));
// 🔴 The grade SAVES an edit — into the app's backend, on disk. Graded in place, the round's own data became the
// grader's ("Europe Quiz"), and a second grade found no Portugal to edit (E1/SE1, s4). So every grade works on a COPY
// of the app and of the backends under the round's HOME (their config holds no absolute path), made fresh each time.
const APP = path.join(LABHOME, 'app', path.basename(ROUND_APP));
fs.cpSync(ROUND_APP, APP, { recursive: true, filter: (s) => !/[\\/](\.previews|grade|node_modules[\\/]\.cache)([\\/]|$)/.test(s) });
const ROUNDHOME = path.join(LABHOME, 'roundhome');
if (fs.existsSync(path.join(ROUND_HOME, '.noodl', 'backends'))) fs.cpSync(path.join(ROUND_HOME, '.noodl', 'backends'), path.join(ROUNDHOME, '.noodl', 'backends'), { recursive: true });
// 🔴 The copy keeps the round's port, and the gallery keeps the round's backend alive ON that port (s5): the copy's
// backend could not bind, provision answered "exited before becoming ready", the grade went on, and the preview
// saved "Europe Quiz" into the GALLERY's backend — 13/13 against the wrong database, its restart a restart of
// nothing. So the copy gets a port of its own (config and the app's endpoint), and a backend that does not start
// stops the grade.
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
{
  const dir = path.join(ROUNDHOME, '.noodl', 'backends');
  const projectFile = path.join(APP, 'nodegx.project.json');
  for (const id of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const f = path.join(dir, id, 'config.json');
    if (!fs.existsSync(f)) continue;
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    const port = await freePort();
    const project = fs.readFileSync(projectFile, 'utf8');
    if (project.includes(`"instanceId": "${id}"`) || project.includes(`"instanceId":"${id}"`)) {
      fs.writeFileSync(projectFile, project.split(`127.0.0.1:${c.port}`).join(`127.0.0.1:${port}`).split(`localhost:${c.port}`).join(`localhost:${port}`));
    }
    fs.writeFileSync(f, JSON.stringify({ ...c, port }, null, 2) + '\n');
  }
}
const cleanEnv = (home) => {
  const env = { ...process.env, HOME: home, npm_config_cache: path.join(LABHOME, '.npm'), TMPDIR: LABHOME };
  for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
  return env;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }));
const CHECK_NAMES = ['editbutton', 'loads', 'saved', 'plays', 'shared', 'question', 'order', 'seconds', 'rightanswer', 'rightcolour', 'wrongcolour', 'unchanged', 'restart'];
const checks = {};
const check = (name, ok, data = {}) => { checks[name] = { ok: !!ok, ...data }; say(`check ${name}`, checks[name]); return ok; };
const observed = {};
const RIGHT = [37, 99, 235];
const WRONG = [249, 115, 22];
const near = (c, h) => !!c && Math.hypot(c[0] - h[0], c[1] - h[1], c[2] - h[2]) < 40;

// ---------------------------------------------------------------- the backend, if the app has one
const projectText = () => fs.readFileSync(path.join(APP, 'nodegx.project.json'), 'utf8');
const loopback = () => /https?:\/\/(127\.0\.0\.1|localhost):\d+/.test(projectText());
const mcpRequire = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../packages/noodl-mcp/package.json'));
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
let mcp = null;
const startBackend = async () => {
  if (!loopback()) return { backend: false };
  const configs = [];
  const dir = path.join(ROUNDHOME, '.noodl', 'backends');
  for (const id of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    for (const f of ['config.json', 'backend.json']) {
      try { configs.push({ id, ...JSON.parse(fs.readFileSync(path.join(dir, id, f), 'utf8')) }); } catch {}
    }
  }
  const instance = (projectText().match(/"instanceId"\s*:\s*"([^"]+)"/) || [])[1];
  const mine = configs.find((c) => c.id === instance) || configs[0];
  if (!mine?.name) return { backend: true, started: false, why: `no backend config for ${instance} under ${dir}` };
  const transport = new StdioClientTransport({ command: 'npx', args: ['-y', `--package=${kitTarball(TGZ, 'nodegx-mcp')}`, 'noodl-mcp', APP, '--allow-writes'], cwd: LABHOME, env: cleanEnv(ROUNDHOME), stderr: 'ignore' });
  mcp = new Client({ name: 'own019-grade-editor', version: '0' });
  await mcp.connect(transport);
  const r = await mcp.callTool({ name: 'call_tool', arguments: { name: 'provision_backend', arguments: { name: mine.name } } }, undefined, { timeout: 180000 });
  const text = (r.content || []).map((c) => c.text).join('');
  return { backend: true, started: /"provisioned"\s*:\s*true|"endpoint"/.test(text), name: mine.name, answer: text.slice(0, 300) };
};
const stopBackend = async () => { if (mcp) { try { await mcp.close(); } catch {} mcp = null; await sleep(1500); } };

// ---------------------------------------------------------------- the preview
let preview = null;
const startPreview = async () => {
  preview = spawn('npx', ['-y', `--package=${kitTarball(TGZ, 'nodegx-preview')}`, 'noodl-preview', APP, '--port', '0', '--no-watch'], { env: cleanEnv(LABHOME), cwd: LABHOME, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`preview printed no URL in 120 s: ${log.slice(-600)}`)), 120000);
    const on = (d) => { log += d; const m = log.match(/http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?/); if (m) { clearTimeout(t); resolve(m[0]); } };
    preview.stdout.on('data', on);
    preview.stderr.on('data', on);
  });
};
const stopPreview = async () => { if (preview) { preview.kill(); preview = null; await sleep(800); } };

// ---------------------------------------------------------------- a browser (each call: a fresh profile)
const LIB = String.raw`
const shown = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) <= 0.05) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const own = (e) => norm([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''));
const leaves = (re) => [...document.querySelectorAll('body *')].filter((e) => !e.closest('script,style,select,option') && re.test(own(e)) && shown(e));
const outer = (leaf) => { let b = leaf; while (b.parentElement && b.parentElement !== document.body && norm(b.parentElement.textContent) === norm(leaf.textContent)) b = b.parentElement; return b; };
const exact = (s) => new RegExp('^' + s.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&') + '$', 'i');
const at = (el) => {
  const pre = el.getBoundingClientRect();
  if (pre.top < 0 || pre.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { x, y, top: r.top, left: r.left, lands: !!hit && (el.contains(hit) || hit.contains(el) || (hit.tagName === 'LABEL' && hit.control === el) || (el.tagName === 'LABEL' && el.control === hit)) };
};
const seen = (re) => leaves(re).length > 0 || re.test(norm(document.body.innerText || '')) && [...document.querySelectorAll('body *')].some((e) => shown(e) && re.test(norm(e.innerText || '')) && ![...e.children].some((k) => re.test(norm(k.innerText || ''))));
const fields = () => [...document.querySelectorAll('input, textarea')].filter((e) => !/^(hidden|button|submit|file|reset|image)$/i.test(e.type || '') && e.getBoundingClientRect().width > 0 && shown(e.parentElement || e));
const byValue = (v) => fields().find((e) => !/^(checkbox|radio)$/i.test(e.type) && e.value.trim().toLowerCase() === String(v).toLowerCase());
const labelOf = (e) => {
  const bits = [e.placeholder, e.getAttribute('aria-label'), e.name, e.id];
  if (e.labels) for (const l of e.labels) bits.push(l.textContent);
  const r = e.getBoundingClientRect();
  for (const l of leaves(/\S/)) { const lr = l.getBoundingClientRect(); if ((lr.bottom <= r.top + 2 && r.top - lr.bottom < 36 && lr.left < r.right && lr.right > r.left) || (Math.abs((lr.top + lr.bottom) / 2 - (r.top + r.bottom) / 2) < 14 && lr.right <= r.left + 2 && r.left - lr.right < 200)) bits.push(own(l)); }
  return bits.filter(Boolean).join(' | ');
};
const paint = (el) => { for (let x = el, i = 0; x && i < 6 && x !== document.body; x = x.parentElement, i++) { const c = getComputedStyle(x).backgroundColor.match(/[\d.]+/g)?.map(Number); if (c && (c[3] ?? 1) > 0.1) return c.slice(0, 3); } return null; };
`;
const openBrowser = async (url, label) => {
  const profile = fs.mkdtempSync(path.join(OUT, `chrome-${label}-`));
  const port = 59600 + Math.floor(Math.random() * 300);
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', 'about:blank'], { stdio: 'ignore' });
  let pageTarget;
  for (let i = 0; i < 60 && !pageTarget; i++) { await sleep(250); try { pageTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pend = {};
  const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; return; }
    if (d.method === 'Runtime.exceptionThrown') errors.push(String(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text).slice(0, 300));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  const page = (expr) => ev(`(() => { ${LIB}; return (${expr}); })()`);
  // A press is held 100 ms, as a finger is: pressed and released in the same instant, a button's focus-scroll lands on
// top of the smooth scroll its click started and cancels it (L1, s4: "Join the waitlist" stopped 2–201 px down; held
// 120 ms, or tapped by touch, it reaches the form) — a fault no person can make.
const press = async (b) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(100);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
};
  const waitFor = async (fn, ms, poll = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await sleep(poll); } return null; };
  const seen = (re) => page(`seen(${re})`);
  const shot = async (name) => fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  await waitFor(() => page(`leaves(/\\S/).length > 1`), 30000);
  await sleep(1200);
  const close = async () => { const gone = new Promise((r) => chrome.once('exit', r)); chrome.kill(); await Promise.race([gone, sleep(4000)]); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
  return { send, ev, page, press, waitFor, seen, shot, close, errors };
};
const pressText = async (b, re) => { const p = await b.page(`(() => { const l = leaves(${re})[0]; return l ? at(outer(l)) : null; })()`); if (!p) return null; await b.press(p); return p; };
// Type into a field found by an expression over the page library (it must return the element).
const typeField = async (b, finder, value) => {
  const p = await b.page(`(() => { const e = ${finder}; return e ? { ...at(e), type: e.type } : null; })()`);
  if (!p) return { ok: false, why: 'not found' };
  if (p.type === 'color') {
    // A colour picker: set it as a person's pick would arrive (input + change).
    const v = await b.page(`(() => { const e = ${finder}; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return e.value; })()`);
    return { ok: v.toLowerCase() === value.toLowerCase(), how: 'color-input', value: v };
  }
  await b.press(p);
  await b.page(`(() => { const e = ${finder}; e.focus(); e.select && e.select(); return true; })()`);
  await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await b.send('Input.insertText', { text: value });
  await sleep(300);
  return { ok: true, lands: p.lands };
};
// Play: the start screen's title, then Start → question 1.
const startQuiz = async (b) => {
  const st = await pressText(b, '/^start( quiz)?$/i');
  if (!st) return { started: false };
  const q = await b.waitFor(() => b.seen('/what is the capital of/i'), 4000);
  return { started: q !== null };
};
const bgOf = (b, name) => b.page(`(() => { const l = leaves(exact(${JSON.stringify(name)}))[0]; return l ? paint(l) : null; })()`);
const pollBg = async (b, name, want) => { let c = null; const t0 = Date.now(); while (Date.now() - t0 < 900) { c = await bgOf(b, name); if (near(c, want)) return { ok: true, rgb: c, ms: Date.now() - t0 }; await sleep(60); } return { ok: false, rgb: c }; };

let fatal = null;
const found = {};
try {
  observed.backend = await startBackend();
  say('backend', observed.backend);
  if (observed.backend.backend && !observed.backend.started) throw new Error(`the app's backend did not start: ${observed.backend.why ?? observed.backend.answer}`);
  let url = await startPreview();
  say('preview', { url });

  // ---- browser A: the editor
  const A = await openBrowser(url, 'a');
  await A.shot('1-start');
  const titleBefore = await A.seen('/capital quiz/i');
  const ed = await pressText(A, '/^edit( the)? quiz$/i');
  check('editbutton', !!ed?.lands, { found: !!ed, lands: ed?.lands ?? null, titleBefore });
  if (!ed) throw new Error('no "Edit quiz" on the start screen');
  const loaded = await A.waitFor(() => A.page(`!!byValue('What is the capital of Portugal?')`), 5000);
  await sleep(500);
  await A.shot('2-editor');
  const today = await A.page(`({ q1: !!byValue('What is the capital of Portugal?'), answers: ['Lisbon', 'Porto', 'Coimbra'].map((a) => !!byValue(a)), seconds: !!byValue('10'), title: !!byValue('Capital Quiz'), fields: fields().map((e) => ({ type: e.type, value: e.value.slice(0, 40), label: labelOf(e).slice(0, 60) })) })`);
  found.editorFields = today.fields;
  check('loads', loaded !== null && today.q1 && today.answers.every(Boolean) && today.seconds && today.title, { q1: today.q1, answers: today.answers, seconds: today.seconds, title: today.title, ms: loaded });
  if (loaded === null) throw new Error('the editor never showed question 1 in a field');

  // Make the edits. Answers first (by the value each shows), then the right-answer marker in question 1's block.
  const typed = {};
  typed.title = await typeField(A, `byValue('Capital Quiz')`, 'Europe Quiz');
  typed.q1 = await typeField(A, `byValue('What is the capital of Portugal?')`, 'What is the capital of Spain?');
  typed.a1 = await typeField(A, `byValue('Lisbon')`, 'Seville');
  typed.a2 = await typeField(A, `byValue('Porto')`, 'Madrid');
  typed.a3 = await typeField(A, `byValue('Coimbra')`, 'Valencia');
  typed.seconds = await typeField(A, `byValue('10')`, '15');
  // Colours: the hex fields (or colour pickers), told apart by their labels; else the first is the right one.
  const colourFields = await A.page(`fields().filter((e) => e.type === 'color' || /^#?[0-9a-f]{6}$/i.test(e.value.trim())).map((e, i) => ({ i, label: labelOf(e) }))`);
  found.colourFields = colourFields;
  const which = (re) => colourFields.find((c) => re.test(c.label));
  const rightF = which(/right|correct/i) || colourFields[0];
  const wrongF = which(/wrong|incorrect/i) || colourFields.find((c) => c !== rightF);
  const nth = (i) => `fields().filter((e) => e.type === 'color' || /^#?[0-9a-f]{6}$/i.test(e.value.trim()))[${i}]`;
  // Read both before typing either: typing the first changes what the filter finds second only if the value stops
  // looking like a hex, which #2563eb does not.
  typed.right = rightF ? await typeField(A, nth(rightF.i), '#2563eb') : { ok: false, why: 'no colour field' };
  typed.wrong = wrongF ? await typeField(A, nth(wrongF.i), '#f97316') : { ok: false, why: 'no second colour field' };
  // The right answer of question 1: whatever the editor offers in question 1's block.
  const mark = await A.page(`(() => {
    const q = byValue('What is the capital of Spain?'), as = ['Seville', 'Madrid', 'Valencia'].map(byValue);
    if (!q || as.some((a) => !a)) return { how: null, why: 'question 1 block not found after typing' };
    let block = q; while (block && !as.every((a) => block.contains(a))) block = block.parentElement;
    if (!block) return { how: null, why: 'no common block' };
    // Grow the block while it still holds no other question's field (a marker may sit beside the answers).
    while (block.parentElement && block.parentElement !== document.body && !fields().some((f) => f !== q && !as.includes(f) && /\\?$/.test(f.value.trim()) && block.parentElement.contains(f))) block = block.parentElement;
    const inBlock = (sel) => [...block.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0 || e.type === 'radio' || e.type === 'checkbox');
    const radios = inBlock('input[type=radio], [role=radio]');
    if (radios.length >= 3) return { how: 'radio', ...at(radios[1].type === 'radio' && radios[1].labels?.[0] && radios[1].getBoundingClientRect().width < 2 ? radios[1].labels[0] : radios[1]) };
    const sel = inBlock('select')[0];
    if (sel) { const o = [...sel.options].find((o) => /madrid|^2$|^b$|second/i.test(o.textContent.trim()) || o.value === '1' && sel.options.length === 3); if (o) { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, o.value); sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); return { how: 'select', chosen: o.textContent.trim() }; } }
    const other = fields().filter((f) => block.contains(f) && f !== q && !as.includes(f) && !/^(checkbox|radio|color)$/.test(f.type));
    const holds = other.find((f) => /^(lisbon|1|a|0)$/i.test(f.value.trim()));
    if (holds) return { how: 'field', value: holds.value.trim(), ...at(holds) };
    const boxes = inBlock('input[type=checkbox], [role=checkbox], [role=switch]');
    if (boxes.length >= 3) return { how: 'checkbox', ...at(boxes[1]), first: at(boxes[0]), firstOn: !!(boxes[0].checked || boxes[0].getAttribute('aria-checked') === 'true') };
    const marks = leaves(/^(right|correct|✓|✔|☆|★|○|●|◯|set as right|mark (as )?right|mark correct)$/i).filter((l) => block.contains(l)).map(outer);
    if (marks.length >= 3) return { how: 'press', ...at(marks[1]) };
    return { how: null, why: 'no radio, select, field, checkbox or pressable marker in question 1', block: block.innerText.slice(0, 200) };
  })()`);
  if (mark.how === 'radio' || mark.how === 'press') { await A.press(mark); await sleep(300); }
  if (mark.how === 'checkbox') { if (mark.firstOn) { await A.press(mark.first); await sleep(200); } await A.press(mark); await sleep(300); }
  if (mark.how === 'field') {
    const v = /^(lisbon)$/i.test(mark.value) ? 'Madrid' : /^1$/.test(mark.value) ? '2' : /^0$/.test(mark.value) ? '1' : 'B';
    typed.mark = await typeField(A, `fields().find((f) => f.value.trim() === ${JSON.stringify(mark.value)} && !['Seville','Madrid','Valencia'].includes(f.value.trim()))`, v);
  }
  found.mark = { how: mark.how, why: mark.why, chosen: mark.chosen, value: mark.value };
  found.typed = typed;
  await A.shot('3-edited');
  const sv = await pressText(A, '/^(save|save changes|save quiz)$/i');
  const savedMs = sv ? await A.waitFor(() => A.seen('/\\bsaved\\b/i'), 5000) : null;
  await A.shot('4-saved');
  check('saved', !!sv && savedMs !== null, { pressed: !!sv, lands: sv?.lands ?? null, ms: savedMs });
  await sleep(1000);
  // Back to the quiz's own start screen in the same browser — not a reload of the editor, where the new title sits in a
  // field and is never text on the page (SE1's first grade read that as "not played").
  await A.send('Page.navigate', { url });
  await sleep(2500);
  const plays = await A.seen('/europe quiz/i');
  check('plays', plays, { titleAfterReload: plays });
  observed.errorsA = A.errors.slice(0, 5);
  await A.close();

  // ---- browser B: another browser, nothing in its storage
  const B = await openBrowser(url, 'b');
  await B.shot('5-other-browser');
  check('shared', await B.seen('/europe quiz/i'), { capitalQuizStill: await B.seen('/capital quiz/i') });
  const st = await startQuiz(B);
  const q1 = await B.seen('/what is the capital of spain\\?/i');
  await B.shot('6-question1');
  check('question', st.started && q1, { started: st.started, portugalStill: await B.seen('/capital of portugal/i') });
  const order = await B.page(`['Seville', 'Madrid', 'Valencia'].map((n) => { const l = leaves(exact(n))[0]; if (!l) return null; const r = l.getBoundingClientRect(); return { n, top: Math.round(r.top), left: Math.round(r.left) }; })`);
  const inOrder = order.every(Boolean) && order.every((o, i) => i === 0 || o.top > order[i - 1].top + 2 || (Math.abs(o.top - order[i - 1].top) <= 2 && o.left > order[i - 1].left));
  check('order', inOrder, { order });
  const secs = await B.page(`leaves(/^(\\d{1,2})( ?s| seconds?)?$/i).map((l) => own(l))`);
  check('seconds', secs.some((t) => /^15/.test(t)), { countdown: secs.slice(0, 4) });
  await pressText(B, `/^madrid$/i`);
  const madrid = await pollBg(B, 'Madrid', RIGHT);
  await B.shot('7-madrid');
  check('rightanswer', madrid.ok && !near(madrid.rgb, WRONG), madrid);
  const q2 = await B.waitFor(() => B.seen('/what is the capital of australia\\?/i'), 5000);
  // The question's words can land a moment before its answer buttons (E1, SE1: text shown, no Sydney yet) — wait for
  // the answers too, then tap.
  await B.waitFor(() => B.page(`['Sydney', 'Canberra', 'Melbourne'].every((n) => leaves(exact(n)).length > 0)`), 3000);
  await sleep(200);
  const q2answers = await B.page(`['Sydney', 'Canberra', 'Melbourne'].map((n) => leaves(exact(n)).length > 0)`);
  check('unchanged', q2 !== null && q2answers.every(Boolean), { q2: q2 !== null, answers: q2answers });
  await pressText(B, `/^sydney$/i`);
  const sydney = await pollBg(B, 'Sydney', WRONG);
  const canberra = await pollBg(B, 'Canberra', RIGHT);
  await B.shot('8-sydney');
  check('rightcolour', canberra.ok, { canberra });
  check('wrongcolour', sydney.ok, { sydney });
  observed.errorsB = B.errors.slice(0, 5);
  await B.close();

  // ---- everything stopped and started again; browser C
  await stopPreview();
  await stopBackend();
  observed.backendAgain = await startBackend();
  if (observed.backendAgain.backend && !observed.backendAgain.started) throw new Error(`the app's backend did not start again: ${observed.backendAgain.why ?? observed.backendAgain.answer}`);
  url = await startPreview();
  const C = await openBrowser(url, 'c');
  const title = await C.seen('/europe quiz/i');
  const st2 = await startQuiz(C);
  const spain = await C.seen('/what is the capital of spain\\?/i');
  await C.shot('9-after-restart');
  check('restart', title && st2.started && spain, { title, started: st2.started, spain });
  await C.close();
} catch (e) {
  fatal = String(e.message || e);
  say('stopped', { why: fatal });
}
observed.found = found;
for (const n of CHECK_NAMES) if (!checks[n]) checks[n] = { ok: false, notReached: true };
await stopPreview();
await stopBackend();
const passed = CHECK_NAMES.filter((n) => checks[n].ok).length;
const result = { app: ROUND_APP, gradedCopy: true, at: new Date().toISOString(), score: `${passed}/${CHECK_NAMES.length}`, passed, stopped: fatal, checks, observed };
fs.writeFileSync(path.join(OUT, 'grade.json'), JSON.stringify(result, null, 2) + '\n');
try { fs.rmSync(LABHOME, { recursive: true, force: true }); } catch {}
console.log(`\nSCORE ${result.score}  ${CHECK_NAMES.map((n) => `${checks[n].ok ? '✓' : '✗'}${n}`).join(' ')}${fatal ? `  (stopped: ${fatal})` : ''}`);
console.log(`FOUND ${JSON.stringify({ backend: observed.backend, mark: found.mark, colourFields: found.colourFields })}`);
process.exit(passed === CHECK_NAMES.length ? 0 : 1);
