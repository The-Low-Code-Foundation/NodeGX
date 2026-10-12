#!/usr/bin/env node
/**
 * NSP-016 — the visual-parameter census: every input of the 19 T5 visual nodes (from the node catalog), its class
 * (hand-kept in visual-params.json), and how often the PRODUCT SURFACE sets it — the shelf templates, the editor's
 * embedded Site Builder template, and the examples an agent is taught from (docs/node-catalog/examples). Never an old
 * corpus. Writes visual-census.json beside the task files and prints the summary RESEARCH-LAYOUT-SEMANTICS.md quotes.
 *
 *   node scripts/node-spec/visual-census.js           write + print
 *   node scripts/node-spec/visual-census.js --check   exit 1 when a T5 input has no class (a new port must be classed)
 *
 * Caveat the numbers carry: the editor's picker stamps defaults on Text, Button, Checkbox and Text Input
 * (ElementConfigRegistry.applyDefaults) — a value set there was not necessarily chosen by the author.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TASK = path.join(ROOT, 'dev-docs/tasks/phase-107-the-node-says-what-it-does');
const census = JSON.parse(fs.readFileSync(path.join(TASK, 'census.json'), 'utf8'));
const classes = JSON.parse(fs.readFileSync(path.join(TASK, 'visual-params.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/noodl-types/src/node-catalog.json'), 'utf8'));

const T5 = census.rows.filter((r) => r.tier === 'T5').map((r) => r.typeName);
const byType = new Map(catalog.nodes.map((n) => [n.typeName, n]));

// Every non-signal input of every T5 node, by name: its groups, its nodes, its class
const ports = new Map();
const unclassed = [];
for (const type of T5) {
  const node = byType.get(type);
  if (!node) continue;
  for (const p of node.inputs) {
    if (p.isSignal) continue;
    const cls = classes.params[p.name] || classes.groups[p.group || '-'];
    if (!cls) unclassed.push(`${type}.${p.name} (group ${p.group})`);
    const e = ports.get(p.name) || { name: p.name, groups: new Set(), nodes: new Set(), cls };
    e.groups.add(p.group || '-');
    e.nodes.add(type);
    ports.set(p.name, e);
  }
}

// The product surface: each source a name and the nodes it holds (any JSON object with a `type` and `parameters`)
function walk(value, out) {
  if (Array.isArray(value)) for (const v of value) walk(v, out);
  else if (value && typeof value === 'object') {
    if (typeof value.type === 'string' && value.parameters && typeof value.parameters === 'object') out.push(value);
    for (const v of Object.values(value)) walk(v, out);
  }
}
function filesUnder(dir, name) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'noodl_modules' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...filesUnder(p, name));
    else if (name(e.name)) out.push(p);
  }
  return out;
}
const sources = [];
const templatesDir = path.join(ROOT, 'templates');
for (const t of fs.readdirSync(templatesDir, { withFileTypes: true })) {
  // a `-demo` folder is its template again with data in it: counted once, under the template
  if (!t.isDirectory() || t.name.endsWith('-demo')) continue;
  const nodes = [];
  for (const f of filesUnder(path.join(templatesDir, t.name), (n) => n === 'nodes.json')) walk(JSON.parse(fs.readFileSync(f, 'utf8')), nodes);
  sources.push({ name: `templates/${t.name}`, surface: 'template', nodes });
}
const siteBuilder = path.join(ROOT, 'packages/noodl-editor/src/editor/src/models/template/templates/site-builder.content.json');
if (fs.existsSync(siteBuilder)) {
  const nodes = [];
  walk(JSON.parse(fs.readFileSync(siteBuilder, 'utf8')), nodes);
  sources.push({ name: 'editor/site-builder', surface: 'template', nodes });
}
for (const f of filesUnder(path.join(ROOT, 'docs/node-catalog/examples'), (n) => n.endsWith('.json'))) {
  const nodes = [];
  walk(JSON.parse(fs.readFileSync(f, 'utf8')), nodes);
  sources.push({ name: `examples/${path.basename(f, '.json')}`, surface: 'example', nodes });
}

// Count: per port, how many nodes set it and in how many sources, per surface; unit and value spreads
const VALUE_SPREAD = ['flexDirection', 'justifyContent', 'alignItems', 'alignX', 'alignY', 'position', 'sizeMode', 'flexWrap', 'textAlignX', 'textAlignY'];
const UNIT_RE = /^-?[\d.]+(px|%|vw|vh|em|rem|fr)$/;
const surfaces = ['template', 'example'];
const usage = {};
const spreads = {};
const units = { template: {}, example: {} };
const tokens = { template: { var: 0, literal: 0 }, example: { var: 0, literal: 0 } };
const unknown = {};
const nodeCount = { template: 0, example: 0 };
const T5set = new Set(T5);
for (const src of sources) {
  for (const n of src.nodes) {
    if (!T5set.has(n.type)) continue;
    nodeCount[src.surface]++;
    for (const [k, v] of Object.entries(n.parameters)) {
      const port = ports.get(k);
      if (!port) {
        unknown[k] = (unknown[k] || 0) + 1;
        continue;
      }
      const u = (usage[k] = usage[k] || { template: { nodes: 0, sources: new Set() }, example: { nodes: 0, sources: new Set() } });
      u[src.surface].nodes++;
      u[src.surface].sources.add(src.name);
      if (VALUE_SPREAD.includes(k)) {
        const s = (spreads[k] = spreads[k] || {});
        const key = `${src.surface}:${typeof v === 'object' ? JSON.stringify(v) : String(v)}`;
        s[key] = (s[key] || 0) + 1;
      }
      let unit;
      if (v && typeof v === 'object' && 'unit' in v) unit = v.unit || '(none)';
      else if (typeof v === 'string' && UNIT_RE.test(v)) unit = v.match(UNIT_RE)[1];
      if (unit) units[src.surface][unit] = (units[src.surface][unit] || 0) + 1;
      if (typeof v === 'string' && /^(color|backgroundColor|borderColor|fontFamily|fontSize)/i.test(k.replace(/^(label|thumb|track)/, ''))) {
        if (v.startsWith('var(--')) tokens[src.surface].var++;
        else tokens[src.surface].literal++;
      }
    }
  }
}

// Totals by class: ports in the catalog, ports ever set, settings, per surface
const byClass = {};
for (const c of classes.classes) byClass[c] = { ports: 0, set: { template: 0, example: 0 }, settings: { template: 0, example: 0 } };
for (const p of ports.values()) {
  if (!p.cls) continue;
  const b = byClass[p.cls];
  b.ports++;
  for (const s of surfaces) {
    const u = usage[p.name]?.[s];
    if (u && u.nodes > 0) {
      b.set[s]++;
      b.settings[s] += u.nodes;
    }
  }
}

const out = {
  $comment: 'Generated by scripts/node-spec/visual-census.js — do not edit. NSP-016 §3.1.',
  t5: T5,
  sources: sources.map((s) => ({ name: s.name, surface: s.surface, t5Nodes: s.nodes.filter((n) => T5set.has(n.type)).length })),
  t5NodesOnSurface: nodeCount,
  byClass,
  ports: [...ports.values()]
    .map((p) => ({
      name: p.name,
      class: p.cls || null,
      groups: [...p.groups].sort(),
      nodes: [...p.nodes].sort(),
      template: { nodes: usage[p.name]?.template.nodes || 0, sources: usage[p.name]?.template.sources.size || 0 },
      example: { nodes: usage[p.name]?.example.nodes || 0, sources: usage[p.name]?.example.sources.size || 0 }
    }))
    .sort((a, b) => b.template.nodes - a.template.nodes || a.name.localeCompare(b.name)),
  valueSpreads: spreads,
  units,
  colourAndFontTokens: tokens,
  parametersNotInTheCatalog: unknown,
  unclassed
};

if (process.argv.includes('--check')) {
  if (unclassed.length) {
    console.error(`${unclassed.length} T5 input(s) with no class in visual-params.json:\n  ` + unclassed.join('\n  '));
    process.exit(1);
  }
  console.log(`every T5 input is classed (${ports.size} ports)`);
  process.exit(0);
}
fs.writeFileSync(path.join(TASK, 'visual-census.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`T5 nodes ${T5.length}; ports ${ports.size}; unclassed ${unclassed.length}`);
console.log(`surface: ${sources.filter((s) => s.surface === 'template').length} templates (${nodeCount.template} T5 nodes), ${sources.filter((s) => s.surface === 'example').length} examples (${nodeCount.example} T5 nodes)`);
console.log('class                ports  set(tpl) settings(tpl)  set(ex) settings(ex)');
for (const [c, b] of Object.entries(byClass)) console.log(`${c.padEnd(20)} ${String(b.ports).padStart(5)}  ${String(b.set.template).padStart(8)} ${String(b.settings.template).padStart(13)}  ${String(b.set.example).padStart(7)} ${String(b.settings.example).padStart(11)}`);
console.log('units', JSON.stringify(units));
console.log('colour/font tokens', JSON.stringify(tokens));
console.log('not in catalog', JSON.stringify(Object.entries(unknown).sort((a, b) => b[1] - a[1]).slice(0, 15)));
if (unclassed.length) console.log('UNCLASSED', unclassed.slice(0, 30));
