#!/usr/bin/env node
/**
 * P109 ISL-001 AC5 — the person sentence in a real browser: a list given twice while the For Each is still building
 * the first one draws ONE set of rows, the latest.
 *
 * The page is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl001-list-twice`, deployed with
 * `nodegx deploy`: a Function seeds a Variable with list `a` (five id-less rows, `a0`…`a4`) at load and replaces it
 * with list `b` 0–30 ms later (random, recorded as `window.__isl001.delay`); the Variable feeds a For Each of `/Row`,
 * each row a Text with class `isl001-row`. `isl001-list-twice-async` is the same page with 60 rows and the project's
 * "Create asynchronously" Repeater setting on, so the rebuild spans 25 ms chunks a timer can land between; the
 * expected count is read from the page (`window.__isl001.count`). Each load is a fresh navigation (`/?load=N` — a query, never a hash, which
 * would not reload). The clock starts when the seed has run; rows are read at +500 ms and +2 s.
 *
 * `--control` drives a COPY of the folder whose bundle has the For Each's rebuild op put back to
 * `() => { this.refresh(); }` — the block body that dropped the promise (one of ISL-001's two sabotage arms,
 * `3df5adb82`). Never the source folder.
 *
 * Usage: drive-isl001-list-twice.js <deploy-dir> [--control] [--loads 20] [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const args = process.argv.slice(2);
const flagValue = (name) => (args.indexOf(name) === -1 ? null : args[args.indexOf(name) + 1]);
const SRC = args[0];
const CONTROL = args.includes('--control');
const LOADS = Number(flagValue('--loads') || 20);
const JSON_OUT = flagValue('--json');
if (!SRC || SRC.startsWith('--') || !(LOADS > 0)) {
  console.error('usage: drive-isl001-list-twice.js <deploy-dir> [--control] [--loads 20] [--json out.json]');
  process.exit(2);
}

/** As the deploy build prints it (TypeScript lowers the arrow): the fix returns the promise; the old op dropped it. */
const FIXED = '_queueOperation(function () { return _this.refresh(); });';
const BEFORE = '_queueOperation(function () { _this.refresh(); });';

function controlCopy(dir) {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'isl001-control-'));
  fs.cpSync(dir, copy, { recursive: true });
  const bundle = path.join(copy, 'noodl.deploy.js');
  const text = fs.readFileSync(bundle, 'utf8');
  const hits = text.split(FIXED).length - 1;
  if (hits !== 1) throw new Error(`control: expected the fixed rebuild op once in noodl.deploy.js, found ${hits}`);
  fs.writeFileSync(bundle, text.replace(FIXED, BEFORE));
  return copy;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const byClass = [...document.querySelectorAll('.isl001-row')].map((el) => el.textContent.trim());
  const byText = document.body.innerText.split('\\n').map((l) => l.trim()).filter((l) => /^[ab]\\d+$/.test(l));
  return { marker: document.body.innerText.includes('isl001 page drew'), seed: window.__isl001 || null, byClass, byText };
})()`;

const DIR = CONTROL ? controlCopy(SRC) : SRC;

withDeployedSite({ dir: DIR }, async ({ evaluate, navigate, consoleErrors }) => {
  const loads = [];
  for (let n = 1; n <= LOADS; n++) {
    await navigate(`/?load=${n}`);
    let read = await evaluate(READ);
    const started = Date.now();
    for (let i = 0; i < 80 && !read.seed; i++) {
      await wait(25);
      read = await evaluate(READ);
    }
    const seenAt = Date.now();
    const expected = (read.seed && read.seed.count) || 5;
    const at = async (ms) => {
      await wait(Math.max(0, seenAt + ms - Date.now()));
      const r = await evaluate(READ);
      const rows = r.byClass.length ? r.byClass : r.byText;
      return { rows: rows.length, latestOnly: rows.length === expected && rows.every((t) => t.startsWith('b')), aRows: rows.filter((t) => t.startsWith('a')).length, labels: rows.length > 12 ? rows.slice(0, 12).join(' ') + ' …' : rows.join(' ') };
    };
    const r500 = await at(500);
    const r2000 = await at(2000);
    loads.push({ load: n, delay: read.seed && read.seed.delay, seedSeenAfterMs: seenAt - started, at500: r500, at2000: r2000 });
  }
  const wrong = loads.filter((l) => !l.at500.latestOnly || !l.at2000.latestOnly).map((l) => l.load);
  return {
    dir: SRC,
    arm: CONTROL ? 'control (the rebuild op put back to a block body, in a copy)' : 'as deployed',
    loads: loads.length,
    wrongLoads: wrong,
    rowCountsAt2s: loads.map((l) => l.at2000.rows).join(','),
    detail: loads,
    consoleErrors: consoleErrors.slice(0, 10)
  };
})
  .then((result) => {
    const text = JSON.stringify(result, null, 2);
    console.log(JSON.stringify({ arm: result.arm, loads: result.loads, wrongLoads: result.wrongLoads, rowCountsAt2s: result.rowCountsAt2s, consoleErrors: result.consoleErrors }, null, 2));
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, text);
    if (CONTROL) fs.rmSync(DIR, { recursive: true, force: true });
    process.exit(0);
  })
  .catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
