#!/usr/bin/env node
/**
 * census — every picker node, its tier, and every place its behaviour is written today.
 * Phase 107 (the node says what it does), NSP-000.
 *
 * Generated, never hand-typed. Writes, into the phase folder:
 *   census.json   one row per picker, non-deprecated node (cardinality checked both ways)
 *   CENSUS.md     the totals by tier and by batch, the ten most-written nodes, the exclusions
 *
 * The only hand-kept input is `tiers.json` beside them: { typeName → { tier, batch, note? } }.
 * The script FAILS (exit 1) when a picker node has no tier or batch, when tiers.json names a node
 * that is not in the picker population, or when a tier/batch value is not one of the known ones.
 * That failure is the ratchet NSP-009 later hangs coverage on: a node added to the picker without
 * a tier is a red census.
 *
 * Population: `inNodePicker && !isDeprecated` — 147 on 2026-09-29 — INCLUDING cloud-only nodes.
 * That differs from phase 18's picker-coverage.js on purpose: export asks "what runs in a browser";
 * this phase asks "what does the node do", and a cloud-only node does something too (its target
 * is the cloud runtime). Rank by the product surface, never by a corpus.
 *
 * How each column is found (so nobody has to trust it):
 *   runtimeFile      the ONE source file under noodl-runtime/src, noodl-viewer-react/src or
 *                    noodl-viewer-cloud/src that declares `name: '<typeName>'` (tests, .d.ts and
 *                    bundles excluded). Zero or several hits is a warning in the row, not a guess.
 *   usesOutcome      that file's text contains `beginOutcome` (the ERG-001 contract).
 *   exportPlanLines  line numbers in nodegx-export/src/analyze/plan.ts where '<typeName>' or
 *                    "<typeName>" appears as a quoted literal.
 *   emitLibs         files in nodegx-export/src/emit/*Lib.ts that quote the type name.
 *   exportStatus     the P18 ledger's status for the type (coverage-ledger.json).
 *   tests            test files (*.test.*, *.spec.*) per package that quote the type name —
 *                    COUNTED, NOT READ. A short generic name ('Text', 'Group', 'Number') over-counts;
 *                    the column is an UPPER BOUND on "tests that already grade this node".
 *   testsTyped       the same files, but only where the name follows a type-ish key
 *                    (type: 'Text', typeName: "Text", …) — the tighter reading. Measured 2026-09-30
 *                    on twelve nodes: it kept every real hit for the small names (String Format 3→3)
 *                    and removed the prose noise on the big ones (States 22→7, Repeater 37→20).
 *   dynamicPorts     the catalog's dynamicPorts.mechanisms is non-empty.
 *   placesWritten    1 (runtime file) + exportPlanLines + emitLibs + testsTyped — the drift-risk score.
 *
 * Usage:
 *   node scripts/node-spec/census.js            # regenerate census.json + CENSUS.md
 *   node scripts/node-spec/census.js --check    # exit 1 if census.json on disk is stale
 *
 * grep lies in this repo (ugrep skips some .ts as binary; -c counts lines), so every count here
 * is a script reading the file text.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');

const root = path.join(__dirname, '..', '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const phaseDir = path.join(root, 'dev-docs', 'tasks', 'phase-107-the-node-says-what-it-does');
const catalogPath = path.join(root, 'packages', 'noodl-types', 'src', 'node-catalog.json');
const ledgerPath = path.join(root, 'packages', 'nodegx-export', 'coverage-ledger.json');
const planPath = path.join(root, 'packages', 'nodegx-export', 'src', 'analyze', 'plan.ts');
const emitDir = path.join(root, 'packages', 'nodegx-export', 'src', 'emit');
const tiersPath = path.join(phaseDir, 'tiers.json');
const jsonOut = path.join(phaseDir, 'census.json');
const mdOut = path.join(phaseDir, 'CENSUS.md');

const RUNTIME_SRC = ['packages/noodl-runtime/src', 'packages/noodl-viewer-react/src', 'packages/noodl-viewer-cloud/src'];
const TEST_DIRS = {
  'noodl-runtime': 'packages/noodl-runtime/test',
  'noodl-viewer-react': 'packages/noodl-viewer-react/tests',
  'noodl-viewer-cloud': 'packages/noodl-viewer-cloud/tests',
  'nodegx-core': 'packages/nodegx-core/tests',
  'nodegx-export': 'packages/nodegx-export/tests',
  'noodl-mcp': 'packages/noodl-mcp/tests'
};
const TIERS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const TIER_NAMES = {
  T1: 'pure / state machine',
  T2: 'clock, randomness & environment',
  T3: 'network & backend',
  T4: 'graph',
  T5: 'visual',
  T6: 'escape hatch'
};
const BATCHES = ['NSP-004', 'NSP-011', 'NSP-012', 'NSP-013', 'NSP-014', 'NSP-015', 'NSP-016', 'NSP-017', 'NSP-022'];
const BATCH_NAMES = {
  'NSP-004': 'the pilot five',
  'NSP-011': 'logic, math, strings, variables, converters',
  'NSP-012': 'arrays, objects, variables, stores, events',
  'NSP-013': 'dates, time, randomness, parsers, animation',
  'NSP-014': 'records, users, files, HTTP, streams (the browser half; s21 split)',
  'NSP-015': 'navigation, popups, component utilities',
  'NSP-016': 'visual nodes',
  'NSP-017': 'the escape hatches',
  'NSP-022': 'the cloud-only nodes (split from NSP-014, s21)'
};

// ---------------------------------------------------------------------------------------------
// helpers

function walk(dir, out, skip) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (skip.has(e.name)) continue;
      walk(p, out, skip);
    } else out.push(p);
  }
  return out;
}
const SKIP_DIRS = new Set(['node_modules', 'dist', '.webpack-cache', 'external']);
const isSource = (f) => /\.(ts|tsx|js|jsx)$/.test(f) && !/\.d\.ts$/.test(f) && !/\.(test|spec)\./.test(f) && !/\/(tests?|__tests__)\//.test(f);
const isTest = (f) => /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/.test(f);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const quoted = (t) => [`'${t}'`, `"${t}"`, '`' + t + '`'];
const mentions = (text, t) => quoted(t).some((q) => text.includes(q));
const typedRe = (t) => new RegExp(`\\b(type|typeName|typename|nodeType|node_type|kind)\\s*[:=]\\s*['"\`]${escapeRe(t)}['"\`]`);

function readAll(files) {
  return files.map((f) => ({ file: f, text: fs.readFileSync(f, 'utf8') }));
}

// ---------------------------------------------------------------------------------------------
// inputs

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerStatus = new Map(ledger.entries.map((e) => [e.typeName, e.status]));
const tiers = JSON.parse(fs.readFileSync(tiersPath, 'utf8'));
const tierRows = tiers.nodes || {};

const population = catalog.nodes.filter((n) => n.inNodePicker && !n.isDeprecated);
const excluded = catalog.nodes.filter((n) => !(n.inNodePicker && !n.isDeprecated));

const runtimeSources = readAll(RUNTIME_SRC.flatMap((d) => walk(path.join(root, d), [], SKIP_DIRS)).filter(isSource));
const planText = fs.readFileSync(planPath, 'utf8');
const planLines = planText.split('\n');
const emitLibs = readAll(fs.readdirSync(emitDir).filter((f) => /Lib\.ts$/.test(f)).map((f) => path.join(emitDir, f)));
const testFiles = {};
for (const [pkg, dir] of Object.entries(TEST_DIRS)) {
  testFiles[pkg] = readAll(walk(path.join(root, dir), [], SKIP_DIRS).filter(isTest));
}

// ---------------------------------------------------------------------------------------------
// validate tiers.json against the population — both directions

const errors = [];
const popNames = new Set(population.map((n) => n.typeName));
for (const n of population) {
  const t = tierRows[n.typeName];
  if (!t) errors.push(`no tier for picker node "${n.typeName}" (${n.displayName}) — add it to tiers.json`);
  else {
    if (!TIERS.includes(t.tier)) errors.push(`"${n.typeName}": tier "${t.tier}" is not one of ${TIERS.join(', ')}`);
    if (!BATCHES.includes(t.batch)) errors.push(`"${n.typeName}": batch "${t.batch}" is not one of ${BATCHES.join(', ')}`);
  }
}
for (const name of Object.keys(tierRows)) {
  if (!popNames.has(name)) {
    const inCatalog = catalog.nodes.find((n) => n.typeName === name);
    errors.push(
      `tiers.json names "${name}", which is not a picker node` +
        (inCatalog ? ` (in the catalog but ${inCatalog.isDeprecated ? 'deprecated' : 'not in the picker'})` : ' (not in the catalog at all)')
    );
  }
}
if (errors.length) {
  console.error(`\nnode-spec census: ${errors.length} problem(s) in ${rel(tiersPath)}:\n`);
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  → Every picker node has exactly one tier and one batch; nothing else is listed.\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// the rows

const rows = population
  .map((n) => {
    const t = tierRows[n.typeName];
    const nameRe = new RegExp(`\\bname:\\s*['"\`]${escapeRe(n.typeName)}['"\`]`);
    const runtimeHits = runtimeSources.filter((s) => nameRe.test(s.text));
    const runtimeFile = runtimeHits.length === 1 ? rel(runtimeHits[0].file) : null;
    const warnings = [];
    if (runtimeHits.length === 0) warnings.push('no source file declares this type name');
    if (runtimeHits.length > 1) warnings.push(`${runtimeHits.length} source files declare this type name`);
    const usesOutcome = runtimeHits.some((s) => s.text.includes('beginOutcome'));
    const exportPlanLines = [];
    planLines.forEach((line, i) => {
      if (mentions(line, n.typeName)) exportPlanLines.push(i + 1);
    });
    const libs = emitLibs.filter((l) => mentions(l.text, n.typeName)).map((l) => path.basename(l.file));
    const tests = {};
    const testsTyped = {};
    let testsTotal = 0;
    let typedTotal = 0;
    const tre = typedRe(n.typeName);
    for (const [pkg, files] of Object.entries(testFiles)) {
      const c = files.filter((f) => mentions(f.text, n.typeName)).length;
      const ct = files.filter((f) => tre.test(f.text)).length;
      tests[pkg] = c;
      testsTyped[pkg] = ct;
      testsTotal += c;
      typedTotal += ct;
    }
    tests.total = testsTotal;
    testsTyped.total = typedTotal;
    const dyn = (n.dynamicPorts && Array.isArray(n.dynamicPorts.mechanisms) && n.dynamicPorts.mechanisms.length) || 0;
    return {
      typeName: n.typeName,
      displayName: n.displayName,
      category: n.category,
      availableIn: n.availableIn,
      providedBy: n.providedBy,
      isVisual: !!n.isVisual,
      tier: t.tier,
      batch: t.batch,
      note: t.note,
      runtimeFile,
      runtimeFiles: runtimeHits.map((s) => rel(s.file)),
      usesOutcome,
      exportPlanLines,
      emitLibs: libs,
      exportStatus: ledgerStatus.get(n.typeName) || null,
      tests,
      testsTyped,
      dynamicPorts: dyn > 0,
      dynamicPortMechanisms: dyn,
      placesWritten: 1 + exportPlanLines.length + libs.length + typedTotal,
      warnings
    };
  })
  .sort((a, b) => a.typeName.localeCompare(b.typeName));

// cardinality, both directions, checked on the OUTPUT not the input
const rowNames = rows.map((r) => r.typeName);
if (new Set(rowNames).size !== rowNames.length) throw new Error('census: duplicate row');
if (rowNames.length !== population.length) throw new Error(`census: ${rowNames.length} rows for ${population.length} picker nodes`);
for (const n of population) if (!rowNames.includes(n.typeName)) throw new Error(`census: missing row ${n.typeName}`);
for (const r of rows) if (!popNames.has(r.typeName)) throw new Error(`census: extra row ${r.typeName}`);

const exclusions = excluded
  .map((n) => ({
    typeName: n.typeName,
    displayName: n.displayName,
    category: n.category,
    reason: n.isDeprecated ? 'deprecated' : 'not in the picker'
  }))
  .sort((a, b) => a.typeName.localeCompare(b.typeName));

const byTier = Object.fromEntries(TIERS.map((t) => [t, rows.filter((r) => r.tier === t).length]));
const byBatch = Object.fromEntries(BATCHES.map((b) => [b, rows.filter((r) => r.batch === b).length]));
const untested = rows.filter((r) => r.tests.total === 0);
const usesOutcomeCount = rows.filter((r) => r.usesOutcome).length;
const dynamicCount = rows.filter((r) => r.dynamicPorts).length;
const planNamedCount = rows.filter((r) => r.exportPlanLines.length).length;
const byExportStatus = rows.reduce((m, r) => ((m[r.exportStatus || 'none'] = (m[r.exportStatus || 'none'] || 0) + 1), m), {});

const census = {
  $comment: 'Generated by scripts/node-spec/census.js (phase 107, NSP-000). Do not edit; edit tiers.json and regenerate.',
  catalogFormatVersion: catalog.catalogFormatVersion,
  catalogNodes: catalog.nodes.length,
  population: rows.length,
  excludedCount: exclusions.length,
  byTier,
  byBatch,
  totals: {
    usesOutcome: usesOutcomeCount,
    dynamicPorts: dynamicCount,
    namedInPlanTs: planNamedCount,
    noTestNamesThem: untested.map((r) => r.typeName),
    byExportStatus
  },
  rows,
  exclusions
};
const jsonText = JSON.stringify(census, null, 2) + '\n';

// ---------------------------------------------------------------------------------------------
// --check: is the committed census fresh?

if (CHECK) {
  const onDisk = fs.existsSync(jsonOut) ? fs.readFileSync(jsonOut, 'utf8') : '';
  if (onDisk !== jsonText) {
    console.error(`\nnode-spec census: ${rel(jsonOut)} is STALE — regenerate with \`node scripts/node-spec/census.js\` and commit it.\n`);
    process.exit(1);
  }
  console.log(`node-spec census: fresh — ${rows.length} picker nodes, ${exclusions.length} excluded, all tiered.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------
// CENSUS.md

const today = new Date().toISOString().slice(0, 10);
const md = [];
md.push('# The census — every picker node, its tier, and where its behaviour is written');
md.push('');
md.push(`**Generated ${today} by \`scripts/node-spec/census.js\` — do not edit by hand; edit \`tiers.json\` and regenerate.**`);
md.push('');
md.push(`Catalog format ${catalog.catalogFormatVersion}: **${catalog.nodes.length}** node types, of which **${rows.length}** are in the picker and not deprecated (the population), **${exclusions.length}** excluded (listed at the end). Cardinality checked both ways by the script.`);
md.push('');
md.push('How every column is found is in the header of the script. `tests` is an upper bound (files that quote the type name, counted, not read); `typed` counts only files where the name follows a type-ish key and is what the drift order uses.');
md.push('');
md.push('## Phase-level facts');
md.push('');
md.push(`- **${usesOutcomeCount}** of ${rows.length} nodes call \`beginOutcome\` (the ERG-001 outcome contract) — their specs carry an outcome on every signal path.`);
md.push(`- **${dynamicCount}** have dynamic ports — NSP-001's derived-port design is not a corner case.`);
md.push(`- **${planNamedCount}** are named as a string literal somewhere in \`plan.ts\` (the exporter's special cases).`);
md.push(`- P18 export status over the population: ${Object.entries(byExportStatus).map(([k, v]) => `${k} ${v}`).join(' · ')}.`);
md.push(`- **${untested.length}** nodes are named by **no test file at all**, even loosely: ${untested.map((r) => `${r.displayName} (\`${r.typeName}\`)`).join(', ') || 'none'}. For these the spec would be the first test.`);
md.push('');
md.push('## Totals by tier');
md.push('');
md.push('| tier | what | nodes |');
md.push('|---|---|---:|');
for (const t of TIERS) md.push(`| **${t}** | ${TIER_NAMES[t]} | ${byTier[t]} |`);
md.push(`| | **total** | **${Object.values(byTier).reduce((a, b) => a + b, 0)}** |`);
md.push('');
md.push('## Totals by batch');
md.push('');
md.push('| batch | what | nodes | tiers |');
md.push('|---|---|---:|---|');
for (const b of BATCHES) {
  const rs = rows.filter((r) => r.batch === b);
  const tc = TIERS.map((t) => [t, rs.filter((r) => r.tier === t).length]).filter(([, c]) => c).map(([t, c]) => `${t} ×${c}`).join(', ');
  md.push(`| [${b}](${batchFile(b)}) | ${BATCH_NAMES[b]} | ${rs.length} | ${tc} |`);
}
const nonPilot = rows.length - byBatch['NSP-004'];
md.push(`| | **total** | **${Object.values(byBatch).reduce((a, b) => a + b, 0)}** | ${byBatch['NSP-004']} pilot + ${nonPilot} in batches |`);
md.push('');
md.push('## The ten nodes whose behaviour is written in the most places');
md.push('');
md.push('The drift-risk order: `placesWritten` = the runtime file + `plan.ts` lines that name the type + emit libs that name it + test files that name it after a type key (`typed`; the loose count is beside it).');
md.push('');
md.push('| # | node | tier | batch | places | plan.ts lines | emit libs | tests typed | tests loose |');
md.push('|---:|---|---|---|---:|---:|---|---:|---:|');
[...rows]
  .sort((a, b) => b.placesWritten - a.placesWritten || a.typeName.localeCompare(b.typeName))
  .slice(0, 10)
  .forEach((r, i) => md.push(`| ${i + 1} | ${label(r)} | ${r.tier} | ${r.batch} | ${r.placesWritten} | ${r.exportPlanLines.length} | ${r.emitLibs.join(', ') || '—'} | ${r.testsTyped.total} | ${r.tests.total} |`));
md.push('');
md.push('## Every node');
md.push('');
md.push('`out` = uses the outcome contract (`beginOutcome`); `dyn` = has dynamic ports; `plan` = lines in `plan.ts`; `tests` = typed / loose test-file counts across runtime / viewer-react / viewer-cloud / core / export / mcp.');
md.push('');
for (const b of BATCHES) {
  const rs = rows.filter((r) => r.batch === b);
  md.push(`### ${b} — ${BATCH_NAMES[b]} (${rs.length})`);
  md.push('');
  md.push('| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |');
  md.push('|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|');
  for (const r of rs) {
    const file = r.runtimeFile ? `\`${r.runtimeFile.replace(/^packages\//, '')}\`` : `⚠️ ${r.warnings.join('; ')}`;
    md.push(
      `| **${r.displayName}** | \`${r.typeName}\` | ${r.tier} | ${r.availableIn.join('+')} | ${file} | ${r.usesOutcome ? '✓' : ''} | ${r.dynamicPorts ? '✓' : ''} | ${r.exportPlanLines.length} | ${r.emitLibs.map((l) => l.replace(/\.ts$/, '')).join(', ')} | ${r.exportStatus || '—'} | ${r.testsTyped.total} / ${r.tests.total} | ${r.note || ''} |`
    );
  }
  md.push('');
}
md.push(`## Excluded from the population (${exclusions.length})`);
md.push('');
md.push('| type name | display name | category | reason |');
md.push('|---|---|---|---|');
for (const e of exclusions) md.push(`| \`${e.typeName}\` | ${e.displayName} | ${e.category} | ${e.reason} |`);
md.push('');
const warned = rows.filter((r) => r.warnings.length);
if (warned.length) {
  md.push(`## Warnings (${warned.length})`);
  md.push('');
  for (const r of warned) md.push(`- \`${r.typeName}\`: ${r.warnings.join('; ')} — ${r.runtimeFiles.map((f) => `\`${f}\``).join(', ') || 'none'}`);
  md.push('');
}

function label(r) {
  return r.displayName === r.typeName ? `**${r.displayName}**` : `**${r.displayName}** (\`${r.typeName}\`)`;
}
function batchFile(b) {
  const f = fs.readdirSync(phaseDir).find((x) => x.startsWith(b + '-') && x.endsWith('.md'));
  return f || `${b}.md`;
}

fs.writeFileSync(jsonOut, jsonText);
fs.writeFileSync(mdOut, md.join('\n') + '\n');

console.log(`node-spec census: ${rows.length} picker nodes (${catalog.nodes.length} in the catalog, ${exclusions.length} excluded)`);
console.log('  by tier : ' + TIERS.map((t) => `${t}=${byTier[t]}`).join('  '));
console.log('  by batch: ' + BATCHES.map((b) => `${b}=${byBatch[b]}`).join('  '));
if (warned.length) console.log(`  ⚠️  ${warned.length} row(s) with warnings — see CENSUS.md`);
console.log(`  wrote ${rel(jsonOut)} and ${rel(mdOut)}`);
