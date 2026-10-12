#!/usr/bin/env node
/**
 * NSP-016 — the port table of a VISUAL node, generated from the catalog so a spec never copies a
 * sibling's ports (s37 assembled the Checkbox from the Button's tail and copied its Children Count;
 * the parity gate caught it — handoff s38).
 *
 *   node scripts/node-spec/gen-ports.js net.noodl.controls.textinput
 *
 * Prints, for the node: (1) every LOOK AND LAYOUT input as a `defineNode` input line with its
 * portability class (visual-params.json: a param override wins over its group's class), ready to
 * paste under the `// ---- look and layout (R10) ----` comment; (2) the LOGIC inputs (class
 * `logic`) as lines with `portability: 'logic'` — these carry the node's behaviour and are written
 * BY HAND with their reducers, the lines here are the catalog's words to start from; (3) the
 * outputs, as lines, the outcome ports left out (the spec's `outcomes` derives them).
 *
 * Catalog parity (tests/catalog-parity.test.ts) compares name, signal-ness, displayName, group,
 * description and default VERBATIM — the lines carry each as the catalog has it. Reads
 * `packages/noodl-types/src/node-catalog.json` and the phase's `visual-params.json`; writes nothing.
 */
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..', '..');
const typeName = process.argv[2];
if (!typeName) {
  console.error('usage: node scripts/node-spec/gen-ports.js <catalog typeName>');
  process.exit(2);
}
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'packages/noodl-types/src/node-catalog.json'), 'utf8'));
const classes = JSON.parse(fs.readFileSync(path.join(root, 'dev-docs/tasks/phase-107-the-node-says-what-it-does/visual-params.json'), 'utf8'));
const node = catalog.nodes.find((n) => n.typeName === typeName);
if (!node) {
  console.error(`no catalog node ${typeName}`);
  process.exit(1);
}

/** s37's convention: the panel-only ports a wire never carries (Button, Checkbox). */
const EDIT_ONLY = new Set(['dataAttributes', 'sizeMode', 'styleCss']);
const OUTCOME_PORTS = new Set(['done', 'unchanged', 'failure', 'completed']);

/** NSP-016 AC4 step 2 — the layout model's role per port name (the table in layout-map.ts; tests/layout-map.test.ts holds the specs to it). */
const layoutMapSource = fs.readFileSync(path.join(root, 'packages/nodegx-node-spec/src/layout-map.ts'), 'utf8');
const LAYOUT_ROLES = Object.fromEntries(
  [...layoutMapSource.split('export const LAYOUT_ROLES')[1].split('};')[0].matchAll(/^  (\w+): '([a-z-]+)',?$/gm)].map((m) => [m[1], m[2]])
);

const q = (s) => JSON.stringify(s);
const classOf = (p) => classes.params[p.name] ?? classes.groups[p.group] ?? 'logic';
const typeOf = (p) => (typeof p.type === 'string' ? p.type : p.type.name);

function inputLine(p, portability) {
  const t = typeOf(p);
  const parts = [`type: ${q(t)}`];
  if (t === 'enum' && p.type.enums) parts.push(`enums: [${p.type.enums.map((e) => q(e.value)).join(', ')}]`);
  if (p.default !== undefined) parts.push(`default: ${q(p.default)}`);
  if (t !== 'signal') parts.push(`coerce: 'none'`);
  if (EDIT_ONLY.has(p.name)) parts.push('editOnly: true');
  parts.push(`displayName: ${q(p.displayName)}`, `group: ${q(p.group)}`, `description: ${q(p.description)}`, `portability: ${q(portability)}`);
  if (LAYOUT_ROLES[p.name] && portability !== 'layout-not-shared' && portability !== 'web-only') parts.push(`layout: '${LAYOUT_ROLES[p.name]}'`);
  return `  ${/^[A-Za-z_$][\w$]*$/.test(p.name) ? p.name : q(p.name)}: { ${parts.join(', ')} },`;
}

function outputLine(p) {
  const t = typeOf(p);
  const parts = [`type: ${q(t)}`];
  if (t !== 'signal') parts.push('from: () => undefined /* TODO */');
  parts.push(`displayName: ${q(p.displayName)}`, `group: ${q(p.group)}`, `description: ${q(p.description)}`);
  return `  ${p.name}: { ${parts.join(', ')} },`;
}

const inputs = [...node.inputs].sort((a, b) => a.name.localeCompare(b.name));
const logic = inputs.filter((p) => classOf(p) === 'logic');
const look = inputs.filter((p) => classOf(p) !== 'logic');

console.log(`// ${typeName}: ${node.inputs.length} inputs (${logic.length} logic, ${look.length} look and layout), ${node.outputs.length} outputs\n`);
console.log('// ---- logic (hand-written: each carries a reducer or a reason it has none) ----');
for (const p of logic) console.log(inputLine(p, 'logic'));
console.log('\n// ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----');
for (const p of look) console.log(inputLine(p, classOf(p)));
console.log('\n// ---- outputs (outcome ports left out: `outcomes` derives them) ----');
for (const p of [...node.outputs].sort((a, b) => a.name.localeCompare(b.name))) {
  if (OUTCOME_PORTS.has(p.name)) continue;
  console.log(outputLine(p));
}
const outcomes = node.outputs.filter((p) => OUTCOME_PORTS.has(p.name) && p.name !== 'completed').map((p) => p.name);
console.log(`\n// outcomes: [${outcomes.map(q).join(', ')}]`);
