// "Hold the id" drive (session 122): held-desk in the runtime and in two exported builds, one headless Chrome. s121's drive,
// no backend. See EXPECTED.md (written first) and README.md. `ARMS=runtime` drives the runtime alone.
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
const BUTTON = (label) => `[...document.querySelectorAll('button')].find((b) => b.innerText.trim() === ${JSON.stringify(label)})`;

async function main() {
  const arms = (process.env.ARMS || 'runtime,export-control,export-fixed').split(',');
  const { chrome } = findChrome();
  const runtimePort = await freePort();
  const runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(X, 'held-desk'), '--port', String(runtimePort)], { stdio: 'ignore' });
  const fixedPort = await freePort();
  const controlPort = await freePort();
  const servers = [];
  if (arms.includes('export-fixed')) servers.push(await serveStatic(path.join(X, 'out-fixed'), fixedPort));
  if (arms.includes('export-control')) servers.push(await serveStatic(path.join(X, 'out-control'), controlPort));
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'helddesk-'));
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=800,1100', 'about:blank']);
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
    const STEPS = [
      ['S0 load', null],
      ['S1 Remove', 'Remove'],
      ['S2 Pick b', 'Pick b'],
      ['S3 Remove', 'Remove'],
      ['S4 Pick nothing', 'Pick nothing'],
      ['S5 Remove', 'Remove']
    ];
    const urls = { runtime: `http://127.0.0.1:${runtimePort}/`, 'export-control': `http://127.0.0.1:${controlPort}/`, 'export-fixed': `http://127.0.0.1:${fixedPort}/` };
    for (const name of arms) {
      arm = name;
      out[name] = { steps: [] };
      events[name] = events[name] || { console: [] };
      for (const [step, label] of STEPS) {
        if (label === null) {
          await client.send('Page.navigate', { url: urls[name] });
          await wait(5000);
        } else {
          // A real click at the button's centre, as a person's would be.
          const box = await evaluate(client, `(() => { const b = ${BUTTON(label)}; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
          if (box === null) {
            out[name].steps.push({ step, button: 'absent', lines: await evaluate(client, LINES) });
            continue;
          }
          for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
          await wait(1500);
        }
        out[name].steps.push({ step, lines: await evaluate(client, LINES) });
        if (step.startsWith('S5')) {
          const shot = await client.send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(X, `shot-${name}-s5.png`), Buffer.from(shot.data, 'base64'));
        }
      }
      out[name].console = events[name].console;
    }
  } finally {
    browser.kill();
    runtime.kill();
    servers.forEach((s) => s.close());
  }
  if (arms.length === 3) fs.writeFileSync(path.join(X, 'readings.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
