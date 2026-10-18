// A small Chrome DevTools Protocol driver for the page test: launch headless Chrome, open a page,
// click where an element is, type, press keys, evaluate. Node 22's own WebSocket; no dependency.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

export async function launch() {
  const exe = CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new Error('No Chrome found; set CHROME_PATH.');
  const profile = mkdtempSync(join(tmpdir(), 'table-editor-chrome-'));
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--window-size=1400,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((ok, fail) => {
    let buf = '';
    const t = setTimeout(() => fail(new Error('Chrome did not start')), 20000);
    proc.stderr.on('data', (d) => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if (m) {
        clearTimeout(t);
        ok(m[1]);
      }
    });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, fail) => {
    ws.onopen = ok;
    ws.onerror = fail;
  });
  let next = 1;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = next++;
      pending.set(id, { ok, fail });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

  async function newPage(url) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const logs = [];
    listeners.push((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Page.javascriptDialogOpening') s('Page.handleJavaScriptDialog', { accept: true });
      if (msg.method === 'Runtime.consoleAPICalled') logs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      if (msg.method === 'Runtime.exceptionThrown') logs.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    });
    await s('Page.enable');
    await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url });
    const page = {
      logs,
      async eval(expr) {
        const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
        return r.result.value;
      },
      async waitFor(expr, ms = 20000) {
        const end = Date.now() + ms;
        for (;;) {
          const v = await page.eval(expr).catch(() => undefined);
          if (v) return v;
          if (Date.now() > end) throw new Error(`timed out waiting for ${expr}`);
          await new Promise((r) => setTimeout(r, 100));
        }
      },
      /** A real mouse click at the middle of the first element the selector finds (scrolled into view first). */
      async click(selector) {
        const box = await page.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null;
          el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        if (!box) throw new Error(`nothing matches ${selector}`);
        for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
          await s('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
        }
      },
      async type(text) {
        await s('Input.insertText', { text });
      },
      async key(key, code = key, keyCode = { Enter: 13, Escape: 27, Delete: 46, Backspace: 8, Tab: 9 }[key], modifiers = 0) {
        const extra = key === 'Enter' ? { text: '\r' } : {};
        await s('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, modifiers, ...extra });
        await s('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers });
      },
      async selectAll() {
        await page.eval('document.activeElement && document.activeElement.select && document.activeElement.select()');
      },
      async screenshot() {
        return Buffer.from((await s('Page.captureScreenshot', { format: 'png' })).data, 'base64');
      }
    };
    return page;
  }

  return {
    newPage,
    async close() {
      try {
        await send('Browser.close');
      } catch {
        /* already gone */
      }
      proc.kill();
      await new Promise((r) => setTimeout(r, 300));
      rmSync(profile, { recursive: true, force: true });
    }
  };
}
