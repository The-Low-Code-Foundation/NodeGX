#!/usr/bin/env node
/**
 * spec-ledger — how many picker nodes have their behaviour written down and checked (phase 107, NSP-009).
 *
 * 🔴 THIS IS THE PHASE'S HEADLINE NUMBER, the sibling of phase 18's `export-ledger/picker-coverage.js`.
 *
 *   SPEC COVERAGE: 124 of 147 picker nodes conform on the runtime (84.4%); 2 on the export, inside a declared reach; 1 exempt; 22 owed
 *
 * Until s64 the board counted this line by hand, every session. This script counts it from the files that decide it:
 *
 *   population  the catalog's `inNodePicker && !isDeprecated` (cloud-only nodes included — census.js says why), each node's tier
 *               from the phase's `tiers.json`. The per-tier totals and the names must equal the committed census.json's, both
 *               directions (AC3) — the census and the ledger never disagree about what is being counted.
 *   runtime     a node conforms on the runtime when it is GRADED there, one of two ways:
 *                 - a SPEC: its type is a key of the registry (`packages/nodegx-node-spec/src/nodes/index.ts`, loaded from source,
 *                   transpiled in memory — never `dist/`, which can be stale);
 *                 - the GRAPH (T4, and On App Error): an `N` graph scenario (`scenarios/graph/*.json`) makes a CLAIM about it — the
 *                   claim's subject is a node of that type, or a component instance, which grades the `Component Outputs` inside it
 *                   (what an instance reports is its Component Outputs' doing). A node only PLACED in a scenario to drive another is
 *                   not graded by it.
 *   contract    NSP-017 AC3 — a spec that declares `contract` (the person writes the node's code: Function, Script, Visual Function).
 *               It runs the same code and grades the contract around it with fixtures, so it is counted in a column of its own —
 *               "specced (contract)" — and never in `runtime`: what conforms is the contract, not the node.
 *   export      the specs with a declared reach on the export (`EXPORT_REACH` in nodegx-export's test helper, read from the AST).
 *   exempt      `exemptions.json` — no spec owed, each with its reason. Printed, never hidden.
 *   owed        `spec-ledger.json` `owed` — picker nodes whose spec is still to be written, each with the task that writes it.
 *
 * WHY THE SCRIPT DOES NOT RUN THE SUITES. NSP-009 §2 says a node counts only if every mutant is killed and it conforms at the R5
 * budget. That is graded where it already is, in the same PR workflow as this step (its `test-packages` job, `npm run test:packages`):
 *   - noodl-runtime `test/node-spec/conformance.test.ts` plays EVERY registered spec at 200 sequences with the mutants and fails on
 *     a divergence, a failed scenario, a surviving or unreached mutant (known rows are counted and printed, not hidden — README §6);
 *   - noodl-runtime `test/node-spec/graph.test.ts` plays every graph scenario and fails on a claim that does not hold (a scenario
 *     marked `row` is known; this script prints how many nodes are graded only through one).
 * So a spec in the registry that does not conform is a red PR, and cannot land. Running the suites again here would repeat the
 * workflow's longest step (~15 minutes for the batch on a loaded box) to recompute a fact it already established. The 10,000-run
 * deep pass is local and on demand (R5): `npm run spec-ledger -- --deep "<type>[,<type>]"`.
 *
 * THE RATCHET (`--check`), in `spec-ledger.json` beside tiers.json:
 *   floor     { runtime, contract, export } — exactly as `pickerCoverageFloor`: a fall fails, and a rise fails until the floor is raised in the
 *             same commit, so the gain is held and the decision is in the diff.
 *   owed      the written reason a picker node may be in the picker without a spec yet. THE NEW-NODE GATE: a picker node with no
 *             spec, no graph claim, no exemption and no `owed` entry fails, named. An `owed` node that is now graded fails too
 *             (remove it — the floor rises in the same commit), as does one that is not a picker node, or is also exempt.
 *
 * Usage:
 *   node scripts/node-spec/spec-ledger.js                 # the line, by tier, and how it was counted
 *   node scripts/node-spec/spec-ledger.js --json          # machine-readable
 *   node scripts/node-spec/spec-ledger.js --check         # exit 1 on a fall, an unraised rise, a new unspecced node, a census mismatch
 *   node scripts/node-spec/spec-ledger.js --deep Counter  # R5's local deep run: 10,000 sequences, shrink on, for the named spec(s)
 *   --catalog <file> --tiers <file> --exemptions <file> --census <file> --ledger <file>   read a COPY instead (the tests do)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadSpecs, requireSource } = require('./load-specs');
const { saidCoverage } = require('./rules');

const started = Date.now();
const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const root = path.join(__dirname, '..', '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const phaseDir = path.join(root, 'dev-docs', 'tasks', 'phase-107-the-node-says-what-it-does');
const specPkg = path.join(root, 'packages', 'nodegx-node-spec');
const catalogPath = argValue('--catalog', path.join(root, 'packages', 'noodl-types', 'src', 'node-catalog.json'));
const tiersPath = argValue('--tiers', path.join(phaseDir, 'tiers.json'));
const exemptionsPath = argValue('--exemptions', path.join(phaseDir, 'exemptions.json'));
const censusPath = argValue('--census', path.join(phaseDir, 'census.json'));
const ledgerPath = argValue('--ledger', path.join(phaseDir, 'spec-ledger.json'));
const graphDir = path.join(specPkg, 'scenarios', 'graph');
const reachPath = path.join(root, 'packages', 'nodegx-export', 'tests', 'helpers', 'node-spec-target.ts');

const TIERS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const ts = require(path.join(root, 'node_modules', 'typescript'));

// ---------------------------------------------------------------------------------------------
// --deep: R5's local 10,000 run, one spec at a time (never the whole registry — the box is shared)

if (args.includes('--deep')) {
  const only = argValue('--deep', '');
  if (!only || only.startsWith('--')) {
    console.error('spec-ledger --deep needs the spec(s) to run: --deep "Counter" or --deep "Counter,Switch" (the type names).');
    process.exit(2);
  }
  const runtimeDir = path.join(root, 'packages', 'noodl-runtime');
  const r = spawnSync('npx', ['jest', 'test/node-spec/conformance.test.ts', '-t', 'deep', '-w', '2'], {
    cwd: runtimeDir,
    stdio: 'inherit',
    env: { ...process.env, NSP_DEEP: process.env.NSP_DEEP || '10000', NSP_ONLY: only }
  });
  process.exit(r.status === null ? 1 : r.status);
}

// ---------------------------------------------------------------------------------------------
// inputs

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const catalog = readJson(catalogPath);
const tierRows = readJson(tiersPath).nodes || {};
const exemptionsRaw = fs.existsSync(exemptionsPath) ? readJson(exemptionsPath) : {};
const exemptions = Object.fromEntries(Object.entries(exemptionsRaw).filter(([k]) => !k.startsWith('$')));
const census = readJson(censusPath);
const ledger = fs.existsSync(ledgerPath) ? readJson(ledgerPath) : {};
const owed = ledger.owed || {};

const population = catalog.nodes.filter((n) => n.inNodePicker && !n.isDeprecated);
const popNames = new Set(population.map((n) => n.typeName));
const display = new Map(population.map((n) => [n.typeName, n.displayName]));

/** The registry, from source (load-specs.js). */
const loadedSpecs = loadSpecs();
const registry = Object.keys(loadedSpecs).map((t) => ({ type: t, contract: typeof loadedSpecs[t].contract === 'string' && loadedSpecs[t].contract.length > 0 }));
// NSP-018 AC2 — how many input reducers have their branches in words (`Patch.says`, rules.js). A count, not a gate (yet).
const said = saidCoverage(loadedSpecs);
const specTypes = new Set(registry.map((r) => r.type));
const contractTypes = new Set(registry.filter((r) => r.contract).map((r) => r.type));

