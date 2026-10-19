#!/usr/bin/env node
/**
 * census — what every template is made of: nodes, wires, script, kit nodes, and the honesty number by hand.
 * Phase 111 (you can see what it built), SEE-000.
 *
 * Generated, never hand-typed. Writes, into the phase folder:
 *   census.json   one row per project (and per component inside it), the counting rules written beside the numbers
 *   CENSUS.md     the table a person reads: one row per template, the rules, the three largest Functions per template
 *
 * THE COUNTING RULE (AC1). A node is an entry the runtime instantiates: an element of a v2 `nodes.json` `nodes` array
 * (or, in a legacy `project.json`, a node in a component's `graph.roots` tree, children included). Nothing else.
 * The scoping count (README §1) counted "any object with `type` and `id`" over every JSON file, which also counts each
 * component's own record in `component.json` (`{ id, type: "visual" | "page" | "logic" | "cloud" | "root" }`). The
 * census prints both counts and the difference, so the over-count is a number and not a sentence.
 *
 * THE HONESTY NUMBER, BY HAND (AC2, and SEE-001's reference). Every node instance falls in exactly one class:
 *   instance   its type is a component of the project (`/…` or `#…`): its behaviour is the component's own nodes,
 *              counted where they live, so the instance is not counted again.
 *   exempt     its type owes no spec, by a ruled reason (`exemptions.json` in phase 107: Component Children, CSS Definition).
 *   script     its type is a T6 node in phase 107's `tiers.json` (Function, Script, Expression, Visual Function — the person
 *              writes the behaviour as code; R3: a Function is script even when it is ten lines of date maths), OR it is
 *              a kit type (not in the shipped catalog, not a component) with no spec.
 *   known      its type has a spec in the registry (`packages/nodegx-node-spec/src/nodes/index.ts`, not a `contract` spec)
 *              or is graded by a claim of an N graph scenario (`scenarios/graph/*.json`) — the two ways phase 107's ledger
 *              counts a node as conforming on the runtime. A spec in the registry that does not conform is a red PR
 *              (`spec-ledger.js` says why), so "in the registry" is "conforms".
 *   unspecced  anything else: a shipped type with no spec yet. Neither known nor script, reported on its own.
 * The number is known ÷ (known + script), by node instance. The line-weighted figure beside it weighs each script node
 * by its script's lines (at least 1; a kit node weighs 1, its code is in the kit) and each known node by 1.
 *
 * This file computes the rule ON ITS OWN, from the phase-107 files, on purpose: `packages/nodegx-node-spec/src/honesty.ts`
 * (SEE-001) is the definition every surface imports, and its test holds it equal to this census (SEE-001 AC1). Two
 * readings that agree are evidence; one reading quoted twice is not.
 *
 * Usage:
 *   node scripts/see/census.js                      # regenerate census.json + CENSUS.md, print the table
 *   node scripts/see/census.js --check              # exit 1 if a template's counts moved and census.json was not regenerated
 *   node scripts/see/census.js <dir> [<dir> …]      # also count these projects (printed; written only with --write-extra)
 *   --templates <dir>  --census <file>  --md <file> read and write COPIES instead (the gate's test does)
 */

const fs = require('fs');
const path = require('path');
const { loadSpecs } = require('../node-spec/load-specs');
const { readProject } = require('./read-project');

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const VALUE_FLAGS = ['--templates', '--census', '--md'];
const CHECK = args.includes('--check');
const extraDirs = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));

