// OWN-026: run a series one job at a time (memory: one heavy job), each round through the stream tap, each graded
// straight after. Re-runnable: a round with round.json, or a grade with meta.json, is skipped.
//
//   node series.mjs t1                     test 1: 9 rounds, order code, harness, nodegx ×3 (PLAN.md §3)
//   node series.mjs t2 <arm> <start-round> test 2: changes c01…c10 on one arm's chain (PLAN.md §4)
//   [--only <round-id>] [--no-grade] [--changes <n>]
//   [--rounds <dir>] [--grades <dir>] [--port-base <p>] [--mock <steps.json>]   (the $0 proof: see below)
//
// Test 2 runs three chains side by side (Richard, 2026-10-23), so each series keeps to itself (PLAN §8, 2026-10-23):
//   - its own log, series-t2-<arm>.log;
//   - its own tap ports: t1 48900+, code 49000+, harness 49100+, nodegx 49200+ (a free-port check alone races between
//     processes), and a port counts as free only when nothing LISTENs on it, by lsof, as well as binding;
//   - the code and harness apps both serve on localhost:3000 (measured: t1-code-3's server/index.js, t1-harness-1's
//     `next dev`), and so do their graders, so a code or harness round or grade holds LOCK-web3000 (a folder, made
//     atomically) for as long as it runs: those two chains take turns, the NodeGX chain (8584/8575) runs beside them;
//   - disk: when change n is graded, node_modules, .next and test-results go from the grade copy and from round n−1
//     (never a t1 round, never round n: n+1 copies it); a step waits while the disk has under 8 GB free.
// --mock: every round talks to mock-model.mjs (MOCK_STEPS from the file) on the tap port instead of the tap; with
// JUDGE_BIN and CLAUDE_BIN pointed at a stand-in, a whole chain costs $0.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const LAB = '/Users/Shared/nodegx-lab';
const [which, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const ROUNDS = path.resolve(opt('--rounds', path.join(LAB, 'own026')));
const GRADES = path.resolve(opt('--grades', path.join(LAB, 'own026-grades')));
const MOCK = opt('--mock', null);
const [ARM, START] = which === 't2' ? rest : [];
const LOG = path.join(ROUNDS, `series-${which}${ARM ? `-${ARM}` : ''}.log`);
const log = (s) => { const line = `${new Date().toISOString()} ${s}`; console.log(line); fs.appendFileSync(LOG, line + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, out) => new Promise((resolve) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const f = fs.createWriteStream(out, { flags: 'a' });
  p.stdout.pipe(f); p.stderr.pipe(f);
  p.on('close', resolve);
});

const T1_IDS = 'S0,F1,F2,F3,F4,F5,F6,F7,F8,T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12,T13';
const C_IDS = { 1: ['C1.1', 'C1.2'], 2: ['C2.1', 'C2.2'], 3: ['C3.1', 'C3.2'], 4: ['C4.1', 'C4.2', 'C4.3'], 5: ['C5.1', 'C5.2', 'C5.3'],
  6: ['C6.1', 'C6.2'], 7: ['C7.1', 'C7.2'], 8: ['C8.1', 'C8.2'], 9: ['C9.1', 'C9.2'], 10: ['C10.1', 'C10.2'],
  // 11–20: pre-registered 2026-10-23 before any change 5 was graded (PLAN §8); two checks each
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 11, [`C${i + 11}.1`, `C${i + 11}.2`]])) };
const t2Ids = (n) => ['S0', ...C_IDS[n], 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'T1', 'T4', 'T6', 'T7', ...Array.from({ length: n - 1 }, (_, i) => C_IDS[i + 1]).flat()].join(',');

