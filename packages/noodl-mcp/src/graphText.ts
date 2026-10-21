/**
 * The graph as text — a whole project (or the components under a path prefix) on one page, for a
 * reader that reads prose and code far better than it reads JSON.
 *
 * ## Why this exists (P112 OWN-023 round 3, 2026-10-21)
 *
 * Two Opus 5.5 strangers were handed the NodeGX gala with no documentation and asked to plan a
 * feature. Both read the graph by writing throwaway Python over `nodes.json` and
 * `connections.json` — a list of nodes and a list of wires per component — before they read
 * anything, and one said afterwards: *"the graphs are JSON … I had to write throwaway one-liners
 * to list nodes and wires. Function code is inside JSON strings."* Measured on that app: 574 KB
 * and 21,794 lines of component JSON on disk; the same graph as this text is 1,852 lines. Every
 * neighbouring field reached the same shape (ComfyBench, the Max/MSP benchmark, the Node-RED
 * plugin, Google's InstructPipe): the model never reads the graph JSON, it reads a compact
 * code-like projection of it. This module is that projection, shipped instead of rewritten by
 * every stranger.
 *
 * ## What it keeps and what it drops
 *
 * Kept, every one: component path, type, description, declared ports; every node's id, type,
 * label, every parameter (a multi-line string — a Function's script — is printed as code, not
 * as an escaped JSON string), state parameters and transitions, variant, declared and dynamic
 * ports, metadata; the visual tree as indentation; every wire. Dropped, and said so in the
 * header: `$schema` fields, timestamps, canvas layout (`x`/`y`), and the long form of a uuid id
 * (printed as its first 8 hex characters; a longer prefix is used when two would collide inside a
 * component). A script node's port boilerplate (`ports`, `scriptOutputs`, `runOnChange-*`,
 * `outtype-*`) is folded into one `inputs:` / `outputs:` line each, so that the 54 KB of it on
 * the gala (a fifth of the whole) reads as two lines per node.
 *
 * The map comes first: one row per component with its type, counts, description and which
 * components it places — what a reader needs to pick which section to read. Then one section
 * per component. A path prefix limits the sections, never the map.
 *
 * Reading only; the server's writing tools and the editor stay the way a graph changes.
 */

import type { ConnectionV2, NodeV2 } from '@nodegx/project-contract/format';
import * as fs from 'fs';
import * as path from 'path';

import { isComponentRef, refToPath } from './editor-deps';
import type { ComponentFiles } from './graph';
import type { ProjectStore } from './project/ProjectStore';

export interface GraphTextOptions {
  /** Only components whose path starts with this (a folder, "Pages/", or one component, "Pages/Home"). */
  prefix?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A string parameter printed as a code block rather than inline: it has a line break, or it is long. */
const CODE_LINE_BREAK = /\n/;
const INLINE_STRING_MAX = 160;

/** `in-save` → `save`; `out-buttons` → `buttons`. The port names a Function's declared ports use (P18 EXP-019). */
const stripPortPrefix = (name: string): string => name.replace(/^(in|out)-/, '');

function shortIds(nodes: readonly NodeV2[]): Map<string, string> {
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const n of nodes) if (!UUID.test(n.id)) taken.add(n.id);
  for (const n of nodes) {
    if (!UUID.test(n.id)) {
      out.set(n.id, n.id);
      continue;
    }
    const hex = n.id.replace(/-/g, '');
    let len = 8;
    while (taken.has(hex.slice(0, len)) && len < hex.length) len += 4;
    const short = hex.slice(0, len);
    taken.add(short);
    out.set(n.id, short);
  }
  return out;
}

/**
 * The components a component places: a node whose type is a component, and a `template` parameter naming one (a
 * For Each / Repeater draws its template per item — 51 of the gala's 53 component-valued parameters, and the one a
 * reader of the map needs; `target` is a navigation, not a placement).
 */
