#!/usr/bin/env node
/**
 * CG-004 AC8 + AC9 drive: a v2 over a used v1 data dir keeps the island, the profiles and the exam results, adopts the
 * new policy; and nothing on the wire leaves the loopback. Modelled on Nightbook's drive-spike.js (TPL-011-DESKTOP).
 *
 *   node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/drive-upgrade.js [--exe <path>]
 *
 * With no --exe it runs `electron .` in shell/ (build-app.js must have run). With --exe it drives an installed or
 * unpacked app (the Mac's `shell/dist/mac-arm64/Olive's Island.app/Contents/MacOS/Olive's Island`, the Windows job's
 * `%LOCALAPPDATA%\Programs\garden-desktop\Olive's Island.exe`).
 *
 * Every launch gets GARDEN_HOME (a throwaway folder), GARDEN_VERSION and GARDEN_POLICY_DIR (drive-only overrides in
 * main.js): the SAME build is launched as 0.0.1 shipping policy A, then as 0.0.2 shipping policy B. "Seed the old
 * version's leavings": launch 1 IS the seeding — it leaves the database, the installed policy, the backup policy, the
 * exam results, the timings, AND a family in the page's localStorage — and launch 2 must keep every one and adopt B.
 *
 *   launch 1 (home A, 0.0.1, policy A)   page drawn → the owl settles → [model] the exam has results (status.exam)
 *                                         | [no model] an ask falls back (`no-model`), no exam is waited for
 *                                         → Profiles: a new player "Ada" whose robot is "Robo" → the island → the
 *                                         family in storage → My robot: rename "Robo" to "Bolt" → in storage → quit
 *   disk                                  local.db, security.json = A, NO backups.json (R14), olive-exam.json [model],
 *                                         timings.log; the island backup (R14): Documents/<folderName>/island-backup-<day>.json
 *                                         written at quit, its stored family AND its save code (decoded by the template's
 *                                         own decoder) hold Ada with Bolt; README.txt beside it
 *   launch 2 (home A, 0.0.2, policy B)   page drawn → status.exam.at unchanged [model] → storage still holds Ada/Bolt →
 *                                         Profiles shows Ada's card with Bolt → chosen → My robot's name box says Bolt
 *   disk                                  security.json = B, security.before-0.0.2-*.json = A, local.db kept,
 *                                         olive-exam.json kept [model], timings.log has two launch lines
 *   launch 3 (home B, control)            a fresh home has no security.before-*, a different exam.at, and NO Ada — and
 *                                         no island backup (a family with no players writes nothing)
 *   wire (AC9)                            every request the page made, across all three launches: host 127.0.0.1 only
 *
 * The family: the garden template has no backend — the family is ONE localStorage entry (key `bot-garden`; P105
 * ruling 8 moves the island's progress onto each profile and bumps the save's version). So the storage clauses walk
 * whatever the save is for an object with the player's name and her robot's name (`robot.name`, or `robotName`) and
 * never read an island field: a profile and a robot's name must survive either shape of the save.
 *
 * Presses are `el.click()` on the element found, with the hit test at its centre recorded beside it (`hit`): the page
 * is zoomed to fit (fit.js), and reachability is the page drive's clause (drive-cg003-pages.js), not this one's.
 * Plain Node 22 (global WebSocket), no dependencies.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const lib = require('./drive-lib');
const { config, CDP_PORT, ORIGIN, wait, until, portListening, quit, backendsFor, watchNetwork } = lib;
const templates = require('./shell/olive-templates.json');
const { CLOSED_POLICY } = require('./shell/policy');

const argv = process.argv.slice(2);
const exeIdx = argv.indexOf('--exe');
const EXE = exeIdx >= 0 ? path.resolve(argv[exeIdx + 1]) : null;
const SHIPPED_POLICY = path.join(lib.SHELL, 'build-output', 'policy', config.policy);
const REPO = path.resolve(lib.HERE, '../../../..');
const WORDS_FILE = path.join(REPO, 'templates', 'bot-garden', 'components', 'Data', 'Words', 'nodes.json');
// The exam on a CI runner's CPU is minutes (43 s on the Mac's CPU path, s1); the bound only matters when it never ends.
const EXAM_WAIT_MS = Number(process.env.GARDEN_EXAM_WAIT_MS) || 600_000;

const PLAYER = 'Ada';
const ROBOT_FIRST = 'Robo';
const ROBOT_RENAMED = 'Bolt';

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
/** An evaluate that a navigation in flight turns into `null`, not a throw. */
const safe = (page, expr) => page.evaluate(expr).catch(() => null);
/** The owl has an answer about itself: past `unloaded` (before the window shows) and `loading`. */
const settled = (s) => !!s && typeof s.model === 'string' && s.model !== 'unloaded' && s.model !== 'loading';

