#!/usr/bin/env node
/**
 * honesty-ledger — the ratchet on every template's honesty number (P111 SEE-001 §4 item 4).
 *
 * The number is `packages/nodegx-node-spec/src/honesty.ts`'s `projectHonesty`, loaded from source (never `dist/`), over
 * each template's component files (`read-project.js`, the census's reader). The ledger is `honesty-ledger.json` in the
 * phase folder: { templates: { <name>: { percent, known, script, unspecced } } }.
 *
 * THE RATCHET (`--check`), the shape of phase 18's `pickerCoverageFloor` and phase 107's `spec-ledger.json` floor:
 *   - a template whose number FELL below its ledger entry fails, named: script was added, or a known node removed;
 *   - a template whose number ROSE fails until the ledger is raised in the same commit, so the gain is held and the
 *     decision is in the diff;
 *   - a template with no entry fails, and so does an entry naming no template.
 * A count that moved while the percentage held (a known node and its share of script added together) is not a failure:
 * the number is the gate. The census gate (`census.js --check`) holds the counts.
 *
 * Usage:
 *   node scripts/see/honesty-ledger.js            # the number per template, against the ledger
 *   node scripts/see/honesty-ledger.js --check    # exit 1 on a fall, an unrecorded rise, a missing or stray entry
 *   node scripts/see/honesty-ledger.js --write    # write the ledger at today's numbers (in the commit that raises it)
 *   --templates <dir> --ledger <file>             read COPIES instead (the tests do)
 */

const fs = require('fs');
const path = require('path');
const { requireSource } = require('../node-spec/load-specs');
const { readProject, trackedTemplateNames } = require('./read-project');

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const root = path.join(__dirname, '..', '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const templatesDir = argValue('--templates', path.join(root, 'templates'));
const ledgerPath = argValue('--ledger', path.join(root, 'dev-docs', 'tasks', 'phase-111-you-can-see-what-it-built', 'honesty-ledger.json'));

const { projectHonesty } = requireSource(path.join(root, 'packages', 'nodegx-node-spec', 'src', 'honesty.ts'));
const coreTypes = JSON.parse(fs.readFileSync(path.join(root, 'packages', 'noodl-types', 'src', 'node-catalog.json'), 'utf8')).nodes.map((n) => n.typeName);

const tracked = trackedTemplateNames(root, templatesDir);
const now = {};
for (const name of fs.readdirSync(templatesDir).sort()) {
  const dir = path.join(templatesDir, name);
  if (!fs.statSync(dir).isDirectory() || (tracked && !tracked.has(name))) continue;
  const p = readProject(dir);
  if (!p) continue;
  const h = projectHonesty(p.components, { coreTypes });
  now[name] = { percent: h.percent, known: h.known, script: h.script, unspecced: h.unspecced };
}

if (args.includes('--write')) {
  const ledger = {
    $comment:
      'P111 SEE-001 — the honesty number per template, ratcheted by scripts/see/honesty-ledger.js --check (a fall fails; a rise fails until this file is raised in the same commit). Rewrite with --write, never by hand.',
    templates: now
  };
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
  console.log(`honesty-ledger: wrote ${rel(ledgerPath)} (${Object.keys(now).length} templates).`);
  process.exit(0);
}

const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : { templates: {} };
const recorded = ledger.templates || {};
const problems = [];
for (const [name, h] of Object.entries(now)) {
  const r = recorded[name];
  if (!r) {
    problems.push(`${name}: no entry in ${rel(ledgerPath)} — its number is ${h.percent}%. Add it with --write.`);
    continue;
  }
  if (h.percent === null || r.percent === null) {
    if (h.percent !== r.percent) problems.push(`${name}: the number is ${h.percent}, the ledger says ${r.percent}.`);
  } else if (h.percent < r.percent) {
    problems.push(
      `${name}: the honesty number FELL to ${h.percent}% (${h.known} known, ${h.script} script); the ledger holds ${r.percent}% (${r.known} known, ${r.script} script).\n` +
        `      → Script was added or a known node removed. Make it a node with a spec, or if the fall is intended, rewrite the ledger (--write) in the same commit so the decision is in the diff.`
    );
  } else if (h.percent > r.percent) {
    problems.push(`${name}: the honesty number ROSE to ${h.percent}%; the ledger still says ${r.percent}%.\n      → Raise it in this commit (node scripts/see/honesty-ledger.js --write), so the gain is held.`);
  }
}
for (const name of Object.keys(recorded)) if (!now[name]) problems.push(`${rel(ledgerPath)} has an entry for "${name}", which is not a template — remove it.`);

for (const [name, h] of Object.entries(now)) console.log(`  ${name.padEnd(30)} ${String(h.percent === null ? '—' : h.percent + '%').padStart(6)}  (${h.known} known, ${h.script} script, ${h.unspecced} unspecced)`);

if (args.includes('--check')) {
  if (problems.length) {
    console.error(`\nhonesty-ledger: ${problems.length} problem(s):\n`);
    for (const p of problems) console.error('  • ' + p);
    process.exit(1);
  }
  console.log(`honesty-ledger: holds for ${Object.keys(now).length} templates.`);
} else if (problems.length) {
  console.log(`\n  ⚠️  ${problems.length} problem(s) — run with --check to see them.`);
}
