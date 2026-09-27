#!/usr/bin/env node
/**
 * CG-004 AC8 + AC9 drive: a v2 over a used v1 data dir keeps the island, the profiles and the exam results, adopts the
 * new policy; and nothing on the wire leaves the loopback. Modelled on Nightbook's drive-spike.js (TPL-011-DESKTOP).
 *
 *   node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/drive-upgrade.js [--exe <path>]
 *
 * With no --exe it runs `electron .` in shell/ (build-app.js must have run; fetch-model.mjs optional — without the
 * model the exam runs on fallbacks and is still kept). With --exe it drives an installed or unpacked app.
 *
 * Every launch gets GARDEN_HOME (a throwaway folder), GARDEN_VERSION and GARDEN_POLICY_DIR (drive-only overrides in
 * main.js): the SAME build is launched as 0.0.1 shipping policy A, then as 0.0.2 shipping policy B. "Seed the old
 * version's leavings": launch 1 IS the seeding — it leaves the database, the installed policy, the backup policy, the
 * exam results and the timings, and launch 2 must keep every one and adopt B.
 *
 *   launch 1 (home A, 0.0.1, policy A)   page drawn → the exam has results (status.exam) → [CG-003: make a profile,
 *                                         name the robot] → quit
 *   disk                                  local.db, security.json = A, backups.json, olive-exam.json, timings.log
 *   launch 2 (home A, 0.0.2, policy B)   page drawn → status.exam.at unchanged (kept, not re-run) → [CG-003: the
 *                                         profile and the robot's name are still there] → quit
 *   disk                                  security.json = B, security.before-0.0.2-*.json = A, local.db kept,
 *                                         olive-exam.json kept, timings.log has two launch lines
 *   launch 3 (home B, control)            a fresh home has no security.before-* and a different exam.at
 *   wire (AC9)                            every request the page made, across all three launches: host 127.0.0.1 only
 *
 * The two CG-003 steps are marked STEP-NEEDS-CG-003 and skipped until the pages exist; the shell-level readings run now.
 * Plain Node 22 (global WebSocket), no dependencies.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const lib = require('./drive-lib');
const { config, CDP_PORT, ORIGIN, wait, until, portListening, quit, backendsFor, watchNetwork } = lib;

const argv = process.argv.slice(2);
const exeIdx = argv.indexOf('--exe');
const EXE = exeIdx >= 0 ? path.resolve(argv[exeIdx + 1]) : null;
const SHIPPED_POLICY = path.join(lib.SHELL, 'build-output', 'policy', config.policy);

const R = { steps: [], hosts: {} };
const step = (s) => {
  R.steps.push(s);
  console.log(`· ${s}`);
};

function report() {
  const json = JSON.stringify(R, null, 2);
  console.log(json);
  if (process.env.GARDEN_DRIVE_REPORT) fs.writeFileSync(process.env.GARDEN_DRIVE_REPORT, json);
}

const bodyText = (page) => page.evaluate('document.body ? document.body.innerText : ""');
const status = (page) => page.evaluate(`fetch(${JSON.stringify(ORIGIN + config.doorPrefix + 'olive/status')}).then(r => r.json())`);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

async function launch(home, version, policyDir) {
  const app = await lib.launch(home, EXE, { GARDEN_VERSION: version, GARDEN_POLICY_DIR: policyDir });
  app.net = await watchNetwork(app.page);
  return app;
}

function mergeHosts(app) {
  for (const [h, n] of Object.entries(app.net.hosts())) R.hosts[h] = (R.hosts[h] || 0) + n;
}

async function main() {
  for (const p of [CDP_PORT, config.port]) {
    if (await portListening(p)) throw new Error(`port ${p} is already taken; nothing was launched`);
  }
  if (!fs.existsSync(SHIPPED_POLICY)) throw new Error(`no shipped policy at ${SHIPPED_POLICY}: run build-app.js first`);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-upgrade-'));
  const homeA = path.join(scratch, 'A');
  const homeB = path.join(scratch, 'B');
  // Policy A = the shipped one plus a marker collection; policy B = the shipped one. Different bytes, so 0.0.2 must
  // adopt B. The marker is a LEGAL collection, not a private top-level key: the backend refuses a policy with an
  // unknown top-level key (`unknown top-level key "_driveMarker"`, FATAL, exit 1) and the window never opens —
  // the first run of this drive, 2026-09-27, 0 launches.
  const shipped = readJson(SHIPPED_POLICY);
  const policyA = { ...shipped, collections: { ...shipped.collections, DriveMarkerV1: shipped.collections.Task } };
  const hasMarker = (file) => !!(readJson(file).collections || {}).DriveMarkerV1;
  const dirA = path.join(scratch, 'policy-A');
  const dirB = path.join(scratch, 'policy-B');
  fs.mkdirSync(dirA, { recursive: true });
  fs.mkdirSync(dirB, { recursive: true });
  fs.writeFileSync(path.join(dirA, config.policy), JSON.stringify(policyA, null, 2));
  fs.copyFileSync(SHIPPED_POLICY, path.join(dirB, config.policy));
  R.home = scratch;
  const data = (home) => path.join(home, 'userData', config.dataDirName);

  // launch 1
  step('launch 1 (home A, 0.0.1, policy A)');
  let app = await launch(homeA, '0.0.1', dirA);
  R.launch1 = {};
  await until('page drawn', () => bodyText(app.page), (s) => s.length > 0, 60_000);
  R.launch1.shownAtMs = Date.now() - app.t0;
  const s1 = await until('the exam has results', () => status(app.page), (s) => s && s.exam && s.exam.at, 180_000);
  R.launch1.model = s1.model;
  R.launch1.examAt = s1.exam.at;
  R.launch1.examRungs = Object.keys(s1.exam.rungs).length;
  step('STEP-NEEDS-CG-003: make a profile, name the robot (skipped until the pages exist)');
  await wait(1000);
  mergeHosts(app);
  R.launch1.quit = await quit(app);
  await wait(1500);

  step('read the disk after 0.0.1');
  const d = data(homeA);
  R.disk1 = {
    database: fs.existsSync(path.join(d, 'data', 'local.db')),
    policyInstalled: fs.existsSync(path.join(d, 'security.json')) && hasMarker(path.join(d, 'security.json')),
    backupPolicy: fs.existsSync(path.join(d, 'backups.json')),
    examKept: fs.existsSync(path.join(d, 'olive-exam.json')),
    backendsLeftRunning: backendsFor(homeA),
    timingsEvents: fs.readFileSync(path.join(homeA, 'userData', 'logs', 'timings.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).event)
  };

  // launch 2
  step('launch 2 (home A, 0.0.2, policy B)');
  app = await launch(homeA, '0.0.2', dirB);
  R.launch2 = {};
  await until('page drawn', () => bodyText(app.page), (s) => s.length > 0, 60_000);
  const s2 = await until('status', () => status(app.page), (s) => s && s.exam, 60_000);
  R.launch2.examAt = s2.exam.at;
  R.launch2.examKept = s2.exam.at === R.launch1.examAt;
  step('STEP-NEEDS-CG-003: the profile and the robot name are still there (skipped until the pages exist)');
  await wait(1000);
  mergeHosts(app);
  R.launch2.quit = await quit(app);
  await wait(1500);

  step('read the disk after 0.0.2');
  const kept = fs.readdirSync(d).filter((f) => /^security\.before-0\.0\.2-.*\.json$/.test(f));
  R.disk2 = {
    database: fs.existsSync(path.join(d, 'data', 'local.db')),
    policyIsB: fs.existsSync(path.join(d, 'security.json')) && !hasMarker(path.join(d, 'security.json')),
    oldPolicyKeptAs: kept,
    oldPolicyIsA: kept.length === 1 && hasMarker(path.join(d, kept[0])),
    examKept: fs.existsSync(path.join(d, 'olive-exam.json')) && readJson(path.join(d, 'olive-exam.json')).at === R.launch1.examAt,
    launchLines: fs.readFileSync(path.join(homeA, 'userData', 'logs', 'timings.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((l) => l.event === 'launch').map((l) => [l.version, l.policy]),
    backendsLeftRunning: backendsFor(homeA)
  };

  // launch 3 — control
  step('launch 3 (home B, control)');
  app = await launch(homeB, '0.0.2', dirB);
  R.launch3 = {};
  await until('page drawn', () => bodyText(app.page), (s) => s.length > 0, 60_000);
  const s3 = await until('status', () => status(app.page), (s) => !!s, 60_000);
  R.launch3.examAtDiffers = !s3.exam || s3.exam.at !== R.launch1.examAt;
  mergeHosts(app);
  R.launch3.quit = await quit(app);
  await wait(1500);
  R.launch3.noOldPolicy = fs.readdirSync(data(homeB)).filter((f) => f.startsWith('security.before-')).length === 0;
  R.backendsLeftRunning = backendsFor(homeA).concat(backendsFor(homeB));

  R.offLoopback = Object.keys(R.hosts).filter((h) => !['127.0.0.1', 'about', 'data', 'blob'].includes(h));
  const verdict =
    R.disk1.database && R.disk1.policyInstalled && R.disk1.backupPolicy && R.disk1.examKept && R.disk1.backendsLeftRunning.length === 0 &&
    R.launch2.examKept && R.disk2.database && R.disk2.policyIsB && R.disk2.oldPolicyIsA && R.disk2.examKept && R.disk2.launchLines.length === 2 &&
    R.disk2.launchLines[1][1] === 'replaced' && R.launch3.examAtDiffers && R.launch3.noOldPolicy && R.backendsLeftRunning.length === 0 && R.offLoopback.length === 0;
  R.verdict = verdict ? 'PASS' : 'FAIL';
  report();
  process.exit(verdict ? 0 : 1);
}

main().catch((e) => {
  console.error(`drive-upgrade: ${e.stack || e.message}`);
  R.error = e.message;
  lib.killAll();
  report();
  process.exit(1);
});
