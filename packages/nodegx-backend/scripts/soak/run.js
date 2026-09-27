#!/usr/bin/env node
'use strict';
/**
 * PRD-004 — the number we do not have.
 *
 * `docs/runtime/SCALING.md` deliberately publishes no requests/second figure,
 * and says so in its Honest limits, because none had ever been measured. The
 * claim the product rested on instead was inherited from phase 48 — *"fine to
 * low thousands of active tenants; a cliff, not a wall"* — and that is an
 * estimate. This is the harness that replaces it with a measurement.
 *
 * It is in the repository rather than in a session's scratch directory for the
 * same two reasons `migrate-bench.js` is: the number will be re-taken on other
 * hardware and after other changes, and **a benchmark nobody can re-run is a
 * number nobody can check** (AC7).
 *
 * ## What it does
 *
 *   1. Starts the **shipped** backend — `bin/nodegx-backend.js`, so `dist/`, in
 *      its own process — on a fresh data directory.
 *   2. Declares five conference-shaped collections **with their indexes** and
 *      seeds them to a recorded row count (§3.2).
 *   3. Drives a mixed read/write workload up a concurrency ladder and finds the
 *      knee (AC2).
 *   4. Repeats writes-only, against the backend's own CPU reading, for the
 *      write-serialisation signature (AC3).
 *   5. Measures request latency while a heavy scheduled workflow runs in the
 *      same process, against the same figure with the scheduler idle (AC4).
 *   6. Holds open SSE streams against `realtimeMaxConnections` (§3.4).
 *   7. Watches resident memory return — or not — to baseline (§3.4).
 *   8. `SIGKILL`s the backend mid-run and reads the execution record
 *      afterwards, which is the whole of PRD-D5 (AC6).
 *
 * ## Running it
 *
 *   node scripts/soak/run.js --out ./soak-results/run-1
 *   node scripts/soak/run.js --scale 0.02 --levels 1,4 --seconds 5   # smoke
 *
 * 🔴 **Not beside other heavy work** (§5). A soak competing with a test suite
 * measures the contention. The script refuses to start if it can see a jest,
 * vitest or Electron process running, unless `--i-know` is passed.
 *
 * 🔴 **The page cap stays on, at its shipped numbers, always.** PRD-001 made
 * `queries.defaultLimit`/`maxLimit` what bounds a single response, so a number
 * measured with the cap off would describe a product we do not ship. There is
 * no flag to turn it off here, and that is on purpose.
 *
 * Rate limiting is the one thing that IS a flag, and the README says why: with
 * the shipped budgets the first thing to move is the rate limiter, which is a
 * true fact about the product and a useless one about the backend. Both arms
 * are worth running; `--rate-limit on` measures the product's refusal point,
 * `off` (the default) measures the backend behind it.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const backend = require('./lib/backend');
const dataset = require('./lib/dataset');
const driver = require('./lib/drive');
const heavy = require('./lib/heavyjob');

const { settle } = backend;

// ============================================================================
// Arguments
// ============================================================================

function parseArgs(argv) {
  const out = {
    out: null,
    dataDir: null,
    port: 8677,
    scale: 1,
    users: 2000,
    levels: [1, 2, 4, 8, 16, 32, 64, 128],
    seconds: 20,
    warmup: 3,
    rateLimit: false,
    arms: ['ramp', 'writers', 'scheduled', 'realtime', 'memory', 'kill'],
    keep: false,
    iKnow: false,
    heavyBudgetMs: 45_000,
    sseTargets: [50, 200, 500]
  };
  const list = (v) => String(v).split(',').map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case '--out': out.out = next(); break;
      case '--data-dir': out.dataDir = next(); break;
      case '--port': out.port = parseInt(next(), 10); break;
      case '--scale': out.scale = Number(next()); break;
      case '--users': out.users = parseInt(next(), 10); break;
      case '--levels': out.levels = list(next()).map(Number); break;
      case '--seconds': out.seconds = parseInt(next(), 10); break;
      case '--warmup': out.warmup = parseInt(next(), 10); break;
      case '--rate-limit': out.rateLimit = next() === 'on'; break;
      case '--arms': out.arms = list(next()); break;
      case '--heavy-budget-ms': out.heavyBudgetMs = parseInt(next(), 10); break;
      case '--sse': out.sseTargets = list(next()).map(Number); break;
      case '--keep': out.keep = true; break;
      case '--i-know': out.iKnow = true; break;
      case '--help':
      case '-h':
        process.stdout.write(require('fs').readFileSync(__filename, 'utf-8').split('*/')[0] + '\n');
        process.exit(0);
        break;
      default:
        throw new Error(`unknown option: ${argv[i]}`);
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (!out.out) out.out = path.join(process.cwd(), 'soak-results', stamp);
  if (!out.dataDir) out.dataDir = path.join(os.tmpdir(), `nodegx-soak-${stamp}`);
  return out;
}

