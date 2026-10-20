// P18-S113-IDBINDREAD drive: bind-desk (both Records' Fetch unwired) in the runtime and in two exported builds, one
// real backend, one headless Chrome. Adapted from s113's drive. See EXPECTED.md (written first) and README.md.
// Run `python3 gen-bind-desk.py` and `./build.sh` first, then `node drive.cjs` from anywhere.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const X = __dirname;
const BACKEND = 'http://localhost:8594';
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

const backendTitle = async (id) => (await (await fetch(`${BACKEND}/classes/Page/${id}`)).json()).title;
const resetTitle = (id) =>
  fetch(`${BACKEND}/classes/Page/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Home' }) });

const LINES = `document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean)`;
/** Focus the input with this placeholder and select what it holds, so the next insertText replaces it. */
const FOCUS = (placeholder) => `(() => {
  const el = document.querySelector('input[placeholder="${placeholder}"]');
  if (!el) return false;
  el.focus();
  el.select();
  return document.activeElement === el;
})()`;
const CLICK = (label) => `(() => {
  const hits = [...document.querySelectorAll('button, [role="button"], div, span')].filter((el) => el.textContent.trim() === '${label}');
  const deepest = hits.find((el) => !hits.some((other) => other !== el && el.contains(other)));
  if (!deepest) return false;
  (deepest.closest('button') || deepest).click();
  return true;
})()`;

async function main() {
  const backend = spawn('node', [path.join(X, 'run-backend.cjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
  const backendLog = [];
  backend.stdout.on('data', (d) => backendLog.push(String(d)));
  backend.stderr.on('data', (d) => backendLog.push(String(d)));
  const seededFile = path.join(X, 'seeded-id.txt');
  if (fs.existsSync(seededFile)) fs.unlinkSync(seededFile);
  for (let i = 0; i < 120 && !fs.existsSync(seededFile); i++) await wait(250);
  if (!fs.existsSync(seededFile)) throw new Error(`backend did not seed:\n${backendLog.join('')}`);
  const id = fs.readFileSync(seededFile, 'utf8').trim();

  const { chrome } = findChrome();
  const runtimePort = await freePort();
  const runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(X, 'bind-desk'), '--port', String(runtimePort), '--backend-port', '8594'], { stdio: 'ignore' });
  const fixedPort = await freePort();
  const controlPort = await freePort();
  const servers = [await serveStatic(path.join(X, 'out-fixed'), fixedPort), await serveStatic(path.join(X, 'out-control'), controlPort)];
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'idbind-'));
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=800,800', 'about:blank']);
  const out = { seededId: id };
  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      await wait(250);
      try {
        target = (await httpJson(cdpPort, '/json/list')).find((p) => p.type === 'page');
      } catch {}
    }
    let failPuts = false;
    let arm = null;
    const events = {};
    const client = await connect(target.webSocketDebuggerUrl, (msg) => {
      const log = arm && (events[arm] = events[arm] || { requests: [], console: [], refused: 0 });
      if (msg.method === 'Network.requestWillBeSent' && log && msg.params.request.url.includes('/classes/Page')) {
        log.requests.push(`${msg.params.request.method} ${msg.params.request.url.replace(/^https?:\/\/[^/]+/, '')}`);
      } else if (msg.method === 'Runtime.consoleAPICalled' && log && ['error', 'warning'].includes(msg.params.type)) {
        log.console.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
      } else if (msg.method === 'Runtime.exceptionThrown' && log) {
        log.console.push(`exception: ${(msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text}`.slice(0, 200));
      } else if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        if (failPuts && request.method === 'PUT') {
          if (log) log.refused++;
          client.send('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' });
        } else {
          client.send('Fetch.continueRequest', { requestId });
        }
      }
    });
    await client.send('Page.enable');
    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await client.send('Fetch.enable', { patterns: [{ urlPattern: '*classes/Page*', requestStage: 'Request' }] });
    for (let i = 0; i < 80; i++) {
      try {
        await httpJson(runtimePort, '/');
        break;
      } catch (e) {
        if (String(e).includes('JSON') || String(e).includes('Unexpected')) break;
        await wait(250);
      }
    }
    const type = async (placeholder, text) => {
      if (!(await evaluate(client, FOCUS(placeholder)))) throw new Error(`no input "${placeholder}" in ${arm}`);
      await client.send('Input.insertText', { text });
    };
    for (const [name, url] of [
      ['runtime', `http://127.0.0.1:${runtimePort}/`],
      ['export-control', `http://127.0.0.1:${controlPort}/`],
      ['export-fixed', `http://127.0.0.1:${fixedPort}/`]
    ]) {
      await resetTitle(id);
      arm = name;
      failPuts = false;
      const reading = {};
      await client.send('Page.navigate', { url });
      await wait(3500);
      reading.D0 = await evaluate(client, LINES);
      await type('a page id', id);
      await wait(2500);
      reading.D1 = await evaluate(client, LINES);
      await type('a new title', 'Welcome');
      if (!(await evaluate(client, CLICK('Save')))) throw new Error(`no Save in ${arm}`);
      await wait(2500);
      reading.D2 = await evaluate(client, LINES);
      reading.D3 = { backendTitle: await backendTitle(id) };
      failPuts = true;
      await type('a new title', 'Gone');
      if (!(await evaluate(client, CLICK('Save')))) throw new Error(`no Save in ${arm}`);
      await wait(3000);
      reading.D4 = await evaluate(client, LINES);
      reading.D4backendTitle = await backendTitle(id);
      failPuts = false;
      // D5: a record nobody holds. D6: the held one again (the only cell that grades the unticked bind).
      await type('a page id', `${id}x`);
      await wait(2500);
      reading.D5 = await evaluate(client, LINES);
      await type('a page id', id);
      await wait(2500);
      reading.D6 = await evaluate(client, LINES);
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(X, `shot-${name}.png`), Buffer.from(shot.data, 'base64'));
      out[name] = { ...reading, ...events[name] };
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
