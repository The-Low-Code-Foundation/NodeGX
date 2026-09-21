#!/usr/bin/env node
/**
 * HLT-004 — the failed requests a fresh launch makes, counted on a fresh launch.
 *
 *   node scripts/devtools/drive-hlt004-requests.js --arm fixed     # expect 0 of each 401
 *   node scripts/devtools/drive-hlt004-requests.js --arm control   # the same counters, made to fire
 *
 * A pair is the evidence; neither arm means anything alone. `--arm fixed` on an instrument
 * that cannot see the event reads 0 for the worst possible reason, which is why `control`
 * exists and why it runs the IDENTICAL build.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ## 🔴 What the control varies, and why it is not a monkey-patch
 *
 * HLT-006 paid three sessions for the rule that an instrument which patches a webpack export
 * grades a build that does not exist ([[an-instrument-must-be-armed-before-it-measures]]).
 * This drive patches nothing at all. The control varies **the credential in the store** —
 * a synthetic dead token planted in `nodegx.community.session.json` — which is the exact
 * state Richard's machine was in when the phase was scoped, and it reproduces the old
 * steady state on the shipped build with no mutation of any kind.
 *
 * ⚠️ **The synthetic token never touches a real one.** Measured 2026-09-21: a garbage bearer
 * and no bearer at all get identical answers from the platform — `/api/v1/me` → `200
 * viewer:null`, `/me/path` and `/me/profile` → `401`. So the control needs no credential of
 * Richard's, and this script BACKS UP and RESTORES whatever was in the store regardless.
 *
 * ## 🔴 Two instruments, because they fail differently
 *
 *  1. **`performance.getEntriesByType('resource')` in the renderer** — the request list
 *     itself. This is the thing the fix actually changes: a request that is not made cannot
 *     be logged. It also carries the REACH arm, below.
 *  2. **The `401` lines in `.logs/dev.log`** — the number §3 of the phase board counts, so
 *     the verdict is comparable with the other four rows. `dev-debug.js` opens that file
 *     with `flags: 'w'`, so one launch is one window and no byte offset is needed.
 *
 * ⚠️ **They are not redundant.** Chromium writes the log line from the NETWORK stack, and a
 * request served from a cache, or coalesced, could move one number without the other. A
 * disagreement between them is a finding, not noise, and `finish()` reports both.
 *
 * ## 🔴 THE REACH ARM IS MANDATORY AND IT IS `/api/v1/me`
 *
 * HLT-001's first drive read a confident 0 while selecting zero nodes. The equivalent failure
 * here is an editor whose launcher never mounted its community surfaces at all: then nothing
 * requests `/me/path`, the count is 0, and the fix is unproven. `/api/v1/me` is requested by
 * `useCommunityPeople` on every launch and is NOT credentialed, so it must appear in BOTH
 * arms. If it is absent the run is ungraded rather than passing
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
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
const SETTLE_MS = Number(opt('settle', '20000'));
const REPO = path.join(__dirname, '..', '..');
const CDP = path.join(__dirname, 'cdp.js');
const LOG = path.join(REPO, '.logs', 'dev.log');
const STORE = path.join(os.homedir(), 'Library', 'Application Support', 'NodeGX', 'nodegx.community.session.json');
const BACKUP = `${STORE}.hlt004-backup`;

/** ⚠️ NOT a real credential, and the platform treats it exactly like none — measured. */
const DEAD_TOKEN = 'hlt004-control-token-the-platform-never-issued';

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

// ── the store, and putting it back ────────────────────────────────────────────

function backupStore() {
  if (fs.existsSync(BACKUP)) return; // an earlier arm already took it
  if (fs.existsSync(STORE)) fs.copyFileSync(STORE, BACKUP);
  else fs.writeFileSync(BACKUP, '');
}

function restoreStore() {
  if (!fs.existsSync(BACKUP)) return;
  const saved = fs.readFileSync(BACKUP);
  if (saved.length === 0) {
    if (fs.existsSync(STORE)) fs.unlinkSync(STORE);
  } else {
    fs.writeFileSync(STORE, saved);
  }
  fs.unlinkSync(BACKUP);
}

