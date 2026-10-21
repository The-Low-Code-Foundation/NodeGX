// node look.mjs <url> <outdir> — headless Chrome at Richard's MacBook size; clicks by visible text; shots + console errors.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const [url, out] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'look-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--use-mock-keychain', '--hide-scrollbars', '--window-size=1426,690', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map(); const errors = [];
try {
  let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await wait(200); } }
  ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console: ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300)); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1426, height: 690, deviceScaleFactor: 1, mobile: false });
  const shot = async (name) => { const { result } = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(out, name), Buffer.from(result.data, 'base64')); console.log('shot', name); };
  // click the smallest visible element whose own text is exactly / starts with `text`
  const click = async (text) => console.log('click', JSON.stringify(text), await ev(`(() => { const t = ${JSON.stringify(text)};
    const els = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0' && (e.innerText || '').trim().startsWith(t); });
    els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
    const e = els[0]; if (!e) return 'NOT FOUND'; const r = e.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const at = document.elementFromPoint(x, y); if (!at || !(e.contains(at) || at.contains(e))) return { covered: true };
    return { x, y, text: (e.innerText || '').trim().slice(0, 40) }; })()`).then(async (r) => {
      if (r && r.x != null) for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
      return JSON.stringify(r); }));
  await send('Page.navigate', { url }); await wait(12000);
  await shot('01-open.png');
  console.log('texts', JSON.stringify(await ev(`[...new Set([...document.querySelectorAll('button, [role=button]')].map(e => e.innerText.trim()).filter(Boolean))].slice(0, 40)`)));
  for (const step of (process.env.STEPS || '').split('|').filter(Boolean)) { await click(step); await wait(Number(process.env.SETTLE || 5000)); await shot(`s-${step.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 24)}.png`); }
  console.log('errors', errors.length); for (const e of errors.slice(0, 15)) console.log(' ', e);
} finally { try { ws?.close(); } catch {} chrome.kill('SIGKILL'); }