/**
 * §5, enforced rather than written down.
 *
 * A ceiling measured while somebody else's suite is compiling is a number about
 * the suite, and this box routinely has two or three sessions on it.
 *
 * 🔴 **It blocks on CPU, not on names.** The first version matched
 * `Electron.app` and refused to start because four *idle* stdio MCP servers
 * were sitting at 0.0% CPU — which would have trained everyone to pass
 * `--i-know` permanently, and a guard everyone overrides is not a guard. A
 * matching process consuming real CPU blocks; a matching process that is idle
 * is recorded in the report and allowed, because it is not contending for
 * anything.
 */
function assertQuietBox(iKnow) {
  const IDLE_PERCENT = 5;
  let contending = [];
  let idle = [];
  try {
    const ps = execFileSync('ps', ['-eo', 'pid,%cpu,etime,command'], { encoding: 'utf-8' });
    for (const line of ps.split('\n')) {
      // 🔴 The name list is not the point — CPU is. It was written as
      // jest/vitest/webpack/tsc/Electron and then missed a peer's repo-wide
      // `grep -ril` pinning a whole core, which is exactly the contention this
      // guard exists to catch. Anything that plausibly saturates a core belongs
      // here, and the CPU threshold below is what keeps the list from being
      // over-eager.
      if (!/(jest|vitest|webpack|tsc |esbuild|Electron\.app|\b(grep|ugrep|rg|ripgrep|find|node|python3?)\b)/.test(line)) continue;
      if (/soak\/run\.js/.test(line)) continue;
      if (new RegExp(`^\\s*${process.pid}\\s`).test(line)) continue;
      const cpu = parseFloat(line.trim().split(/\s+/)[1]);
      const row = { cpu: Number.isFinite(cpu) ? cpu : null, line: line.trim().slice(0, 120) };
      if (row.cpu !== null && row.cpu < IDLE_PERCENT) idle.push(row);
      else contending.push(row);
    }
  } catch {
    // No `ps`: say the box was not checked rather than pretend it was quiet.
    contending = [{ cpu: null, line: '(could not run ps — the box was NOT checked)' }];
  }

  const loadAverage = os.loadavg().map((n) => Number(n.toFixed(2)));
  const result = { checked: true, busy: contending, idleMatches: idle, loadAverage };

  if (!contending.length) return result;
  const message =
    `The box is not quiet — ${contending.length} process(es) using CPU that would contend with this run:\n` +
    contending.slice(0, 8).map((r) => `  ${r.cpu ?? '?'}%  ${r.line}`).join('\n') +
    `\n\nPRD-004 §5: a soak competing with other heavy work measures the contention.\n` +
    `Wait for the box, or pass --i-know to record the number WITH this noted in the report.`;
  if (!iKnow) throw new Error(message);
  process.stderr.write(`\n!! ${message}\n\n`);
  return result;
}

// ============================================================================
// Small helpers
// ============================================================================

const say = (msg) => process.stdout.write(`${msg}\n`);

function opsConfig({ rateLimit }) {
  return {
    version: 1,
    logging: { level: 'warn', format: 'json', requests: false },
    rateLimit: { enabled: rateLimit },
    metrics: { enabled: true, allowLoopback: true }
    // `queries` is deliberately absent: the shipped defaults apply, and there
    // is no way to ask this harness for a number measured without the cap.
  };
}

const adminTokenOf = (dataDir) =>
  JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;

/** CPU cores consumed by the BACKEND between two scrapes. */
function coresUsed(before, after, wallSeconds) {
  if (before.cpuSeconds === null || after.cpuSeconds === null || !wallSeconds) return null;
  return Number(((after.cpuSeconds - before.cpuSeconds) / wallSeconds).toFixed(2));
}

/** Everything the report needs about one measured window. */
async function window_(base, run) {
  const before = backend.processReading(await backend.scrape(base));
  const result = await run();
  const after = backend.processReading(await backend.scrape(base));
  return {
    ...result,
    cores: coresUsed(before, after, result.wallSeconds),
    refusalsDelta: after.refusals - before.refusals,
    rssBytes: after.rssBytes,
    dbBytes: after.dbBytes
  };
}

// ============================================================================
// The arms
// ============================================================================

