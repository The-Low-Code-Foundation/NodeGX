#!/usr/bin/env node
/**
 * P109 ISL-002 AC5 — the person sentence on a deployed page: a States node that starts in its first state sends
 * that state's `false` as `false` and its empty text as the empty text, from the first paint.
 *
 * The page is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl002-first-state`, deployed with
 * `nodegx deploy`: a States node `off,on` with `flag` (true/false: off → false) and `label` (text: off → ''), never
 * moved. `flag` and `label` each go into a Function that writes `typeof:value` into a Text; `label` also goes
 * straight into a third Text whose own text is `LABEL-DEFAULT` (what a person sees).
 *
 * Readings (ISL-002 §8 grades them; this prints): the marker, the three Texts as drawn, console errors, and a
 * screenshot when `--shot` is given. The control arm is the same deployed folder with its bundle's first jump put
 * back to `|| 0` (`--control` does that to a COPY of the folder, never the source).
 *
 * Usage: drive-isl002-first-state.js <deploy-dir> [--control] [--shot out.png] [--json out.json]
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
const SHOT = flagValue('--shot');
const JSON_OUT = flagValue('--json');
if (!SRC || SRC.startsWith('--')) {
  console.error('usage: drive-isl002-first-state.js <deploy-dir> [--control] [--shot out.png] [--json out.json]');
  process.exit(2);
}

/** The fixed first jump, as webpack's dev build prints it, and the `|| 0` it replaced. */
const FIXED = 'internal.currentValues[v] = typed ? typed.value : internal.stateParameters[prefix + v] || 0;';
const BEFORE = 'internal.currentValues[v] = internal.stateParameters[prefix + v] || 0;';

function controlCopy(dir) {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'isl002-control-'));
  fs.cpSync(dir, copy, { recursive: true });
  const bundle = path.join(copy, 'noodl.deploy.js');
  const text = fs.readFileSync(bundle, 'utf8');
  const hits = text.split(FIXED).length - 1;
  if (hits !== 1) throw new Error(`control: expected the fixed first jump once in noodl.deploy.js, found ${hits}`);
  fs.writeFileSync(bundle, text.replace(FIXED, BEFORE));
  return copy;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const text = document.body.innerText;
  const lines = text.split('\\n').map((l) => l.trim());
  return {
    marker: text.includes('isl002 page drew'),
    flag: lines.find((l) => l.startsWith('flag: ')) ?? null,
    label: lines.find((l) => l.startsWith('label: ')) ?? null,
    labelTextDefaultShown: text.includes('LABEL-DEFAULT'),
    lines: lines.filter((l) => l !== '')
  };
})()`;

const DIR = CONTROL ? controlCopy(SRC) : SRC;

withDeployedSite({ dir: DIR }, async ({ evaluate, consoleErrors, screenshot }) => {
  let read = await evaluate(READ);
  for (let i = 0; i < 20 && !(read.marker && read.flag && !read.flag.endsWith('nothing arrived')); i++) {
    await wait(250);
    read = await evaluate(READ);
  }
  if (SHOT) await screenshot(SHOT);
  return { dir: SRC, arm: CONTROL ? 'control (|| 0 put back in a copy)' : 'as deployed', ...read, consoleErrors: consoleErrors.slice(0, 10) };
})
  .then((result) => {
    const text = JSON.stringify(result, null, 2);
    console.log(text);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, text);
    if (CONTROL) fs.rmSync(DIR, { recursive: true, force: true });
    process.exit(0);
  })
  .catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
