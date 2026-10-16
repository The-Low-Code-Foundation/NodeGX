// EXP-011 §86 drive (session 119): pulse-desk in the runtime and in two exported builds, one headless Chrome; five Sends in
// each arm. Adapted from s118's drive, with no backend. See EXPECTED.md (written first) and README.md. Run
// `python3 -I gen-pulse-desk.py`, the two emits (README) and `./build.sh` first.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const X = __dirname;
const { findChrome, freePort, connect, evaluate, httpJson } = require(path.join(R, 'scripts/devtools/render-report.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function serveStatic(dir, port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const file = url === '/' ? path.join(dir, 'serve.html') : path.join(dir, url);
    if (!file.startsWith(dir) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const LINES = `document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean)`;
const FIELD = `document.querySelector('input[placeholder="Your name"]')`;
// The runtime's Button is a <button> holding its label; the export's is a <button> too.
const SEND = `[...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Send')`;

async function main() {
  const { chrome } = findChrome();
  const runtimePort = await freePort();
  const runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(X, 'pulse-desk'), '--port', String(runtimePort)], { stdio: 'ignore' });
  const fixedPort = await freePort();
  const controlPort = await freePort();
  const servers = [await serveStatic(path.join(X, 'out-fixed'), fixedPort), await serveStatic(path.join(X, 'out-control'), controlPort)];
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pulsedesk-'));
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=800,900', 'about:blank']);
  const out = {};
  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      await wait(250);
      try {
        target = (await httpJson(cdpPort, '/json/list')).find((p) => p.type === 'page');
      } catch {}
    }
    let arm = null;
    const events = {};
    const client = await connect(target.webSocketDebuggerUrl, (msg) => {
      const log = arm && (events[arm] = events[arm] || { console: [] });
      if (msg.method === 'Runtime.consoleAPICalled' && log && ['error', 'warning'].includes(msg.params.type)) {
        log.console.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
      } else if (msg.method === 'Runtime.exceptionThrown' && log) {
        log.console.push(`exception: ${(msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text}`.slice(0, 200));
      }
    });
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    for (let i = 0; i < 80; i++) {
      try {
        await httpJson(runtimePort, '/');
        break;
      } catch (e) {
        if (String(e).includes('JSON') || String(e).includes('Unexpected')) break;
        await wait(250);
      }
    }
    // Key events in a headless page need focus emulation on the same connection (CDP keys trap).
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    const STEPS = [
      ['S0 load', null],
      ['S1 Send, the field empty', { send: true }],
      ['S2 type Ada, Send', { text: 'Ada', send: true }],
      ['S3 Send again', { send: true }],
      ['S4 clear, Send', { clear: true, send: true }],
      ['S5 type Grace, Send', { text: 'Grace', send: true }]
    ];
    for (const [name, url] of [
      ['runtime', `http://127.0.0.1:${runtimePort}/`],
      ['export-control', `http://127.0.0.1:${controlPort}/`],
      ['export-fixed', `http://127.0.0.1:${fixedPort}/`]
    ]) {
      arm = name;
      out[name] = { steps: [] };
      events[name] = events[name] || { console: [] };
      for (const [step, act] of STEPS) {
        if (act === null) {
          await client.send('Page.navigate', { url });
          await wait(5000);
        } else {
          if (act.text !== undefined || act.clear) {
            const ok = await evaluate(client, `(() => { const f = ${FIELD}; if (!f) return false; f.focus(); f.select(); return true; })()`);
            if (!ok) {
              out[name].steps.push({ step, field: 'absent', lines: await evaluate(client, LINES) });
              continue;
            }
            if (act.clear) {
              for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
            } else {
              await client.send('Input.insertText', { text: act.text });
            }
            await wait(800);
          }
          // A real click at the button's centre, as a person's would be.
          const box = await evaluate(client, `(() => { const b = ${SEND}; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
          if (box === null) {
            out[name].steps.push({ step, send: 'absent', lines: await evaluate(client, LINES) });
            continue;
          }
          for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
          await wait(1500);
        }
        const lines = await evaluate(client, LINES);
        const field = await evaluate(client, `(() => { const f = ${FIELD}; return f ? f.value : null; })()`);
        out[name].steps.push({ step, field, lines });
        if (step.startsWith('S4')) {
          const shot = await client.send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(X, `shot-${name}-s4.png`), Buffer.from(shot.data, 'base64'));
        }
      }
      out[name].console = events[name].console;
    }
  } finally {
    browser.kill();
    runtime.kill();
    servers.forEach((s) => s.close());
  }
  fs.writeFileSync(path.join(X, 'readings.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