let jobs;
if (which === 't1') {
  jobs = [1, 2, 3].flatMap((k) => ['code', 'harness', 'nodegx'].map((arm) => ({ id: `t1-${arm}-${k}`, arm, request: path.join(HERE, 'request-build.txt'), ids: T1_IDS })));
} else if (which === 't2') {
  if (!['code', 'harness', 'nodegx'].includes(ARM) || !START) throw new Error('usage: node series.mjs t2 <arm> <start-round-id>');
  let seed = path.join(ROUNDS, START);
  jobs = [];
  const CHANGES = fs.readdirSync(path.join(HERE, 'changes')).filter((f) => /^c\d\d\.txt$/.test(f)).length;
  // --first n (FIX-05, 2026-10-23): start the chain at change n, seeded from <start-round> (e.g. the main chain's c(n−1))
  for (let n = Number(opt('--first', 1)); n <= Number(opt('--changes', CHANGES)); n++) {
    const id = `t2-${ARM}-c${String(n).padStart(2, '0')}`;
    // the grader reads the whole history the person asked for: the build, then every change so far, in order
    const history = path.join(GRADES, `${id}-request.txt`);
    fs.mkdirSync(GRADES, { recursive: true });
    fs.writeFileSync(history, [fs.readFileSync(path.join(HERE, 'request-build.txt'), 'utf8').trim(),
      ...Array.from({ length: n }, (_, i) => `Later, change ${i + 1}:\n` + fs.readFileSync(path.join(HERE, 'changes', `c${String(i + 1).padStart(2, '0')}.txt`), 'utf8').trim())].join('\n\n') + '\n');
    jobs.push({ id, arm: ARM, n, seed, request: path.join(HERE, 'changes', `c${String(n).padStart(2, '0')}.txt`), gradeRequest: history, ids: t2Ids(n) });
    seed = path.join(ROUNDS, id);
  }
} else throw new Error('usage: node series.mjs t1 | t2 <arm> <start-round-id>');

