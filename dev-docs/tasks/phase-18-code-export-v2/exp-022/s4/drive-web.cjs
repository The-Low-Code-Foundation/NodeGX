// EXP-022 S4, the two web arms: todo-list in the runtime (`render-from-disk.js` on the bound copy) and in the React
// export (`build-web.sh`), each on its own fresh seeded backend, in one headless Chrome at a phone's width (390 × 844).
// The same steps as Drive.swift (s137's harness for the browser half). Writes `readings-runtime.json` and
// `readings-react.json`, and `shots/<arm>-<step>.png`. Run `./build.sh --no-build` and `./build-web.sh` first.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { startBackend, requestsBetween } = require('./backend-arm.cjs');

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const X = __dirname;
const W = path.join(X, 'work');
const PORT = Number(process.env.S4_PORT || 8644);
const { findChrome, freePort, connect, evaluate, httpJson } = require(path.join(R, 'scripts/devtools/render-report.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function serveDist(dir, port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(dir, url);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const visible = `(el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; }`;
const READ = `(() => {
  const vis = ${visible};
  return {
    texts: document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean),
    buttons: [...document.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim()),
    fields: [...document.querySelectorAll('input, textarea')].filter(vis).map((i) => (i.type === 'password' ? 'secure' : 'text') + ':' + (i.labels && i.labels[0] ? i.labels[0].innerText.trim() : '') + ':' + (i.placeholder || '')),
    path: location.pathname
  };
})()`;
const FOCUS = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.focus();
  el.select && el.select();
  return document.activeElement === el;
})()`;
const CLICK = (label, prefix = false) => `(() => {
  const vis = ${visible};
  const want = ${JSON.stringify(label)};
  const hit = (el) => { const t = el.textContent.trim(); return ${prefix ? 't.startsWith(want)' : 't === want'}; };
  const hits = [...document.querySelectorAll('button, [role="button"], div, span, p')].filter((el) => hit(el) && vis(el));
  const deepest = hits.find((el) => !hits.some((other) => other !== el && el.contains(other)));
  if (!deepest) return false;
  (deepest.closest('button') || deepest).click();
  return true;
})()`;
/** The centre of the visible button whose text is `label` (the last one, a dialog's sits after the page's), or null. */
const CENTRE = (label) => `(() => {
  const vis = ${visible};
  const b = [...document.querySelectorAll('button, [role="button"]')].filter((el) => el.textContent.trim() === ${JSON.stringify(label)} && vis(el)).at(-1);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;
/** The ✓ nearest (vertically) the element whose own text is `title`: the circle on that task's row. */
const CLICK_CIRCLE = (title) => `(() => {
  const vis = ${visible};
  const t = [...document.querySelectorAll('div, span, p')].find((el) => el.textContent.trim() === ${JSON.stringify(title)} && ![...el.children].some((c) => c.textContent.trim() === ${JSON.stringify(title)}) && vis(el));
  if (!t) return 'no title';
  const y = t.getBoundingClientRect().top + t.getBoundingClientRect().height / 2;
  const circles = [...document.querySelectorAll('button, [role="button"], div')].filter((el) => el.textContent.trim() === '✓' && vis(el) && ![...el.children].some((c) => c.textContent.trim() === '✓'));
  if (!circles.length) return 'no circle';
  const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
  const c = circles.reduce((a, b) => (Math.abs(mid(a) - y) <= Math.abs(mid(b) - y) ? a : b));
  (c.closest('button') || c).click();
  return 'pressed ' + circles.length;
})()`;

async function driveArm(client, name, url, seeded, until) {
  const reading = { arm: name, seeded: seeded.ids, steps: [] };
  const emit = async (step, extra = {}) => {
    const r = await evaluate(client, READ);
    const at = new Date().toISOString();
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(X, 'shots', `${name}-${step}.png`), Buffer.from(shot.data, 'base64'));
    reading.steps.push({ step, at, ...r, ...extra });
  };
  const type = async (selector, text) => {
    if (!(await evaluate(client, FOCUS(selector)))) throw new Error(`no field ${selector}`);
    await client.send('Input.insertText', { text });
  };
  try {
    await client.send('Page.navigate', { url });
    await until('!!document.querySelector(\'input[type="password"]\')');
    await wait(500);
    await emit('D0');
    await type('input[type="email"], input:not([type="password"])', seeded.email);
    await type('input[type="password"]', seeded.password);
    await evaluate(client, CLICK('Sign in'));
    const left = await until(`!document.querySelector('input[type="password"]')`);
    await wait(4000);
    await emit('D1', { reachedTodo: left });
    await emit('D2');
    await type('input[placeholder^="Add a task"]', 'Pick up the dry cleaning');
    const added = await evaluate(client, CLICK('Add'));
    await wait(3000);
    await emit('D3', { addPressed: added });
    const circle = await evaluate(client, CLICK_CIRCLE('Write the release notes'));
    await wait(1500);
    const before = (reading.steps.at(-1) || {}).buttons || [];
    await emit('D4dialog', { circle });
    const after = reading.steps.at(-1).buttons;
    const ok = after.find((b) => b && b !== 'Cancel' && !before.includes(b));
    const noted = await evaluate(client, FOCUS('[placeholder^="What happened"]'));
    if (noted) await client.send('Input.insertText', { text: 'Sent to the printer.' });
    // A real pointer press at the button's centre (the runtime's dialog button does not answer a synthetic click).
    const at = ok ? await evaluate(client, CENTRE(ok)) : null;
    if (at) {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    }
    const okPressed = !!at;
    await wait(1500);
    // Pressed again only when the dialog is still there, as a person whose press did nothing presses again.
    const again = ok ? await evaluate(client, CENTRE(ok)) : null;
    if (again) {
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: again.x, y: again.y, button: 'left', clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: again.x, y: again.y, button: 'left', clickCount: 1 });
    }
    await wait(3000);
    await emit('D4', { ok: ok || null, noted, okPressed, pressedAgain: !!again });
    await client.send('Page.reload', {});
    await wait(5000);
    await emit('D5');
    await evaluate(client, CLICK('Sign out'));
    await wait(2500);
    await emit('D6');
    await client.send('Page.reload', {});
    await wait(3500);
    await emit('D6relaunch');
  } catch (e) {
    reading.stoppedAt = String(e && e.stack ? e.stack : e).slice(0, 400);
  }
  return reading;
}

