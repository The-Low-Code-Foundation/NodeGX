'use strict';
/**
 * The backend under measurement: start it, scrape it, stop it, kill it.
 *
 * 🔴 **A separate process, launched through `bin/nodegx-backend.js`, and both
 * halves of that matter.**
 *
 * *Separate*, because PRD-004 §3.4 asks for resident memory and CPU readings
 * about the backend. A harness that booted `BackendService` in its own process
 * would share a heap and an event loop with the load generator, and every one
 * of those numbers would be about the pair.
 *
 * *Through the bin*, because the bin runs `dist/`, which is the artefact a
 * deploy target runs. Driving `src/` through ts-node would measure a
 * transpiled-on-the-fly build nobody ships.
 *
 * @module nodegx-backend/scripts/soak/backend
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..', '..', '..');
const BIN = path.join(PKG_ROOT, 'bin', 'nodegx-backend.js');

/** Resolve after `ms`. */
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start a backend on `dataDir` and wait until `/health` answers.
 *
 * `--parent-pid` is passed so the child dies with this harness even if the
 * harness is force-killed — a soak that leaves an orphaned backend holding a
 * port is the next run's mystery.
 */
async function start({ dataDir, port, backendId = 'soak', env = {}, quiet = true }) {
  fs.mkdirSync(dataDir, { recursive: true });

  const child = spawn(
    process.execPath,
    [
      BIN,
      'serve',
      '--data-dir',
      dataDir,
      '--port',
      String(port),
      '--backend-id',
      backendId,
      '--backend-name',
      'PRD-004 soak',
      '--parent-pid',
      String(process.pid)
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODEGX_LOG_LEVEL: quiet ? 'warn' : 'info', ...env }
    }
  );

  const log = [];
  const collect = (chunk) => {
    log.push(String(chunk));
    if (log.length > 400) log.shift();
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  let exited = null;
  child.on('exit', (code, signal) => {
    exited = { code, signal };
  });

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (exited) {
      throw new Error(
        `backend exited before it was ready (code=${exited.code} signal=${exited.signal}).\n` +
          log.join('')
      );
    }
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) break;
    } catch {
      /* not listening yet */
    }
    if (Date.now() > deadline) {
      throw new Error(`backend did not answer /health on ${base} within 60s.\n${log.join('')}`);
    }
    await settle(200);
  }

  return {
    base,
    dataDir,
    pid: child.pid,
    child,
    /** Everything the child has written, for a failure message that says why. */
    log: () => log.join(''),
    hasExited: () => exited !== null,

    /** Graceful stop. Returns once the process is gone. */
    async stop() {
      if (exited) return;
      child.kill('SIGTERM');
      const until = Date.now() + 20_000;
      while (!exited && Date.now() < until) await settle(100);
      if (!exited) {
        child.kill('SIGKILL');
        while (!exited) await settle(100);
      }
    },

    /**
     * PRD-D5's instrument: no warning, no handlers, no flush. The question is
     * what the execution record looks like after exactly this.
     */
    async sigkill() {
      if (exited) return;
      child.kill('SIGKILL');
      while (!exited) await settle(50);
    }
  };
}

// ============================================================================
// /metrics
// ============================================================================

/**
 * Parse Prometheus exposition into something addressable.
 *
 * Counters and histograms carry labels, so a sample's key is the full
 * `name{labels}` string as rendered; `sum(prefix)` adds every series whose
 * name matches, which is how `nodegx_requests_total` across route classes
 * becomes one number.
 */
function parseMetrics(text) {
  const samples = new Map();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const at = line.lastIndexOf(' ');
    if (at < 0) continue;
    const key = line.slice(0, at);
    const value = Number(line.slice(at + 1));
    if (Number.isFinite(value)) samples.set(key, value);
  }
  return {
    samples,
    /** One series by exact name (no labels). */
    get: (name) => (samples.has(name) ? samples.get(name) : null),
    /** Every series whose name is `name`, summed across label sets. */
    sum: (name) => {
      let total = 0;
      let seen = false;
      for (const [key, value] of samples) {
        if (key === name || key.startsWith(`${name}{`)) {
          total += value;
          seen = true;
        }
      }
      return seen ? total : null;
    }
  };
}

/** Scrape `/metrics`. Loopback is permitted by `metrics.allowLoopback`, on by default. */
async function scrape(base) {
  const res = await fetch(`${base}/metrics`);
  if (!res.ok) throw new Error(`GET /metrics answered ${res.status}`);
  return parseMetrics(await res.text());
}

/**
 * The backend's own CPU and memory, read from its `/metrics` rather than from
 * `ps`.
 *
 * 🔴 This is the reading AC3 turns on. "Latency rising while CPU is not
 * saturated" is the write-serialisation signature, and it is only a signature
 * if the CPU number belongs to the process doing the serialising — not to the
 * box, which is also running the load generator.
 */
function processReading(metrics) {
  return {
    cpuSeconds: metrics.get('process_cpu_seconds_total'),
    rssBytes: metrics.get('process_resident_memory_bytes'),
    heapBytes: metrics.get('nodejs_heap_used_bytes'),
    dbBytes: metrics.get('nodegx_db_file_bytes'),
    executionsDbBytes: metrics.get('nodegx_executions_db_file_bytes'),
    realtimeConnections: metrics.get('nodegx_realtime_connections'),
    refusals: metrics.sum('nodegx_ratelimit_refusals_total') || 0,
    requests: metrics.sum('nodegx_requests_total') || 0
  };
}

module.exports = { start, scrape, parseMetrics, processReading, settle, PKG_ROOT };
