/**
 * A HEADLESS CHROME, DRIVEN OVER THE DEVTOOLS PROTOCOL (DBU-11).
 *
 * Only what tools/drive-demo.mjs needs, with no dependency: Node 22's WebSocket and the Chrome on this machine
 * (CHROME_BIN overrides). Clicks are real mouse events at an element's centre, typing is real key input, so a
 * drive presses what a person presses. Every console error and uncaught exception is kept.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1280, height = 900, mobile = false } = {}) {
  const bin = CANDIDATES.find((p) => existsSync(p));
  if (!bin) throw new Error('cdp: no Chrome found. Set CHROME_BIN.');
  const profile = mkdtempSync(join(tmpdir(), 'dbu-demo-chrome-'));
  const proc = spawn(bin, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', `--window-size=${width},${height}`, 'about:blank'
  ], { stdio: 'ignore' });
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    const f = join(profile, 'DevToolsActivePort');
    if (existsSync(f)) port = readFileSync(f, 'utf8').split('\n')[0];
  }
  if (!port) throw new Error('cdp: Chrome did not open its debugging port');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let seq = 0;
  const pending = new Map();
  const errors = [];
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push('exception: ' + ((d.exception && d.exception.description) || d.text));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push(`${msg.params.entry.source}: ${msg.params.entry.text} ${msg.params.entry.url || ''}`.trim());
    }
    listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('evaluate: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    return r.result.value;
  };

  const api = {
    errors,
    send,
    evaluate,
    async goto(url) {
      await send('Page.navigate', { url });
      await sleep(300);
    },
    async waitFor(expression, { timeout = 15000, what } = {}) {
      const end = Date.now() + timeout;
      let last;
      while (Date.now() < end) {
        try {
          last = await evaluate(expression);
          if (last) return last;
        } catch (e) {
          last = e.message;
        }
        await sleep(150);
      }
      throw new Error(`waited ${timeout} ms for ${what || expression} (last: ${JSON.stringify(last)})`);
    },
    /** The visible text of the page. */
    text: () => evaluate('document.body ? document.body.innerText : ""'),
    async waitForText(s, opts = {}) {
      return api.waitFor(`document.body && document.body.innerText.includes(${JSON.stringify(s)})`, { what: `"${s}" on screen`, ...opts });
    },
    /**
     * Click the innermost visible element whose own text is `label` (exact, trimmed), or which matches `selector`.
     * `nth` picks among several matches, `within` limits the search to the elements matching that selector.
     */
    async click(label, { selector, nth = 0, within } = {}) {
      const re = label instanceof RegExp ? label.source : null;
      if (re) label = null;
      const box = await evaluate(`(() => {
        const re = ${JSON.stringify(re)} && new RegExp(${JSON.stringify(re)});
        const label = ${JSON.stringify(label)}, selector = ${JSON.stringify(selector || null)}, within = ${JSON.stringify(within || null)};
        const roots = within ? [...document.querySelectorAll(within)] : [document];
        const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        let found = [];
        for (const root of roots) {
          if (selector) found.push(...root.querySelectorAll(selector));
          else {
            for (const el of root.querySelectorAll('*')) {
              const own = (el.innerText || '').trim();
              const is = (s) => (re ? re.test(s) : s === label);
              if (!is(own)) continue;
              if ([...el.children].some((c) => is((c.innerText || '').trim()))) continue;
              found.push(el);
            }
          }
        }
        found = found.filter(visible);
        const el = found[${nth}];
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, n: found.length };
      })()`);
      if (!box) throw new Error(`click: nothing visible reads "${label || re || selector}"`);
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
      }
      await sleep(250);
      return box;
    },
    /** Focus the field matching `selector` (nth) and type into it. */
    async type(selector, text, { nth = 0, clear = true } = {}) {
      const ok = await evaluate(`(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => e.getBoundingClientRect().width > 0)[${nth}];
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.focus();
        if (${clear}) { el.select && el.select(); }
        return true;
      })()`);
      if (!ok) throw new Error(`type: no field ${selector}`);
      if (clear) await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
      await send('Input.insertText', { text });
      await sleep(150);
    },
    /** Type into the field that follows the label reading `label` (exact), as a person finds it. */
    async typeLabelled(label, text) {
      const ok = await evaluate(`(() => {
        const lab = [...document.querySelectorAll('label')].find((l) => (l.innerText || '').trim() === ${JSON.stringify(label)} && l.getBoundingClientRect().width > 0);
        if (!lab) return false;
        const all = [...document.querySelectorAll('input, textarea')];
        const el = (lab.htmlFor && document.getElementById(lab.htmlFor)) || lab.querySelector('input, textarea') ||
          all.find((x) => lab.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.focus();
        el.select && el.select();
        return true;
      })()`);
      if (!ok) throw new Error(`typeLabelled: no field labelled "${label}"`);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
      await send('Input.insertText', { text });
      await sleep(150);
    },
    /** Click the smallest visible element whose text holds every one of `parts` (a row in a list). */
    async clickRow(...parts) {
      const box = await evaluate(`(() => {
        const parts = ${JSON.stringify(parts)};
        const hits = [...document.querySelectorAll('body *')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && parts.every((p) => (el.innerText || '').includes(p));
        });
        const el = hits.filter((h) => !hits.some((o) => o !== h && h.contains(o))).sort((a, b) => a.innerText.length - b.innerText.length)[0];
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + Math.min(40, r.width / 2), y: r.top + r.height / 2 };
      })()`);
      if (!box) throw new Error(`clickRow: no row holds ${parts.join(' + ')}`);
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
      }
      await sleep(250);
    },
    /** Run `fn` (which reloads the page) and wait until the new page has loaded. */
    async reloadingBy(fn) {
      await evaluate('window.__beforeReload = true');
      await fn();
      await api.waitFor('!window.__beforeReload && document.readyState === "complete"', { what: 'the page to load again' });
    },
    /** How many visible buttons read exactly `label`. */
    count: (label) => evaluate(`[...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0 && (x.innerText || '').trim() === ${JSON.stringify(label)}).length`),
    async screenshot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async close() {
      try { ws.close(); } catch (e) { /* closed */ }
      proc.kill();
      await sleep(300);
      try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* in use */ }
    }
  };
  return api;
}