function placedComponents(nodes: readonly NodeV2[]): string[] {
  const out = new Set<string>();
  for (const n of nodes) {
    if (isComponentRef(n.type)) out.add('/' + refToPath(n.type).replace(/^\//, ''));
    const template = n.parameters?.template;
    if (typeof template === 'string' && isComponentRef(template)) out.add('/' + refToPath(template).replace(/^\//, ''));
  }
  return [...out].sort();
}

function inlineValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  return JSON.stringify(v);
}

function isCodeString(v: unknown): v is string {
  return typeof v === 'string' && (CODE_LINE_BREAK.test(v) || v.length > INLINE_STRING_MAX);
}

interface PortLine {
  name: string;
  type?: string;
  label?: string;
}

/**
 * A script node's port boilerplate, folded. Returns the lines to print and the parameter keys it
 * consumed, so that the generic parameter printer leaves them out and nothing is printed twice.
 */
function foldPorts(node: NodeV2): { lines: string[]; consumed: Set<string> } {
  const consumed = new Set<string>();
  const params = node.parameters ?? {};
  const inputs: PortLine[] = [];
  const outputs: PortLine[] = [];
  const declared = [...(node.ports ?? []), ...(node.dynamicports ?? [])] as Array<Record<string, unknown>>;
  for (const p of declared) {
    const name = String(p.name ?? '');
    const row: PortLine = { name: stripPortPrefix(name) };
    if (typeof p.type === 'string' && p.type !== '*') row.type = p.type;
    else if (p.type && typeof p.type === 'object' && typeof (p.type as { name?: unknown }).name === 'string') {
      row.type = (p.type as { name: string }).name;
    }
    if (typeof p.displayName === 'string' && p.displayName !== row.name) row.label = p.displayName;
    (p.plug === 'output' ? outputs : inputs).push(row);
  }
  const outTypes = new Map<string, string>();
  for (const [k, v] of Object.entries(params)) {
    if (k.startsWith('outtype-') && typeof v === 'string') {
      outTypes.set(k.slice('outtype-'.length), v);
      consumed.add(k);
    }
  }
  if (Array.isArray(params.scriptOutputs)) {
    consumed.add('scriptOutputs');
    for (const o of params.scriptOutputs as Array<Record<string, unknown>>) {
      const id = String(o.id ?? '');
      if (!outputs.some((r) => r.name === id)) {
        const row: PortLine = { name: id };
        if (typeof o.label === 'string' && o.label !== id) row.label = o.label;
        outputs.push(row);
      }
    }
  }
  for (const row of outputs) {
    const t = outTypes.get(row.name);
    if (t && !row.type) row.type = t;
  }
  const runOff: string[] = [];
  const runOn: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (k.startsWith('runOnChange-') && typeof v === 'boolean') {
      (v ? runOn : runOff).push(stripPortPrefix(k.slice('runOnChange-'.length)));
      consumed.add(k);
    }
  }
  const fmt = (r: PortLine) => `${r.name}${r.type ? `: ${r.type}` : ''}${r.label ? ` "${r.label}"` : ''}`;
  const lines: string[] = [];
  if (inputs.length) lines.push(`inputs: ${inputs.map(fmt).join(', ')}`);
  if (outputs.length) lines.push(`outputs: ${outputs.map(fmt).join(', ')}`);
  if (runOff.length) lines.push(`run on value change OFF: ${runOff.join(', ')}`);
  if (runOn.length) lines.push(`run on value change ON: ${runOn.join(', ')}`);
  return { lines, consumed };
}

function nodeLines(node: NodeV2, ids: Map<string, string>, indent: string): string[] {
  const out: string[] = [];
  const type = isComponentRef(node.type) ? refToPath(node.type) : node.type;
  const { lines: portLines, consumed } = foldPorts(node);
  const params = node.parameters ?? {};
  const inline: string[] = [];
  const blocks: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(params)) {
    if (consumed.has(k)) continue;
    if (isCodeString(v)) blocks.push([k, v]);
    else inline.push(`${k}: ${inlineValue(v)}`);
  }
  const head =
    `${indent}${ids.get(node.id) ?? node.id}: ${type}` +
    (node.label ? ` "${node.label}"` : '') +
    (node.variant ? ` variant=${node.variant}` : '') +
    (inline.length ? ` {${inline.join(', ')}}` : '');
  out.push(head);
  const sub = indent + '    ';
  for (const l of portLines) out.push(`${sub}${l}`);
  for (const [k, v] of blocks) {
    out.push(`${sub}${k}:`);
    for (const line of v.replace(/\n$/, '').split('\n')) out.push(`${sub}  | ${line}`);
  }
  if (node.stateParameters && Object.keys(node.stateParameters).length) {
    out.push(`${sub}state parameters: ${JSON.stringify(node.stateParameters)}`);
  }
  if (node.stateTransitions && Object.keys(node.stateTransitions).length) {
    out.push(`${sub}state transitions: ${JSON.stringify(node.stateTransitions)}`);
  }
  if (node.defaultStateTransitions && Object.keys(node.defaultStateTransitions).length) {
    out.push(`${sub}default state transitions: ${JSON.stringify(node.defaultStateTransitions)}`);
  }
  const meta = node.metadata ?? {};
  if (typeof meta.comment === 'string' && meta.comment.trim()) {
    out.push(`${sub}comment: ${meta.comment.replace(/\s*\n\s*/g, ' ')}`);
  }
  const otherMeta = Object.fromEntries(Object.entries(meta).filter(([k]) => k !== 'comment'));
  if (Object.keys(otherMeta).length) out.push(`${sub}metadata: ${JSON.stringify(otherMeta)}`);
  const known = new Set([
    'id', 'type', 'label', 'x', 'y', 'variant', 'version', 'parameters', 'stateParameters', 'stateTransitions',
    'defaultStateTransitions', 'ports', 'dynamicports', 'children', 'parent', 'metadata', 'annotation', 'conflicts'
  ]);
  const rest = Object.fromEntries(Object.entries(node).filter(([k]) => !known.has(k)));
  if (node.annotation) rest.annotation = node.annotation;
  if (node.conflicts?.length) rest.conflicts = node.conflicts;
  if (Object.keys(rest).length) out.push(`${sub}other: ${JSON.stringify(rest)}`);
  return out;
}

/** One component as text, the section a reader opens after the map. */
export function componentGraphText(key: string, files: ComponentFiles): string {
  const { component, nodes: nodesFile, connections } = files;
  const nodes = nodesFile.nodes;
  const ids = shortIds(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  out.push(
    `## /${key} (${component.type}) — ${nodes.length} node${nodes.length === 1 ? '' : 's'}, ` +
      `${connections.connections.length} wire${connections.connections.length === 1 ? '' : 's'}`
  );
  if (component.displayName && component.displayName !== component.name) out.push(`  display name: ${component.displayName}`);
  if (component.description) out.push(`  ${component.description.replace(/\s*\n\s*/g, ' ')}`);
  if (component.category) out.push(`  category: ${component.category}`);
  if (component.tags?.length) out.push(`  tags: ${component.tags.join(', ')}`);
  const places = placedComponents(nodes);
  if (places.length) out.push(`  places: ${places.join(', ')}`);
  const ports = component.ports as { inputs?: unknown[]; outputs?: unknown[] } | undefined;
  if (ports?.inputs?.length) out.push(`  component inputs: ${JSON.stringify(ports.inputs)}`);
  if (ports?.outputs?.length) out.push(`  component outputs: ${JSON.stringify(ports.outputs)}`);

  // The visual tree: the roots the file names, then any parentless node with children (a file
  // written before `visualRoots` was derived), indented by depth. Everything else is logic.
  const placed = new Set<string>();
  const tree: string[] = [];
  const walk = (n: NodeV2, depth: number) => {
    placed.add(n.id);
    tree.push(...nodeLines(n, ids, '  ' + '  '.repeat(depth)));
    for (const cid of n.children ?? []) {
      const c = byId.get(cid);
      if (c && !placed.has(c.id)) walk(c, depth + 1);
    }
  };
  const roots = (nodesFile.visualRoots ?? []).map((id) => byId.get(id)).filter((n): n is NodeV2 => n !== undefined);
  for (const r of roots) if (!placed.has(r.id)) walk(r, 1);
  for (const n of nodes) if (!placed.has(n.id) && n.parent === undefined && (n.children?.length ?? 0) > 0) walk(n, 1);
  if (tree.length) {
    out.push('  visual (indent = child of the line above):');
    out.push(...tree);
  }
  const logic = nodes.filter((n) => !placed.has(n.id));
  if (logic.length) {
    out.push('  logic:');
    for (const n of logic) out.push(...nodeLines(n, ids, '    '));
  }
  if (connections.connections.length) {
    out.push('  wires (from.port -> to.port):');
    for (const c of connections.connections as ConnectionV2[]) {
      out.push(`    ${ids.get(c.fromId) ?? c.fromId}.${c.fromProperty} -> ${ids.get(c.toId) ?? c.toId}.${c.toProperty}`);
    }
  }
  if (nodesFile.comments?.length) out.push(`  canvas comments: ${JSON.stringify(nodesFile.comments)}`);
  return out.join('\n');
}

function listScripts(projectDir: string): string[] {
  const dir = path.join(projectDir, 'scripts');
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(`${path.relative(projectDir, p)} (${fs.statSync(p).size} bytes)`);
    }
  };
  walk(dir);
  return out;
}

