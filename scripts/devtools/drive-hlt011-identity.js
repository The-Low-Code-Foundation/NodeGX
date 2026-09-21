#!/usr/bin/env node
/**
 * HLT-011 — click a launcher card, and measure WHICH PROJECT OPENED.
 *
 *   node scripts/devtools/drive-hlt011-identity.js --arm control   # the build before the fix
 *   node scripts/devtools/drive-hlt011-identity.js --arm fixed     # the build after it
 *
 * A pair is the evidence; neither arm means anything alone.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ## 🔴 The arms are two BUILDS, not two data states, and that is forced
 *
 * Every other P99 drive varies data and keeps one build, because a control that patches a
 * webpack export grades a build nobody ships ([[an-instrument-must-be-armed-before-it-measures]]).
 * Here the data IS the defect: two rows sharing one `id`. Removing the collision does not
 * reproduce the old behaviour, it *removes the thing being measured*. So the control arm is
 * run against HEAD before the fix and the fixed arm after it, on an IDENTICAL fixture — which
 * makes the fixture, not the patch, the thing that has to be reproducible. It is written from
 * scratch on every run.
 *
 * ## 🔴 It never touches Richard's profile
 *
 * `NOODL_USER_DATA_DIR` moves `app.getPath('userData')` and every electron-store file with it,
 * so the launcher this drive clicks reads a store written by this script into the scratchpad.
 * Richard's own `recently_opened_project.json` — 106 entries, 7.6 MB, and the real collision
 * this row was opened from — is READ ONCE for `firstRunLegal.json` and never written.
 * [[drive-a-first-run-with-nodegx-user-data-dir]].
 *
 * ## The fixture, and why there are THREE rows
 *
 *   alpha   id = SHARED   latestAccessed = now          ← `fetch()` sorts this first
 *   beta    id = SHARED   latestAccessed = now - 1h     ← the card this drive CLICKS
 *   gamma   id = unique   latestAccessed = now - 2h     ← the calibration click
 *
 * 🔴 **Gamma is not decoration.** A run in which every click opens alpha, or no click opens
 * anything, reads exactly like the defect. Gamma's row cannot collide, so it must open itself
 * in BOTH arms — a known-firing signal beside the reading
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]). If gamma misroutes, the run is
 * UNGRADED rather than passing.
 *
 * ## What is measured
 *
 * `ProjectModel.instance._retainedProjectDirectory` — the directory the editor actually opened,
 * which is ground truth. Deliberately NOT the project's name: `loadProject` assigns
 * `project.name = projectEntry.name`, so a misrouted open reports the name of the row it
 * resolved to and a name-based instrument would agree with itself either way.
 *
 * ## The third arm — AC3, the collision the editor is supposed to SAY OUT LOUD
 *
 * Counted in both arms: whether the launcher names the collision. Absent in `control` because
 * the feature does not exist there; present in `fixed`. Read from the toast's own text, so it
 * grades what a person sees rather than a flag in a model.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ARM = opt('arm', 'fixed');
const JSON_OUT = opt('json', null);
const REPO = path.join(__dirname, '..', '..');
const CDP = path.join(__dirname, 'cdp.js');
const SOURCE_PROJECT = opt('source', '/Users/richardosborne/vscode_projects/NodeGX test projects/cn012-drive');

const WORK = opt('work', path.join(os.tmpdir(), 'hlt011-drive'));
const PROFILE = path.join(WORK, 'profile');
const PROJECTS = path.join(WORK, 'projects');
const REAL_USER_DATA = path.join(os.homedir(), 'Library', 'Application Support', 'NodeGX');

/** One id on two rows. Not a real project's id: the fixture manufactures the collision. */
const SHARED_ID = 'hlt011-shared-identity-0000-000000000000';
const UNIQUE_ID = 'hlt011-unique-identity-1111-111111111111';

const ROWS = [
  { key: 'alpha', name: 'HLT-011 Alpha', id: SHARED_ID, ageMs: 0 },
  { key: 'beta', name: 'HLT-011 Beta', id: SHARED_ID, ageMs: 60 * 60 * 1000 },
  { key: 'gamma', name: 'HLT-011 Gamma', id: UNIQUE_ID, ageMs: 2 * 60 * 60 * 1000 }
];

