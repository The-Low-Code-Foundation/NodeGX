// OWN-017: make an edit THROUGH the stranger's editor page (http://localhost:4870), as a person would: real CDP
// presses on its tabs, rows and Save buttons (each checked with elementFromPoint), and field values set the way its
// own `input` handlers read them (value + an `input` event). Reports the page's banner and a screenshot.
// Usage: node editor-drive.mjs <label> <edit.json>   where edit.json is one of
//   { "kind": "node",    "component": "Components/PhraseRow", "node": "<label>", "field": "<displayName>", "value": "…" }
//   { "kind": "phrase",  "french": "Merci", "newFrench": "Merci beaucoup", "newEnglish": "Thank you very much" }
//   { "kind": "voice",   "voiceName": "Puck" }
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const S = path.dirname(new URL(import.meta.url).pathname);
const [LABEL, EDIT_FILE] = process.argv.slice(2);
const edit = JSON.parse(fs.readFileSync(EDIT_FILE, 'utf8'));
const EDITOR = 'http://localhost:4870/';
const OUT = path.join(S, 'drives', `editor-${LABEL}`);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }).slice(0, 1200));

const profile = fs.mkdtempSync(path.join(S, 'chrome-'));
const port = 59900 + Math.floor(Math.random() * 90);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--use-mock-keychain', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
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
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; return; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(String(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text).slice(0, 300));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || ''));
  return r.result?.result?.value;
};
const waitFor = async (expression, ms, label) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await ev(expression)) return Date.now() - t0; await sleep(200); }
  throw new Error(`timed out waiting for ${label}`);
};
// Press the element `finder` (a JS expression yielding an element) at its centre; refuse if something else is on top.
const press = async (finder, what) => {
  const at = await ev(`(() => { const el = ${finder}; if (!el) return null; el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y);
    return { x, y, lands: !!hit && (hit === el || el.contains(hit)) }; })()`);
  if (!at) throw new Error(`nothing to press: ${what}`);
  if (!at.lands) throw new Error(`press on ${what} would land on something else`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
  say('press', { what });
};
const setValue = (finder, value) => ev(`(() => { const el = ${finder}; if (!el) return false; el.focus(); el.value = ${JSON.stringify(value)};
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
const byText = (sel, text) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.trim() === ${JSON.stringify(text)})`;
const banner = async () => { await waitFor(`!document.getElementById('banner').hidden`, 10000, 'the banner'); return ev(`({ text: document.getElementById('banner').textContent.trim(), cls: document.getElementById('banner').className })`); };

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: EDITOR });
  await waitFor(`document.getElementById('project-path') && !/Opening/.test(document.getElementById('project-path').textContent)`, 15000, 'the project');

  if (edit.kind === 'node') {
    await press(byText('.tab-btn', 'Browse Components'), 'the Browse Components tab');
    await waitFor(`[...document.querySelectorAll('#component-list button')].length > 0`, 10000, 'the component list');
    await press(`[...document.querySelectorAll('#component-list button')].find((b) => b.firstChild.textContent === ${JSON.stringify(edit.component)})`, edit.component);
    await waitFor(`!!document.getElementById('node-tbody')`, 10000, 'the node table');
    await press(`[...document.querySelectorAll('.node-row')].find((r) => r.children[2].textContent === ${JSON.stringify(edit.node)})`, `the row "${edit.node}"`);
    const fieldFinder = `(() => { const row = [...document.querySelectorAll('.node-panel .field-row')].find((r) => r.querySelector('.field-label').firstChild.textContent === ${JSON.stringify(edit.field)}); return row && row.querySelector('textarea, input, select'); })()`;
    say('field before', { value: String(await ev(`${fieldFinder}.value`)).slice(0, 200) });
    if (!(await setValue(fieldFinder, edit.value))) throw new Error(`no field "${edit.field}"`);
    await shot('edited');
    await press(byText('.node-panel button', 'Save node'), 'Save node');
  } else if (edit.kind === 'phrase') {
    const frenchFinder = `[...document.querySelectorAll('#lessons-root input')].find((i) => i.value === ${JSON.stringify(edit.french)})`;
    await waitFor(`!!${frenchFinder}`, 10000, `the phrase ${edit.french}`);
    // The English input is the next input in the same row.
    const englishFinder = `(() => { const f = ${frenchFinder}; const all = [...f.closest('tr, .phrase-row, div').querySelectorAll('input')]; return all[all.indexOf(f) + 1]; })()`;
    say('row before', { english: await ev(`${englishFinder}.value`) });
    if (edit.newEnglish) await setValue(englishFinder, edit.newEnglish);
    if (edit.newFrench) await setValue(frenchFinder, edit.newFrench);
    await shot('edited');
    await press(`document.getElementById('save-lessons-btn')`, 'Save lessons');
  } else if (edit.kind === 'voice') {
    await press(byText('.tab-btn', 'Cloud Voice'), 'the Cloud Voice tab');
    await waitFor(`document.getElementById('voice-name').value !== ''`, 10000, 'the voice');
    say('voice before', { value: await ev(`document.getElementById('voice-name').value`) });
    await setValue(`document.getElementById('voice-name')`, edit.voiceName);
    await press(`document.querySelector('#voice-form button[type=submit]')`, 'Save voice');
  }
  const b = await banner();
  say('banner', b);
  await shot('saved');
  say('errors', { count: errors.length, errors });
  done(/\berr\b/.test(b.cls) ? 1 : 0);
} catch (e) {
  say('failed', { error: String(e.message), errors });
  try { await shot('failed'); } catch {}
  done(1);
}

async function shot(name) {
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
}
