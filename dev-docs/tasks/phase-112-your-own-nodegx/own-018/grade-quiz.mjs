// OWN-018 §13: the grader for "Capital Quiz" (sentence-quiz.txt). It plays one fixed pattern in headless Chrome over the
// PACKED preview (the person's `npx @nodegx/preview <app>`), at phone size, reading only what a person sees, and audits
// the graph on disk. No API spend.
//
// The play (each check pass/fail; a check whose step was never reached fails):
//   start   Start screen: "Capital Quiz" and a Start button a press lands on (elementFromPoint at its centre)
//   order   Every question shows "Question n of 5", its question, and the three answers in the brief's order
//   timer   A number ≤ 10 on question 1 that goes down while nobody touches anything
//   green   Lisbon (right) → the Lisbon button turns green (pixels of the button, sampled ~300 ms after the press)
//   advance The next question appears 0.4–3 s after the press ("after about a second")
//   red     Sydney (wrong) → Sydney turns red AND Canberra turns green
//   timeout Question 4 left alone → question 5 appears 8.5–14 s later
//   score   Ottawa right, Bern right → "You scored 3 out of 5"
//   best    the same screen says "Best: 3 out of 5"
//   again   Play again → "Question 1 of 5"; an all-wrong run → "You scored 0 out of 5" (the score went back to 0)
//   keep    that screen still says "Best: 3 out of 5" (a worse run doesn't lower it)
//   reload  after a page reload, "Best: 3 out of 5" is still what the app says (on the start screen, or after another
//           all-wrong run if the app only shows it on the results)
// A press is a real CDP mouse press at the element's centre. Colours are read from a screenshot of the answer's box,
// not from CSS: a share of green / red pixels against the same box before the press.
//
// The audit (reported, not scored): node-type census, list nodes, custom components and their Component Inputs,
// Timer/Repeat nodes, JavaScript nodes and what their code calls (setInterval, setTimeout, localStorage), how the
// answers reach the screen (where "Coimbra" is written), storage nodes, and validate_project through the packed MCP.
//
//   node grade-quiz.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--no-audit]
// Writes <out>/grade.json and screenshots; prints the checks. Exit 0 when every check passes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const target = path.resolve(argv[0] || '');
const TGZ = path.resolve(opt('--tgz', ''));
if (!argv[0] || !fs.existsSync(path.join(TGZ, 'nodegx-preview-0.2.0.tgz'))) throw new Error('usage: node grade-quiz.mjs <round-root | app-dir> --tgz <tgz-dir> [--out <dir>] [--no-audit]');

// The app: the folder that holds nodegx.project.json (a round root has it under work/apps/<name>/).
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

const QUESTIONS = [
  { q: /capital of Portugal/i, answers: ['Lisbon', 'Porto', 'Coimbra'], right: 'Lisbon' },
  { q: /capital of Australia/i, answers: ['Sydney', 'Canberra', 'Melbourne'], right: 'Canberra' },
  { q: /capital of Canada/i, answers: ['Toronto', 'Vancouver', 'Ottawa'], right: 'Ottawa' },
  { q: /capital of Morocco/i, answers: ['Rabat', 'Casablanca', 'Marrakesh'], right: 'Rabat' },
  { q: /capital of Switzerland/i, answers: ['Zurich', 'Geneva', 'Bern'], right: 'Bern' }
];
const WRONG = ['Porto', 'Sydney', 'Toronto', 'Casablanca', 'Zurich'];

const checks = {};
const CHECK_NAMES = ['start', 'order', 'timer', 'green', 'advance', 'red', 'timeout', 'score', 'best', 'again', 'keep', 'reload'];
const check = (name, ok, data = {}) => { checks[name] = { ok: !!ok, ...data }; say(`check ${name}`, checks[name]); return ok; };

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
const bodyText = () => ev('document.body.innerText');
const waitText = async (re, ms) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await bodyText())) return Date.now() - t0; await sleep(100); }
  return null;
};
const shot = async (name) => fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));