/** The words the pages show, both languages (the window opens in whichever the machine asks for). */
function words() {
  const nodes = JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  const rows = JSON.parse(list.find((n) => n.type === 'Static Data').parameters.json);
  const out = {};
  for (const r of rows) out[r.key] = [r.en, r.fr].filter(Boolean);
  return out;
}

/** An Olive request the route accepts without asking anything of the page: the first rung whose slots are all lists. */
function sampleAsk() {
  for (const [rung, r] of Object.entries(templates.rungs)) {
    const specs = Object.entries(r.slots || {});
    if (!specs.length || !specs.every(([, s]) => s.list && templates.lists[s.list] && templates.lists[s.list].fr.length)) continue;
    return { rung, lang: 'fr', slots: Object.fromEntries(specs.map(([k, s]) => [k, templates.lists[s.list].fr[0]])) };
  }
  throw new Error('no rung in olive-templates.json has list-only slots');
}

const askOlive = (page) =>
  page.evaluate(
    `fetch(${JSON.stringify(ORIGIN + config.doorPrefix + 'olive')}, { method: 'POST', headers: { 'content-type': 'application/json', ${JSON.stringify(config.header)}: '1' }, body: ${JSON.stringify(JSON.stringify(sampleAsk()))} }).then(r => r.json())`
  );

/** Every profile-shaped object in the family's storage, whatever the save's version: {key, name, robot}. */
const FAMILY = `(() => {
  const out = [];
  for (const k of Object.keys(localStorage)) {
    if (!/bot-garden/.test(k)) continue;
    let v;
    try { v = JSON.parse(localStorage.getItem(k)); } catch (e) { continue; }
    const walk = (o, d) => {
      if (!o || typeof o !== 'object' || d > 8) return;
      const robot = o.robot && typeof o.robot.name === 'string' ? o.robot.name : typeof o.robotName === 'string' ? o.robotName : null;
      if (typeof o.name === 'string' && robot !== null) out.push({ key: k, name: o.name, robot });
      for (const x of Object.values(o)) walk(x, d + 1);
    };
    walk(v, 0);
  }
  return out;
})()`;
const family = async (page) => (await safe(page, FAMILY)) || [];
const holds = (fam, name, robot) => fam.some((p) => p.name === name && p.robot === robot);

/**
 * R14: the island backups a home's Documents folder holds, each read two ways — its stored family (what a restore
 * writes back) and its save code decoded by the TEMPLATE's own `Logic/Decode save code` (what the Grown-ups page shows).
 */
function islandBackups(home) {
  const dir = path.join(home, 'Documents', config.backups.folderName);
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { dir, files: [], readme: false, backups: [] };
  }
  const files = names.filter((n) => /^island-backup-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  const decodeFile = path.join(REPO, 'templates', 'bot-garden', 'components', 'Logic', 'Decode save code', 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(decodeFile, 'utf8'));
  const script = (Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes)).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript;
  const decode = (code) => {
    const Outputs = {};
    vm.runInNewContext(script, { Inputs: { code }, Outputs, btoa, atob });
    return JSON.parse(JSON.stringify(Outputs));
  };
  const pairs = (profiles) => (profiles || []).map((p) => ({ name: p.name, robot: p.robot && p.robot.name }));
  const backups = files.map((name) => {
    try {
      const body = readJson(path.join(dir, name));
      const decoded = body.saveCode ? decode(body.saveCode) : null;
      return {
        name,
        kind: body.kind,
        players: body.players,
        stored: pairs(body.store && body.store.model && body.store.model.profiles),
        code: decoded && decoded.ok ? pairs(decoded.model.profiles) : null
      };
    } catch (e) {
      return { name, error: String(e && e.message).slice(0, 200) };
    }
  });
  return { dir, files, readme: names.includes('README.txt'), backups };
}
const backupHolds = (b, name, robot) => !!b && holds(b.stored || [], name, robot) && holds(b.code || [], name, robot);

