// Headless Chrome and the game's server, for the tools that need the running game (what.mjs, check.mjs). Not for
// tests: tests are drives (tools/drive.mjs).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const answers = async (url) => fetch(url).then(() => true, () => false);
async function freePort(from) {
  let p;
  do p = from + Math.floor(Math.random() * 400);
  while (await answers(`http://127.0.0.1:${p}/`));
  return p;
}

/** Serves `root` (tools/serve.mjs) on a free port. Returns { url, port, stop }. */
export async function startServer(root) {
  const port = await freePort(8900);
  const child = spawn(process.execPath, [path.join(here, 'serve.mjs'), '--root', root, '--port', String(port)], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await answers(`http://127.0.0.1:${port}/`)); i++) await sleep(100);
  return { url: `http://127.0.0.1:${port}/`, port, stop: () => child.kill() };
}

/** Opens `url` in headless Chrome. Returns { evaluate(js), waitFor(js, ms), errors, close }. */
export async function openPage(url, { width = 1600, height = 1000, dpr = 1 } = {}) {
  const port = await freePort(9500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'play-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  // The profile goes once Chrome has gone: removed while it still writes, the removal throws (2026-10-30).
  const tidy = () => {
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
    } catch {}
  };
  chrome.on('exit', tidy);
  const close = () => chrome.kill();
  process.on('exit', close);
  let page;
  for (let i = 0; i < 60 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {}
    if (!page) await sleep(200);
  }
  if (!page) throw new Error('headless Chrome did not start (inside a sandbox that forbids it?)');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map(), errors = [];
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id);
    else if (msg.method === 'Runtime.exceptionThrown') errors.push((msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 600));
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  await send('Page.navigate', { url });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  const waitFor = async (expression, ms = 60000) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      try {
        if (await evaluate(`!!(${expression})`)) return true;
      } catch {}
      await sleep(250);
    }
    return false;
  };
  return { evaluate, waitFor, errors, close: () => (ws.close(), close()) };
}