/** AC2 — the knee, on the mixed workload. */
async function armRamp(ctx) {
  const levels = [];
  for (const concurrency of ctx.opts.levels) {
    say(`  ramp: concurrency ${concurrency}`);
    const measured = await window_(ctx.base, () =>
      driver.drive({
        base: ctx.base,
        users: ctx.users,
        counts: ctx.counts,
        concurrency,
        seconds: ctx.opts.seconds,
        warmupSeconds: ctx.opts.warmup,
        mix: { read: 85, write: 15 }
      })
    );
    levels.push(measured);
    say(
      `    ${measured.throughput} req/s  p50 ${measured.latency.p50}ms  p95 ${measured.latency.p95}ms  ` +
        `p99 ${measured.latency.p99}ms  cores ${measured.cores}  errors ${measured.errors}  429s ${measured.refusals}`
    );
  }
  return { levels, ...analyse(levels) };
}

/**
 * Where the knee is, and which signal moved first.
 *
 * 🔴 Both of these are *derived and labelled as derived*. The levels table is
 * the measurement; this is a reading of it, and a reader who disagrees with the
 * threshold can apply their own to the same rows.
 */
function analyse(levels) {
  const usable = levels.filter((l) => l.latency.p95 !== null);
  if (usable.length < 2) return { knee: null, firstSignal: null };
  const baseline = usable[0];
  const peakThroughput = Math.max(...usable.map((l) => l.throughput));

  // The knee: the first level whose p95 is 3x the baseline's AND which is no
  // longer buying throughput for it.
  let knee = null;
  for (let i = 1; i < usable.length; i++) {
    const level = usable[i];
    const brokeLatency = level.latency.p95 > baseline.latency.p95 * 3;
    const boughtNothing = level.throughput <= usable[i - 1].throughput * 1.1;
    if (brokeLatency && boughtNothing) {
      knee = {
        concurrency: level.concurrency,
        throughput: level.throughput,
        p95: level.latency.p95,
        rule: 'first level with p95 > 3x the concurrency-1 p95 AND < 10% more throughput than the level below'
      };
      break;
    }
  }

  // Which of SCALING.md's six signals moved first.
  const first = [];
  for (const level of usable) {
    if (level.refusals > 0) { first.push({ signal: '4 — rate-limit refusals', at: level.concurrency }); break; }
  }
  for (const level of usable) {
    const reads = ['programme', 'exhibitors', 'my-day', 'profile-read'].map((n) => level.perOp[n]).filter(Boolean);
    const writes = ['save-to-my-day', 'profile-rewrite'].map((n) => level.perOp[n]).filter(Boolean);
    if (!reads.length || !writes.length) continue;
    const readP95 = Math.max(...reads.map((r) => r.p95));
    const writeP95 = Math.max(...writes.map((w) => w.p95));
    if (writeP95 > readP95 * 2 && level.cores !== null && level.cores < 0.9) {
      first.push({ signal: '5 — write-bound with CPU unsaturated', at: level.concurrency, readP95, writeP95, cores: level.cores });
      break;
    }
  }
  for (const level of usable) {
    if (level.latency.p95 > baseline.latency.p95 * 3) {
      first.push({ signal: '1/3 — request duration', at: level.concurrency });
      break;
    }
  }
  first.sort((a, b) => a.at - b.at);
  return { knee, peakThroughput, firstSignal: first[0] || null, signals: first };
}

/**
 * AC3 — the write-serialisation reading, taken separately from the knee.
 *
 * SQLite is a single-writer database with WAL on: many concurrent readers, one
 * writer at a time. The signature of having reached that ceiling is latency
 * climbing with concurrency **while CPU is not saturated** — which is why this
 * arm reports the backend's own core usage beside every level, and why it is a
 * separate arm rather than a column in the ramp: a mixed workload's reads hide
 * it.
 */
async function armWriters(ctx) {
  const levels = [];
  for (const concurrency of ctx.opts.levels) {
    say(`  writers: concurrency ${concurrency}`);
    const measured = await window_(ctx.base, () =>
      driver.drive({
        base: ctx.base,
        users: ctx.users,
        counts: ctx.counts,
        concurrency,
        seconds: ctx.opts.seconds,
        warmupSeconds: ctx.opts.warmup,
        mix: { read: 0, write: 100 }
      })
    );
    levels.push(measured);
    say(
      `    ${measured.throughput} writes/s  p95 ${measured.latency.p95}ms  cores ${measured.cores}  errors ${measured.errors}`
    );
  }
  const serialising = levels.filter((l) => l.cores !== null && l.cores < 0.9 && l.latency.p95 !== null);
  return {
    levels,
    reading:
      serialising.length >= 2 &&
      serialising[serialising.length - 1].latency.p95 > serialising[0].latency.p95 * 2
        ? 'write-serialisation visible: p95 more than doubled across the ladder with the backend under 0.9 cores'
        : 'no clean write-serialisation signature in this ladder — read the levels table before concluding anything'
  };
}

