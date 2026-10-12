// OWN-015 AC1's last clause + AC2's last third, on the round-2 stranger's app in the npm preview:
// open Home → tap the first lesson → tap the first phrase → does audio play? Every request and response the page
// makes is kept and searched for the key's value (read from .env, never printed). A tap is a real CDP mouse press at
// the element's centre, checked with elementFromPoint first; no autoplay flag, so a gesture problem stays visible.
// Chrome gets --use-mock-keychain (P112-S14-KEYCHAIN). Usage: node drive.mjs [--phone]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const S = path.dirname(new URL(import.meta.url).pathname);
const PREVIEW = process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:59500/';
const PHONE = process.argv.includes('--phone');
const KEY = fs
  .readFileSync('/Users/richardosborne/vscode_projects/OpenNoodl/.env', 'utf8')
  .match(/^GEMINI_TTS_API_KEY=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(S, 'chrome-'));
const port = 59600 + Math.floor(Math.random() * 300);
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--use-mock-keychain', 'about:blank'],
  { stdio: 'ignore' }
);
const done = (code) => { chrome.kill(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }, 500); };

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = {};
const requests = new Map();
const haystack = []; // every request URL, request body and response body, for the key search
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; return; }
  if (d.method === 'Network.requestWillBeSent') {
    const r = d.params.request;
    requests.set(d.params.requestId, { method: r.method, url: r.url });
    haystack.push(r.url, r.postData || '', JSON.stringify(r.headers));
  }
  if (d.method === 'Network.responseReceived') {
    const q = requests.get(d.params.requestId);
    if (q) { q.status = d.params.response.status; q.type = d.params.response.mimeType; }
  }
  if (d.method === 'Network.loadingFinished') requests.get(d.params.requestId) && (requests.get(d.params.requestId).finished = true);
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
// The element whose own text is exactly `text`, its centre, and whether a press there lands on it.
const tap = async (text) => {
  const at = await ev(`(() => {
    const el = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && e.textContent.trim() === ${JSON.stringify(text)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, lands: !!hit && (hit === el || el.contains(hit) || hit.contains(el)) };
  })()`);
  if (!at) throw new Error(`no element reads "${text}"`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
  return at;
};

try {
  await send('Network.enable', { maxPostDataSize: 1 << 20 });
  await send('Runtime.enable');
  await send('Page.enable');
  if (PHONE) await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: PREVIEW });
  say('home', { waitedMs: await waitFor(`document.body.innerText.includes('Greetings')`, 30000, 'the lesson list') });
  const shot = async (name) => fs.writeFileSync(path.join(S, `${name}${PHONE ? '-phone' : ''}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  await shot('home');

  say('tap lesson', await tap('Greetings'));
  say('lesson', { waitedMs: await waitFor(`document.body.innerText.includes('Hello') && document.body.innerText.includes('Bonjour')`, 20000, 'the phrases'), text: (await ev('document.body.innerText')).slice(0, 300) });
  await shot('lesson');

  // Arm the player probe BEFORE the tap: any media element that starts playing is recorded.
  // s15: the stranger's player is a detached \`new Audio()\`, whose events never reach document — so every media
  // element that play() is called on is recorded, and its own playing/ended/error events are watched.
  await ev(`window.__played = []; window.__media = []; window.__ended = []; window.__mediaErr = [];
    document.addEventListener('playing', (e) => window.__played.push({ src: (e.target.currentSrc || '').slice(0, 30), duration: e.target.duration }), true);
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!window.__media.includes(this)) {
        window.__media.push(this);
        this.addEventListener('playing', () => window.__played.push({ src: (this.currentSrc || '').slice(0, 30), duration: this.duration }));
        this.addEventListener('ended', () => window.__ended.push({ currentTime: this.currentTime, duration: this.duration }));
        this.addEventListener('error', () => window.__mediaErr.push(this.error && this.error.code));
      }
      return orig.apply(this, arguments);
    }; true`);
  const phrase = await ev(`(() => { const e = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && /^Bonjour/.test(e.textContent.trim())); return e && e.textContent.trim(); })()`);
  say('tap phrase', { phrase, ...(await tap(phrase)) });
  let outcome;
  try {
    const waited = await waitFor(`window.__played.length > 0`, 30000, 'audio to play');
    await sleep(4000);
    outcome = { played: true, waitedMs: waited, ended: await ev('window.__ended'), detached: await ev(`window.__media.map((m) => ({ src: (m.currentSrc || '').slice(0, 30), paused: m.paused, currentTime: m.currentTime, duration: m.duration }))`), media: await ev(`[...document.querySelectorAll('video,audio')].map((m) => ({ src: (m.currentSrc || '').slice(0, 30), paused: m.paused, currentTime: m.currentTime, duration: m.duration, muted: m.muted, volume: m.volume }))`), events: await ev('window.__played') };
  } catch (e) {
    outcome = { played: false, why: String(e.message), playCalls: await ev('window.__media.length'), mediaErr: await ev('window.__mediaErr'), media: await ev(`[...document.querySelectorAll('video,audio')].map((m) => ({ src: (m.currentSrc || '').slice(0, 30), paused: m.paused, error: m.error && m.error.code }))`), visibleError: (await ev('document.body.innerText')).slice(0, 400) };
  }
  say('audio', outcome);
  await shot('after-tap');

  // Response bodies: fetch each finished request's body for the search.
  for (const [rid, q] of requests) {
    if (!q.finished) continue;
    const b = await send('Network.getResponseBody', { requestId: rid });
    const body = b.result ? (b.result.base64Encoded ? Buffer.from(b.result.body, 'base64').toString('latin1') : b.result.body) : '';
    q.bytes = body.length;
    haystack.push(body);
  }
  const all = haystack.join('\n');
  say('requests', { count: requests.size, list: [...requests.values()].map((q) => `${q.method} ${q.url.slice(0, 90)} → ${q.status} ${q.type || ''} ${q.bytes ?? ''}`) });
  // Known-firing control: a string the page certainly received (a phrase from the backend's seed) must be found
  // by the same search, or a zero for the key means nothing.
  say('key search', { keyHits: all.split(KEY).length - 1, controlHits: all.split('Bonjour').length - 1, searchedChars: all.length, html: (await ev('document.documentElement.outerHTML')).split(KEY).length - 1 });
  say('errors', { count: errors.length, errors: errors.slice(0, 8) });
  done(outcome.played ? 0 : 1);
} catch (e) {
  say('failed', { error: String(e.message), errors: errors.slice(0, 8) });
  done(1);
}