if (!['fixed', 'control'].includes(ARM)) {
  console.error(`--arm must be 'fixed' or 'control', got ${ARM}`);
  process.exit(2);
}

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail: detail === undefined ? null : String(detail) });
  const tag = ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL';
  console.log(`${tag}  ${name}${detail !== undefined ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dirOf = (key) => path.join(PROJECTS, `hlt011-${key}`);

function ev(expression) {
  const out = execFileSync('node', [CDP, 'eval', expression], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.trim().split('\n').pop().trim();
}
const evJSON = (expression) => {
  const raw = ev(expression);
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return { __unparsed: raw };
  }
};

// ── the fixture ───────────────────────────────────────────────────────────────

function buildFixture() {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(PROFILE, { recursive: true });
  fs.mkdirSync(PROJECTS, { recursive: true });

  for (const row of ROWS) {
    fs.cpSync(SOURCE_PROJECT, dirOf(row.key), { recursive: true });
  }

  // A truly empty profile shows the first-run legal modal in front of the launcher, and the
  // drive would click a card it cannot see. Copied, never written back.
  const legal = path.join(REAL_USER_DATA, 'firstRunLegal.json');
  if (fs.existsSync(legal)) fs.copyFileSync(legal, path.join(PROFILE, 'firstRunLegal.json'));

  const now = Date.now();
  const recentProjects = ROWS.map((row) => ({
    retainedProjectDirectory: dirOf(row.key),
    latestAccessed: now - row.ageMs,
    id: row.id,
    name: row.name,
    thumbURI: ''
  }));
  fs.writeFileSync(
    path.join(PROFILE, 'recently_opened_project.json'),
    JSON.stringify({ recentProjects }, null, 2)
  );
  return recentProjects;
}

// ── the launch ────────────────────────────────────────────────────────────────

function stopDev() {
  try {
    execFileSync('node', [path.join(__dirname, 'stop-dev.js')], { encoding: 'utf8', stdio: 'pipe' });
  } catch (_e) {
    /* nothing running is fine */
  }
}

async function launch() {
  stopDev();
  await wait(1500);
  const child = spawn('npm', ['run', 'dev:debug', '--', '--quiet'], {
    cwd: REPO,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, NOODL_USER_DATA_DIR: PROFILE }
  });
  child.unref();

  // 🔴 Gate on `reactMounted`, never on a regex over `health`'s output and never on the
  // launcher's exit status — it exits 0 for a stack that never came up.
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    await wait(5000);
    try {
      const out = execFileSync('node', [CDP, 'health'], { encoding: 'utf8', timeout: 20000, stdio: 'pipe' });
      const state = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
      if (state.reactMounted === true) return true;
    } catch (_e) {
      /* not up yet */
    }
  }
  return false;
}

// ── the renderer ──────────────────────────────────────────────────────────────

const W = (p) => `window.__wreq(${JSON.stringify(p)})`;
const BOOT = `(() => {
  if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') {
    webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]);
  }
  return typeof window.__wreq;
})()`;

const PROJECT_MODEL = () => `${W('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const openedDirectory = () =>
  ev(`(() => { const p = ${PROJECT_MODEL()}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);

/** Find the router the way HLT-003 does — it is the only way back to the launcher. */
function findRouter() {
  return ev(`(() => {
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 60) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__hlt011Router = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__hlt011Router ? 'ok' : 'NO ROUTER';
  })()`);
}

const CARDS = `JSON.stringify([...document.querySelectorAll('[data-test="launcher-project-card"]')].map((el, i) => {
  const r = el.getBoundingClientRect();
  return { i, title: (el.textContent || '').slice(0, 60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
}))`;

/**
 * Tag one card and HIT-TEST it. A rect is not visibility: a card behind a modal or a toast
 * still has a rect, and a click at its centre would land on whatever is on top
 * ([[a-rendered-surface-can-be-behind-a-blocker]]).
 */
const TAG = (title) => `JSON.stringify((() => {
  document.querySelectorAll('[data-hlt011]').forEach((el) => el.removeAttribute('data-hlt011'));
  const cards = [...document.querySelectorAll('[data-test="launcher-project-card"]')];
  const card = cards.find((el) => (el.textContent || '').includes(${JSON.stringify(title)}));
  if (!card) return { tagged: false, cards: cards.length };
  card.setAttribute('data-hlt011', 'target');
  const r = card.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return {
    tagged: true,
    cards: cards.length,
    index: cards.indexOf(card),
    reachable: Boolean(hit && card.contains(hit)),
    hit: hit ? (hit.className || hit.tagName).toString().slice(0, 80) : 'NONE'
  };
})())`;

/** The collision warning a person sees. Read from the rendered toast, not from a model flag. */
const WARNING = `JSON.stringify((() => {
  const text = (document.body.innerText || '');
  const lines = text.split('\\n').filter((l) => /share one identity|same identity|one identity/i.test(l));
  return { present: lines.length > 0, lines: lines.slice(0, 4) };
})())`;

async function clickCard(title) {
  const tag = evJSON(TAG(title));
  if (!tag.tagged) return { ...tag, opened: 'NOT CLICKED' };
  execFileSync('node', [CDP, 'click', '[data-hlt011="target"]'], { encoding: 'utf8', stdio: 'pipe' });
  await wait(14000);
  return { ...tag, opened: openedDirectory() };
}

/**
 * 🔴 **The drive's own blocker, removed before it measures and never before it READS.**
 *
 * The collision warning is a toast, and the toast layer draws over the grid: the first fixed
 * run hit-tested the third card's centre and got `ToastCard-module__Message`, so the click
 * landed on the warning and the calibration correctly refused to grade
 * ([[a-rendered-surface-can-be-behind-a-blocker]]). It auto-dismisses after 6s like every other
 * warning in the product, so this is a race, not a stuck overlay — but a drive that waits it
 * out is a drive whose timing decides its verdict. AC3 is therefore read FIRST, off the
 * rendered toast, and only then is the toast cleared.
 */
async function clearToasts() {
  ev(`(() => { ${W('./src/editor/src/views/ToastLayer/index.ts')}.ToastLayer.hideAll(); return 'ok'; })()`);
  await wait(1200);
}

async function backToLauncher() {
  ev(`(() => { window.__hlt011Router.route({ to: 'projects' }); return 'ok'; })()`);
  await wait(6000);
  await clearToasts();
}

// ── the run ───────────────────────────────────────────────────────────────────

const reading = { arm: ARM, fixture: null, calibration: null, target: null, warning: null };

function finish(code) {
  const failures = arms.filter((a) => a.ok === false).length;
  const ungraded = arms.filter((a) => a.ok === null).length;
  console.log(`\n${arms.length - failures - ungraded}/${arms.length} arms ok, ${failures} FAIL, ${ungraded} ungraded`);
  console.log(JSON.stringify(reading, null, 2));
  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
    fs.writeFileSync(JSON_OUT, JSON.stringify({ arm: ARM, arms, reading }, null, 2));
    console.log(`\nwrote ${JSON_OUT}`);
  }
  process.exitCode = code !== undefined ? code : failures > 0 ? 1 : 0;
}

async function main() {
  console.log(`HLT-011 identity drive — --arm ${ARM}`);
  console.log(`profile: ${PROFILE}\n`);

  const rows = buildFixture();
  reading.fixture = rows.map((r) => ({ name: r.name, id: r.id, dir: r.retainedProjectDirectory }));
  const sharing = rows.filter((r) => r.id === SHARED_ID).length;
  record('the fixture manufactures the collision before anything is driven', sharing === 2 && rows.length === 3, `${rows.length} rows, ${sharing} sharing one id`);

  if (!(await launch())) {
    record('the editor came up', false, 'no reactMounted inside 5 minutes');
    return finish(1);
  }
  record('the editor came up', true);

  ev(BOOT);
  const routed = findRouter();
  record('the router was found', routed === 'ok', routed);
  if (routed !== 'ok') return finish(1);

  // The editor must be ON the launcher, and it must be reading THIS profile's store.
  const seen = evJSON(`JSON.stringify(${W('./src/editor/src/utils/LocalProjectsModel.ts')}.LocalProjectsModel.instance.getProjects().map((p) => ({ name: p.name, id: p.id, dir: p.retainedProjectDirectory })))`);
  const seenOk = Array.isArray(seen) && seen.length === 3 && seen.filter((p) => p.id === SHARED_ID).length === 2;
  record('the editor reads the seeded profile, collision intact', seenOk, JSON.stringify(seen).slice(0, 300));
  if (!seenOk) return finish(1);

  const cards = evJSON(CARDS);
  record('REACH — three cards rendered on the launcher', Array.isArray(cards) && cards.length === 3, JSON.stringify((cards || []).map((c) => c.title.split('\n')[0])));

  // ═══ AC3 — what the launcher says about the collision, read BEFORE anything is clicked ═══
  const warning = evJSON(WARNING);
  reading.warning = warning;
  if (ARM === 'control') {
    record('AC3 — nothing in this build names the collision', warning.present === false, JSON.stringify(warning.lines));
  } else {
    record('AC3 — the launcher names the collision in words', warning.present === true, JSON.stringify(warning.lines));
  }
  await clearToasts();

  // ═══ CALIBRATION — a row that CANNOT collide must open itself, in both arms ═══
  const gamma = await clickCard('HLT-011 Gamma');
  reading.calibration = gamma;
  const gammaOk = path.resolve(gamma.opened || '') === path.resolve(dirOf('gamma'));
  record('CALIBRATION — the uncollidable row opens itself', gammaOk, `reachable=${gamma.reachable}, opened=${gamma.opened}`);
  if (!gammaOk) {
    record('THE NUMBER', null, 'ungraded: the drive cannot open the card it clicks');
    return finish(1);
  }

  await backToLauncher();

  // ═══ THE NUMBER — click BETA, the older of the two rows sharing an id ═══
  const beta = await clickCard('HLT-011 Beta');
  reading.target = beta;
  const openedBeta = path.resolve(beta.opened || '') === path.resolve(dirOf('beta'));
  const openedAlpha = path.resolve(beta.opened || '') === path.resolve(dirOf('alpha'));
  record('REACH — the clicked card was the one a person could press', beta.reachable === true, `index=${beta.index}, hit=${beta.hit}`);

  if (ARM === 'control') {
    record('THE MISROUTE — clicking Beta opens ALPHA', openedAlpha, `opened=${beta.opened}`);
  } else {
    record('THE NUMBER — clicking Beta opens BETA', openedBeta, `opened=${beta.opened}`);
  }

  finish();
}

// 🔴 The teardown runs on EVERY path. HLT-004 lost one to a `process.exit()` inside a `try`,
// and what it did not restore was Richard's real session file.
main()
  .catch((err) => {
    record('the drive ran to completion', false, err && err.message);
    finish(1);
  })
  .finally(() => {
    stopDev();
  });