const only = opt('--only', null);
const PORT_BASE = Number(opt('--port-base', { code: 49000, harness: 49100, nodegx: 49200 }[ARM] ?? 48900));
let port = PORT_BASE;
// a port nothing listens on, on any address (memory: a `*:P` listener beside a `127.0.0.1:P` one both listen)
const listening = (q) => (spawnSync('lsof', ['-nP', `-iTCP:${q}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).stdout || '').trim().split('\n').filter(Boolean);
const binds = (q) => new Promise((r) => { const srv = net.createServer().once('error', () => r(false)).once('listening', () => srv.close(() => r(true))).listen(q, '127.0.0.1'); });
async function freePort() {
  for (; port < PORT_BASE + 100; port++) if (!listening(port).length && (await binds(port))) return port++;
  throw new Error(`no free tap port in ${PORT_BASE}–${PORT_BASE + 99}`);
}

// LOCK-web3000: the code and harness chains' apps and graders share localhost:3000. mkdir is the atomic step; the
// owner's pid is inside, and a lock whose owner is gone is taken over (and said so). Only our own lock is removed.
// Since FIX-04's comparison chain (2026-10-23): every NodeGX app serves on 8575 (the preview's default) and 8584 (the
// backend's port, in the app's own config, inherited by every seed), so two NodeGX chains take turns on
// LOCK-nodegx8575 the same way. A chain in another rounds folder shares the main lab's locks with --lock-dir.
const LOCK_DIR = path.resolve(opt('--lock-dir', ROUNDS));
const LOCK_NAME = ARM === 'nodegx' ? 'LOCK-nodegx8575' : 'LOCK-web3000';
const LOCK_PORTS = ARM === 'nodegx' ? [8575, 8584] : [3000];
const LOCK = path.join(LOCK_DIR, LOCK_NAME);
const needsLock = () => which === 't2' && (ARM !== 'nodegx' || rest.includes('--lock'));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// First come, first served: a series that wants the lock leaves LOCK-web3000.want-<pid> (its time inside) and tries only
// when no live series has wanted it longer; else the one that just dropped it takes it straight back, every time
// (the first mock, 2026-10-23: the harness chain waited through code's round, grade and next round).
const want = path.join(LOCK_DIR, `${LOCK_NAME}.want-${process.pid}`);
function myTurn() {
  const mine = fs.statSync(want).mtimeMs;
  for (const f of fs.readdirSync(LOCK_DIR).filter((x) => x.startsWith(`${LOCK_NAME}.want-`) && x !== path.basename(want))) {
    const pid = Number(f.split('-').at(-1));
    let t; try { t = fs.statSync(path.join(LOCK_DIR, f)).mtimeMs; } catch { continue; }
    if (!alive(pid)) { fs.rmSync(path.join(LOCK_DIR, f), { force: true }); continue; }
    if (t < mine) return false;
  }
  return true;
}
async function takeLock(what) {
  let said = false;
  fs.writeFileSync(want, `${what}\n`);
  for (;;) {
    if (myTurn()) try { fs.mkdirSync(LOCK); fs.writeFileSync(path.join(LOCK, 'owner'), `${process.pid} ${what}\n`); fs.rmSync(want, { force: true }); break; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    let owner = '';
    try { owner = fs.readFileSync(path.join(LOCK, 'owner'), 'utf8').trim(); } catch {}
    const pid = Number(owner.split(' ')[0]);
    if (pid && !alive(pid)) { log(`${what}: ${LOCK_NAME}'s owner (${owner}) is gone; taking it over`); fs.rmSync(LOCK, { recursive: true, force: true }); continue; }
    if (!said) { log(`${what}: waiting for ${LOCK_NAME} (${owner || 'another series wanted it first'})`); said = true; }
    await sleep(15000);
  }
  // the lock is ours; the port should be too (an orphaned server, or a peer's, would answer this job's checks)
  let said3000 = false;
  const held = () => LOCK_PORTS.flatMap((q) => listening(q).map((pid) => `${q}:${pid}`));
  while (held().length) {
    if (!said3000) { log(`${what}: ${held().join(' ')} still listening (not this lab's lock holder); waiting`); said3000 = true; }
    await sleep(30000);
  }
  if (said) log(`${what}: got ${LOCK_NAME}`);
}
const dropLock = () => {
  fs.rmSync(want, { force: true });
  try { if (fs.readFileSync(path.join(LOCK, 'owner'), 'utf8').startsWith(`${process.pid} `)) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {}
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { dropLock(); process.exit(130); });

// Disk: a harness round is ~1.2 GB, mostly node_modules; three chains × ten changes would fill the disk.
const freeGB = () => Number((spawnSync('df', ['-k', ROUNDS], { encoding: 'utf8' }).stdout.trim().split('\n').at(-1).split(/\s+/)[3])) / 1048576;
async function roomOnDisk(what) {
  let said = false;
  while (freeGB() < 8) { if (!said) { log(`${what}: ${freeGB().toFixed(1)} GB free, under 8; waiting`); said = true; } await sleep(60000); }
}
const du = (d) => Number((spawnSync('du', ['-sk', d], { encoding: 'utf8' }).stdout || '0').split(/\s/)[0]) / 1024;
function prune(dir) {
  if (!fs.existsSync(dir)) return 0;
  const hits = (spawnSync('find', [dir, '-type', 'd', '(', '-name', 'node_modules', '-o', '-name', '.next', '-o', '-name', 'test-results', ')', '-prune', '-print'], { encoding: 'utf8' }).stdout || '').split('\n').filter(Boolean);
  let mb = 0;
  for (const h of hits) { mb += du(h); fs.rmSync(h, { recursive: true, force: true }); }
  return mb;
}

// The learning loop (PLAN §8, 2026-10-22): while HOLD-nodegx exists, NodeGX jobs wait and the others run; when nothing
// else is left, the series waits for the hold to lift (round.mjs also waits, before it makes a folder).
const HOLD = path.join(ROUNDS, 'HOLD-nodegx');
// ...and until KIT-PROVEN names the kit KIT names: the fixer lifts the hold when the kit is ready, and the lab proves it
// with a $0 mock round before a chain spends on it (FIX-01, FIX-02's rule; the gate added 2026-10-23 for FIX-03).
const readOr = (f) => { try { return fs.readFileSync(f, 'utf8').trim(); } catch { return ''; } };
const gated = () => fs.existsSync(HOLD) ? 'the hold to lift' : readOr(path.join(ROUNDS, 'KIT')) !== readOr(path.join(ROUNDS, 'KIT-PROVEN')) ? `KIT-PROVEN to name ${readOr(path.join(ROUNDS, 'KIT')) || '(no KIT)'}` : null;
const finished = (j) => fs.existsSync(path.join(ROUNDS, j.id, 'round.json')) && (rest.includes('--no-grade') || fs.existsSync(path.join(GRADES, j.id, 'meta.json')));
let waitedLogged = false;
for (;;) {
  const pending = jobs.filter((j) => (!only || j.id === only) && !finished(j));
  if (!pending.length) break;
  // test 2 is a chain: only its first unfinished change can run
  const runnable = which === 't2' ? pending.slice(0, 1) : pending;
  const gate = gated();
  const j = runnable.find((x) => x.arm !== 'nodegx' || !gate);
  if (!j) {
    if (waitedLogged !== gate) { log(`waiting for ${gate} (${pending.map((x) => x.id).join(', ')})`); waitedLogged = gate; }
    await sleep(60000);
    continue;
  }
  if (waitedLogged) log(`no longer waiting for ${waitedLogged}`);
  waitedLogged = false;
  const root = path.join(ROUNDS, j.id);
  if (!fs.existsSync(path.join(root, 'round.json'))) {
    if (fs.existsSync(root)) { log(`${j.id}: an unfinished root is there; move it aside by hand and re-run`); process.exit(1); }
    await roomOnDisk(j.id);
    if (needsLock(j)) await takeLock(`${j.id} round`);
    const tapDir = path.join(ROUNDS, `${j.id}-tap`);
    fs.mkdirSync(tapDir, { recursive: true });
    const p = await freePort();
    const tap = MOCK
      ? spawn('node', [path.join(HERE, 'mock-model.mjs'), String(p), tapDir, path.join(root, 'work', 'apps')], { stdio: 'ignore', env: { ...process.env, MOCK_STEPS: fs.readFileSync(MOCK, 'utf8') } })
      : spawn('node', [path.join(HERE, '../own-020/stream-tap.mjs'), String(p), tapDir, '--mode', 'retry'], { stdio: 'ignore' });
    await sleep(1000);
    // the tap must be the one on the port: an orphan holding it would carry this round's traffic (t1-harness-3)
    const holders = listening(p);
    if (tap.exitCode !== null || !holders.includes(String(tap.pid))) { log(`${j.id}: the tap on ${p} did not come up (listeners: ${holders.join(' ') || 'none'})`); tap.kill(); dropLock(); process.exit(1); }
    log(`${j.id}: round start (arm ${j.arm}${j.seed ? `, seed ${path.basename(j.seed)}` : ''}, ${MOCK ? 'MOCK ' : ''}tap ${p})`);
    const code = await run('nice', ['-n', '10', 'node', path.join(HERE, 'round.mjs'), root, j.request, '--arm', j.arm, '--tap', String(p),
      '--hold', HOLD, '--kit-file', path.join(ROUNDS, 'KIT'), ...(j.seed ? ['--seed', j.seed] : [])], path.join(ROUNDS, `${j.id}.out`));
    tap.kill();
    dropLock();
    const r = fs.existsSync(path.join(root, 'round.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'round.json'), 'utf8')) : null;
    log(`${j.id}: round end exit ${code} ${r ? `${r.finish} judge ${r.judge} sittings ${r.sittings} ${r.seconds}s $${r.usdAtClinePassPrices} audit ${r.audit}` : '(no round.json)'}`);
    if (!r) process.exit(1);
  }
  if (rest.includes('--no-grade')) continue;
  const g = path.join(GRADES, j.id);
  if (!fs.existsSync(path.join(g, 'meta.json'))) {
    if (fs.existsSync(g)) { log(`${j.id}: an unfinished grade is there; move it aside by hand and re-run`); process.exit(1); }
    await roomOnDisk(`${j.id} grade`);
    if (needsLock(j)) await takeLock(`${j.id} grade`);
    log(`${j.id}: grade start (${j.ids.split(',').length} checks)`);
    await run('nice', ['-n', '10', 'node', path.join(HERE, 'grade.mjs'), root, g, '--ids', j.ids, '--request', j.gradeRequest ?? j.request], path.join(GRADES, `${j.id}.out`));
    dropLock();
    const m = fs.existsSync(path.join(g, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(g, 'meta.json'), 'utf8')) : null;
    log(`${j.id}: grade end ${m ? `pass ${m.pass} fail ${m.fail} not reached ${m.notReached} · ${m.seconds}s $${m.usd} 7-day ${m.sevenDay}` : '(no meta.json)'}`);
    if (!m) process.exit(1);
  }
  if (which === 't2') {
    // change n is graded: its grade copy's packages go, and round n−1's (round n stays: n+1 copies it)
    const k = jobs.indexOf(j);
    const prev = k > 0 ? path.join(ROUNDS, jobs[k - 1].id, 'work', 'apps') : null;
    const mb = prune(g) + (prev ? prune(prev) : 0);
    if (mb) log(`${j.id}: pruned ${Math.round(mb)} MB (grade copy${prev ? `, ${jobs[k - 1].id}` : ''}); ${freeGB().toFixed(1)} GB free`);
  }
}
log('series done');
