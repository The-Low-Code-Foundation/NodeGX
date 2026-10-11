#!/usr/bin/env node
/**
 * census — how much of every template a home-made editor could run in a page, counted the P107 way.
 * Phase 112 (your own NodeGX), OWN-000 §3.2. Replaces the prototype's rough count (README §1 reading 6).
 *
 * Generated, never hand-typed. Writes, into the phase folder:
 *   census.json   one row per template, one bucket count per rule below, every "other" type by name
 *   CENSUS.md     the table, the world-need split, the unspecced types, and the README §1 reading 6 comparison
 *
 * WHAT A NODE IS (reused, not re-derived): a node is one entry of a component's `nodes.json` `nodes` array.
 * In the v2 format that array is FLAT — `children` is a list of ids into the same array — so every node is
 * counted exactly once and nothing is nested (memory: a census must read the format it is given; the
 * prototype's rough-census.ts walked a `nodes` field that v2 nodes do not have, which is why it is retired).
 * The PICKER POPULATION is P107's: catalog `inNodePicker && !isDeprecated` (scripts/node-spec/census.js); the
 * tier per type is read from P107's generated census.json, never typed here.
 *
 * THE RULE, applied in this order (the first that fits wins):
 *   component     the type is a component path ("/Todo/Note dialog") — an instance of the project's own component
 *   notInPicker   the type is not in the P107 population (Page, project-only types…) — listed by name
 *   visual        the catalog says isVisual — needs a screen (R4: the real preview, until NSP-016)
 *   script        P107 tier T6, the escape hatches (Function, Script, Expression, Logic Builder, CSS Definition)
 *   page          has a spec, mounts with no parameters, and its world needs are a subset of
 *                 {clock, random, timezone} — what the Orbit prototype could give a node (tools/genpicker.ts)
 *   world         has a spec but needs more (registry, backend, router, popup, viewport, stack, network,
 *                 socket, digest, location, project, picker) — split by need
 *   unspecced     in the population, no spec yet — listed BY TYPE NAME with counts (OWN-003 R1's input)
 * The spec list and each spec's `needs` are read from the package at run time through an esbuild bundle of
 * spec-needs.ts (the package's `main` is TypeScript); the count is never typed here.
 *
 * Usage:
 *   node scripts/own/census.js            # regenerate census.json + CENSUS.md
 *   node scripts/own/census.js --check    # exit 1 if census.json on disk is stale
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CHECK = process.argv.includes('--check');
const root = path.join(__dirname, '..', '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const phaseDir = path.join(root, 'dev-docs', 'tasks', 'phase-112-your-own-nodegx');
const p107Census = path.join(root, 'dev-docs', 'tasks', 'phase-107-the-node-says-what-it-does', 'census.json');
const catalogPath = path.join(root, 'packages', 'noodl-types', 'src', 'node-catalog.json');
const templatesDir = path.join(root, 'templates');
const jsonOut = path.join(phaseDir, 'census.json');
const mdOut = path.join(phaseDir, 'CENSUS.md');

const PAGE_NEEDS = new Set(['clock', 'random', 'timezone']);

// P112 OWN-003 AC4 — "runnable in a page" ON THE CHOSEN RUNNER (R1: the real engine, opened up): the node types the
// engine registers in a page, written by `npm --prefix packages/noodl-preview run graph-target-check -- --types <file>`
// into engine-types.json beside this script's outputs. Read, never typed. Absent: the engine section is not produced.
const engineTypesPath = path.join(phaseDir, 'engine-types.json');
const engineTypes = fs.existsSync(engineTypesPath) ? new Set(JSON.parse(fs.readFileSync(engineTypesPath, 'utf8'))) : undefined;

// README §1 reading 6 — the rough count this script replaces. Kept so the comparison is printed, never trusted.
const README_READING_6 = {
  'todo-list': { total: 531, page: 19, world: 92, visual: 201, script: 52, component: 71, other: 96 },
  planning: { total: 972, page: 16, world: 141, visual: 523, script: 92, component: 67, other: 133 }
};

// ---- the vocabulary: P107 population and tiers, the catalog, the specs
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const population = new Map(catalog.nodes.filter((n) => n.inNodePicker && !n.isDeprecated).map((n) => [n.typeName, n]));
const p107 = JSON.parse(fs.readFileSync(p107Census, 'utf8'));
const tierOf = new Map(p107.rows.map((r) => [r.typeName, r.tier]));
if (p107.rows.length !== population.size) {
  console.error(`P107 census.json has ${p107.rows.length} rows but the catalog population is ${population.size}: run \`npm run spec-census\` first`);
  process.exit(1);
}

function readSpecs() {
  const bundle = path.join(os.tmpdir(), `own-spec-needs-${process.pid}.cjs`);
  const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');
  execFileSync(esbuild, [path.join(__dirname, 'spec-needs.ts'), '--bundle', '--platform=node', `--outfile=${bundle}`, '--log-level=warning'], { stdio: ['ignore', 'ignore', 'inherit'] });
  try {
    return JSON.parse(execFileSync(process.execPath, [bundle], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } finally {
    fs.rmSync(bundle, { force: true });
  }
}
const { specCount, specs } = readSpecs();

// ---- the templates
const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(templatesDir, d.name, 'components')))
  .map((d) => d.name)
  .sort();

function nodeFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) nodeFiles(p, out);
    else if (e.name === 'nodes.json') out.push(p);
  }
  return out;
}

function classify(type) {
  if (typeof type === 'string' && type.startsWith('/')) return { bucket: 'component' };
  const cat = population.get(type);
  if (!cat) return { bucket: 'notInPicker' };
  if (cat.isVisual) return { bucket: 'visual' };
  if (tierOf.get(type) === 'T6') return { bucket: 'script' };
  const spec = specs[type];
  if (!spec) return { bucket: 'unspecced' };
  const extra = spec.needs.filter((n) => !PAGE_NEEDS.has(n));
  if (spec.mountable && extra.length === 0) return { bucket: 'page' };
  return { bucket: 'world', needs: extra.length ? extra : ['(does not mount with no parameters)'] };
}

/**
 * OWN-003 AC4 — the same node on the chosen runner. The first three rules are the spec rule's (component, not in picker,
 * visual: a visual node runs in a page through the real app, `@noodl/preview`, R4 — not headless); then `engine` when
 * the page's engine registers the type (a spec or not; the escape hatches too — Function and Logic Builder are played
 * by the graph scenarios), else `unregistered`, listed by name.
 */