/** A finder over visible elements: the first whose text includes any of the needles. */
const byText = (selector, needles) =>
  `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && ${JSON.stringify(needles)}.some((n) => e.innerText.includes(n)))`;
/** Press it: el.click(), with the hit test at its centre recorded (see the header). */
const press = (page, finder) =>
  safe(
    page,
    `(() => { const el = (${finder}); if (!el) return { found: false };
      el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const hit = !!at && (el === at || el.contains(at)); el.click(); return { found: true, hit }; })()`
  );
/** Type into an input the way the page drive does: the native setter, then input + change, then blur (a save on blur). */
const type = (page, finder, value) =>
  safe(
    page,
    `(() => { const el = (${finder}); if (!el) return false; el.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return true; })()`
  );
const visibleInputs = `[...document.querySelectorAll('input')].filter((e) => e.offsetParent !== null)`;
const go = (page, where) => safe(page, `location.assign(${JSON.stringify(ORIGIN + where)})`);
const pathIs = (page, want, ms = 10_000) =>
  until(`location ${want}`, () => safe(page, 'location.pathname'), (p) => p === want, ms).then(
    () => true,
    () => false
  );
const becomes = (label, read, ok, ms) => until(label, read, ok, ms).then(
  () => true,
  () => false
);

/** Launch 1's family: a new player and her robot, then the robot renamed on My robot. Never throws: each clause records. */
async function makeFamily(page) {
  const W = words();
  const c = {};
  try {
    await go(page, '/');
    c.onProfiles = await becomes('Profiles', () => safe(page, 'document.body.innerText'), (t) => !!t && W.whoIsPlaying.some((w) => t.includes(w)), 20_000);
    c.newPlayer = await press(page, byText('button', W.newProfile));
    c.formOpen = await becomes('the form', () => safe(page, `${visibleInputs}.length`), (n) => n >= 2, 8_000);
    // The name box is the form's first input; the robot's box is the one holding the default robot name (Pip).
    c.typedName = await type(page, `${visibleInputs}[0]`, PLAYER);
    c.boxesBefore = await safe(page, `${visibleInputs}.map((e) => e.value)`);
    c.typedRobot = await type(page, `(${visibleInputs}.find((e) => e.value === 'Pip') || ${visibleInputs}[1])`, ROBOT_FIRST);
    await wait(300);
    c.create = await press(page, byText('button', W.create));
    c.landedOnIsland = await pathIs(page, '/island');
    await wait(1500);
    c.afterCreate = await family(page);
    c.storedAfterCreate = holds(c.afterCreate, PLAYER, ROBOT_FIRST);
    // Ruling 7: the kids may rename the robot (My robot, opSetName on blur/enter). Verify it, do not rebuild it.
    await go(page, '/robot');
    c.myRobotBox = await becomes('My robot’s name box', () => safe(page, `${visibleInputs}.some((e) => e.value === ${JSON.stringify(ROBOT_FIRST)})`), (b) => b === true, 15_000);
    c.typedRename = await type(page, `${visibleInputs}.find((e) => e.value === ${JSON.stringify(ROBOT_FIRST)})`, ROBOT_RENAMED);
    await wait(1500);
    c.afterRename = await family(page);
    c.storedAfterRename = holds(c.afterRename, PLAYER, ROBOT_RENAMED);
  } catch (e) {
    c.error = String(e && e.message).slice(0, 300);
  }
  c.logs = page.logs.slice(-10);
  return c;
}