const root = path.join(__dirname, '..', '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const phaseDir = path.join(root, 'dev-docs', 'tasks', 'phase-111-you-can-see-what-it-built');
const p107 = path.join(root, 'dev-docs', 'tasks', 'phase-107-the-node-says-what-it-does');
const templatesDir = argValue('--templates', path.join(root, 'templates'));
const jsonOut = argValue('--census', path.join(phaseDir, 'census.json'));
const mdOut = argValue('--md', path.join(phaseDir, 'CENSUS.md'));
const graphDir = path.join(root, 'packages', 'nodegx-node-spec', 'scenarios', 'graph');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ---------------------------------------------------------------------------------------------
// the rule's inputs, read from the files that decide them

const catalogTypes = new Set(readJson(path.join(root, 'packages', 'noodl-types', 'src', 'node-catalog.json')).nodes.map((n) => n.typeName));
const tiers = readJson(path.join(p107, 'tiers.json')).nodes || {};
const exempt = new Set(Object.keys(readJson(path.join(p107, 'exemptions.json'))).filter((k) => !k.startsWith('$')));
const scriptTypes = new Set(Object.keys(tiers).filter((t) => tiers[t].tier === 'T6' && !exempt.has(t)));
const specs = loadSpecs();
const knownTypes = new Set(Object.keys(specs).filter((t) => !(typeof specs[t].contract === 'string' && specs[t].contract)));
// the graph's claims, as spec-ledger.js reads them: a claim's subject node, or the Component Outputs of a claimed instance
for (const f of fs.readdirSync(graphDir).filter((x) => x.endsWith('.json'))) {
  for (const sc of readJson(path.join(graphDir, f))) {
    if (!Array.isArray(sc.clauses) || !sc.clauses.includes('N')) continue;
    for (const c of sc.claims || []) {
      const node = sc.nodes[c.subject];
      if (node) knownTypes.add(node.type);
      else if (sc.components && sc.components[c.subject]) {
        for (const n of Object.values(sc.nodes)) if (n.type === 'Component Outputs' && n.in === c.subject) knownTypes.add(n.type);
      }
    }
  }
}
for (const t of scriptTypes) knownTypes.delete(t); // a T6 node is script whatever grades it (Expression has a spec)

/** The script text a script node carries, by type (the parameter the catalog names). */
const SCRIPT_PARAM = { JavaScriptFunction: 'functionScript', Expression: 'expression', Javascript2: 'code', 'Logic Builder': 'generatedCode' };
const linesOf = (node) => {
  const s = node.parameters && node.parameters[SCRIPT_PARAM[node.type]];
  return typeof s === 'string' && s.length ? s.split('\n').length : 0;
};

function classOf(type) {
  if (typeof type !== 'string') return 'unspecced';
  if (type.startsWith('/') || type.startsWith('#')) return 'instance';
  if (exempt.has(type)) return 'exempt';
  if (scriptTypes.has(type)) return 'script';
  if (knownTypes.has(type)) return 'known';
  if (!catalogTypes.has(type)) return 'script'; // a kit type with no spec
  return 'unspecced';
}

// reading a project, both formats: ./read-project.js (the honesty ratchet reads with the same function)

// ---------------------------------------------------------------------------------------------
// the count

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);

function countNodes(nodes) {
  const c = { nodes: nodes.length, known: 0, script: 0, unspecced: 0, instance: 0, exempt: 0, scriptLines: 0, scriptWeight: 0, functions: 0, functionLines: 0, kitNodes: 0 };
  for (const n of nodes) {
    const cls = classOf(n.type);
    c[cls]++;
    if (cls === 'script') {
      const lines = linesOf(n);
      c.scriptLines += lines;
      c.scriptWeight += Math.max(1, lines);
      if (!scriptTypes.has(n.type)) c.kitNodes++;
    }
    if (n.type === 'JavaScriptFunction') {
      c.functions++;
      c.functionLines += linesOf(n);
    }
  }
  c.percent = pct(c.known, c.known + c.script);
  c.percentByLines = pct(c.known, c.known + c.scriptWeight);
  return c;
}