async function main() {
  fs.mkdirSync(path.join(X, 'shots'), { recursive: true });
  const { chrome } = findChrome();
  const cdpPort = await freePort();
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-s4-'));
  const arms = (process.env.S4_ARMS || 'runtime,react').split(',');
  for (const name of arms) {
    const backend = await startBackend();
    const children = [];
    let server = null;
    let url;
    // A fresh browser profile per arm: no session, no saved theme, nothing the last arm left.
    const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${path.join(profileRoot, name)}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank']);
    try {
      if (name === 'runtime') {
        const port = await freePort();
        children.push(spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(W, 'proj'), '--port', String(port), '--backend-port', String(PORT)], { stdio: 'ignore' }));
        for (let i = 0; i < 120; i++) {
          try {
            await httpJson(port, '/');
            break;
          } catch (e) {
            if (String(e).includes('JSON') || String(e).includes('Unexpected')) break;
            await wait(250);
          }
        }
        url = `http://127.0.0.1:${port}/`;
      } else {
        const port = await freePort();
        server = await serveDist(path.join(W, 'react', 'dist'), port);
        url = `http://127.0.0.1:${port}/`;
      }
      let target = null;
      for (let i = 0; i < 60 && !target; i++) {
        await wait(250);
        try {
          target = (await httpJson(cdpPort, '/json/list')).find((p) => p.type === 'page');
        } catch {}
      }
      const consoleLines = [];
      const client = await connect(target.webSocketDebuggerUrl, (msg) => {
        if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
          consoleLines.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 240));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          consoleLines.push(`exception: ${(msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text}`.slice(0, 240));
        }
      });
      await client.send('Page.enable');
      await client.send('Runtime.enable');
      await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
      await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      const until = async (expr, ms = 20000) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
          if (await evaluate(client, expr)) return true;
          await wait(250);
        }
        return false;
      };
      const reading = await driveArm(client, name, url, backend.seeded, until);
      let prev = null;
      for (const s of reading.steps) {
        s.requests = requestsBetween(backend.logFile, backend.logStart, prev, s.at);
        prev = s.at;
      }
      reading.console = consoleLines;
      fs.writeFileSync(path.join(X, `readings-${name}.json`), JSON.stringify(reading, null, 1) + '\n');
      console.log(name, reading.steps.map((s) => s.step).join(' '), reading.stoppedAt || '');
    } finally {
      browser.kill();
      children.forEach((c) => c.kill());
      if (server) server.close();
      backend.stop();
      await wait(1000);
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