/** AC4 — request latency during a heavy scheduled run, against the same figure idle. */
async function armScheduled(ctx) {
  const concurrency = ctx.opts.levels[Math.floor(ctx.opts.levels.length / 2)] || 8;
  const one = (label) =>
    window_(ctx.base, () =>
      driver.drive({
        base: ctx.base,
        users: ctx.users,
        counts: ctx.counts,
        concurrency,
        seconds: ctx.opts.seconds,
        warmupSeconds: ctx.opts.warmup,
        mix: { read: 85, write: 15 }
      })
    ).then((r) => ({ ...r, label }));

  say(`  scheduled: baseline at concurrency ${concurrency}, scheduler idle`);
  const idle = await one('scheduler idle');

  say('  scheduled: arming the heavy ingest');
  await heavy.setArmed(ctx.base, ctx.adminToken, true);
  // The catch-up fire is due the moment it arms; give it a moment to be under
  // way, so the window measures the job running rather than the job starting.
  await settle(2000);

  const during = await one('heavy scheduled run');
  await heavy.setArmed(ctx.base, ctx.adminToken, false);

  const delta =
    idle.latency.p95 && during.latency.p95
      ? {
          p95Idle: idle.latency.p95,
          p95During: during.latency.p95,
          multiple: Number((during.latency.p95 / idle.latency.p95).toFixed(2)),
          throughputIdle: idle.throughput,
          throughputDuring: during.throughput
        }
      : null;

  // 🔴 Prove the heavy job actually ran. A workflow that errored in its first
  // node would leave an execution record, contend with nothing, and produce a
  // delta of ~1.0 that reads as "a scheduled job costs you nothing" — the most
  // expensive wrong conclusion this arm could reach. So the record's STATUS is
  // read, not merely its existence.
  const body = await fetch(`${ctx.base}/executions?limit=20`, {
    headers: { authorization: `Bearer ${ctx.adminToken}` }
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const runs = body ? body.results || body.executions || (Array.isArray(body) ? body : []) : [];
  const heavyRuns = runs.map((r) => ({ status: r.status, completedAt: r.completedAt || null, error: r.error || null }));
  // 🔴 A run still marked `running` is the INTENDED state, not a failure.
  // The first version of this check demanded `success` and flagged a perfectly
  // good measurement, because the job's budget deliberately outlasts the
  // measurement window — a job that finished early would have stopped
  // contending halfway through. What actually invalidates the delta is a job
  // that errored instantly, or no run at all.
  const ranCleanly = heavyRuns.filter((r) => r.status === 'running' || r.status === 'success').length;

  return {
    concurrency,
    idle,
    during,
    delta,
    heavyRuns,
    ranCleanly,
    trustworthy: ranCleanly > 0,
    caveat:
      ranCleanly > 0
        ? null
        : 'NO heavy run was running or successful during this window — the delta below is not evidence that a scheduled job is cheap. Read heavyRuns.'
  };
}

/**
 * §3.4 — actual simultaneous SSE streams sustained, against `realtimeMaxConnections`.
 *
 * 🔴 **`Accept: text/event-stream` is not optional, and the first version of
 * this arm was wrong without it.** `GET /realtime` sent without that header
 * answers `200` with a JSON *hint* telling you how to open a stream — and opens
 * nothing. A client counting 2xx therefore reported twenty open streams while
 * `nodegx_realtime_connections` read 0. The gauge was right.
 *
 * So two things here are deliberate: the request declares the header, and a
 * stream is only counted as open if the response is actually
 * `content-type: text/event-stream`. The gauge is then read as an independent
 * witness and a disagreement is reported rather than smoothed over — the
 * harness has already been wrong about this once.
 */
async function armRealtime(ctx) {
  const results = [];
  for (const target of ctx.opts.sseTargets) {
    say(`  realtime: opening ${target} streams`);
    const controllers = [];
    let opened = 0;
    let refused = 0;
    let notAStream = 0;
    for (let i = 0; i < target; i++) {
      const controller = new AbortController();
      controllers.push(controller);
      try {
        const res = await fetch(`${ctx.base}/realtime`, {
          headers: { accept: 'text/event-stream' },
          signal: controller.signal
        });
        const isStream = (res.headers.get('content-type') || '').includes('text/event-stream');
        if (res.ok && res.body && isStream) {
          opened++;
          // Drain in the background. A stream nobody reads back-pressures and
          // stops being an open stream.
          const reader = res.body.getReader();
          (async () => {
            try {
              for (;;) {
                const { done } = await reader.read();
                if (done) break;
              }
            } catch {
              /* aborted at teardown */
            }
          })();
        } else if (res.status === 503) {
          refused++;
          await res.arrayBuffer();
        } else {
          notAStream++;
          await res.arrayBuffer();
        }
      } catch {
        refused++;
      }
    }
    await settle(1500);
    const reading = backend.processReading(await backend.scrape(ctx.base));
    const gauge = reading.realtimeConnections;
    const agrees = gauge === null ? null : Math.abs(gauge - opened) <= Math.max(1, opened * 0.02);
    results.push({
      target,
      opened,
      refused,
      notAStream,
      gaugeReads: gauge,
      gaugeAgrees: agrees,
      rssBytes: reading.rssBytes
    });
    say(
      `    opened ${opened}, refused ${refused}, not-a-stream ${notAStream}, gauge ${gauge}` +
        (agrees === false ? '  <-- GAUGE DISAGREES WITH THE CLIENT' : '')
    );
    for (const c of controllers) c.abort();
    await settle(1000);
  }
  return {
    cap: 500,
    note: 'cap is `rateLimit.realtimeMaxConnections`, shipped default 500; a stream is counted only when the response content-type is text/event-stream',
    results
  };
}

/** §3.4 — does resident memory return to baseline after load? */
async function armMemory(ctx) {
  const baseline = backend.processReading(await backend.scrape(ctx.base));
  say('  memory: driving a load burst');
  const under = await driver.drive({
    base: ctx.base,
    users: ctx.users,
    counts: ctx.counts,
    concurrency: Math.max(...ctx.opts.levels),
    seconds: ctx.opts.seconds,
    warmupSeconds: 1,
    mix: { read: 85, write: 15 }
  });
  const peak = backend.processReading(await backend.scrape(ctx.base));
  say('  memory: idling 45s');
  await settle(45_000);
  const settled = backend.processReading(await backend.scrape(ctx.base));
  return {
    baselineRss: baseline.rssBytes,
    peakRss: peak.rssBytes,
    settledRss: settled.rssBytes,
    burstThroughput: under.throughput,
    returnedToBaseline:
      baseline.rssBytes && settled.rssBytes ? settled.rssBytes <= baseline.rssBytes * 1.25 : null,
    note: 'a settled RSS within 25% of baseline is "returned"; V8 does not hand every page back and should not be expected to'
  };
}

/**
 * AC6 / PRD-D5 — what does the record of an interrupted run look like?
 *
 * The scoping session could not tell whether a killed run leaves a record stuck
 * in a non-terminal state or **no record at all**: the status vocabulary reads
 * as `success | error`, and records may only be written at completion. README
 * §8 predicts stuck-then-recovered. One deliberate `SIGKILL` settles it, and if
 * runs vanish that is its own defect and gets filed.
 *
 * 🔴 The kill lands while a run is genuinely in flight — the arm waits to SEE a
 * running record before killing, rather than killing on a timer and hoping.
 */
async function armKill(ctx) {
  say('  kill: arming the heavy ingest');
  await heavy.setArmed(ctx.base, ctx.adminToken, true);

  const executions = async (base) => {
    const res = await fetch(`${base}/executions?limit=25`, {
      headers: { authorization: `Bearer ${ctx.adminToken}` }
    });
    if (!res.ok) return [];
    const body = await res.json();
    return body.results || body.executions || (Array.isArray(body) ? body : []);
  };

  let target = null;
  const deadline = Date.now() + 90_000;
  for (;;) {
    const runs = await executions(ctx.base);
    target = runs.find((r) => !r.completedAt) || null;
    if (target) break;
    if (Date.now() > deadline) {
      await heavy.setArmed(ctx.base, ctx.adminToken, false);
      return { answered: false, why: 'no run was in flight within 90s; nothing was killed' };
    }
    await settle(500);
  }

  const before = { id: target.id || target.objectId, status: target.status, completedAt: target.completedAt || null };
  say(`  kill: SIGKILL with run ${before.id} in flight (status "${before.status}")`);
  await ctx.server.sigkill();

  say('  kill: restarting on the same data directory');
  const restarted = await backend.start({ dataDir: ctx.opts.dataDir, port: ctx.opts.port, backendId: 'soak' });
  ctx.server = restarted;
  ctx.base = restarted.base;

  // Give the restarted service a moment to do whatever recovery it does.
  await settle(5000);
  const after = (await executions(restarted.base)).find((r) => (r.id || r.objectId) === before.id) || null;

  // Leave the schedule disarmed so the rest of the report is not measured
  // beside a heavy job nobody asked for.
  try {
    await heavy.setArmed(restarted.base, adminTokenOf(ctx.opts.dataDir), false);
  } catch {
    /* the trigger may have been mid-write when the process died; the finding is above */
  }

  return {
    answered: true,
    before,
    // 🔴 `errorMessage`, not `error`. Reading the wrong field name here produced
    // a confident "the record does not say why it failed" — an absence invented
    // by the reader. The record says exactly why, and `metadata.interrupted`
    // marks it as a restart rather than an ordinary failure.
    after: after
      ? {
          id: after.id || after.objectId,
          status: after.status,
          completedAt: after.completedAt || null,
          errorMessage: after.errorMessage || null,
          interrupted: Boolean(after.metadata && after.metadata.interrupted)
        }
      : null,
    verdict: !after
      ? 'THE RECORD IS GONE — an interrupted run leaves no trace. File it.'
      : after.completedAt
        ? `the record survived and is terminal: status "${after.status}"` +
          `${after.metadata && after.metadata.interrupted ? ', marked metadata.interrupted' : ''}` +
          `${after.errorMessage ? `, saying: "${after.errorMessage}"` : ', with NO errorMessage'}`
        : `the record survived in a NON-TERMINAL state: status "${after.status}", no completedAt`
  };
}

// ============================================================================
// Report
// ============================================================================

const mb = (bytes) => (bytes === null || bytes === undefined ? '—' : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function markdown(report) {
  const l = [];
  const p = (s = '') => l.push(s);

  p(`# PRD-004 — single-process ceiling, measured`);
  p();
  p(`**Run ${report.startedAt}** · harness \`packages/nodegx-backend/scripts/soak/run.js\``);
  p();
  p('## Conditions');
  p();
  p('| | |');
  p('|---|---|');
  p(`| hardware | ${report.hardware.model} — ${report.hardware.cores} cores, ${mb(report.hardware.memoryBytes)} RAM |`);
  p(`| platform | ${report.hardware.platform} ${report.hardware.release}, Node ${report.hardware.node} |`);
  p(`| backend | \`bin/nodegx-backend.js serve\` (dist), own process, SQLite/WAL |`);
  p(`| page cap | \`defaultLimit: 1000\`, \`maxLimit: 10000\` — **shipped defaults, always on** |`);
  p(`| rate limiting | ${report.options.rateLimit ? '**on** (shipped budgets)' : '**off** — see the README on why both arms exist'} |`);
  p(`| workload | ${report.options.mixNote} |`);
  p(`| virtual users | ${report.users} distinct \`Profile\` rows |`);
  p(`| rows seeded | ${Object.entries(report.counts).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(', ')} |`);
  p(`| security | \`devOpen\` — the localhost dev posture, ACLs not enforced per request. A backend with \`enforced: true\` does per-row policy work this number does not include. |`);
  p(
    `| box quiet? | ${
      report.box.busy.length
        ? `**NO** — ${report.box.busy.length} process(es) using CPU; this number is contended`
        : `yes — nothing matching jest/vitest/webpack/tsc/Electron above 5% CPU${report.box.idleMatches && report.box.idleMatches.length ? `, ${report.box.idleMatches.length} idle match(es) ignored` : ''}`
    } |`
  );
  p(`| load average | ${report.box.loadAverage ? report.box.loadAverage.join(', ') : '—'} (1, 5, 15 min, at start) |`);
  p();

  if (report.ramp) {
    p('## The ramp — mixed workload (AC2)');
    p();
    p('| concurrency | req/s | p50 | p95 | p99 | max | backend cores | errors | 429s |');
    p('|---|---|---|---|---|---|---|---|---|');
    for (const lv of report.ramp.levels) {
      p(
        `| ${lv.concurrency} | ${lv.throughput} | ${lv.latency.p50} | ${lv.latency.p95} | ${lv.latency.p99} | ` +
          `${lv.latency.max} | ${lv.cores ?? '—'} | ${lv.errors} | ${lv.refusals} |`
      );
    }
    p();
    p(`- **Peak throughput:** ${report.ramp.peakThroughput} req/s`);
    p(
      report.ramp.knee
        ? `- **Knee:** concurrency ${report.ramp.knee.concurrency} — ${report.ramp.knee.throughput} req/s at p95 ${report.ramp.knee.p95}ms.\n  Rule: ${report.ramp.knee.rule}`
        : '- **Knee:** not reached inside this ladder. The ceiling is above the highest level driven.'
    );
    p(
      report.ramp.firstSignal
        ? `- **First signal to move:** ${report.ramp.firstSignal.signal}, at concurrency ${report.ramp.firstSignal.at}`
        : '- **First signal to move:** none crossed its threshold.'
    );
    p();
  }

  if (report.writers) {
    p('## Writers only — the write-serialisation reading (AC3)');
    p();
    p('| concurrency | writes/s | p50 | p95 | p99 | backend cores | errors |');
    p('|---|---|---|---|---|---|---|');
    for (const lv of report.writers.levels) {
      p(
        `| ${lv.concurrency} | ${lv.throughput} | ${lv.latency.p50} | ${lv.latency.p95} | ${lv.latency.p99} | ` +
          `${lv.cores ?? '—'} | ${lv.errors} |`
      );
    }
    p();
    p(`- ${report.writers.reading}`);
    p();
  }

  if (report.scheduled) {
    p('## Latency during a heavy scheduled run (AC4)');
    p();
    if (report.scheduled.delta) {
      const d = report.scheduled.delta;
      p('| | scheduler idle | heavy run in the same process |');
      p('|---|---|---|');
      p(`| p95 | ${d.p95Idle} ms | **${d.p95During} ms** |`);
      p(`| throughput | ${d.throughputIdle} req/s | ${d.throughputDuring} req/s |`);
      p();
      p(`**Delta: p95 × ${d.multiple}** at concurrency ${report.scheduled.concurrency}.`);
      p();
      p(
        'This is the whole argument for a separate worker role. A scheduled workflow ' +
          'runs in the process serving your users; there is no worker tier today.'
      );
      p();
      p(
        report.scheduled.caveat
          ? `⚠️ ${report.scheduled.caveat}`
          : `(${report.scheduled.ranCleanly} heavy run(s) were running or complete during this arm, so the delta is a delta against real work.)`
      );
    } else {
      p('No usable delta — see the JSON.');
    }
    p();
  }

  if (report.realtime) {
    p('## Realtime streams (§3.4)');
    p();
    p('| streams asked for | opened | refused (503) | `nodegx_realtime_connections` | gauge agrees? | backend RSS |');
    p('|---|---|---|---|---|---|');
    for (const r of report.realtime.results) {
      p(
        `| ${r.target} | ${r.opened} | ${r.refused} | ${r.gaugeReads ?? '—'} | ` +
          `${r.gaugeAgrees === null ? '—' : r.gaugeAgrees ? 'yes' : '**NO**'} | ${mb(r.rssBytes)} |`
      );
    }
    p();
    p(`- ${report.realtime.note}`);
    p();
  }

  if (report.memory) {
    p('## Memory (§3.4)');
    p();
    p(`- baseline ${mb(report.memory.baselineRss)} → peak ${mb(report.memory.peakRss)} → settled ${mb(report.memory.settledRss)}`);
    p(`- returned to baseline: **${report.memory.returnedToBaseline === null ? 'unknown' : report.memory.returnedToBaseline ? 'yes' : 'no'}**`);
    p(`- ${report.memory.note}`);
    p();
  }

  if (report.kill) {
    p('## PRD-D5 — the record of an interrupted run (AC6)');
    p();
    if (!report.kill.answered) {
      p(`Not answered: ${report.kill.why}`);
    } else {
      p(`- before the kill: run \`${report.kill.before.id}\`, status \`${report.kill.before.status}\`, not completed`);
      p(
        report.kill.after
          ? `- after restart: status \`${report.kill.after.status}\`, completedAt \`${report.kill.after.completedAt || 'null'}\`, ` +
            `\`metadata.interrupted\` ${report.kill.after.interrupted ? '**true**' : 'absent'}` +
            `${report.kill.after.errorMessage ? `\n- the record says why: _"${report.kill.after.errorMessage}"_` : '\n- **no `errorMessage`**'}`
          : '- after restart: **the run is not in the executions list at all**'
      );
      p();
      p(`**${report.kill.verdict}**`);
    }
    p();
  }

  p('## Re-running this');
  p();
  p('```');
  p(`node packages/nodegx-backend/scripts/soak/run.js \\`);
  p(`  --scale ${report.options.scale} --users ${report.options.users} \\`);
  p(`  --levels ${report.options.levels.join(',')} --seconds ${report.options.seconds} \\`);
  p(`  --rate-limit ${report.options.rateLimit ? 'on' : 'off'}`);
  p('```');
  p();
  p('See `scripts/soak/README.md` for the method and for what each number does and does not say.');
  return l.join('\n') + '\n';
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const box = assertQuietBox(opts.iKnow);

  fs.mkdirSync(opts.out, { recursive: true });
  fs.mkdirSync(opts.dataDir, { recursive: true });
  fs.writeFileSync(path.join(opts.dataDir, 'ops.json'), JSON.stringify(opsConfig(opts), null, 2));

  // The heavy job's definition goes in before the service starts, so the
  // registry and the scheduler read it from disk exactly as a deploy does.
  fs.mkdirSync(path.join(opts.dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(opts.dataDir, 'workflows', 'soak-heavy-ingest.workflow.json'),
    JSON.stringify(heavy.workflowBundle({ budgetMs: opts.heavyBudgetMs }))
  );
  fs.writeFileSync(path.join(opts.dataDir, 'triggers.json'), JSON.stringify(heavy.triggersFile(), null, 2));

  say(`data dir : ${opts.dataDir}`);
  say(`out dir  : ${opts.out}`);
  say('starting the shipped backend…');
  let server = await backend.start({ dataDir: opts.dataDir, port: opts.port, backendId: 'soak' });
  const adminToken = adminTokenOf(opts.dataDir);

  const report = {
    startedAt: new Date().toISOString(),
    options: {
      ...opts,
      mixNote: '85% reads / 15% writes, from the application shape in the field report (§3.1)'
    },
    hardware: {
      model: os.cpus()[0] ? os.cpus()[0].model : 'unknown',
      cores: os.cpus().length,
      memoryBytes: os.totalmem(),
      platform: os.platform(),
      release: os.release(),
      node: process.version
    },
    box
  };

  try {
    // Conditions read from the backend itself rather than assumed by the harness.
    report.backendStatus = await fetch(`${server.base}/admin/status`, {
      headers: { authorization: `Bearer ${adminToken}` }
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    say('declaring the schema and its indexes…');
    report.schema = await dataset.declareSchema(server.base, adminToken);

    say('seeding…');
    let lastSaid = 0;
    const seeded = await dataset.seed(server.base, adminToken, {
      scale: opts.scale,
      onProgress: ({ table, done, total, rowsPerSecond }) => {
        if (Date.now() - lastSaid < 2000 && done < total) return;
        lastSaid = Date.now();
        say(`  ${table}: ${done}/${total} (${rowsPerSecond} rows/s)`);
      }
    });
    report.counts = seeded.counts;
    report.seedReport = seeded.report;

    const users = await driver.resolveUsers(server.base, opts.users);
    report.users = users.length;
    say(`resolved ${users.length} virtual users`);

    // Before anything is timed: prove the workload actually moves rows.
    say('preflight…');
    report.preflight = await driver.preflight(server.base, users, seeded.counts);
    for (const line of report.preflight) say(`  ${line}`);

    const ctx = { base: server.base, server, users, counts: seeded.counts, adminToken, opts };

    if (opts.arms.includes('ramp')) { say('\narm: ramp'); report.ramp = await armRamp(ctx); }
    if (opts.arms.includes('writers')) { say('\narm: writers'); report.writers = await armWriters(ctx); }
    if (opts.arms.includes('scheduled')) { say('\narm: scheduled'); report.scheduled = await armScheduled(ctx); }
    if (opts.arms.includes('realtime')) { say('\narm: realtime'); report.realtime = await armRealtime(ctx); }
    if (opts.arms.includes('memory')) { say('\narm: memory'); report.memory = await armMemory(ctx); }
    // Kill last: it takes the process down and restarts it, so anything after
    // it would be measuring a different process than everything before it.
    if (opts.arms.includes('kill')) { say('\narm: kill'); report.kill = await armKill(ctx); }

    server = ctx.server;
  } catch (e) {
    report.failed = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    process.exitCode = 1;
    process.stderr.write(`\nFAILED: ${report.failed}\n`);
    if (server && !server.hasExited()) process.stderr.write(`\nbackend log tail:\n${server.log()}\n`);
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(opts.out, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(opts.out, 'report.md'), markdown(report));
    try {
      if (server) await server.stop();
    } catch {
      /* already gone */
    }
    if (!opts.keep) {
      fs.rmSync(opts.dataDir, { recursive: true, force: true });
    } else {
      say(`\ndata dir kept at ${opts.dataDir}`);
    }
    say(`\nwrote ${path.join(opts.out, 'report.md')}`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    process.stderr.write(`${e && e.stack ? e.stack : e}\n`);
    process.exit(1);
  });
}

module.exports = { parseArgs, analyse, markdown, opsConfig };
