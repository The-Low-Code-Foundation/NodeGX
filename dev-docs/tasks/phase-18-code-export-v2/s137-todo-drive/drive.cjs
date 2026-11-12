// EXP-021 AC1 drive: todo-list in the runtime and in two exported builds, one real backend, one headless Chrome.
// See EXPECTED.md (written first) and README.md. Run `./build.sh` first, then `node drive.cjs` from anywhere.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const X = __dirname;
const W = path.join(X, 'work');
const { findChrome, freePort, connect, evaluate, httpJson } = require(path.join(R, 'scripts/devtools/render-report.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The built app, every unknown path answered with index.html (BrowserRouter's paths: /sign-in, /todo). */
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

const LINES = `document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean)`;
const BUTTONS = `[...document.querySelectorAll('button')].map((b) => b.innerText.trim())`;
const PATH = `location.pathname`;
const HAS = (selector) => `!!document.querySelector(${JSON.stringify(selector)})`;
/** Focus the field and select what it holds, so the next insertText replaces it. */
const FOCUS = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.focus();
  el.select();
  return document.activeElement === el;
})()`;
/** The deepest element whose own text is exactly (or, with `prefix`, starts with) the label, clicked. */
const CLICK = (label, prefix = false) => `(() => {
  const want = ${JSON.stringify(label)};
  const hit = (el) => { const t = el.textContent.trim(); return ${prefix ? 't.startsWith(want)' : 't === want'}; };
  const hits = [...document.querySelectorAll('button, [role="button"], div, span, p')].filter(hit);
  const deepest = hits.find((el) => !hits.some((other) => other !== el && el.contains(other)));
  if (!deepest) return false;
  (deepest.closest('button') || deepest).click();
  return true;
})()`;

async function main() {
  const seededFile = path.join(X, 'seeded.json');
  if (fs.existsSync(seededFile)) fs.unlinkSync(seededFile);
  const backend = spawn('node', [path.join(X, 'run-backend.cjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
  const backendLog = [];
  backend.stdout.on('data', (d) => backendLog.push(String(d)));
  backend.stderr.on('data', (d) => backendLog.push(String(d)));
  for (let i = 0; i < 120 && !fs.existsSync(seededFile); i++) await wait(250);
  if (!fs.existsSync(seededFile)) throw new Error(`backend did not seed:\n${backendLog.join('')}`);
  const seeded = JSON.parse(fs.readFileSync(seededFile, 'utf8'));

  const { chrome } = findChrome();
  const runtimePort = await freePort();
  const runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(W, 'proj'), '--port', String(runtimePort), '--backend-port', '8597'], { stdio: 'ignore' });
  const headPort = await freePort();
  const fixedPort = await freePort();
  const servers = [await serveDist(path.join(W, 'export-head', 'dist'), headPort), await serveDist(path.join(W, 'export-fixed', 'dist'), fixedPort)];
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'todo137-'));
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,1400', 'about:blank']);
  const out = { seeded: seeded.ids, startedAt: new Date().toISOString() };
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
      if (!log) return;
      if (msg.method === 'Network.requestWillBeSent') {
        const url = msg.params.request.url;
        if (/\/(classes|login|users|functions|logout)\b/.test(url)) {
          log.requests.push(`${msg.params.request.method} ${url.replace(/^https?:\/\/[^/]+/, '').replace('/__backend', '').split('?')[0]}`);
        }
      } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        log.console.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 240));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        log.console.push(`exception: ${(msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text}`.slice(0, 240));
      }
    });
    await client.send('Page.enable');
    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    for (let i = 0; i < 120; i++) {
      try {
        await httpJson(runtimePort, '/');
        break;
      } catch (e) {
        if (String(e).includes('JSON') || String(e).includes('Unexpected')) break;
        await wait(250);
      }
    }
    const until = async (expr, ms = 20000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (await evaluate(client, expr)) return true;
        await wait(250);
      }
      return false;
    };
    const read = async () => ({ path: await evaluate(client, PATH), lines: await evaluate(client, LINES), buttons: await evaluate(client, BUTTONS) });
    const type = async (selector, text) => {
      if (!(await evaluate(client, FOCUS(selector)))) throw new Error(`no field ${selector} in ${arm}`);
      await client.send('Input.insertText', { text });
    };
    for (const [name, port] of [
      ['runtime', runtimePort],
      ['export-head', headPort],
      ['export-fixed', fixedPort]
    ]) {
      arm = name;
      const reading = {};
      try {
        await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
        reading.D0ready = await until(HAS('input[type="password"]'));
        reading.D0 = await read();
        await type('input[type="email"], input:not([type="password"])', seeded.email);
        await type('input[type="password"]', seeded.password);
        reading.D1pressed = await evaluate(client, CLICK('Sign in'));
        reading.D1left = await until(`!document.querySelector('input[type="password"]')`);
        await wait(5000);
        reading.D2 = await read();
        const shot = await client.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(X, `shot-D2-${name}.png`), Buffer.from(shot.data, 'base64'));
        for (const [step, label] of [
          ['D3', 'Done'],
          ['D4', 'Today'],
          ['D5', 'Log']
        ]) {
          const pressed = await evaluate(client, CLICK(label, true));
          await wait(2000);
          reading[step] = { pressed, ...(await read()) };
        }
      } catch (e) {
        reading.stoppedAt = String(e && e.stack ? e.stack : e).slice(0, 400);
      }
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
