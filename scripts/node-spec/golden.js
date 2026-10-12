#!/usr/bin/env node
/**
 * golden — NSP-010 (phase 107): a behaviour change is a version, a trace diff, and a migration answer.
 *
 * Every spec's hand scenarios, played on the interpreter, are committed as `packages/nodegx-node-spec/golden/<type>.json`
 * (src/runner/golden.ts says what is in one). Three checks, all in `--check`:
 *
 *   FRESH     the committed golden files are what the specs play today — a reducer edited without `golden.js` run fails,
 *             named, as does a golden file whose spec is gone.
 *   VERSION   against the golden files at `--base` (default HEAD; the PR workflow passes the PR's base): a scenario that plays
 *             the same input and traces differently, or a port renamed / added / removed, with the spec's `version`
 *             unchanged, fails; every version above the base's needs its `changes` entry; a version never falls.
 *   HISTORY   every spec's `changes`: rising versions, none above `version`, words in `says`, exactly one migration answer
 *             (`none` with its reason / `project` with its id / `parameter` naming an input of the spec).
 *
 * Usage:
 *   node scripts/node-spec/golden.js                          # write every golden file
 *   node scripts/node-spec/golden.js --check [--base <ref>]   # exit 1 on any of the three
 *   node scripts/node-spec/golden.js --diff  [--base <ref>]   # the readable before / after (markdown) of every node that moved
 *   --type <type>[,<type>]   only these specs (write / check / diff)
 *
 * A base that cannot be read (a shallow clone without it) is an error, never a pass: the rule would grade nothing.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { requireSource } = require('./load-specs');

const root = path.join(__dirname, '..', '..');
const pkg = path.join(root, 'packages', 'nodegx-node-spec');
const GOLDEN_DIR = path.join(pkg, 'golden');
const GOLDEN_REL = path.relative(root, GOLDEN_DIR).split(path.sep).join('/');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const fileOf = (type) => `${type}.json`;
/** One scenario per line: a PR's diff of a golden file shows the scenarios that moved and nothing else (19 MB compact over 9,204 scenarios at s78; indented it was 31 MB). */
const serialise = (g) =>
  `{"type":${JSON.stringify(g.type)},"version":${g.version},"ports":${JSON.stringify(g.ports)},"scenarios":[\n${g.scenarios.map((s) => JSON.stringify(s)).join(',\n')}\n]}\n`;

/** The golden file at a commit — `null` when the commit has none for this node; throws when the commit itself is unreadable. */
function atBase(base, type) {
  const r = spawnSync('git', ['show', `${base}:${GOLDEN_REL}/${fileOf(type)}`], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status === 0) return JSON.parse(r.stdout);
  if (/does not exist in|exists on disk, but not in/.test(r.stderr)) return null;
  throw new Error(`cannot read ${GOLDEN_REL}/${fileOf(type)} at ${base}: ${r.stderr.trim()}`);
}

function baseReadable(base) {
  const r = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { cwd: root, encoding: 'utf8' });
  return r.status === 0;
}

async function main() {
  const lib = requireSource(path.join(pkg, 'src', 'index.ts'));
  const only = option('--type')?.split(',');
  const types = Object.keys(lib.specs)
    .filter((t) => !only || only.includes(t))
    .sort();

  const fresh = new Map();
  for (const type of types) fresh.set(type, await lib.goldenOf(lib.specs[type], lib.loadScenarios(type)));

  if (!flag('--check') && !flag('--diff')) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    let wrote = 0;
    for (const [type, golden] of fresh) {
      const file = path.join(GOLDEN_DIR, fileOf(type));
      const text = serialise(golden);
      if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) continue;
      fs.writeFileSync(file, text);
      wrote++;
      console.log(`wrote ${path.relative(root, file)}`);
    }
    if (!only) {
      for (const f of fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'))) {
        if (!fresh.has(f.slice(0, -5))) {
          fs.unlinkSync(path.join(GOLDEN_DIR, f));
          console.log(`removed ${f} — no spec`);
        }
      }
    }
    console.log(`golden: ${fresh.size} specs, ${[...fresh.values()].reduce((n, g) => n + g.scenarios.length, 0)} scenarios, ${wrote} file(s) written`);
    return 0;
  }

  const base = option('--base') ?? 'HEAD';
  if (!baseReadable(base)) {
    console.error(`golden: the base ${base} is not a commit here — fetch it (a shallow clone has no parent); the version rule would grade nothing`);
    return 1;
  }

  if (flag('--diff')) {
    const out = [];
    for (const [type, golden] of fresh) {
      const was = atBase(base, type);
      if (!was) continue;
      if (!lib.goldenChange(was, golden) && was.version === golden.version) continue;
      out.push(lib.formatGoldenChange(was, golden, lib.specs[type]));
    }
    console.log(out.length ? out.join('\n\n') : `No golden trace moved since ${base}.`);
    return 0;
  }

  const problems = [];
  for (const [type, golden] of fresh) {
    const file = path.join(GOLDEN_DIR, fileOf(type));
    if (!fs.existsSync(file)) problems.push(`${type}: no golden file — run node scripts/node-spec/golden.js`);
    else if (fs.readFileSync(file, 'utf8') !== serialise(golden)) problems.push(`${type}: the golden file is stale — the spec plays differently from what is committed; run node scripts/node-spec/golden.js and read --diff`);
    problems.push(...lib.changesProblems(lib.specs[type]));
    problems.push(...lib.versionProblems(atBase(base, type), golden, lib.specs[type]));
  }
  if (!only && fs.existsSync(GOLDEN_DIR)) {
    for (const f of fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'))) {
      if (!fresh.has(f.slice(0, -5))) problems.push(`${f}: a golden file with no spec`);
    }
  }
  const scenarios = [...fresh.values()].reduce((n, g) => n + g.scenarios.length, 0);
  const histories = [...fresh.keys()].filter((t) => (lib.specs[t].changes ?? []).length > 0).length;
  if (problems.length) {
    for (const p of problems) console.error('✗ ' + p);
    console.error(`golden --check: ${problems.length} problem(s) over ${fresh.size} specs (base ${base})`);
    return 1;
  }
  console.log(`golden --check: ${fresh.size} specs, ${scenarios} scenarios fresh; version rule held against ${base}; ${histories} spec(s) with a history`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
