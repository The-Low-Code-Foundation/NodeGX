/**
 * P123 — a small CDP driver for the gate and for looking at the page: headless Chrome on its own profile and port,
 * one page, `evaluate`, `click`, `drag`, `type`, `screenshot`. Node's own WebSocket (22+), no dependency.
 *
 *   import { browser } from './cdp.mjs';
 *   const b = await browser({ port: 9333 }); await b.goto(url); await b.evaluate('1+1'); await b.close();
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function browser({ port = 9333, width = 1440, height = 900, chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } = {}) {
  if (!existsSync(chrome)) throw new Error(`no Chrome at ${chrome}`);
  const profile = mkdtempSync(join(tmpdir(), 'open-bubble-chrome-'));
  const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', '--hide-scrollbars', `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await wait(250);
    try {
      target = await new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: '/json/list' }, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b).find((t) => t.type === 'page')); } catch (e) { rej(e); } }); }).on('error', rej));
    } catch { /* not up yet */ }
  }
  if (!target) { proc.kill(); throw new Error('Chrome did not come up'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const waiting = new Map();
  const listeners = new Set();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) { const { ok, no } = waiting.get(msg.id); waiting.delete(msg.id); msg.error ? no(new Error(msg.error.message)) : ok(msg.result); }
    else for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; waiting.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
  const problems = [];
  listeners.add((m) => {
    if (m.method === 'Runtime.exceptionThrown') problems.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra });
  const b = {
    send, evaluate, problems,
    goto: (url) => send('Page.navigate', { url }),
    waitTitle: async (pred, ms = 40000) => { const t = Date.now(); let title = ''; while (Date.now() - t < ms) { title = await evaluate('document.title').catch(() => ''); if (pred(title)) return title; await wait(200); } throw new Error(`title stayed "${title}"`); },
    until: async (expr, ms = 8000) => { const t = Date.now(); let v = await evaluate(expr); while (!v && Date.now() - t < ms) { await wait(120); v = await evaluate(expr); } return v; },
    rectOf: (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView?.({ block: 'nearest' }); const r = el.getBoundingClientRect(); return r.width ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width, h: r.height, left: r.left, top: r.top } : null; })()`),
    click: async (x, y) => { await mouse('mouseMoved', x, y, { button: 'none' }); await mouse('mousePressed', x, y, { buttons: 1 }); await mouse('mouseReleased', x, y, { buttons: 0 }); },
    clickSel: async (sel) => { const at = await b.rectOf(sel); if (!at) throw new Error(`nothing on screen at ${sel}`); await b.click(at.x, at.y); return at; },
    drag: async (from, to, steps = 12) => {
      await mouse('mouseMoved', from.x, from.y, { button: 'none' });
      await mouse('mousePressed', from.x, from.y, { buttons: 1 });
      for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', Math.round(from.x + (to.x - from.x) * i / steps), Math.round(from.y + (to.y - from.y) * i / steps), { buttons: 1 }); await wait(25); }
      await mouse('mouseReleased', to.x, to.y, { buttons: 0 });
    },
    type: async (text) => { await send('Input.insertText', { text }); },
    key: async (key, code = key, vk) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk }); },
    screenshot: async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.data, 'base64')); return file; },
    close: async () => { try { ws.close(); } catch {} proc.kill(); await wait(200); rmSync(profile, { recursive: true, force: true }); }
  };
  return b;
}
