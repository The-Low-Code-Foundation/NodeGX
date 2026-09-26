/**
 * What both Nightbook drives share: launch the shell (or an installed Nightbook.exe) against a
 * throwaway NIGHTBOOK_HOME, talk CDP to its window, quit it the way a person does, and find any
 * backend left running for a home. Plain Node 22 (global WebSocket), no dependencies.
 *
 * Moved here unchanged from drive-spike.js (DESK-1) when the page-designer drive needed the same
 * launch and quit; `launch` now takes the exe instead of reading argv.
 */
'use strict';

const { spawn, execFileSync } = require('child_process');
const net = require('net');
const path = require('path');

const HERE = __dirname;
const SHELL = path.join(HERE, 'shell');
const config = require('./shell/nightbook.json');
const ORIGIN = `http://127.0.0.1:${config.port}`;
const CDP_PORT = 9339;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(label, read, ok, ms = 30_000) {
  const deadline = Date.now() + ms;
  let last = await read();
  while (!ok(last)) {
    if (Date.now() > deadline) throw new Error(`${label}: gave up after ${ms}ms; last reading ${JSON.stringify(last).slice(0, 400)}`);
    await wait(300);
    last = await read();
  }
  return last;
}

// ── A minimal CDP client ────────────────────────────────────────────────────

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.text}`);
    return r.result.value;
  };
  return { ws, send, evaluate, close: () => ws.close() };
}

/** Taken = something already listens there. Measured by trying to listen, which works on every OS. */
function portListening(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(true));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(false)));
  });
}

async function launch(home, EXE) {
  const env = { ...process.env, NIGHTBOOK_HOME: home };
  delete env.ELECTRON_RUN_AS_NODE;
  const cmd = EXE || path.join(SHELL, 'node_modules', '.bin', 'electron');
  const args = EXE ? [`--remote-debugging-port=${CDP_PORT}`] : ['.', `--remote-debugging-port=${CDP_PORT}`];
  const t0 = Date.now();
  const child = spawn(cmd, args, { cwd: SHELL, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});

  const target = await until(
    'the Nightbook window',
    async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
        const list = await res.json();
        return list.find((t) => t.type === 'page' && t.url.startsWith(ORIGIN)) || null;
      } catch {
        return null;
      }
    },
    (t) => !!t,
    120_000
  );
  const page = await connect(target.webSocketDebuggerUrl);
  const version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  return { child, page, browserWs: version.webSocketDebuggerUrl, t0 };
}

async function quit(app) {
  app.page.close();
  const exited = new Promise((r) => app.child.once('exit', (code, signal) => r({ code, signal })));
  try {
    const b = await connect(app.browserWs);
    b.send('Browser.close').catch(() => {});
    setTimeout(() => b.close(), 500);
  } catch {
    // fall through to the timeout below
  }
  const res = await Promise.race([exited, wait(15_000).then(() => null)]);
  if (res) return { how: 'Browser.close', ...res };
  app.child.kill('SIGTERM');
  return { how: 'SIGTERM after 15s', ...(await exited) };
}

/** Command lines of any process still serving this home's book. */
function backendsFor(home) {
  const out =
    process.platform === 'win32'
      ? execFileSync('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine }'], { encoding: 'utf8' })
      : execFileSync('ps', ['-Ao', 'pid,command'], { encoding: 'utf8' });
  return out.split(/\r?\n/).filter((l) => l.includes(path.join(home, 'userData', 'book')) && l.includes('cli.js'));
}

module.exports = { HERE, SHELL, config, ORIGIN, CDP_PORT, wait, until, connect, portListening, launch, quit, backendsFor };