/** The graph: type → the scenario files whose `N` claims grade it (and whether every one of them is a known row). */
const graphGraded = new Map();
for (const f of fs.readdirSync(graphDir).filter((x) => x.endsWith('.json')).sort()) {
  for (const sc of readJson(path.join(graphDir, f))) {
    if (!Array.isArray(sc.clauses) || !sc.clauses.includes('N')) continue;
    const credit = (type) => {
      if (!graphGraded.has(type)) graphGraded.set(type, { files: new Set(), rowOnly: true });
      const g = graphGraded.get(type);
      g.files.add(f);
      if (!sc.row) g.rowOnly = false;
    };
    for (const c of sc.claims || []) {
      const node = sc.nodes[c.subject];
      if (node) credit(node.type);
      else if (sc.components && sc.components[c.subject]) {
        for (const n of Object.values(sc.nodes)) if (n.type === 'Component Outputs' && n.in === c.subject) credit(n.type);
      }
    }
  }
}

/** EXPORT_REACH's keys, read from the helper's AST (requiring it would load the exporter). */
function exportReach() {
  const src = ts.createSourceFile(reachPath, fs.readFileSync(reachPath, 'utf8'), ts.ScriptTarget.ES2019, true);
  let keys = null;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'EXPORT_REACH' && node.initializer) {
      let init = node.initializer;
      if (ts.isCallExpression(init)) init = init.arguments[0];
      if (init && ts.isObjectLiteralExpression(init)) keys = init.properties.map((p) => p.name.getText().replace(/^['"]|['"]$/g, ''));
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  if (!keys) throw new Error(`spec-ledger: no \`EXPORT_REACH\` object literal in ${rel(reachPath)} — re-read the file`);
  return keys;
}
const reach = exportReach();

/**
 * NSP-020 AC4 — can an editor draw this node's ports WITHOUT A VIEWER? Read from what the catalog says the node's ports
 * do (`dynamicPorts.mechanisms`) against what its spec models:
 *   - no mechanism: the ports are the registration's own, a static list — `static`;
 *   - a spec that models every mechanism it has — `derived` for runtime-discovered, numbered-inputs, component-ports and
 *     editor-adapter ports; `narrow` on a declared port for runtime-narrowed; `when` for declared-port-groups, except the
 *     data-attributes group (`dataAttributes`), an editor rule the spec leaves to the editor (NSP-020 §6.6 piece 8(5)) —
 *     classed by `portsDerivability` (ports.ts): from the params alone, with the project, or with the backend schema —
 *     and, for runtime or adapter ports, only for a type in `DRAWN_PORT_TYPES` (graded by oracle (a), names complete);
 *   - anything else is NOT derivable: a node with dynamic ports and no spec, or a spec that misses a mechanism (named).
 */
const { portsDerivability } = requireSource(path.join(specPkg, 'src', 'ports.ts'));
const NEEDS_DERIVED = ['runtime-discovered', 'numbered-inputs', 'component-ports', 'editor-adapter'];
/**
 * The types whose port draw is graded and complete (`DRAWN_PORT_TYPES`, src/nodes/drawn-port-types.ts — held to oracle (a)'s
 * `TABLE` both ways by the runtime's nsp-020-ports-parity.test.ts): a spec's `derived` counts only for these. Having
 * `derived` is not drawing the ports — Cloud Function's and Navigate's draw nothing from the project, and the HTTP
 * Request's Output Fields are not in its spec (s85). The MCP reads the same list (R19).
 */
const gradedPorts = new Set(requireSource(path.join(specPkg, 'src', 'nodes', 'drawn-port-types.ts')).DRAWN_PORT_TYPES);
function portsClass(n) {
  const mechanisms = (n.dynamicPorts && n.dynamicPorts.mechanisms) || [];
  if (!mechanisms.length) return { cls: 'static' };
  const spec = loadedSpecs[n.typeName];
  if (!spec) return { cls: null, why: `dynamic ports (${mechanisms.join(', ')}) and no spec` };
  const declared = [...Object.values(spec.inputs || {}), ...Object.values(spec.outputs || {})];
  const groups = (n.dynamicPorts.declaredPortGroups || []).filter((g) => g.parameter !== 'dataAttributes');
  const missing = [];
  if (mechanisms.some((m) => NEEDS_DERIVED.includes(m)) && !spec.derived) missing.push('`derived`');
  else if (mechanisms.some((m) => NEEDS_DERIVED.includes(m)) && !gradedPorts.has(n.typeName))
    return { cls: null, why: `its ${mechanisms.filter((m) => NEEDS_DERIVED.includes(m)).join(', ')} ports are drawn by no graded spec (not in DRAWN_PORT_TYPES${mechanisms.includes('editor-adapter') ? '; oracle (c), the adapters, is owed' : ''})` };
  if (mechanisms.includes('runtime-narrowed') && !declared.some((d) => d && d.narrow)) missing.push('`narrow`');
  if (mechanisms.includes('declared-port-groups') && groups.length && !declared.some((d) => d && d.when)) missing.push('`when`');
  if (missing.length) return { cls: null, why: `the spec has no ${missing.join(', ')}` };
  return { cls: portsDerivability(spec) };
}

// ---------------------------------------------------------------------------------------------
// the count

const rows = population
  .map((n) => {
    const t = n.typeName;
    const contract = contractTypes.has(t);
    const spec = specTypes.has(t) && !contract;
    const graph = graphGraded.get(t);
    return {
      typeName: t,
      displayName: n.displayName,
      tier: tierRows[t] ? tierRows[t].tier : null,
      batch: tierRows[t] ? tierRows[t].batch : null,
      // a contract node is never counted as conforming, whatever grades it (a graph claim about its contract included)
      runtime: spec || (!!graph && !contract),
      contract,
      by: spec ? 'spec' : graph ? 'graph' : contract ? 'contract' : null,
      graphFiles: graph ? [...graph.files] : [],
      graphRowOnly: !spec && !!graph && graph.rowOnly,
      export: spec && reach.includes(t),
      exempt: exemptions[t] ? exemptions[t].reason : null,
      owed: owed[t] || null,
      ports: portsClass(n)
    };
  })
  .sort((a, b) => a.typeName.localeCompare(b.typeName));

const runtime = rows.filter((r) => r.runtime);
const contracted = rows.filter((r) => r.contract && !r.runtime);
const exported = rows.filter((r) => r.export);
const exempt = rows.filter((r) => r.exempt);
const owedRows = rows.filter((r) => r.owed);
const byTier = Object.fromEntries(
  TIERS.map((t) => {
    const rs = rows.filter((r) => r.tier === t);
    return [t, { nodes: rs.length, runtime: rs.filter((r) => r.runtime).length, contract: rs.filter((r) => r.contract && !r.runtime).length, exempt: rs.filter((r) => r.exempt).length, owed: rs.filter((r) => r.owed).length }];
  })
);
const pct = population.length ? (100 * runtime.length) / population.length : 0;
const PORT_CLASSES = ['params-only', 'with-project', 'with-schema', 'static'];
const portsBy = Object.fromEntries(PORT_CLASSES.map((c) => [c, rows.filter((r) => r.ports.cls === c).length]));
const portsDerivable = rows.filter((r) => r.ports.cls !== null);
const portsNot = rows.filter((r) => r.ports.cls === null);

// ---------------------------------------------------------------------------------------------
// what must hold — checked on every run; --check makes it the exit status

const problems = [];
const name = (t) => (display.get(t) && display.get(t) !== t ? `"${t}" (${display.get(t)})` : `"${t}"`);

// AC3 — the census and the ledger count one population, by tier and by name, both directions
for (const t of TIERS) {
  const c = (census.byTier || {})[t] || 0;
  if (c !== byTier[t].nodes) problems.push(`${t}: the ledger counts ${byTier[t].nodes} picker nodes, census.json says ${c} — regenerate the census (node scripts/node-spec/census.js)`);
}
const censusNames = new Set((census.rows || []).map((r) => r.typeName));
for (const r of rows) if (!censusNames.has(r.typeName)) problems.push(`picker node ${name(r.typeName)} is not in census.json — regenerate the census`);
for (const t of censusNames) if (!popNames.has(t)) problems.push(`census.json lists "${t}", which is not a picker node — regenerate the census`);
for (const r of rows) if (!r.tier) problems.push(`picker node ${name(r.typeName)} has no tier in ${rel(tiersPath)}`);

// the registry holds picker nodes only
for (const t of specTypes) if (!popNames.has(t)) problems.push(`the registry holds a spec for "${t}", which is not a picker node`);

// NSP-018 AC5 — `idioms` (the code a node replaces) is counted, and every T1 node NSP-011 specced carries one
const withIdioms = Object.keys(loadedSpecs).filter((t) => (loadedSpecs[t].idioms || []).length > 0);
for (const [t, row] of Object.entries(tierRows)) {
  if (row.tier === 'T1' && row.batch === 'NSP-011' && loadedSpecs[t] && !withIdioms.includes(t)) {
    problems.push(`${name(t)} is a T1 node NSP-011 specced and its spec has no \`idioms\` (NSP-018 AC5) — say the code it replaces`);
  }
}

// THE NEW-NODE GATE — a picker node with no spec, no graph claim, no exemption and no owed entry
const ungraded = rows.filter((r) => !r.runtime && !r.contract && !r.exempt && !r.owed);
for (const r of ungraded) {
  problems.push(
    `NEW-NODE GATE: picker node ${name(r.typeName)} has no spec, no graph claim, no exemption and no owed entry.\n` +
      `      → Write its spec (packages/nodegx-node-spec/src/nodes, registered in index.ts), or give it a reason in\n` +
      `        ${rel(exemptionsPath)} (it owes no spec) or in ${rel(ledgerPath)} \`owed\` (the task that will write it).`
  );
}
for (const [t, reason] of Object.entries(owed)) {
  if (t.startsWith('$')) continue;
  if (!popNames.has(t)) problems.push(`${rel(ledgerPath)} owes a spec for "${t}", which is not a picker node — remove it`);
  else if (typeof reason !== 'string' || !reason.trim()) problems.push(`${rel(ledgerPath)} owes a spec for ${name(t)} with no reason`);
  const r = rows.find((x) => x.typeName === t);
  if (r && (r.runtime || r.contract)) problems.push(`${name(t)} is graded on the runtime now (by its ${r.by}) — remove it from ${rel(ledgerPath)} \`owed\``);
  if (r && r.exempt) problems.push(`${name(t)} is both exempt and owed — it is one or the other`);
}
for (const r of exempt) if (r.runtime || r.contract) problems.push(`${name(r.typeName)} is exempt but graded (by its ${r.by}) — remove the exemption`);

// the floor — exactly as pickerCoverageFloor
const floor = ledger.floor || {};
const floorProblems = [];
for (const [key, have] of [['runtime', runtime.length], ['contract', contracted.length], ['export', exported.length], ['ports', portsDerivable.length]]) {
  const f = floor[key];
  if (typeof f !== 'number') floorProblems.push(`${rel(ledgerPath)} has no numeric \`floor.${key}\` — add it (${have} today)`);
  else if (have < f)
    floorProblems.push(
      `SPEC COVERAGE FELL on the ${key}: ${have} nodes conform, the floor is ${f}.\n` +
        `      → A spec or a graph claim was removed. Restore it, or if the fall is intended, lower \`floor.${key}\` in the same commit so the decision is in the diff.`
    );
  else if (have > f) floorProblems.push(`SPEC COVERAGE ROSE on the ${key}: ${have} nodes conform, the floor is still ${f}.\n      → Raise \`floor.${key}\` to ${have} in this commit, so the gain is held.`);
}

// ---------------------------------------------------------------------------------------------
// output

const ms = Date.now() - started;
const tierLine = TIERS.map(
  (t) => `${t} ${byTier[t].runtime}/${byTier[t].nodes}${byTier[t].contract ? ` (+${byTier[t].contract} contract)` : ''}${byTier[t].exempt ? ` (+${byTier[t].exempt} exempt)` : ''}`
).join(' · ');
const owedByBatch = owedRows.reduce((m, r) => ((m[r.batch] = m[r.batch] || []).push(r.displayName), m), {});

if (args.includes('--json')) {
  console.log(
    JSON.stringify(
      {
        population: population.length,
        runtime: runtime.length,
        percent: Number(pct.toFixed(2)),
        contract: contracted.map((r) => r.typeName),
        export: exported.map((r) => r.typeName),
        exempt: exempt.map((r) => r.typeName),
        owed: owedRows.map((r) => r.typeName),
        bySpec: runtime.filter((r) => r.by === 'spec').length,
        byGraph: runtime.filter((r) => r.by === 'graph').map((r) => r.typeName),
        byTier,
        floor,
        problems: [...problems, ...floorProblems],
        said,
        idioms: withIdioms.length,
        ports: { derivable: portsDerivable.length, by: portsBy, not: portsNot.map((r) => ({ type: r.typeName, why: r.ports.why })) },
        ms
      },
      null,
      2
    )
  );
} else {
  console.log(
    `\nSPEC COVERAGE: ${runtime.length} of ${population.length} picker nodes conform on the runtime (${pct.toFixed(1)}%); ` +
      `${contracted.length} specced as a contract (${contracted.map((r) => r.displayName).join(', ') || 'none'}); ` +
      `${exported.length} on the export, inside a declared reach (${exported.map((r) => r.displayName).join(', ') || 'none'}); ${exempt.length} exempt; ${owedRows.length} owed`
  );
  console.log(`  by tier:  ${tierLine}`);
  const byGraph = runtime.filter((r) => r.by === 'graph');
  console.log(`  counted:  ${runtime.length - byGraph.length} by a spec in the registry · ${byGraph.length} by an N graph scenario's claims${byGraph.some((r) => r.graphRowOnly) ? ` (${byGraph.filter((r) => r.graphRowOnly).length} only through a known row)` : ''}`);
  console.log(
    `  in words: ${said.said} of ${said.reducers} input reducers say what each case does (NSP-018); ${said.specsSaid.length} spec(s) fully: ${said.specsSaid.join(', ') || 'none'}` +
      (said.unread.length ? `; not readable from the source (built in a factory): ${said.unread.join(', ')}` : '')
  );
  console.log(`  idioms:   ${withIdioms.length} of ${registry.length} specs name the code they replace (NSP-018)`);
  console.log(
    `  ports:    ${portsDerivable.length} of ${population.length} drawable without a viewer (NSP-020) — ${portsDerivable.length - portsBy.static} by a spec ` +
      `(${portsBy['params-only']} from the params, ${portsBy['with-project']} with the project, ${portsBy['with-schema']} with the schema), ${portsBy.static} static`
  );
  for (const r of portsNot) console.log(`  no view:  ${name(r.typeName)} — ${r.ports.why}`);
  for (const r of exempt) console.log(`  exempt:   ${name(r.typeName)} — ${r.exempt}`);
  for (const [b, names] of Object.entries(owedByBatch)) console.log(`  owed:     ${b} ×${names.length} — ${names.join(', ')}`);
}

const all = [...problems, ...floorProblems];
if (args.includes('--check')) {
  if (all.length) {
    console.error(`\nspec-ledger: ${all.length} problem(s):\n`);
    for (const p of all) console.error('  • ' + p);
    console.error(`\nspec-ledger: FAILED in ${Date.now() - started} ms.`);
    process.exit(1);
  }
  console.log(`spec-ledger: holds at ${runtime.length}/${population.length} on the runtime, ${contracted.length} as a contract, ${exported.length} on the export, ${portsDerivable.length} with ports drawable without a viewer (${Date.now() - started} ms).`);
} else if (all.length && !args.includes('--json')) {
  console.log(`\n  ⚠️  ${all.length} problem(s) — run with --check to see them as the PR job will.`);
}
