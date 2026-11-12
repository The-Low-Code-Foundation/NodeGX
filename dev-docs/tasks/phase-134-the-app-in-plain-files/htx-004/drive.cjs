// HTX-004, the drive (EXP-022 S6's drive-web.cjs, copied, with the HTML arm): todo-list in the runtime
// (`render-from-disk.js` on the bound copy), the React export (`work/react/dist`, built by ./build.sh) and the HTML export
// (`work/html`, served by `python3 -m http.server`, nothing built), each on its own fresh seeded backend, in one headless
// Chrome at a phone's width (390 × 844). Writes `readings-<arm>.json` and `shots/<arm>-<step>.png`.
//
// Steps: D0 open; D1 sign in; D2 open "Book the van in for its MOT"; D2tick its "Ring the garage" ✓; D2back "← Back";
// D3 add "Pick up the dry cleaning", typed with a caret move in the middle (HTX-003's cursor); D4dialog the release
// notes' ✓; D4 a note, then the dialog's OK; D5 reload; D6 Sign out; D6relaunch reload.
// Run `./build.sh` first. S4_ARMS=runtime,react,html (the default) picks the arms.
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
    values: [...document.querySelectorAll('input, textarea')].filter(vis).map((i) => i.value).filter(Boolean),
    path: location.pathname + location.hash
  };
})()`;
const FOCUS = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.focus();
  el.select && el.select();
  return document.activeElement === el;
})()`;
/** The focused field's value and caret. */
const CARET = `(() => { const el = document.activeElement; return el && 'value' in el ? { value: el.value, start: el.selectionStart, end: el.selectionEnd, focused: el.tagName } : null; })()`;
const SET_CARET = (at) => `(() => { const el = document.activeElement; if (!el || !el.setSelectionRange) return false; el.setSelectionRange(${at}, ${at}); return el.selectionStart === ${at}; })()`;
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
/** The centre of the visible element whose own text is `label` (a button first; the last one, a dialog's sits after the page's), or null. */
const CENTRE = (label) => `(() => {
  const vis = ${visible};
  const want = ${JSON.stringify(label)};
  let b = [...document.querySelectorAll('button, [role="button"]')].filter((el) => el.textContent.trim() === want && vis(el)).at(-1);
  if (!b) b = [...document.querySelectorAll('div, span, p')].filter((el) => el.textContent.trim() === want && vis(el) && ![...el.children].some((c) => c.textContent.trim() === want)).at(-1);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;
/** The ✓ nearest (vertically) the element whose own text is `title`: the circle on that row. */
const CLICK_CIRCLE = (title) => `(() => {
  const vis = ${visible};
  const want = ${JSON.stringify(title)};
  // A row's title is a text, or a field whose value it is (an action's title is editable in place).
  const t = [...document.querySelectorAll('div, span, p')].find((el) => el.textContent.trim() === want && ![...el.children].some((c) => c.textContent.trim() === want) && vis(el))
    || [...document.querySelectorAll('input, textarea')].find((el) => el.value === want && vis(el));
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
  /** A real pointer press at the centre of what says `label` (the runtime's buttons do not all answer a synthetic click). */
  const press = async (label) => {
    const at = await evaluate(client, CENTRE(label));
    if (!at) return false;
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    return true;
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

    /** The note dialog a ✓ opens: its new button (the OK), a note, a real press; again only if it is still there. */
    const answerDialog = async (before, note) => {
      const after = reading.steps.at(-1).buttons;
      const ok = after.find((b) => b && b !== 'Cancel' && !before.includes(b));
      const noted = ok ? await evaluate(client, FOCUS('[placeholder^="What happened"]')) : false;
      if (noted) await client.send('Input.insertText', { text: note });
      const okPressed = ok ? await press(ok) : false;
      await wait(1500);
      // Pressed again only when the dialog is still there, as a person whose press did nothing presses again.
      const again = ok && (await evaluate(client, CENTRE(ok))) ? await press(ok) : false;
      await wait(3000);
      return { ok: ok || null, noted, okPressed, pressedAgain: again };
    };

    // D2: open a task, tick one of its next actions (its note dialog), come back.
    const opened = await press('Book the van in for its MOT');
    await wait(2500);
    await emit('D2', { opened });
    const ticked = await evaluate(client, CLICK_CIRCLE('Ring the garage'));
    await wait(1500);
    const beforeTick = reading.steps.at(-1).buttons;
    await emit('D2tickdialog', { ticked });
    await emit('D2tick', await answerDialog(beforeTick, 'Booked for Thursday.'));
    const back = await press('← Back');
    await wait(2000);
    await emit('D2back', { back });

    // D3: add, typed as a person types who goes back to put a word in (HTX-003: the field keeps its cursor).
    await type('input[placeholder^="Add a task"]', 'Pick up the cleaning');
    await wait(300);
    const typed = await evaluate(client, CARET);
    const moved = await evaluate(client, SET_CARET(12));
    await client.send('Input.insertText', { text: 'dry ' });
    await wait(300);
    const caret = await evaluate(client, CARET);
    const added = await evaluate(client, CLICK('Add'));
    await wait(3000);
    await emit('D3', { typed, moved, caret, addPressed: added });

    // D4: close a task through its note dialog.
    const circle = await evaluate(client, CLICK_CIRCLE('Write the release notes'));
    await wait(1500);
    const before = (reading.steps.at(-1) || {}).buttons || [];
    await emit('D4dialog', { circle });
    await emit('D4', await answerDialog(before, 'Sent to the printer.'));

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

async function waitForHttp(port) {
  for (let i = 0; i < 120; i++) {
    try {
      await httpJson(port, '/');
      return;
    } catch (e) {
      if (String(e).includes('JSON') || String(e).includes('Unexpected')) return;
      await wait(250);
    }
  }
}

async function main() {
  fs.mkdirSync(path.join(X, 'shots'), { recursive: true });
  const { chrome } = findChrome();
  const cdpPort = await freePort();
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-htx4-'));
  const arms = (process.env.S4_ARMS || 'runtime,react,html').split(',');
  for (const name of arms) {
    const backend = await startBackend();
    const children = [];
    let server = null;
    let url;
    // A fresh browser profile per arm: no session, no saved theme, nothing the last arm left.
    const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${path.join(profileRoot, name)}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank']);
    try {
      const port = await freePort();
      if (name === 'runtime') {
        children.push(spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(W, 'proj'), '--port', String(port), '--backend-port', String(PORT)], { stdio: 'ignore' }));
      } else if (name === 'html') {
        // The person's way (the export's README): any static server in the folder. Nothing is built.
        children.push(spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: path.join(W, 'html'), stdio: 'ignore' }));
      } else {
        server = await serveDist(path.join(W, 'react', 'dist'), port);
      }
      await waitForHttp(port);
      url = `http://127.0.0.1:${port}/`;
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