function plantArmState() {
  if (ARM === 'control') {
    fs.mkdirSync(path.dirname(STORE), { recursive: true });
    fs.writeFileSync(STORE, JSON.stringify({ token: DEAD_TOKEN, handle: 'hlt004-control' }));
    return 'a dead token planted';
  }
  if (fs.existsSync(STORE)) fs.unlinkSync(STORE);
  return 'no credential';
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
    stdio: 'ignore'
  });
  child.unref();

  // ⚠️ Poll `cdp health` rather than sleeping a fixed time: a webpack rebuild after a source
  // change takes far longer than a warm start, and a fixed sleep grades whichever it got.
  //
  // 🔴 **READ `reactMounted`, NOT A REGEX OVER THE OUTPUT.** The first version of this matched
  // `/ok|renderer|attached/` against `cdp health`'s stdout — which is a JSON object with the
  // keys `url`, `title`, `mountPoint`, `rootChildren`, `visibleText`, `reactMounted`, and
  // matches NONE of those words. So the probe reported the editor had not come up while the
  // editor was up, had already logged both 401s and had already forgotten the credential: an
  // instrument that printed a verdict on a run it never measured
  // ([[an-instrument-must-be-armed-before-it-measures]]), the fourth in this phase.
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    await wait(5000);
    try {
      const out = execFileSync('node', [CDP, 'health'], { encoding: 'utf8', timeout: 20000, stdio: 'pipe' });
      const state = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
      if (state.reactMounted === true) return true;
    } catch (_e) {
      /* not up yet, or `health` exited 1 because the renderer is not mounted */
    }
  }
  return false;
}

// ── counting ──────────────────────────────────────────────────────────────────

/**
 * The renderer's own request list. ⚠️ `name` is the full URL, so this matches on the PATH and
 * never on a last segment — `(path)` in a console line is Chromium abbreviating, and matching
 * that would also match any other route ending in the same word.
 */
const RESOURCES = `JSON.stringify((() => {
  const entries = performance.getEntriesByType('resource').map((e) => e.name);
  const count = (needle) => entries.filter((n) => n.includes(needle)).length;
  return {
    total: entries.length,
    bufferFull: entries.length >= 250,
    me: count('/api/v1/me?') + count('/api/v1/me') - count('/api/v1/me/'),
    path: count('/api/v1/me/path'),
    profile: count('/api/v1/me/profile'),
    intake: count('/api/v1/me/intake'),
    feed: count('whats-new/feed.json'),
    community: entries.filter((n) => n.includes('community.nodegx.io')).length
  };
})())`;

function logCounts() {
  if (!fs.existsSync(LOG)) return { path401: 0, profile401: 0, feed404: 0, lines: 0, missing: true };
  const text = fs.readFileSync(LOG, 'utf8');
  const lines = text.split('\n');
  const hits = (re) => lines.filter((l) => re.test(l)).length;
  return {
    path401: hits(/status of 401 \(\) \(path\)/),
    profile401: hits(/status of 401 \(\) \(profile\)/),
    feed404: hits(/status of 404 \(\) \(feed\.json\)/),
    lines: lines.length,
    missing: false
  };
}

function finish(code, payload) {
  const out = { arm: ARM, exit: code, ...payload, arms };
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
  console.log(`\n${code === 0 ? 'PASS' : 'FAIL'} — arm ${ARM}`);
  return code;
}

