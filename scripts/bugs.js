#!/usr/bin/env node
/**
 * The bug ledger — `dev-docs/bugs/*.md`, one file per bug (the rules: dev-docs/bugs/README.md).
 *
 *   node scripts/bugs.js                 open + needs-ruling, worst first, grouped by severity
 *   node scripts/bugs.js --all           every status
 *   node scripts/bugs.js --status fixed  --area runtime  --from P107  --severity high   (filters combine)
 *   node scripts/bugs.js check           validate every header; exit 1 on a problem
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
  const bugs = allBugs().filter((b) => {
    const f = b.fields;
    if (status) {
      if (f.status !== status) return false;
    } else if (!all && !['open', 'needs-ruling'].includes(f.status)) return false;
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

if (process.argv[2] === 'check') check();
else list();
