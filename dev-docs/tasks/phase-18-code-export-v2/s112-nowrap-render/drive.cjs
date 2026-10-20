// P18-S110-NOWRAP render: the same four Texts in the runtime (render-from-disk) and in two exported builds (HEAD, patched).
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const S = __dirname;
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

const MEASURE = (selector) => `(async () => {
  for (let i = 0; i < 80 && document.querySelectorAll(${JSON.stringify(selector)}).length < 4; i++) await new Promise((r) => setTimeout(r, 100));
  return [...document.querySelectorAll(${JSON.stringify(selector)})].slice(0, 4).map((el) => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const r = el.getBoundingClientRect();
    return {
      text: JSON.stringify(el.textContent),
      whiteSpace: cs.whiteSpace,
      overflowWrap: cs.overflowWrap,
      textOverflow: cs.textOverflow,
      overflow: cs.overflowX,
      width: Math.round(r.width),
      lines: Math.round(r.height / lh),
      overflowsBox: el.scrollWidth > el.clientWidth + 1
    };
  });
})()`;

async function main() {
  const { chrome } = findChrome();
  const runtimePort = await freePort();
  const runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(S, 'wrap-desk'), '--port', String(runtimePort)], { stdio: 'ignore' });
  const headPort = await freePort();
  const workPort = await freePort();
  const servers = [await serveStatic(path.join(S, 'out-head'), headPort), await serveStatic(path.join(S, 'out-work'), workPort)];
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nowrap-'));
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=800,800', 'about:blank']);
  const out = {};
  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      await wait(250);
      try {
        target = (await httpJson(cdpPort, '/json/list')).find((p) => p.type === 'page');
      } catch {}
    }
    const client = await connect(target.webSocketDebuggerUrl, () => {});
    await client.send('Page.enable');
    for (let i = 0; i < 80; i++) {
      try {
        await httpJson(runtimePort, '/');
        break;
      } catch (e) {
        if (String(e).includes('JSON') || String(e).includes('Unexpected')) break;
        await wait(250);
      }
    }
    for (const [arm, url, selector] of [
      ['runtime', `http://127.0.0.1:${runtimePort}/`, '.ndl-visual-text'],
      ['export-HEAD', `http://127.0.0.1:${headPort}/`, 'p'],
      ['export-patched', `http://127.0.0.1:${workPort}/`, 'p']
    ]) {
      await client.send('Page.navigate', { url });
      await wait(2500);
      out[arm] = await evaluate(client, MEASURE(selector));
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(S, `shot-${arm}.png`), Buffer.from(shot.data, 'base64'));
    }
  } finally {
    browser.kill();
    runtime.kill();
    servers.forEach((s) => s.close());
  }
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