function censusOf(name, dir) {
  const p = readProject(dir);
  if (!p) return null;
  const all = p.components.flatMap((c) => c.nodes);
  const totals = countNodes(all);
  const byType = {};
  for (const n of all) byType[n.type] = (byType[n.type] || 0) + 1;
  const scriptByType = {};
  const unspeccedByType = {};
  for (const n of all) {
    const cls = classOf(n.type);
    if (cls === 'script') scriptByType[n.type] = (scriptByType[n.type] || 0) + 1;
    if (cls === 'unspecced') unspeccedByType[n.type] = (unspeccedByType[n.type] || 0) + 1;
  }
  const largest = p.components
    .flatMap((c) => c.nodes.filter((n) => n.type === 'JavaScriptFunction').map((n) => ({ component: c.name, id: n.id, label: n.label || null, lines: linesOf(n) })))
    .sort((a, b) => b.lines - a.lines || a.component.localeCompare(b.component) || String(a.id).localeCompare(String(b.id)))
    .slice(0, 3);
  const connections = p.components.reduce((s, c) => s + c.connections, 0);
  return {
    name,
    format: p.format,
    bytes: p.bytes,
    files: p.files,
    components: p.components.length,
    handObjects: p.handObjects,
    componentRecords: p.handObjects - totals.nodes,
    connections,
    ...totals,
    topTypes: Object.entries(byType)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([type, count]) => ({ type, count })),
    scriptByType: sortObj(scriptByType),
    unspeccedByType: sortObj(unspeccedByType),
    largestFunctions: largest,
    byComponent: p.components.map((c) => {
      const k = countNodes(c.nodes);
      return { name: c.name, nodes: k.nodes, connections: c.connections, known: k.known, script: k.script, unspecced: k.unspecced, instance: k.instance, exempt: k.exempt, scriptLines: k.scriptLines, percent: k.percent };
    })
  };
}

function sortObj(o) {
  return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

const projects = fs
  .readdirSync(templatesDir)
  .filter((d) => fs.statSync(path.join(templatesDir, d)).isDirectory())
  .sort()
  .map((d) => censusOf(d, path.join(templatesDir, d)))
  .filter(Boolean);

const census = {
  $comment: 'GENERATED by scripts/see/census.js (P111 SEE-000) — never hand-edit. Regenerate with `node scripts/see/census.js` in the commit that changes a template.',
  rules: {
    node: 'an element of a v2 nodes.json `nodes` array (legacy: a node of a component graph.roots tree, children included) — what the runtime instantiates',
    handObjects: 'the scoping count: any JSON object with `type` and `id`; it also counts each component record in component.json (componentRecords = handObjects − nodes)',
    known: 'type has a non-contract spec in the nodegx-node-spec registry, or is graded by an N graph scenario claim — conforming on the runtime by phase 107\'s ledger',
    script: 'a T6 node of phase-107 tiers.json (Function, Script, Expression, Visual Function), or a kit type (not in the shipped catalog, not a component) with no spec',
    unspecced: 'a shipped type with no spec and no graph claim yet — neither known nor script',
    instance: 'a component instance (type starts with / or #) — counted inside its component, not again here',
    exempt: 'a type exemptions.json says owes no spec (Component Children, CSS Definition)',
    percent: 'known ÷ (known + script) × 100, by node instance, one decimal',
    percentByLines: 'known ÷ (known + Σ max(1, script lines)) × 100 — each script node weighed by its lines, a kit node by 1'
  },
  inputs: {
    knownTypes: knownTypes.size,
    scriptTypes: [...scriptTypes].sort(),
    exemptTypes: [...exempt].sort(),
    catalogTypes: catalogTypes.size
  },
  projects
};

// ---------------------------------------------------------------------------------------------
// the gate's comparison: the counts that must not move without a regenerated census

const GATED = ['nodes', 'connections', 'functions', 'functionLines', 'scriptLines', 'known', 'script', 'unspecced', 'instance', 'exempt'];
function compare(onDisk, now) {
  const problems = [];
  const old = new Map((onDisk.projects || []).map((p) => [p.name, p]));
  for (const p of now.projects) {
    const o = old.get(p.name);
    if (!o) {
      problems.push(`template "${p.name}" is not in ${rel(jsonOut)}`);
      continue;
    }
    for (const k of GATED) if (o[k] !== p[k]) problems.push(`${p.name}: ${k} is ${p[k]}, census.json says ${o[k]}`);
  }
  for (const name of old.keys()) if (!now.projects.some((p) => p.name === name)) problems.push(`census.json lists "${name}", which is not a template`);
  return problems;
}

// ---------------------------------------------------------------------------------------------
// output

const n = (x) => (x === null || x === undefined ? '—' : x.toLocaleString('en-GB'));
const pctStr = (x) => (x === null ? '—' : `${x}%`);

function tableRows(rows) {
  const head =
    '| template | graph JSON bytes | component files | components | nodes (runtime rule) | hand count (type+id) | connections | Functions | Function lines | known | script (of it kit) | unspecced | instances | honesty | by lines |\n' +
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  return [
    head,
    ...rows.map(
      (p) =>
        `| \`${p.name}\` | ${n(p.bytes)} | ${n(p.files)} | ${n(p.components)} | ${n(p.nodes)} | ${n(p.handObjects)} | ${n(p.connections)} | ${n(p.functions)} | ${n(p.functionLines)} | ${n(p.known)} | ${n(p.script)} (${n(p.kitNodes)}) | ${n(p.unspecced)} | ${n(p.instance)} | **${pctStr(p.percent)}** | ${pctStr(p.percentByLines)} |`
    )
  ].join('\n');
}

function markdown(c) {
  const lines = [
    '# P111 census — what the templates are made of',
    '',
    '**GENERATED by `node scripts/see/census.js` (SEE-000). Do not hand-edit; regenerate in the commit that changes a template.**',
    `The gate (\`packages/nodegx-node-spec/tests/see-census.test.ts\`) fails when a template's counts move and \`census.json\` does not.`,
    '',
    '## The table',
    '',
    tableRows(c.projects),
    '',
    '## The rules',
    '',
    ...Object.entries(c.rules).map(([k, v]) => `- **${k}**: ${v}.`),
    '',
    `Inputs read: ${c.inputs.knownTypes} known types (registry specs that are not contracts, plus graph-graded types, minus T6); script types ${c.inputs.scriptTypes.map((t) => `\`${t}\``).join(', ')}; exempt ${c.inputs.exemptTypes.map((t) => `\`${t}\``).join(', ')}; ${c.inputs.catalogTypes} shipped catalog types.`,
    '',
    '## What the script is, per template',
    '',
    '| template | script nodes by type | unspecced nodes by type |',
    '|---|---|---|',
    ...c.projects.map(
      (p) =>
        `| \`${p.name}\` | ${Object.entries(p.scriptByType).map(([t, k]) => `${t} ${k}`).join(', ') || '—'} | ${Object.entries(p.unspeccedByType).map(([t, k]) => `${t} ${k}`).join(', ') || '—'} |`
    ),
    '',
    '## The three largest Functions, per template (SEE-004 starts here)',
    '',
    '| template | component | Function (label or id) | lines |',
    '|---|---|---|---|',
    ...c.projects.flatMap((p) => p.largestFunctions.map((f) => `| \`${p.name}\` | \`${f.component}\` | ${f.label ? f.label : '`' + f.id + '`'} | ${f.lines} |`)),
    ''
  ];
  return lines.join('\n');
}

