/**
 * What the Bot Garden drives share: launch the shell (or an installed exe) against a throwaway GARDEN_HOME, talk CDP
 * to its window, quit it the way a person does, find any backend left running for a home, and WATCH THE WIRE (AC9:
 * every request's host must be 127.0.0.1). Plain Node 22 (global WebSocket), no dependencies.
 *
 * Forked from Nightbook's drive-lib.js (TPL-011-DESKTOP) for P105 CG-004; parameterised by shell/garden.json; the
 * CDP port moved off Nightbook's (9339) so the two drives cannot collide on one Mac; `watchNetwork` added.
 */
'use strict';

const { spawn, execFileSync } = require('child_process');
const net = require('net');
const path = require('path');

const HERE = __dirname;
const SHELL = path.join(HERE, 'shell');
const config = require('./shell/garden.json');
const ORIGIN = `http://127.0.0.1:${config.port}`;
const CDP_PORT = 9341;

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
  // What the page said: its errors and exceptions, for a failure to name (runtime warnings too — one found a bug, s3).
  const logs = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + String(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text).slice(0, 300));
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) logs.push(msg.params.type + ' ' + msg.params.args.map((a) => a.value || a.description).join(' ').slice(0, 300));
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
  send('Runtime.enable').catch(() => {});
  return { ws, send, evaluate, logs, close: () => ws.close() };
}

/** Taken = something already listens there. Measured by trying to listen, which works on every OS. */
function portListening(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(true));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(false)));
  });
}

/** Every app a drive launched, so a drive that fails can still shut them (an orphan holds the ports the next run needs). */
const launched = new Set();
function killAll() {
  for (const child of launched) {
    try {
      // The launcher (`electron`) spawns the app; killing the launcher alone left the app holding the ports.
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
  launched.clear();
}

async function launch(home, EXE, extraEnv = {}) {
  const env = { ...process.env, GARDEN_HOME: home, ...extraEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  const cmd = EXE || path.join(SHELL, 'node_modules', '.bin', 'electron');
  const args = EXE ? [`--remote-debugging-port=${CDP_PORT}`] : ['.', `--remote-debugging-port=${CDP_PORT}`];
  const t0 = Date.now();
  // Its own process group (not on Windows), so killAll can take the app with its launcher.
  const child = spawn(cmd, args, { cwd: SHELL, env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  launched.add(child);
  child.once('exit', () => launched.delete(child));
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});

  const target = await until(
    `the ${config.name} window`,
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

/**
 * AC9: every request the page makes, by host. Armed BEFORE the page loads anything the drive cares about (a window
 * opened after the event attributes nothing): call it right after `launch`, read `hosts()` at the end.
 */
async function watchNetwork(page) {
  const seen = new Map();
  const before = page.ws.onmessage;
  page.ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Network.requestWillBeSent') {
        const url = msg.params.request.url;
        let host = 'about';
        try {
          host = new URL(url).hostname || url.split(':')[0];
        } catch {
          host = url.split(':')[0];
        }
        seen.set(host, (seen.get(host) || 0) + 1);
      }
    } catch {
      // not ours
    }
    before(ev);
  };
  await page.send('Network.enable');
  return { hosts: () => Object.fromEntries(seen), offLoopback: () => [...seen.keys()].filter((h) => h !== '127.0.0.1' && h !== 'about' && h !== 'data' && h !== 'blob') };
}

/** Command lines of any process still serving this home's data. */
function backendsFor(home) {
  const out =
    process.platform === 'win32'
      ? execFileSync('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine }'], { encoding: 'utf8' })
      : execFileSync('ps', ['-Ao', 'pid,command'], { encoding: 'utf8' });
  return out.split(/\r?\n/).filter((l) => l.includes(path.join(home, 'userData', config.dataDirName)) && l.includes('cli.js'));
}

module.exports = { killAll, HERE, SHELL, config, ORIGIN, CDP_PORT, wait, until, connect, portListening, launch, quit, backendsFor, watchNetwork };