/** The whole project as text: the header, the map, then a section per component (under `prefix` when given). */
export function projectGraphText(store: ProjectStore, options: GraphTextOptions = {}): string {
  const project = store.readProjectFile();
  const rows = store.listComponents().sort((a, b) => a.path.localeCompare(b.path));
  const prefix = options.prefix ? options.prefix.replace(/^\//, '') : undefined;
  const chosen = prefix ? rows.filter((r) => r.path === prefix || r.path.startsWith(prefix.replace(/\/?$/, '/'))) : rows;
  const out: string[] = [];
  out.push(`# ${project?.name ?? path.basename(store.projectDir)} — a NodeGX app read as text`);
  const facts: string[] = [];
  if (project) {
    facts.push(`project format ${project.version}`);
    if (project.nodegxVersion) facts.push(`nodegx ${project.nodegxVersion}`);
    if (project.runtimeVersion) facts.push(`runtime ${project.runtimeVersion}`);
  }
  const root = rows.find((r) => r.type === 'root');
  if (root) facts.push(`root component /${root.path}`);
  out.push(facts.join('; '));
  const settings = project?.settings as Record<string, unknown> | undefined;
  if (settings && Object.keys(settings).length) out.push(`settings: ${JSON.stringify(settings)}`);
  const routes = store.readRoutes();
  if (routes?.routes?.length) out.push(`routes: ${JSON.stringify(routes.routes)}${routes.notFound ? ` (not found: ${routes.notFound})` : ''}`);
  const scripts = listScripts(store.projectDir);
  if (scripts.length) {
    out.push(`scripts (plain JavaScript a Function reaches through \`Scripts.<name>\`; read them as they are): ${scripts.join(', ')}`);
  }
  out.push('');
  out.push(
    'Every component, node, parameter and wire is here. Left out: canvas layout (x/y), `$schema` fields and ' +
      'timestamps. A uuid node id is printed as its first 8 hex characters (grep the components folder for it). ' +
      'A Function\'s declared ports and run-on-change ticks are folded into its `inputs:` / `outputs:` lines; ' +
      'its script is printed as code under `functionScript:`. A node of a component type is an instance of ' +
      'that component (its path is the type).'
  );
  out.push('');
  const totalNodes = rows.reduce((n, r) => n + r.nodeCount, 0);
  const totalWires = rows.reduce((n, r) => n + r.connectionCount, 0);
  out.push(`## Map — ${rows.length} components, ${totalNodes} nodes, ${totalWires} wires`);
  const placesOf = new Map<string, string[]>();
  for (const r of rows) {
    placesOf.set(r.path, placedComponents(store.readComponent(r.path).files.nodes.nodes));
  }
  for (const r of rows) {
    const places = placesOf.get(r.path) ?? [];
    out.push(
      `- /${r.path} (${r.type}) ${r.nodeCount} nodes, ${r.connectionCount} wires` +
        (places.length ? ` — places ${places.join(', ')}` : '') +
        (r.description ? ` — ${r.description.replace(/\s*\n\s*/g, ' ')}` : '')
    );
  }
  if (prefix) {
    out.push('');
    out.push(`(Sections below: the ${chosen.length} component${chosen.length === 1 ? '' : 's'} under /${prefix}; the map above is the whole app.)`);
  }
  for (const r of chosen) {
    out.push('');
    out.push(componentGraphText(r.path, store.readComponent(r.path).files));
  }
  out.push('');
  return out.join('\n');
}

/**
 * `--graph` / `--graph=<prefix>` on the `noodl-mcp` command line: print the project as text and exit, nothing
 * served, nothing written. Returns `undefined` when the flag is absent.
 */
export function parseGraphFlag(argv: readonly string[]): GraphTextOptions | undefined {
  const flag = argv.find((a) => a === '--graph' || a.startsWith('--graph='));
  if (!flag) return undefined;
  const prefix = flag === '--graph' ? undefined : flag.slice('--graph='.length);
  return prefix ? { prefix } : {};
}

/**
 * The command line's `--graph` branch, whole: `undefined` when the flag is absent (the server goes on to start),
 * otherwise the exit code after the page went to `out` or the refusal to `err`. Kept apart from `cli.ts` so a
 * spec can drive it with the real argument parsing and real streams, without a built bundle.
 */
export function runGraphCli(
  argv: readonly string[],
  positional: readonly string[],
  out: (text: string) => void,
  err: (text: string) => void
): number | undefined {
  const graph = parseGraphFlag(argv);
  if (!graph) return undefined;
  if (positional.length !== 1) {
    err('noodl-mcp: --graph takes exactly one project directory\n');
    return 2;
  }
  try {
    // Required here rather than imported at the top: `ProjectStore` pulls the format engine in, and this module is
    // also read by the tool layer that already has it; a cycle through `cli.ts` is what the lazy require avoids.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProjectStore: Store } = require('./project/ProjectStore') as { ProjectStore: new (dir: string) => ProjectStore };
    out(projectGraphText(new Store(positional[0]), graph));
    return 0;
  } catch (e) {
    err(`noodl-mcp: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
}