async function main() {
  console.log(`HLT-004 requests drive — --arm ${ARM}\n`);

  backupStore();
  let code = 1;
  let payload = {};
  try {
    const planted = plantArmState();
    record('the store is in this arm’s state before the launch', true, planted);

    const up = await launch();
    record('the editor came up and CDP answered', up);
    if (!up) return;

    console.log(`  settling ${SETTLE_MS / 1000}s for the launcher’s community reads…`);
    await wait(SETTLE_MS);

    const res = evJSON(RESOURCES);
    const log = logCounts();
    payload = { resources: res, log };
    console.log(`\n  resources: ${JSON.stringify(res)}`);
    console.log(`  log:       ${JSON.stringify(log)}\n`);

    // ═══ REACH — before any absence is believed ═══
    if (res.__unparsed !== undefined) {
      record('the renderer answered the resource query', false, res.__unparsed);
      return;
    }
    record('REACH: the launcher’s community layer ran (`/api/v1/me` was requested)', res.me >= 1, `me=${res.me}`);
    if (res.me < 1) {
      console.log('\n⚠️  UNGRADED — nothing asked the platform anything, so a 0 below means nothing.');
      return;
    }
    record('the resource buffer did not overflow', !res.bufferFull, `${res.total} entries`);
    record('the log window is this launch only', !log.missing, `${log.lines} lines`);

    // ═══ THE NUMBERS ═══
    if (ARM === 'control') {
      record('CONTROL: `/me/path` WAS requested with a dead token', res.path >= 1, `requests=${res.path}`);
      record('CONTROL: `/me/profile` WAS requested with a dead token', res.profile >= 1, `requests=${res.profile}`);
      record('CONTROL: the log carries the 401s the phase counted', log.path401 + log.profile401 >= 2,
        `path=${log.path401} profile=${log.profile401}`);
      // 🔴 The fix's own mechanism, graded in the arm that provokes it: the dead credential
      // must be GONE from the store by the end of the launch that discovered it.
      // ⚠️ Read the CONTENT, not the file's existence: `clearCommunitySession` goes through
      // `StorageNode.remove`, and whether that unlinks or writes an empty object is its
      // business, not this drive's. The credential being unreadable is the claim.
      let heldAfter = null;
      try {
        heldAfter = fs.existsSync(STORE) ? (JSON.parse(fs.readFileSync(STORE, 'utf8')) || {}).token ?? null : null;
      } catch (_e) {
        heldAfter = null;
      }
      record('the dead credential was FORGOTTEN by the end of the launch', heldAfter === null,
        heldAfter === null ? 'the store no longer holds a token' : 'a token is still stored');
      code = arms.every((a) => a.ok !== false) ? 0 : 1;
    } else {
      record('`/me/path` was NOT requested', res.path === 0, `requests=${res.path}`);
      record('`/me/profile` was NOT requested', res.profile === 0, `requests=${res.profile}`);
      record('0 `401 (path)` lines in the launch log', log.path401 === 0, `lines=${log.path401}`);
      record('0 `401 (profile)` lines in the launch log', log.profile401 === 0, `lines=${log.profile401}`);
      // ⚠️ The two instruments must agree. A request with no log line, or a log line with no
      // request, is a finding about the instrument and the run is not a clean pass.
      const agree =
        (res.path === 0) === (log.path401 === 0) && (res.profile === 0) === (log.profile401 === 0);
      record('the two instruments agree', agree,
        `requests path=${res.path} profile=${res.profile} · log path=${log.path401} profile=${log.profile401}`);
      code = arms.every((a) => a.ok !== false) ? 0 : 1;
    }

    // ═══ THE ROW THIS TASK DOES NOT FIX, COUNTED ANYWAY ═══
    // ⚠️ `feed.json` is classified CORRECT-BEHAVIOUR: the content origin is entirely
    // unpublished (the whole GitHub Pages site answers 404), `whats-new.ts` already resolves
    // it to `null` without throwing, and the console line is Chromium's. Counted so the
    // verdict states it rather than a later reader rediscovering it. See HLT-013.
    record('feed.json 404s — recorded, NOT fixed by this task', null, `lines=${log.feed404}`);
  } finally {
    // 🔴 **AND NOTHING ABOVE MAY CALL `process.exit`.** The first version of this drive exited
    // from inside the `try` on a failed arm; `process.exit` terminates immediately and a
    // pending `finally` DOES NOT RUN, so the dev stack was left up and — far worse — the real
    // session file stayed deleted, restored by hand afterwards. A teardown that only runs on
    // the happy path is not a teardown. Every arm above returns; only `main` exits.
    stopDev();
    restoreStore();
    console.log('  teardown: dev stack stopped, the store put back as it was');
  }
  return process.exit(finish(code, payload));
}

main().catch((err) => {
  console.error(err);
  try {
    stopDev();
    restoreStore();
  } catch (_e) {
    /* best effort */
  }
  process.exit(1);
});