const extras = extraDirs.map((d) => censusOf(path.basename(path.resolve(d)), path.resolve(d))).filter(Boolean);

if (CHECK) {
  if (!fs.existsSync(jsonOut)) {
    console.error(`census: ${rel(jsonOut)} does not exist — run node scripts/see/census.js`);
    process.exit(1);
  }
  const problems = compare(readJson(jsonOut), census);
  if (problems.length) {
    console.error(`\ncensus: the templates moved and ${rel(jsonOut)} did not (${problems.length}):\n`);
    for (const p of problems) console.error('  • ' + p);
    console.error('\n  → Count the artefact, never bump a literal: run `node scripts/see/census.js` and commit census.json + CENSUS.md with the template change.\n');
    process.exit(1);
  }
  console.log(`census: holds — ${census.projects.length} templates, ${census.projects.reduce((s, p) => s + p.nodes, 0)} nodes.`);
  process.exit(0);
}

fs.writeFileSync(jsonOut, JSON.stringify(census, null, 2) + '\n');
fs.writeFileSync(mdOut, markdown(census));
console.log(tableRows(census.projects));
if (extras.length) {
  console.log('\nPassed directories (not written):\n');
  console.log(tableRows(extras));
}
console.log(`\ncensus: wrote ${rel(jsonOut)} and ${rel(mdOut)} (${census.projects.length} templates).`);
