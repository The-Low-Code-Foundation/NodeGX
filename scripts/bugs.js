#!/usr/bin/env node
/**
 * The bug ledger — `dev-docs/bugs/*.md`, one file per bug (the rules: dev-docs/bugs/README.md).
 *
 *   node scripts/bugs.js                 open + needs-ruling, worst first, grouped by severity
 *   node scripts/bugs.js --all           every status
 *   node scripts/bugs.js --status fixed  --area runtime  --from P107  --severity high   (filters combine)
 *   node scripts/bugs.js check           validate every header; exit 1 on a problem
 *   node scripts/bugs.js --kit node-spec  only the bugs one package has to learn from
 *   node scripts/bugs.js --launch beta    the rows a launch waits on (`launch: beta`), scheduled ones included
 *   node scripts/bugs.js kits [--suggest] per package: found / fixed / with a regression; --suggest proposes kit: tags
 *   node scripts/bugs.js gate <kit>       a publish gate: exit 1 while the package has an unresolved blocker
 *
 * Plain Node, no dependencies: the root package.json is not always runnable from a shared checkout.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'dev-docs', 'bugs');
const STATUSES = ['open', 'needs-ruling', 'scheduled', 'fixed', 'wontfix', 'duplicate'];
const SEVERITIES = ['blocker', 'high', 'medium', 'low'];
const REQUIRED = ['id', 'title', 'status', 'severity', 'area', 'found', 'evidence'];
const NEEDS = { scheduled: 'phase', fixed: 'commit', duplicate: 'of' };
/**
 * The packages a bug can teach (README "Bugs and the packages"): `kit:` names one, and a fixed kit bug must name
 * its `regression:`, the scenario, test or fixture that reproduces it and now ships in that package's own suite.
 */
const KITS = ['node-spec', 'project-contract', 'preview', 'observe', 'canvas-look', 'editor-suite', 'core', 'mcp'];
const ROOT = path.join(__dirname, '..');

/** The `---` header as a flat key: value map (values may contain colons). */
function readBug(file) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const fields = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
      if (kv) fields[kv[1]] = kv[2].trim();
    }
  }
  return { file, fields, hasHeader: !!m };
}

function allBugs() {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map(readBug);
}