function classifyEngine(type) {
  if (typeof type === 'string' && type.startsWith('/')) return 'component';
  const cat = population.get(type);
  if (!cat) return 'notInPicker';
  if (cat.isVisual) return 'visual';
  return engineTypes.has(type) ? 'engine' : 'unregistered';
}

const BUCKETS = ['page', 'world', 'visual', 'script', 'component', 'notInPicker', 'unspecced'];
const ENGINE_BUCKETS = ['engine', 'visual', 'component', 'notInPicker', 'unregistered'];
const rows = templates.map((t) => {
  const files = nodeFiles(path.join(templatesDir, t, 'components'));
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  const byType = Object.fromEntries(BUCKETS.map((b) => [b, {}]));
  const worldNeeds = {};
  const engineCounts = Object.fromEntries(ENGINE_BUCKETS.map((b) => [b, 0]));
  const unregistered = {};
  let total = 0;
  let components = 0;
  for (const f of files) {
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    const nodes = Array.isArray(doc) ? doc : doc.nodes || [];
    components++;
    for (const n of nodes) {
      total++;
      const { bucket, needs } = classify(n.type);
      counts[bucket]++;
      byType[bucket][n.type] = (byType[bucket][n.type] || 0) + 1;
      if (needs) for (const need of needs) worldNeeds[need] = (worldNeeds[need] || 0) + 1;
      if (engineTypes) {
        const b = classifyEngine(n.type);
        engineCounts[b]++;
        if (b === 'unregistered') unregistered[n.type] = (unregistered[n.type] || 0) + 1;
      }
    }
  }
  const sortedTypes = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    template: t,
    components,
    total,
    counts,
    worldNeeds: Object.fromEntries(sortedTypes(worldNeeds)),
    unspecced: Object.fromEntries(sortedTypes(byType.unspecced)),
    notInPicker: Object.fromEntries(sortedTypes(byType.notInPicker)),
    world: Object.fromEntries(sortedTypes(byType.world)),
    page: Object.fromEntries(sortedTypes(byType.page)),
    ...(engineTypes ? { engine: { counts: engineCounts, unregistered: Object.fromEntries(sortedTypes(unregistered)) } } : {})
  };
});

