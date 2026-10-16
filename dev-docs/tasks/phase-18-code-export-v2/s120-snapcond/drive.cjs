// EXP-011 §87 drive (session 120): gate-desk in the runtime and in two exported builds, one headless Chrome; eight presses
// in each arm. Adapted from s119's drive, with no backend. See EXPECTED.md (written first) and README.md. Copy the fixture
// to `gate-desk/`, run the two emits (README) and `./build.sh` first.
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

// Each Text by its own words: absent (no element holds them), hidden (visibility: hidden), or shown.
const TEXTS = { sent: 'It went', note: 'Not yet', live: 'The switch was on' };
const READ = `(() => {
  const out = {};
  for (const [k, words] of Object.entries(${JSON.stringify(TEXTS)})) {
    const el = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && e.textContent.trim() === words);
    out[k] = !el ? 'absent' : getComputedStyle(el).visibility === 'hidden' ? 'hidden' : 'shown';
  }
  return out;
})()`;
const BUTTON = (label) => `[...document.querySelectorAll('button, [role=button], div, span')].filter((b) => b.children.length === 0 && b.textContent.trim() === ${JSON.stringify(label)}).map((b) => b.closest('button') || b)[0]`;

async function main() {
  const { chrome } = findChrome();
  const runtimePort = await freePort();
  const runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(X, 'gate-desk'), '--port', String(runtimePort)], { stdio: 'ignore' });
  const fixedPort = await freePort();
  const controlPort = await freePort();
  const servers = [await serveStatic(path.join(X, 'out-fixed'), fixedPort), await serveStatic(path.join(X, 'out-control'), controlPort)];
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gatedesk-'));
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
    const STEPS = [['S0 load', null], ['S1 Show', 'Show'], ['S2 Hide', 'Hide'], ['S3 Both', 'Both'], ['S4 Show', 'Show'], ['S5 Flip', 'Flip'], ['S6 Check', 'Check'], ['S7 Flip', 'Flip'], ['S8 Check', 'Check']];
    for (const [name, url] of [
      ['runtime', `http://127.0.0.1:${runtimePort}/`],
      ['export-control', `http://127.0.0.1:${controlPort}/`],
      ['export-fixed', `http://127.0.0.1:${fixedPort}/`]
    ]) {
      arm = name;
      out[name] = { steps: [] };
      events[name] = events[name] || { console: [] };
      for (const [step, label] of STEPS) {
        if (label === null) {
          await client.send('Page.navigate', { url });
          await wait(5000);
        } else {
          // A real click at the button's centre, as a person's would be.
          const box = await evaluate(client, `(() => { const b = ${BUTTON(label)}; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
          if (box === null) {
            out[name].steps.push({ step, button: 'absent', texts: await evaluate(client, READ) });
            continue;
          }
          for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
          await wait(1200);
        }
        out[name].steps.push({ step, texts: await evaluate(client, READ) });
        if (step.startsWith('S6')) {
          const shot = await client.send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(X, `shot-${name}-s6.png`), Buffer.from(shot.data, 'base64'));
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
  for (const [name, arm] of Object.entries(out)) {
    console.log(name, arm.console.length ? `console: ${JSON.stringify(arm.console)}` : 'console clean');
    for (const s of arm.steps) console.log('  ', s.step.padEnd(10), JSON.stringify(s.texts), s.button ? 'button ' + s.button : '');
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
