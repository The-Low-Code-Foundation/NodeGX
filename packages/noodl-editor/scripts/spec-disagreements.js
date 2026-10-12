#!/usr/bin/env node
/**
 * NSP-019 §3 — the rows where a node's spec and its runtime ever disagreed, per catalog type name,
 * read from the bug ledger (`dev-docs/bugs/p107-*.md`) and written as data the editor bundles:
 *
 *   node scripts/spec-disagreements.js            regenerate src/.../spec/spec-disagreements.json
 *   node scripts/spec-disagreements.js --check    exit 1 when the committed file is stale
 *
 * A row is a P107 bug with `kit: node-spec` whose `regression:` names a scenario file —
 * `packages/nodegx-node-spec/scenarios/<type>.json`, where `<type>` IS the catalog typeName
 * (`src/runner/scenario-files.ts` names a scenario file after `spec.type`, and the registry is
 * keyed by catalog typeName). Graph scenarios (`scenarios/graph/`) and rows pinned by a test
 * elsewhere have no single node, so they are left out and counted on stderr.
 *
 * The ruling is the first `**Ruling…**` / `**Ruled…**` paragraph, markdown stripped, cut at a
 * sentence end under 220 characters. It is a pointer for the person reading the Try panel, not the
 * ruling's record — that stays in the bug file.
 *
 * Plain Node, no dependencies, like scripts/bugs.js at the repo root. The editor cannot read
 * `dev-docs/` at run time, so the table is a committed snapshot; this script is what keeps it
 * honest (memory: a second copy of anything drifts silently — so this copy has a `--check`).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const BUGS = path.join(ROOT, 'dev-docs', 'bugs');
const OUT = path.join(
  __dirname,
  '..',
  'src',
  'editor',
  'src',
  'views',
  'panels',
  'propertyeditor',
  'spec',
  'spec-disagreements.json'
);
const RULING_CAP = 220;

function header(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return { fields, bodyAt: m[0].length };
}

/** The first ruling paragraph (to the next blank line), markdown stripped, cut at a sentence end. */
function rulingOf(body) {
  const lines = body.split(/\r?\n/);
  const at = lines.findIndex((l) => /^\*\*Rul(ing|ed)/.test(l));
  if (at < 0) return undefined;
  const para = [];
  for (let i = at; i < lines.length && lines[i].trim() !== ''; i++) para.push(lines[i]);
  let text = para
    .join(' ')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^Ruling:\s*/, '')
    .trim();
  if (text.length > RULING_CAP) {
    const head = text.slice(0, RULING_CAP);
    const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('." '), head.lastIndexOf('.” '));
    text = end > 40 ? head.slice(0, end + 1) : head.replace(/\s\S*$/, '') + '…';
  }
  return text;
}

function build() {
  const rows = {};
  const skipped = [];
  for (const file of fs
    .readdirSync(BUGS)
    .filter((f) => /^p107-.*\.md$/.test(f))
    .sort()) {
    const text = fs.readFileSync(path.join(BUGS, file), 'utf8');
    const h = header(text);
    if (!h || h.fields.kit !== 'node-spec') continue;
    const m = /^packages\/nodegx-node-spec\/scenarios\/([^/"]+)\.json/.exec(h.fields.regression || '');
    if (!m) {
      skipped.push(`${h.fields.id}: ${h.fields.regression || '(no regression)'}`);
      continue;
    }
    const row = { id: h.fields.id, title: h.fields.title, status: h.fields.status };
    if (h.fields.commit) row.commit = h.fields.commit;
    const ruling = rulingOf(text.slice(h.bodyAt));
    if (ruling) row.ruling = ruling;
    (rows[m[1]] = rows[m[1]] || []).push(row);
  }
  const sorted = {};
  for (const type of Object.keys(rows).sort()) sorted[type] = rows[type];
  return { rows: sorted, skipped };
}

const { rows, skipped } = build();
const json = JSON.stringify(rows, null, 2) + '\n';
const count = Object.values(rows).reduce((n, r) => n + r.length, 0);

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== json) {
    console.error(
      `spec-disagreements: ${path.relative(
        ROOT,
        OUT
      )} is stale — run node packages/noodl-editor/scripts/spec-disagreements.js`
    );
    process.exit(1);
  }
  console.log(
    `spec-disagreements: up to date (${count} rows over ${Object.keys(rows).length} types; ${
      skipped.length
    } rows have no single node)`
  );
} else {
  fs.writeFileSync(OUT, json);
  console.log(
    `spec-disagreements: wrote ${count} rows over ${Object.keys(rows).length} types to ${path.relative(ROOT, OUT)}`
  );
  if (skipped.length) console.error(`left out (no single node):\n  ${skipped.join('\n  ')}`);
}
