// P18-S115-QUERYPARAMS drive (session 116): params-desk in the runtime and in two exported builds, one real backend,
// one headless Chrome; five steps typed into the City box in each arm. Adapted from s115's drive. See EXPECTED.md
// (written first) and README.md. Run `python3 -I gen-params-desk.py`, the two emits (README) and `./build.sh` first.
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

async function main() {
  const backend = spawn('node', [path.join(X, 'run-backend.cjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
  const backendLog = [];
  backend.stdout.on('data', (d) => backendLog.push(String(d)));
  backend.stderr.on('data', (d) => backendLog.push(String(d)));
  const seeded = path.join(X, 'seeded.txt');
  if (fs.existsSync(seeded)) fs.unlinkSync(seeded);
  for (let i = 0; i < 120 && !fs.existsSync(seeded); i++) await wait(250);
  if (!fs.existsSync(seeded)) throw new Error(`backend did not seed:\n${backendLog.join('')}`);

  const { chrome } = findChrome();
  const runtimePort = await freePort();
  const runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(X, 'params-desk'), '--port', String(runtimePort), '--backend-port', '8596'], { stdio: 'ignore' });
  const fixedPort = await freePort();
  const controlPort = await freePort();
  const servers = [await serveStatic(path.join(X, 'out-fixed'), fixedPort), await serveStatic(path.join(X, 'out-control'), controlPort)];
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'paramsdesk-'));
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
      const log = arm && (events[arm] = events[arm] || { requests: [], console: [] });
      if (msg.method === 'Network.requestWillBeSent' && log && msg.params.request.url.includes('/classes/Contact')) {
        const { method, url, postData } = msg.params.request;
        log.requests.push({ method, path: url.replace(/^https?:\/\/[^/]+/, ''), body: postData === undefined ? undefined : JSON.parse(postData) });
      } else if (msg.method === 'Runtime.consoleAPICalled' && log && ['error', 'warning'].includes(msg.params.type)) {
        log.console.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
      } else if (msg.method === 'Runtime.exceptionThrown' && log) {
        log.console.push(`exception: ${(msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text}`.slice(0, 200));
      }
    });
    await client.send('Page.enable');
    await client.send('Network.enable');
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
    const BOX = `document.querySelector('input[placeholder="City"]')`;
    const STEPS = [
      ['S0 load', null],
      ['S1 type Berlin', { text: 'Berlin' }],
      ['S2 replace with Paris', { text: 'Paris' }],
      ['S3 clear', { clear: true }],
      ['S4 type Oslo', { text: 'Oslo' }]
    ];
    for (const [name, url] of [
      ['runtime', `http://127.0.0.1:${runtimePort}/`],
      ['export-control', `http://127.0.0.1:${controlPort}/`],
      ['export-fixed', `http://127.0.0.1:${fixedPort}/`]
    ]) {
      arm = name;
      out[name] = { steps: [] };
      for (const [step, act] of STEPS) {
        const log = (events[name] = events[name] || { requests: [], console: [] });
        const from = log.requests.length;
        if (act === null) {
          await client.send('Page.navigate', { url });
          await wait(5000);
        } else {
          const box = await evaluate(client, `(() => { const b = ${BOX}; if (!b) return false; b.focus(); b.select(); return true; })()`);
          if (!box) {
            out[name].steps.push({ step, box: 'absent', lines: await evaluate(client, LINES), requests: [] });
            continue;
          }
          if (act.clear) {
            for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
          } else {
            await client.send('Input.insertText', { text: act.text });
          }
          await wait(2500);
        }
        const lines = await evaluate(client, LINES);
        const value = await evaluate(client, `(() => { const b = ${BOX}; return b ? b.value : null; })()`);
        out[name].steps.push({ step, box: value, lines, requests: log.requests.slice(from) });
        const shot = await client.send('Page.captureScreenshot', { format: 'png' });
        if (step.startsWith('S1')) fs.writeFileSync(path.join(X, `shot-${name}-berlin.png`), Buffer.from(shot.data, 'base64'));
      }
      out[name].console = events[name].console;
    }
  } finally {
    browser.kill();
    runtime.kill();
    servers.forEach((s) => s.close());
    backend.kill('SIGTERM');
  }
  fs.writeFileSync(path.join(X, 'readings.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