function check() {
  const problems = [];
  const seen = new Map();
  for (const b of allBugs()) {
    if (!b.hasHeader) {
      problems.push(`${b.file}: no --- header`);
      continue;
    }
    for (const k of REQUIRED) if (!b.fields[k]) problems.push(`${b.file}: missing ${k}`);
    if (b.fields.status && !STATUSES.includes(b.fields.status)) problems.push(`${b.file}: status "${b.fields.status}" is not one of ${STATUSES.join(', ')}`);
    if (b.fields.severity && !SEVERITIES.includes(b.fields.severity)) problems.push(`${b.file}: severity "${b.fields.severity}" is not one of ${SEVERITIES.join(', ')}`);
    const need = NEEDS[b.fields.status];
    if (need && !b.fields[need]) problems.push(`${b.file}: status ${b.fields.status} needs a ${need}: line`);
    if (b.fields.status === 'wontfix' && !b.fields.reason) problems.push(`${b.file}: status wontfix needs a reason: line`);
    if (b.fields.kit && !KITS.includes(b.fields.kit)) problems.push(`${b.file}: kit "${b.fields.kit}" is not one of ${KITS.join(', ')}`);
    if (b.fields.kit && b.fields.status === 'fixed' && !b.fields.regression) problems.push(`${b.file}: a fixed kit bug needs a regression: line (the scenario, test or fixture that reproduces it, in ${b.fields.kit}'s suite)`);
    if (b.fields.regression) {
      // `<path>` or `<path> "<scenario name>"`: the path must exist, so a regression cannot be a promise
      const p = b.fields.regression.split(/\s+["#]/)[0].trim();
      if (!fs.existsSync(path.join(ROOT, p))) problems.push(`${b.file}: regression ${p} does not exist`);
    }
    if (b.fields.id) {
      if (seen.has(b.fields.id)) problems.push(`${b.file}: id ${b.fields.id} is also ${seen.get(b.fields.id)}`);
      else seen.set(b.fields.id, b.file);
      const expected = b.fields.id.toLowerCase() + '-';
      if (!b.file.startsWith(expected)) problems.push(`${b.file}: the file name should start with "${expected}"`);
    }
  }
  if (problems.length) {
    console.log(problems.join('\n'));
    console.log(`\n${problems.length} problem(s) in ${DIR}`);
    process.exit(1);
  }
  console.log(`${seen.size} bug(s), every header valid`);
}

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function list() {
  const all = process.argv.includes('--all');
  const status = arg('status');
  const area = arg('area');
  const from = arg('from');
  const severity = arg('severity');
  const kit = arg('kit');
  const launch = arg('launch');
  const bugs = allBugs().filter((b) => {
    const f = b.fields;
    if (kit && f.kit !== kit) return false;
    if (launch && f.launch !== launch) return false;
    if (status) {
      if (f.status !== status) return false;
    } else if (!all && !['open', 'needs-ruling', ...(launch ? ['scheduled'] : [])].includes(f.status)) return false;
    if (area && !(f.area || '').toLowerCase().includes(area.toLowerCase())) return false;
    if (from && !(f.id || '').toUpperCase().startsWith(from.toUpperCase())) return false;
    if (severity && f.severity !== severity) return false;
    return true;
  });
  const rank = (s) => (SEVERITIES.indexOf(s) < 0 ? 99 : SEVERITIES.indexOf(s));
  bugs.sort((a, b) => rank(a.fields.severity) - rank(b.fields.severity) || (a.fields.area || '').localeCompare(b.fields.area || '') || a.file.localeCompare(b.file));
  let current;
  for (const b of bugs) {
    const f = b.fields;
    if (f.severity !== current) {
      current = f.severity;
      console.log(`\n${(current || 'no severity').toUpperCase()}`);
    }
    const tag = f.status === 'open' ? '' : ` [${f.status}${f.phase ? ' ' + f.phase : ''}${f.commit ? ' ' + f.commit : ''}]`;
    console.log(`  ${f.id.padEnd(14)} ${(f.area || '').padEnd(34)} ${f.title}${tag}`);
  }
  const counts = {};
  for (const b of bugs) counts[b.fields.status] = (counts[b.fields.status] || 0) + 1;
  console.log(`\n${bugs.length} bug(s)` + (bugs.length ? ` — ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}` : '') + `   (dev-docs/bugs/)`);
}

/**
 * `kits`: what each package has learned and still owes; with `--suggest`, the untagged bugs whose `area` names a
 * node that has a spec (a scenarios file in @nodegx/node-spec), which is where tagging the backlog starts.
 */
function kits() {
  const bugs = allBugs();
  for (const k of KITS) {
    const mine = bugs.filter((b) => b.fields.kit === k);
    if (!mine.length) continue;
    const by = {};
    for (const b of mine) by[b.fields.status] = (by[b.fields.status] || 0) + 1;
    const withReg = mine.filter((b) => b.fields.regression).length;
    console.log(`${k.padEnd(18)} ${mine.length} bug(s): ${Object.entries(by).map(([s, n]) => `${n} ${s}`).join(', ')}; ${withReg} with a regression`);
  }
  const untagged = bugs.filter((b) => !b.fields.kit);
  console.log(`untagged           ${untagged.length} bug(s)`);
  if (!process.argv.includes('--suggest')) return;
  const scenarios = path.join(ROOT, 'packages', 'nodegx-node-spec', 'scenarios');
  const census = path.join(ROOT, 'dev-docs', 'tasks', 'phase-107-the-node-says-what-it-does', 'census.json');
  if (!fs.existsSync(scenarios) || !fs.existsSync(census)) return console.log('(no scenarios or census to suggest from)');
  const specced = new Set(fs.readdirSync(scenarios).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
  const names = [];
  const parsed = JSON.parse(fs.readFileSync(census, 'utf8'));
  for (const n of Array.isArray(parsed) ? parsed : parsed.rows || []) {
    if (!specced.has(n.typeName)) continue;
    for (const name of new Set([n.typeName, n.displayName])) names.push({ name, type: n.typeName });
  }
  names.sort((a, b) => b.name.length - a.name.length); // the longest name wins: "String Format" before "String"
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  console.log('\nUntagged bugs whose area names a specced node (suggest kit: node-spec):');
  let n = 0;
  for (const b of untagged) {
    const hit = names.find((x) => new RegExp(`(^|[^A-Za-z])${esc(x.name)}([^A-Za-z]|$)`).test(b.fields.area || ''));
    if (!hit) continue;
    n++;
    console.log(`  ${(b.fields.id || '').padEnd(22)} ${hit.type.padEnd(22)} [${b.fields.status}] ${b.fields.title}`);
  }
  console.log(`${n} suggestion(s)`);
}

/**
 * `gate <kit>`: P112 R6 — a package cannot publish while one of its bugs is an unresolved blocker; the lesser unresolved
 * ones are printed as its known issues. Exit 1 on a blocker, and on a kit name that is not in KITS: a typo must not read
 * as "no blockers" (before `mcp` was in the list, `--kit mcp` listed 0 because no bug could carry it).
 */
function gate() {
  const kit = process.argv[3];
  if (!KITS.includes(kit)) {
    console.error(`gate: "${kit}" is not a kit — one of ${KITS.join(', ')}`);
    process.exit(1);
  }
  const unresolved = allBugs().filter((b) => b.fields.kit === kit && ['open', 'needs-ruling', 'scheduled'].includes(b.fields.status));
  const blockers = unresolved.filter((b) => b.fields.severity === 'blocker');
  for (const b of blockers) console.log(`BLOCKER  ${b.fields.id}  ${b.fields.title}`);
  for (const b of unresolved.filter((x) => x.fields.severity !== 'blocker')) console.log(`known issue (${b.fields.severity})  ${b.fields.id}  ${b.fields.title}`);
  console.log(`${kit}: ${blockers.length} blocker(s), ${unresolved.length - blockers.length} known issue(s)`);
  if (blockers.length) process.exit(1);
}

if (process.argv[2] === 'check') check();
else if (process.argv[2] === 'kits') kits();
else if (process.argv[2] === 'gate') gate();
else list();
