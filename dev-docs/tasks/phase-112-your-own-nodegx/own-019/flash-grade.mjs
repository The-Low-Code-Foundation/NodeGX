// AC3 / CARRYOVER, the painted-frame grade: plays Lisbon (right) → Sydney (wrong) → Ottawa (right) → Rabat (right) at
// phone size with every painted frame recorded (CDP screencast), and judges each frame by what a person would see:
//   a frame showing question k BEFORE its tap: no answer may be green or red;
//   a frame showing question k AFTER its tap: only the feedback for that tap (right tapped → it green; wrong tapped →
//   it red and the right one green). Anything else is a flash: colours that were never the person's answer.
// Which question a frame shows = a fingerprint of its question line, taken from a settled frame of each question.
//   node flash-grade.mjs <app-dir> <tgz-dir> <out-dir>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/Users/richardosborne/vscode_projects/OpenNoodl/package.json');
const sharp = require('sharp');
const [APP, TGZ, OUT] = process.argv.slice(2).map((p) => path.resolve(p));
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HOME = fs.mkdtempSync(path.join(OUT, 'home-'));
const env = { ...process.env, HOME, npm_config_cache: path.join(HOME, '.npm'), TMPDIR: HOME };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
const tgz = fs.readdirSync(TGZ).find((f) => /^nodegx-preview-\d/.test(f));
const preview = spawn('npx', ['-y', `--package=${path.join(TGZ, tgz)}`, 'noodl-preview', APP, '--port', '0', '--no-watch'], { env, cwd: HOME, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
const url = await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('no url ' + log.slice(-400))), 120000);
  const on = (d) => { log += d; const m = log.match(/http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?/); if (m) { clearTimeout(t); res(m[0]); } };
  preview.stdout.on('data', on); preview.stderr.on('data', on);
});
const port = 59000 + Math.floor(Math.random() * 300);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${fs.mkdtempSync(path.join(OUT, 'chrome-'))}`, '--no-first-run', '--use-mock-keychain', 'about:blank'], { stdio: 'ignore' });
const done = (code) => { chrome.kill(); preview.kill(); process.exit(code); };
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = {}; const frames = []; let recording = false;
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; return; }
  if (d.method === 'Page.screencastFrame') {
    if (recording) frames.push({ t: d.params.metadata.timestamp * 1000, data: d.params.data });
    ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: d.params.sessionId } }));
  }
};
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.enable');
await send('Page.navigate', { url });
// The grader's box: the visible leaf whose own text is exactly T, widened to the outermost ancestor holding no other text.
const BOX = (t) => `(() => { const re = new RegExp(${JSON.stringify('^(?:[A-C1-3][.):]\\s*)?' + t + '$')}, 'i');
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const leaf = [...document.querySelectorAll('body *')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && re.test(n.textContent.trim())) && vis(e));
  if (!leaf) return null; let b = leaf;
  while (b.parentElement && b.parentElement !== document.body && b.parentElement.textContent.trim() === leaf.textContent.trim()) b = b.parentElement;
  const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`;
const LINE = (re) => `(() => { const e = [...document.querySelectorAll('body *')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && ${re}.test(n.textContent))); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`;
const rectOf = (t) => ev(BOX(t));
const tap = async (t) => { const r = await rectOf(t); for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r.x + r.w / 2, y: r.y + r.h / 2, button: 'left', clickCount: 1 }); };
const waitFor = async (t, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await rectOf(t)) return true; await sleep(10); } return false; };
const Q = [
  { line: /capital of Portugal/, answers: ['Lisbon', 'Porto', 'Coimbra'], right: 'Lisbon', tap: 'Lisbon' },
  { line: /capital of Australia/, answers: ['Sydney', 'Canberra', 'Melbourne'], right: 'Canberra', tap: 'Sydney' },
  { line: /capital of Canada/, answers: ['Toronto', 'Vancouver', 'Ottawa'], right: 'Ottawa', tap: 'Ottawa' },
  { line: /capital of Morocco/, answers: ['Rabat', 'Casablanca', 'Marrakesh'], right: 'Rabat', tap: 'Rabat' }
];
const startRe = /^(start|start quiz|start the quiz|begin|play)$/i;
let startText = null;
for (let i = 0; i < 120 && !startText; i++) { await sleep(250); for (const c of ['Start', 'Start Quiz', 'Start quiz', 'Start the quiz', 'Begin', 'Play']) if (await rectOf(c)) { startText = c; break; } }
if (!startText) { console.log('NO START'); done(2); }
await sleep(500);
await send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 390, maxHeight: 844 });
await tap(startText);
if (!(await waitFor('Lisbon'))) { console.log('NO Q1'); done(2); }
await sleep(700);
const geo = [];
const taps = [];
recording = true;
for (let k = 0; k < Q.length; k++) {
  if (k > 0 && !(await waitFor(Q[k].answers[0]))) { console.log(`NO Q${k + 1}`); done(2); }
  await sleep(700); // settled: a frame of this question with nothing tapped
  const slots = {};
  for (const a of Q[k].answers) slots[a] = await rectOf(a);
  geo.push({ line: await ev(LINE(Q[k].line)), slots, settled: Date.now() });
  taps.push(Date.now());
  await tap(Q[k].tap);
}
if (!(await waitFor('Zurich'))) { console.log('NO Q5'); done(2); }
await sleep(500);
recording = false;
await send('Page.stopScreencast');
await sleep(200);
const colourOf = async (buf, r) => {
  const { data, info } = await sharp(buf).extract({ left: Math.max(0, Math.round(r.x + 3)), top: Math.max(0, Math.round(r.y + 3)), width: Math.max(2, Math.round(r.w - 6)), height: Math.max(2, Math.round(r.h - 6)) }).raw().toBuffer({ resolveWithObject: true });
  let red = 0, green = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const R = data[i] / 255, G = data[i + 1] / 255, B = data[i + 2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2; n++;
    if (mx === mn) continue;
    const s = l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
    let h = mx === R ? (G - B) / (mx - mn) + (G < B ? 6 : 0) : mx === G ? (B - R) / (mx - mn) + 2 : (R - G) / (mx - mn) + 4; h *= 60;
    if (s < 0.3 || l < 0.15 || l > 0.96) continue;
    if (h >= 75 && h <= 165) green++; else if (h <= 15 || h >= 340) red++;
  }
  const g = green / n, rd = red / n;
  return g >= 0.08 && g > rd ? 'green' : rd >= 0.08 ? 'red' : '-';
};
const fp = async (buf, r) => { const { data } = await sharp(buf).extract({ left: Math.max(0, Math.round(r.x)), top: Math.max(0, Math.round(r.y)), width: Math.round(r.w), height: Math.round(r.h) }).greyscale().raw().toBuffer({ resolveWithObject: true }); return data; };
const same = (a, b) => { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length < 2; };
// Each question's fingerprint from its settled frame (the last frame before its tap).
const decoded = [];
for (const f of frames) decoded.push({ t: Math.round(f.t), buf: Buffer.from(f.data, 'base64') });
const prints = [];
for (let k = 0; k < Q.length; k++) {
  const settled = [...decoded].reverse().find((f) => f.t < taps[k]);
  prints.push(settled && geo[k].line ? await fp(settled.buf, geo[k].line) : null);
}
const flashes = [];
const rows = [];
for (const f of decoded) {
  let k = -1;
  for (let j = 0; j < Q.length; j++) if (prints[j] && geo[j].line && same(await fp(f.buf, geo[j].line), prints[j])) { k = j; break; }
  if (k < 0) { rows.push(`${f.t} ?`); continue; }
  const seen = {};
  for (const a of Q[k].answers) seen[a] = await colourOf(f.buf, geo[k].slots[a]);
  const tapped = f.t >= taps[k];
  const want = {};
  for (const a of Q[k].answers) want[a] = !tapped ? '-' : a === Q[k].tap ? (a === Q[k].right ? 'green' : 'red') : a === Q[k].right ? 'green' : '-';
  // Before its feedback is painted, a tapped question may still show nothing; never something else.
  const bad = Q[k].answers.filter((a) => seen[a] !== '-' && seen[a] !== want[a]);
  rows.push(`${f.t} Q${k + 1}${tapped ? ' tapped' : ''} ${Q[k].answers.map((a) => `${a}:${seen[a]}`).join(' ')}${bad.length ? '  ← FLASH' : ''}`);
  if (bad.length) { flashes.push({ t: f.t, question: k + 1, afterTap: tapped, seen: bad.map((a) => `${a} ${seen[a]}`) }); fs.writeFileSync(path.join(OUT, `flash-${f.t}.png`), f.buf); }
}
fs.writeFileSync(path.join(OUT, 'frames.txt'), rows.join('\n') + '\n');
const unknown = rows.filter((r) => r.endsWith('?')).length;
console.log(`FRAMES ${decoded.length} (${unknown} unmatched)  FLASH ${flashes.length ? flashes.map((x) => `Q${x.question}${x.afterTap ? '' : ' before its tap'}: ${x.seen.join(', ')}`).join(' · ') : 'none'}`);
done(0);