// the same for every template at once
const all = { total: 0, counts: Object.fromEntries(BUCKETS.map((b) => [b, 0])), unspecced: {}, worldNeeds: {}, notInPicker: {} };
for (const r of rows) {
  all.total += r.total;
  for (const b of BUCKETS) all.counts[b] += r.counts[b];
  for (const [k, v] of Object.entries(r.unspecced)) all.unspecced[k] = (all.unspecced[k] || 0) + v;
  for (const [k, v] of Object.entries(r.worldNeeds)) all.worldNeeds[k] = (all.worldNeeds[k] || 0) + v;
  for (const [k, v] of Object.entries(r.notInPicker)) all.notInPicker[k] = (all.notInPicker[k] || 0) + v;
}
// OWN-003 AC4 — the engine's totals, and the move from README §1 reading 6's "19 of 531"
let engine;
if (engineTypes) {
  const counts = Object.fromEntries(ENGINE_BUCKETS.map((b) => [b, 0]));
  const unregistered = {};
  for (const r of rows) {
    for (const b of ENGINE_BUCKETS) counts[b] += r.engine.counts[b];
    for (const [k, v] of Object.entries(r.engine.unregistered)) unregistered[k] = (unregistered[k] || 0) + v;
  }
  const todo = rows.find((r) => r.template === 'todo-list');
  engine = {
    source: rel(engineTypesPath),
    types: engineTypes.size,
    rule: 'component · not in picker · visual (the real app, R4) · engine (the page\'s engine registers the type) · unregistered',
    counts,
    unregistered: Object.fromEntries(Object.entries(unregistered).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    todoList: todo ? { readmeReading6: README_READING_6['todo-list'], engine: todo.engine.counts.engine, visual: todo.engine.counts.visual, total: todo.total } : undefined
  };
}
const sortDesc = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
all.unspecced = sortDesc(all.unspecced);
all.worldNeeds = sortDesc(all.worldNeeds);
all.notInPicker = sortDesc(all.notInPicker);

const specced = Object.keys(specs);
const pageTypes = specced.filter((t) => classify(t).bucket === 'page');
const out = {
  $comment: 'GENERATED by scripts/own/census.js — do not edit. The rule is in the script header.',
  rule: {
    node: 'one entry of a component nodes.json `nodes` array (flat; `children` are ids)',
    population: 'catalog inNodePicker && !isDeprecated (P107)',
    page: 'specced, mounts with {}, needs ⊆ {clock, random, timezone}',
    order: BUCKETS
  },
  vocabulary: {
    catalogFormatVersion: catalog.catalogFormatVersion,
    catalogNodes: catalog.nodes.length,
    population: population.size,
    specCount,
    pageTypes: pageTypes.length,
    unmountableSpecs: specced.filter((t) => !specs[t].mountable)
  },
  templates: rows,
  all,
  ...(engine ? { engine } : {}),
  readmeReading6: README_READING_6
};

// ---- compare with README §1 reading 6
function compareLines() {
  const lines = [];
  for (const [t, r6] of Object.entries(README_READING_6)) {
    const r = rows.find((x) => x.template === t);
    if (!r) { lines.push(`- \`${t}\`: not found under templates/`); continue; }
    const mine = { total: r.total, page: r.counts.page, world: r.counts.world, visual: r.counts.visual, script: r.counts.script, component: r.counts.component, other: r.counts.notInPicker + r.counts.unspecced };
    const cells = Object.keys(r6).map((k) => `${k} ${r6[k]} → **${mine[k]}**${r6[k] === mine[k] ? '' : ' ✗'}`);
    lines.push(`- \`${t}\`: ${cells.join(' · ')}`);
  }
  return lines;
}

// ---- markdown
const md = [];
md.push('# The runnable census — how much of each template a home-made editor could run in a page');
md.push('');
md.push('**GENERATED** by `scripts/own/census.js` (phase 112, OWN-000). Do not edit; re-run. `--check` fails when this is stale.');
md.push('');
md.push(`Vocabulary at run time: catalog format ${catalog.catalogFormatVersion}, **${catalog.nodes.length}** node types, **${population.size}** in the P107 population, **${specCount}** specs, of which **${pageTypes.length}** run in a page on clock, randomness and time zone alone.${out.vocabulary.unmountableSpecs.length ? ` Specs that do not mount with no parameters: ${out.vocabulary.unmountableSpecs.map((t) => `\`${t}\``).join(', ')}.` : ''}`);
md.push('');
md.push('The rule, in order (the first that fits wins): **component** (an instance of the project\'s own component) · **not in picker** (a type outside the P107 population) · **visual** (catalog `isVisual`) · **script** (P107 tier T6) · **page** (specced, mounts with no parameters, needs ⊆ {clock, random, timezone}) · **world** (specced, needs a registry, backend, router, popup, viewport, stack, network, socket, digest, location, project or picker) · **unspecced** (in the population, no spec yet).');
md.push('');
md.push('| template | components | nodes | page | world | visual | script | component | not in picker | unspecced |');
md.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const r of rows) md.push(`| \`${r.template}\` | ${r.components} | ${r.total} | ${r.counts.page} | ${r.counts.world} | ${r.counts.visual} | ${r.counts.script} | ${r.counts.component} | ${r.counts.notInPicker} | ${r.counts.unspecced} |`);
md.push(`| **all** | | **${all.total}** | ${all.counts.page} | ${all.counts.world} | ${all.counts.visual} | ${all.counts.script} | ${all.counts.component} | ${all.counts.notInPicker} | ${all.counts.unspecced} |`);
md.push('');
if (engine) {
  md.push('## On the real engine (OWN-003 AC4)');
  md.push('');
  md.push(`R1 ruled the runner is the real engine, opened up (\`@noodl/preview\`'s \`noodl-graph-target.js\`). The same nodes, counted against the **${engine.types}** node types that engine registers in a page (\`${engine.source}\`, written by \`graph-target-check --types\`): **engine** (registered: it runs headless in a page, a spec or not, the escape hatches too) · **visual** (runs in a page through the real app, R4) · **component** · **not in picker** · **unregistered** (in the population, not visual, and the engine does not register it).`);
  md.push('');
  md.push('| template | nodes | engine | visual | component | not in picker | unregistered |');
  md.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) md.push(`| \`${r.template}\` | ${r.total} | ${r.engine.counts.engine} | ${r.engine.counts.visual} | ${r.engine.counts.component} | ${r.engine.counts.notInPicker} | ${r.engine.counts.unregistered} |`);
  md.push(`| **all** | **${all.total}** | ${engine.counts.engine} | ${engine.counts.visual} | ${engine.counts.component} | ${engine.counts.notInPicker} | ${engine.counts.unregistered} |`);
  md.push('');
  if (engine.todoList) {
    const t = engine.todoList;
    md.push(`README §1 reading 6 counted **${t.readmeReading6.page} of ${t.readmeReading6.total}** todo-list nodes as runnable in a page (the prototype's own runner). On the engine it is **${t.engine} of ${t.total}** headless, and **${t.visual}** more through the real app.`);
    md.push('');
  }
  md.push('Unregistered types, by name: ' + (Object.entries(engine.unregistered).map(([k, v]) => `\`${k}\` ×${v}`).join(', ') || 'none') + '.');
  md.push('');
}
md.push('## What the specced-but-world nodes need');
md.push('');
md.push('One count per need per node (a node that needs two things is counted under both). Across every template:');
md.push('');
md.push('| need | nodes |');
md.push('|---|---:|');
for (const [k, v] of Object.entries(all.worldNeeds)) md.push(`| \`${k}\` | ${v} |`);
md.push('');
md.push('## The unspecced types, by name');
md.push('');
md.push('In the P107 population, not visual, not an escape hatch, and without a spec at run time. This is what the real engine would have to run for OWN-003 (R1).');
md.push('');
md.push('| type | nodes across every template |');
md.push('|---|---:|');
for (const [k, v] of Object.entries(all.unspecced)) md.push(`| \`${k}\` | ${v} |`);
md.push('');
md.push('## Types outside the P107 population');
md.push('');
md.push('| type | nodes across every template |');
md.push('|---|---:|');
for (const [k, v] of Object.entries(all.notInPicker)) md.push(`| \`${k}\` | ${v} |`);
md.push('');
md.push('## README §1 reading 6, compared');
md.push('');
md.push('The rough count the phase was scoped from, then this script\'s (the README\'s "other" is this script\'s not-in-picker plus unspecced). A ✗ marks a cell that moved.');
md.push('');
md.push(...compareLines());
md.push('');
md.push('## Per template');
md.push('');
for (const r of rows) {
  md.push(`### \`${r.template}\``);
  md.push('');
  md.push(`- page (${r.counts.page}): ${Object.entries(r.page).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none'}`);
  md.push(`- world (${r.counts.world}): ${Object.entries(r.world).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none'} — needs: ${Object.entries(r.worldNeeds).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  md.push(`- unspecced (${r.counts.unspecced}): ${Object.entries(r.unspecced).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none'}`);
  md.push(`- not in picker (${r.counts.notInPicker}): ${Object.entries(r.notInPicker).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none'}`);
  md.push('');
}

const json = JSON.stringify(out, null, 2) + '\n';
if (CHECK) {
  const onDisk = fs.existsSync(jsonOut) ? fs.readFileSync(jsonOut, 'utf8') : '';
  if (onDisk !== json) {
    console.error(`own census: ${rel(jsonOut)} is stale — run \`node scripts/own/census.js\``);
    process.exit(1);
  }
  console.log('own census: up to date');
  process.exit(0);
}
fs.writeFileSync(jsonOut, json);
fs.writeFileSync(mdOut, md.join('\n') + '\n');
console.log(`own census: ${rows.length} templates, ${all.total} nodes; ${specCount} specs, ${pageTypes.length} page-runnable types → ${rel(jsonOut)}, ${rel(mdOut)}`);
if (engine) console.log(`own census: on the engine (${engine.types} types) — ${engine.counts.engine} nodes headless, ${engine.counts.visual} visual, ${engine.counts.unregistered} unregistered${engine.todoList ? `; todo-list ${engine.todoList.readmeReading6.page} of ${engine.todoList.readmeReading6.total} → ${engine.todoList.engine} of ${engine.todoList.total}` : ''}`);
else console.log('own census: no engine-types.json — the OWN-003 AC4 section was not produced (graph-target-check --types writes it)');
for (const l of compareLines()) console.log(l);