// The box a person sees for a piece of text: the visible leaf whose own text matches, widened to the outermost
// ancestor that holds no other text (the answer's button). Returns its rect and whether a press at its centre lands.
const BOX = `(re) => {
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const leaf = [...document.querySelectorAll('body *')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && re.test(n.textContent.trim())) && visible(e) && re.test(e.textContent.trim()));
  if (!leaf) return null;
  let box = leaf;
  while (box.parentElement && box.parentElement !== document.body && box.parentElement.textContent.trim() === leaf.textContent.trim()) box = box.parentElement;
  const r = box.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { text: leaf.textContent.trim(), x, y, left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height, vtop: r.top, vleft: r.left, lands: !!hit && (box.contains(hit) || hit.contains(box)) };
}`;
const exact = (s) => `new RegExp(${JSON.stringify('^(?:[A-C1-3][.):]\\s*)?' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')}, 'i')`;
const box = (reSrc) => ev(`(${BOX})(${reSrc})`);
const press = async (b) => {
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
};
// Share of green and red pixels in a box, from a screenshot of it.
const colours = async (b) => {
  if (!b) return null;
  const clip = { x: b.left + 2, y: b.top + 2, width: Math.max(4, b.width - 4), height: Math.max(4, b.height - 4), scale: 1 };
  const png = (await send('Page.captureScreenshot', { format: 'png', clip })).result?.data;
  if (!png) return null;
  return ev(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${png}'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    let green = 0, red = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gg = d[i + 1] / 255, bb = d[i + 2] / 255, mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb), l = (mx + mn) / 2;
      n++;
      if (mx === mn) continue;
      const s = l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
      let h = mx === r ? (gg - bb) / (mx - mn) + (gg < bb ? 6 : 0) : mx === gg ? (bb - r) / (mx - mn) + 2 : (r - gg) / (mx - mn) + 4; h *= 60;
      if (s < 0.3 || l < 0.15 || l > 0.96) continue;
      if (h >= 75 && h <= 165) green++; else if (h <= 15 || h >= 340) red++;
    }
    return { green: +(green / n).toFixed(3), red: +(red / n).toFixed(3) };
  })()`);
};
const turned = (before, after, hue) => !!after && after[hue] >= 0.08 && after[hue] - (before?.[hue] || 0) >= 0.06;

// Numbers on screen that could be the countdown: visible leaves holding a number ≤ 10 that isn't "n of 5".
const NUMBERS = `(() => { window.__nums = [...document.querySelectorAll('body *')].filter((e) => { const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(); const r = e.getBoundingClientRect(); return t && r.width > 0 && /\\d/.test(t) && !/of\\s*5/i.test(e.textContent) && t.length < 24; }).map((e) => ({ e, t: e.textContent.trim() })); return window.__nums.map((o) => o.t); })()`;
const NUMBERS_AGAIN = `window.__nums.map((o) => ({ was: o.t, now: o.e.isConnected ? o.e.textContent.trim() : null }))`;
const num = (t) => { const m = String(t ?? '').match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };

// Answer one question by pressing `answer`; returns timings and colours. Waits for the next screen.
const answerQuestion = async (index, answer, { sample = [] } = {}) => {
  const b = await box(exact(answer));
  if (!b) return { pressed: false, why: `no "${answer}" on screen; it reads: ${(await bodyText()).replace(/\s+/g, ' ').slice(0, 160)}`, before: {}, after: {}, advancedMs: null };
  const before = {};
  for (const s of sample) before[s] = await colours(await box(exact(s)));
  const t0 = Date.now();
  await press(b);
  await sleep(300);
  const after = {};
  for (const s of sample) after[s] = await colours(await box(exact(s)));
  const nextRe = index < 4 ? new RegExp(`Question\\s*${index + 2}\\s*(of|/)\\s*5`, 'i') : /scored\s*\d+\s*(out of|\/)\s*5/i;
  const waited = await waitText(nextRe, 6000);
  return { pressed: true, lands: b.lands, before, after, advancedMs: waited === null ? null : Date.now() - t0 };
};

const readQuestion = async (index) => {
  const text = await bodyText();
  const qn = new RegExp(`Question\\s*${index + 1}\\s*(of|/)\\s*5`, 'i').test(text);
  const qt = QUESTIONS[index].q.test(text);
  const boxes = [];
  for (const a of QUESTIONS[index].answers) boxes.push(await box(exact(a)));
  const present = boxes.every(Boolean);
  const inOrder = present && boxes.every((b, i) => i === 0 || b.vtop > boxes[i - 1].vtop + 2 || (Math.abs(b.vtop - boxes[i - 1].vtop) <= 2 && b.vleft > boxes[i - 1].vleft));
  return { index: index + 1, numbered: qn, question: qt, answersPresent: present, inOrder, lands: boxes.every((b) => b?.lands) };
};

const playRun = async (answers) => {
  for (let i = 0; i < 5; i++) {
    await sleep(400); // a person reads the question before tapping; a press in the first instant can land mid-change
    const r = await answerQuestion(i, answers[i]);
    if (!r.pressed || r.advancedMs === null) return { ok: false, at: i + 1, ...r };
  }
  return { ok: true };
};

let fatal = null;
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  // A fresh browser profile: no best score from an earlier grade.
  const loaded = await waitText(/Capital Quiz/i, 30000);
  await sleep(800);
  await shot('1-start');
  const start = await box(`/^(start|start quiz|start game|play|begin)$/i`);
  check('start', loaded !== null && start?.lands, { title: loaded !== null, startButton: start?.text ?? null, lands: start?.lands ?? null });
  if (!start) throw new Error('no Start button');
  await press(start);
  const q1 = await waitText(/Question\s*1\s*(of|\/)\s*5/i, 5000);
  if (q1 === null) throw new Error('"Question 1 of 5" never appeared after Start');
  await sleep(200);
  await shot('2-question1');
  const order = [await readQuestion(0)];

  // timer: numbers on screen now and 2.2 s later, nobody touching anything
  const nums0 = await ev(NUMBERS);
  await sleep(2200);
  const nums1 = await ev(NUMBERS_AGAIN);
  const falling = nums1.filter((o) => num(o.was) !== null && num(o.was) <= 10 && num(o.now) !== null && num(o.now) < num(o.was) && num(o.was) - num(o.now) <= 3.5);
  check('timer', falling.length > 0, { seen: nums0.slice(0, 8), after: nums1.slice(0, 8), falling });

  // Q1: Lisbon, right
  const a1 = await answerQuestion(0, 'Lisbon', { sample: ['Lisbon'] });
  check('green', a1.pressed && a1.lands && turned(a1.before.Lisbon, a1.after.Lisbon, 'green'), { lands: a1.lands, before: a1.before.Lisbon, after: a1.after.Lisbon, why: a1.why });
  check('advance', a1.advancedMs !== null && a1.advancedMs >= 400 && a1.advancedMs <= 3000, { advancedMs: a1.advancedMs });
  if (a1.advancedMs === null) throw new Error(a1.why || 'question 2 never appeared after Lisbon');
  await sleep(150);

  // Q2: Sydney, wrong
  order.push(await readQuestion(1));
  const a2 = await answerQuestion(1, 'Sydney', { sample: ['Sydney', 'Canberra', 'Melbourne'] });
  await shot('3-question2-after');
  check('red', a2.pressed && turned(a2.before.Sydney, a2.after.Sydney, 'red') && turned(a2.before.Canberra, a2.after.Canberra, 'green'),
    { sydney: [a2.before.Sydney, a2.after.Sydney], canberra: [a2.before.Canberra, a2.after.Canberra], melbourne: a2.after.Melbourne });
  if (a2.advancedMs === null) throw new Error('question 3 never appeared after Sydney');
  await sleep(150);

  // Q3: Ottawa, right
  order.push(await readQuestion(2));
  const a3 = await answerQuestion(2, 'Ottawa');
  if (a3.advancedMs === null) throw new Error('question 4 never appeared after Ottawa');
  await sleep(150);

  // Q4: left alone
  order.push(await readQuestion(3));
  const t4 = Date.now();
  const q5 = await waitText(/Question\s*5\s*(of|\/)\s*5/i, 16000);
  check('timeout', q5 !== null && Date.now() - t4 >= 8500 && Date.now() - t4 <= 14500, { advancedMs: q5 === null ? null : Date.now() - t4 });
  if (q5 === null) throw new Error('question 5 never appeared when question 4 was left alone');
  await sleep(150);

  // Q5: Bern, right → results
  order.push(await readQuestion(4));
  check('order', order.every((o) => o.numbered && o.question && o.answersPresent && o.inOrder), { questions: order });
  const a5 = await answerQuestion(4, 'Bern');
  await sleep(400);
  await shot('4-results');
  const r1 = await bodyText();
  check('score', /scored\s*3\s*(out of|\/)\s*5/i.test(r1), { text: r1.replace(/\s+/g, ' ').slice(0, 200), advancedMs: a5.advancedMs });
  check('best', /Best\s*:?\s*3\s*(out of|\/)\s*5/i.test(r1), {});

  // Play again → all wrong
  const again = await box(`/^(play again|restart|try again)$/i`);
  if (!again) throw new Error('no Play again button');
  await press(again);
  const q1b = await waitText(/Question\s*1\s*(of|\/)\s*5/i, 5000);
  const run2 = q1b === null ? { ok: false, why: 'no Question 1 after Play again' } : await playRun(WRONG);
  await sleep(400);
  await shot('5-results-all-wrong');
  const r2 = await bodyText();
  check('again', q1b !== null && run2.ok && /scored\s*0\s*(out of|\/)\s*5/i.test(r2), { questionOneMs: q1b, run: run2, text: r2.replace(/\s+/g, ' ').slice(0, 200) });
  check('keep', /Best\s*:?\s*3\s*(out of|\/)\s*5/i.test(r2), {});

  // Reload
  await send('Page.reload', { ignoreCache: true });
  await waitText(/Capital Quiz/i, 30000);
  await sleep(800);
  await shot('6-after-reload');
  let r3 = await bodyText();
  let how = 'start screen';
  if (!/Best\s*:?\s*3\s*(out of|\/)\s*5/i.test(r3)) {
    how = 'after an all-wrong run';
    const s = await box(`/^(start|start quiz|start game|play|begin)$/i`);
    let run3 = { ok: false, why: 'no Start button after the reload' };
    if (s) {
      await press(s);
      run3 = (await waitText(/Question\s*1\s*(of|\/)\s*5/i, 5000)) !== null ? await playRun(WRONG) : { ok: false, why: 'no Question 1 after Start' };
      await sleep(400);
      r3 = await bodyText();
      await shot('7-results-after-reload');
    }
    if (!run3.ok) how += ` — the play did not reach the results (${JSON.stringify(run3).slice(0, 160)})`;
  }
  check('reload', /Best\s*:?\s*3\s*(out of|\/)\s*5/i.test(r3), { how, text: r3.replace(/\s+/g, ' ').slice(0, 200) });
} catch (e) {
  fatal = String(e.message || e);
  say('stopped', { why: fatal });
  try { await shot('x-stopped'); } catch {}
}
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
  const coimbra = [];
  const storage = [];
  for (const c of comps) {
    for (const n of c.nodes) {
      census[n.type] = (census[n.type] || 0) + 1;
      const params = JSON.stringify(n.parameters || {});
      if (/javascript|^Expression$|^Function$|Script/i.test(n.type)) js.push({ component: c.name, type: n.type, calls: ['setInterval', 'setTimeout', 'localStorage', 'Date.now'].filter((w) => params.includes(w)), chars: params.length });
      if (params.includes('Coimbra')) for (const [k, v] of Object.entries(n.parameters || {})) if (String(v).includes('Coimbra')) coimbra.push({ component: c.name, type: n.type, param: k, literal: String(v).trim() === 'Coimbra' });
      if (/stor|persist/i.test(n.type) || /persist/i.test(params)) storage.push({ component: c.name, type: n.type, params: Object.keys(n.parameters || {}).filter((k) => /persist|store|key|name/i.test(k)) });
    }
  }
  const custom = Object.keys(census).filter((t) => t.startsWith('/'));
  const withInputs = comps.filter((c) => c.nodes.some((n) => n.type === 'Component Inputs')).map((c) => c.name);
  audit = {
    components: comps.length,
    nodes: Object.values(census).reduce((a, b) => a + b, 0),
    census,
    list: { forEach: census['For Each'] || 0, repeater: census['Repeater'] || 0 },
    customComponentsPlaced: custom,
    componentsWithInputs: withInputs,
    timer: { Timer: census['Timer'] || 0, Repeat: census['Repeat'] || 0 },
    javascript: { count: js.length, nodes: js },
    answersWritten: coimbra,
    storage
  };
  // validate_project through the packed MCP, as the agent's own server would answer it (started read-only on the app).
  try {
    const mcpRequire = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../packages/noodl-mcp/package.json'));
    const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
    const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
    const transport = new StdioClientTransport({ command: 'npx', args: ['-y', `--package=${path.join(TGZ, 'nodegx-mcp-0.2.0.tgz')}`, 'noodl-mcp', APP], cwd: LABHOME, env, stderr: 'ignore' }); // read-only, bound to the app
    const client = new Client({ name: 'own018-grade', version: '0' });
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
const result = { app: APP, at: new Date().toISOString(), score: `${passed}/${CHECK_NAMES.length}`, passed, stopped: fatal, checks, pageErrors: errors.slice(0, 10), audit };
fs.writeFileSync(path.join(OUT, 'grade.json'), JSON.stringify(result, null, 2) + '\n');
for (const d of [profile, LABHOME]) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch {}
console.log(`\nSCORE ${result.score}  ${CHECK_NAMES.map((n) => `${checks[n].ok ? '✓' : '✗'}${n}`).join(' ')}${fatal ? `  (stopped: ${fatal})` : ''}`);
if (audit) console.log('AUDIT', JSON.stringify({ components: audit.components, nodes: audit.nodes, list: audit.list, custom: audit.customComponentsPlaced, inputs: audit.componentsWithInputs, timer: audit.timer, js: audit.javascript.count, jsCalls: audit.javascript.nodes.flatMap((n) => n.calls), answersWritten: audit.answersWritten.map((a) => `${a.type}.${a.param}${a.literal ? ' (literal)' : ''}`), storage: audit.storage.map((s) => s.type), validate: audit.validate }));
process.exit(passed === CHECK_NAMES.length ? 0 : 1);