/** Launch 2's (and the control's) reading: the family in storage; with `choose`, on her card and on My robot too. */
async function readFamily(page, { choose }) {
  const c = {};
  try {
    await wait(1500);
    c.stored = await family(page);
    c.storedKept = holds(c.stored, PLAYER, ROBOT_RENAMED);
    if (!choose) return c;
    await go(page, '/');
    const card = byText('.bg-profile', [PLAYER]);
    c.cardText = await until('Ada’s card', () => safe(page, `(() => { const e = (${card}); return e ? e.innerText : null; })()`), (t) => !!t, 15_000).catch(() => null);
    c.cardShows = !!c.cardText && c.cardText.includes(PLAYER) && c.cardText.includes(ROBOT_RENAMED);
    c.chose = await press(page, card);
    c.onIsland = await pathIs(page, '/island');
    await go(page, '/robot');
    c.myRobotShows = await becomes('My robot says Bolt', () => safe(page, `${visibleInputs}.some((e) => e.value === ${JSON.stringify(ROBOT_RENAMED)})`), (b) => b === true, 15_000);
  } catch (e) {
    c.error = String(e && e.message).slice(0, 300);
  }
  c.logs = page.logs.slice(-10);
  return c;
}

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
  if (!fs.existsSync(WORDS_FILE)) throw new Error(`no words table at ${WORDS_FILE}: the family clauses read the template's own words`);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-upgrade-'));
  const homeA = path.join(scratch, 'A');
  const homeB = path.join(scratch, 'B');
  // Policy A = the shipped one plus a marker collection; policy B = the shipped one. Different bytes, so 0.0.2 must
  // adopt B. The marker is a LEGAL collection, not a private top-level key: the backend refuses a policy with an
  // unknown top-level key (`unknown top-level key "_driveMarker"`, FATAL, exit 1) and the window never opens —
  // the first run of this drive, 2026-09-27, 0 launches. It is written out (every rule nobody), not copied from a
  // collection of the shipped policy: the garden ships the shell's CLOSED policy, which has none (s3).
  const shipped = readJson(SHIPPED_POLICY);
  const marker = { permissions: { ...CLOSED_POLICY.defaults.permissions }, creatorOwns: true };
  const policyA = { ...shipped, collections: { ...shipped.collections, DriveMarkerV1: marker } };
  const hasMarker = (file) => !!(readJson(file).collections || {}).DriveMarkerV1;
  const dirA = path.join(scratch, 'policy-A');
  const dirB = path.join(scratch, 'policy-B');
  fs.mkdirSync(dirA, { recursive: true });
  fs.mkdirSync(dirB, { recursive: true });
  fs.writeFileSync(path.join(dirA, config.policy), JSON.stringify(policyA, null, 2));
  fs.copyFileSync(SHIPPED_POLICY, path.join(dirB, config.policy));
  R.home = scratch;
  R.policyShipped = { collections: Object.keys(shipped.collections || {}), devOpen: shipped.devOpen };
  const data = (home) => path.join(home, 'userData', config.dataDirName);

  // launch 1
  step('launch 1 (home A, 0.0.1, policy A)');
  let app = await launch(homeA, '0.0.1', dirA);
  R.launch1 = {};
  await until('page drawn', () => bodyText(app.page), (s) => s.length > 0, 60_000);
  R.launch1.shownAtMs = Date.now() - app.t0;
  R.launch1.title = await safe(app.page, 'document.title');
  const owl1 = await until('the owl settled', () => status(app.page), settled, 180_000);
  R.launch1.model = owl1.model;
  R.withModel = owl1.model === 'ready';
  if (R.withModel) {
    const s1 = await until('the exam has results', () => status(app.page), (s) => s && s.exam && s.exam.at, EXAM_WAIT_MS);
    R.launch1.examAt = s1.exam.at;
    R.launch1.examRungs = Object.keys(s1.exam.rungs).length;
  } else {
    // AC4 in Electron: no model → no exam runs, so none is waited for; an ask is the page's cue for the written line.
    step(`the owl is "${owl1.model}" (${owl1.reason || 'no reason'}): no exam wait; an ask must fall back`);
    R.launch1.reason = owl1.reason;
    R.launch1.ask = await askOlive(app.page);
    R.launch1.fallsBack = !!R.launch1.ask && R.launch1.ask.ok === false && R.launch1.ask.fallback === true && R.launch1.ask.reason === 'no-model';
  }
  step(`CG-003: a new player "${PLAYER}" with the robot "${ROBOT_FIRST}", then the robot renamed "${ROBOT_RENAMED}" on My robot`);
  R.launch1.family = await makeFamily(app.page);
  await wait(1000);
  mergeHosts(app);
  R.launch1.quit = await quit(app);
  await wait(1500);

  step('read the disk after 0.0.1');
  const d = data(homeA);
  R.disk1 = {
    database: fs.existsSync(path.join(d, 'data', 'local.db')),
    policyInstalled: fs.existsSync(path.join(d, 'security.json')) && hasMarker(path.join(d, 'security.json')),
    // R14: the backend's SQLite backup (it holds nothing of the game) is no longer seeded.
    noBackendBackup: !fs.existsSync(path.join(d, 'backups.json')),
    island: islandBackups(homeA),
    examKept: fs.existsSync(path.join(d, 'olive-exam.json')),
    backendsLeftRunning: backendsFor(homeA),
    timingsEvents: fs.readFileSync(path.join(homeA, 'userData', 'logs', 'timings.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).event)
  };

  // launch 2
  step('launch 2 (home A, 0.0.2, policy B)');
  app = await launch(homeA, '0.0.2', dirB);
  R.launch2 = {};
  await until('page drawn', () => bodyText(app.page), (s) => s.length > 0, 60_000);
  const s2 = await until('the owl settled', () => status(app.page), settled, 180_000);
  R.launch2.model = s2.model;
  R.launch2.examAt = s2.exam ? s2.exam.at : null;
  // With a model: kept, not re-run. Without: still none (nothing invented, and no exam started by an upgrade).
  R.launch2.examKept = R.withModel ? R.launch2.examAt === R.launch1.examAt : s2.exam === null;
  step(`CG-003: "${PLAYER}" and "${ROBOT_RENAMED}" are still there — in storage, on her card, on My robot`);
  R.launch2.family = await readFamily(app.page, { choose: true });
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
    examKept: R.withModel ? fs.existsSync(path.join(d, 'olive-exam.json')) && readJson(path.join(d, 'olive-exam.json')).at === R.launch1.examAt : !fs.existsSync(path.join(d, 'olive-exam.json')),
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
  // The control for the family clauses: a fresh home has no Ada — so launch 2's reading was the upgrade's, not a
  // storage every home shares.
  R.launch3.family = await readFamily(app.page, { choose: false });
  R.launch3.noFamily = Array.isArray(R.launch3.family.stored) && !R.launch3.family.stored.some((p) => p.name === PLAYER);
  mergeHosts(app);
  R.launch3.quit = await quit(app);
  await wait(1500);
  R.launch3.noOldPolicy = fs.readdirSync(data(homeB)).filter((f) => f.startsWith('security.before-')).length === 0;
  R.launch3.island = islandBackups(homeB);
  R.launch3.noBackup = R.launch3.island.files.length === 0;
  R.backendsLeftRunning = backendsFor(homeA).concat(backendsFor(homeB));

  R.offLoopback = Object.keys(R.hosts).filter((h) => !['127.0.0.1', 'about', 'data', 'blob'].includes(h));
  const f1 = R.launch1.family;
  const f2 = R.launch2.family;
  R.clauses = {
    owl: R.withModel ? !!R.launch1.examAt : R.launch1.model === 'none' && R.launch1.fallsBack,
    disk1: R.disk1.database && R.disk1.policyInstalled && R.disk1.noBackendBackup && (R.withModel ? R.disk1.examKept : true) && R.disk1.backendsLeftRunning.length === 0,
    // R14: after launch 1 made Ada/Bolt and quit, a backup of the day holds them — stored and as a save code.
    islandBackup: R.disk1.island.files.length === 1 && R.disk1.island.readme && backupHolds(R.disk1.island.backups[0], PLAYER, ROBOT_RENAMED),
    family1: !!f1.storedAfterCreate && !!f1.storedAfterRename,
    examKept: R.launch2.examKept && R.disk2.examKept,
    disk2: R.disk2.database && R.disk2.policyIsB && R.disk2.oldPolicyIsA && R.disk2.launchLines.length === 2 && R.disk2.launchLines[1][1] === 'replaced',
    family2: !!f2.storedKept && !!f2.cardShows && !!f2.myRobotShows,
    control: R.launch3.examAtDiffers && R.launch3.noOldPolicy && R.launch3.noFamily && R.launch3.noBackup,
    noBackendLeft: R.backendsLeftRunning.length === 0,
    wire: R.offLoopback.length === 0
  };
  const verdict = Object.values(R.clauses).every(Boolean);
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
