// OWN-008: a headless Chrome on its own profile, driven over CDP the way a person uses a page: real mouse presses
// at an element's centre (refused if `elementFromPoint` lands on something else), real key events, real typing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openChrome(url, { width = 1440, height = 960 } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'own008-chrome-'));
  const port = 59700 + Math.floor(Math.random() * 200);
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--use-mock-keychain', `--window-size=${width},${height}`, 'about:blank'
  ], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = {};
  const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (pending[d.id]) { pending[d.id](d); delete pending[d.id]; return; }
    if (d.method === 'Runtime.exceptionThrown') errors.push(String(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text).slice(0, 300));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url });
  await sleep(1500);

  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || ''));
    return r.result?.result?.value;
  };
  const waitFor = async (expression, ms = 10_000, label = expression) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expression)) return Date.now() - t0; await sleep(150); }
    throw new Error(`timed out waiting for ${label}`);
  };
  const press = async (finder, what = finder) => {
    const at = await ev(`(() => { const el = ${finder}; if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y); return { x, y, lands: !!hit && (hit === el || el.contains(hit)) }; })()`);
    if (!at) throw new Error(`nothing to press: ${what}`);
    if (!at.lands) throw new Error(`a press on ${what} would land on something else`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
      if (type === 'mousePressed') await sleep(60);
    }
    await sleep(250);
  };
  const key = async (k, code = k, keyCode = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8 }[k]) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode, ...(k === 'Enter' ? { text: '\r' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode });
    await sleep(200);
  };
  const selectAllAndType = async (text) => {
    // macOS: a Meta+A key event selects nothing in headless Chrome; the editing command does what the keys do.
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65, commands: ['selectAll'] });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65 });
    await send('Input.insertText', { text });
    await sleep(150);
  };
  const shot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  };
  const close = () => { try { ws.close(); } catch {} chrome.kill(); setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500); };
  return { send, ev, waitFor, press, key, selectAllAndType, shot, close, errors };
}
