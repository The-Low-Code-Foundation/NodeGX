// OWN-017: what the running app shows and plays, before and after an edit made in the stranger's editor.
// From s15's drive (headless Chrome, --use-mock-keychain, real CDP presses checked with elementFromPoint, the probe on
// HTMLMediaElement.prototype.play). Adds: the FULL src of what play() was called on, decoded here as a player reads
// it (the first `data` chunk of the outer WAV, 16-bit mono), and RMS per 50 ms over its last 0.6 s: the WAVTWICE
// measure (s15: `5 → 15066 → 17174` with the double header). Also every lesson title, the lesson's phrase texts and the
// computed colours of its buttons, for the text and colour edits.
// Usage: node drive.mjs <label> [previewUrl] [--lesson "Greetings"] [--phrase "^Bonjour"]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const S = path.dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const LABEL = argv[0] || 'run';
const PREVIEW = argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:59500/';
const LESSON = opt('--lesson', 'Greetings');
const PHRASE = new RegExp(opt('--phrase', '^Bonjour'));
const OUT = path.join(S, 'drives', LABEL);
fs.mkdirSync(OUT, { recursive: true });
const result = { label: LABEL, at: new Date().toISOString() };
const say = (step, data = {}) => { result[step] = data; console.log(JSON.stringify({ step, ...data }).slice(0, 1500)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(S, 'chrome-'));
const port = 59600 + Math.floor(Math.random() * 300);
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--use-mock-keychain', 'about:blank'],
  { stdio: 'ignore' }
);
const done = (code) => {
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(result, null, 2));
  chrome.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }, 500);
};

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
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
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
const waitFor = async (expression, ms, label) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await ev(expression)) return Date.now() - t0; await sleep(250); }
  throw new Error(`timed out waiting for ${label}`);
};
const tap = async (match) => {
  const at = await ev(`(() => {
    const re = new RegExp(${JSON.stringify(match.source)});
    const el = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && re.test(e.textContent.trim()));
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { text: el.textContent.trim(), x, y, lands: !!hit && (hit === el || el.contains(hit) || hit.contains(el)) };
  })()`);
  if (!at) throw new Error(`no element matches ${match}`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
  return at;
};
const shot = async (name) => fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
const buttons = () => ev(`[...document.querySelectorAll('button, [role=button]')].map((b) => { const s = getComputedStyle(b); return { text: b.innerText.trim().slice(0, 40), bg: s.backgroundColor, color: s.color }; })`);

// The bytes a player gets from a WAV: the first `data` chunk as declared, everything else skipped.
function wavPcm(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return { error: 'not RIFF/WAVE' };
  const chunks = [];
  let off = 12, fmt, data;
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4), len = buf.readUInt32LE(off + 4);
    chunks.push(`${id} ${len}`);
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === 'data' && !data) data = buf.subarray(off + 8, Math.min(buf.length, off + 8 + len));
    off += 8 + len + (len % 2);
  }
  return { fmt, data, chunks };
}
function tailRms(buf) {
  const w = wavPcm(buf);
  if (w.error || !w.data) return { error: w.error || 'no data chunk', chunks: w.chunks };
  const n = Math.floor(w.data.length / 2), win = Math.round(w.fmt.rate * 0.05);
  const rms = [];
  for (let s = 0; s + win <= n; s += win) {
    let sum = 0;
    for (let i = s; i < s + win; i++) { const v = w.data.readInt16LE(i * 2); sum += v * v; }
    rms.push(Math.round(Math.sqrt(sum / win)));
  }
  // The data starts with what? A second RIFF inside the samples is the WAVTWICE signature.
  return { chunks: w.chunks, fmt: w.fmt, seconds: +(n / w.fmt.rate).toFixed(2), innerRiff: w.data.subarray(0, 4).toString('latin1') === 'RIFF', peak: Math.max(...rms), tail: rms.slice(-12) };
}

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: PREVIEW });
  say('home', { waitedMs: await waitFor(`document.body.innerText.includes(${JSON.stringify(LESSON)})`, 30000, 'the lesson list'), text: (await ev('document.body.innerText')).slice(0, 600), buttons: await buttons() });
  await shot('home');

  say('tap lesson', await tap(new RegExp('^' + LESSON)));
  await waitFor(`[...document.querySelectorAll('body *')].some((e) => e.childElementCount === 0 && ${PHRASE}.test(e.textContent.trim()))`, 20000, 'the phrases');
  await sleep(500);
  say('lesson', { text: (await ev('document.body.innerText')).slice(0, 1200), buttons: await buttons() });
  await shot('lesson');

  await ev(`window.__srcs = []; window.__ended = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.__srcs.push(this.src || this.currentSrc || '');
      this.addEventListener('ended', () => window.__ended.push({ currentTime: this.currentTime, duration: this.duration }));
      return orig.apply(this, arguments);
    }; true`);
  say('tap phrase', await tap(PHRASE));
  let audio;
  try {
    await waitFor(`window.__srcs.length > 0`, 30000, 'play()');
    await sleep(4000);
    const src = await ev('window.__srcs[0]');
    let bytes;
    if (src.startsWith('data:')) bytes = Buffer.from(src.slice(src.indexOf(',') + 1), 'base64');
    else bytes = Buffer.from(await ev(`fetch(${JSON.stringify(src)}).then((r) => r.arrayBuffer()).then((b) => { let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); })`), 'base64');
    fs.writeFileSync(path.join(OUT, 'played.wav'), bytes);
    audio = { played: true, srcHead: src.slice(0, 40), bytes: bytes.length, ended: await ev('window.__ended'), ...tailRms(bytes) };
  } catch (e) {
    audio = { played: false, why: String(e.message) };
  }
  say('audio', audio);
  say('errors', { count: errors.length, errors: errors.slice(0, 8) });
  done(audio.played ? 0 : 1);
} catch (e) {
  say('failed', { error: String(e.message), errors: errors.slice(0, 8) });
  done(1);
}
