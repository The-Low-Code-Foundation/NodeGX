/**
 * EXP-008's open question, measured — does each parameter of a translated node reach the export?
 *
 * The picker number (`export-ledger:picker`) counts NODES: 130 of 130 placeable nodes translate.
 * A node can translate while one of its parameters vanishes — §67–§70 were four sessions of a
 * typed-in value ignored behind a `translated` row, and §75.5 #3 refused to quote 100% until this
 * existed. A parameter that changes nothing in the emitted code AND says nothing in the notes is
 * the one failure a reader of the export cannot see, so that is what this measures:
 *
 *   for each translated picker type, for each non-signal input port:
 *     set the port to a value other than the one it holds, re-run `emitApp`, and compare the
 *     emitted files and notes with the run before. Different → the parameter REACHES. The same →
 *     retry with each boolean / enum sibling flipped as the context (a shadow colour waits for
 *     Shadow Enabled); different there → it REACHES UNDER that sibling. Still the same → SILENT.
 *
 * 🔴 **SILENT is a measurement, not a verdict.** It says the export did not move; whether that is
 * a defect depends on the runtime. `treatUnchangedAs` is silent because the only graph where it
 * matters (Done or Unchanged wired) is one the export refuses by name; `runOnChange-<input>` is
 * silent because the box only governs an input that is wired. `parameter-ledger.json` carries the
 * adjudication per port; this file only measures.
 *
 * The contexts, cheapest first, and each port stops at its first REACH:
 *   1. **Synthetic, minimal** — one node on the `cheer` fixture's Home page: a visual node as a
 *      child of the page root (inside a Radio Button Group when it is a Radio Button); a logic node
 *      with its first value output into a Text and its first signal input driven by a Button.
 *   2. **Synthetic, fully wired** — every value output into its own Text, every signal input from
 *      its own Button, every signal output into a Counter shown in a Text.
 *   3. **The corpus** — every placed instance in every fixture of `tests/fixtures`, for the ports
 *      neither synthetic context moved, on the instance's own graph (ports wired on it skipped).
 *
 * A port whose type the probe cannot vary (component, array, object, image, font…) is UNPROBED.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Catalog, CatalogNode, CatalogPort } from '../../src/catalog';
import type { EmittedApp } from '../../src/emit/emitApp';
import type { ComponentIR, ConnectionIR, ExportIR, NodeIR, ParamIR, ParamValue } from '../../src/ir/types';

export type Emit = (ir: ExportIR, catalog: Catalog) => EmittedApp;
export type Parse = (dir: string, catalog: Catalog) => ExportIR;

export type Verdict = 'reaches' | 'reaches-under' | 'silent' | 'unprobed' | 'threw';

export interface PortReading {
  verdict: Verdict;
  /** `reaches-under`: the sibling that opened it (`boxShadowEnabled=true`); `unprobed`: the port type; `threw`: the message. */
  how?: string;
  /** Which context decided it: `minimal`, `wired`, or `corpus:<fixture>`. */
  where?: string;
}

/** Keyed `${typeName}.${port}`. */
export type Reading = Map<string, PortReading>;

export const FIXTURES = path.join(__dirname, '..', 'fixtures');
const CONTEXT_FIXTURE = 'cheer';
const CONTEXT_PAGE = 'Pages/Home';

/**
 * Types the synthetic arm does not place. A Router's parameters are read by `parseProject` into
 * `ir.project.routers`, so one added to a parsed IR is not a Router the plan knows; the fixtures' own
 * Routers are graded by the corpus arm on the graphs they were parsed from.
 */
const NOT_PLACED = new Set(['Router']);

/** A node that draws nothing without a child gets one (a Drag with no child is never rendered). */
const CHILD_OF: Record<string, string> = { Drag: 'Group' };

/** A node that only renders inside a parent of its own family is placed inside one. */
const PARENT_OF: Record<string, string> = {
  'Radio Button': 'Radio Button Group',
  'net.noodl.controls.radiobutton': 'Radio Button Group'
};

const portType = (p: CatalogPort): string => (typeof p.type === 'string' ? p.type : p.type?.name ?? '?');
const isSignal = (p: CatalogPort): boolean => p.isSignal === true || portType(p) === 'signal';

/** The picker population `picker-coverage.js` counts, narrowed to the types the ledger says translate. */
export function translatedPickerTypes(catalog: Catalog, ledger: { entries: Array<{ typeName: string; status: string }> }): CatalogNode[] {
  const status = new Map(ledger.entries.map((e) => [e.typeName, e.status]));
  return (catalog.nodes as Array<CatalogNode & { inNodePicker?: boolean; isDeprecated?: boolean; availableIn?: string[] }>)
    .filter((n) => n.inNodePicker && !n.isDeprecated && (n.availableIn || []).includes('browser'))
    .filter((n) => status.get(n.typeName) === 'translated');
}

/** Every port the probe grades: non-signal inputs. */
export function gradedPorts(node: CatalogNode): CatalogPort[] {
  return (node.inputs ?? []).filter((p) => !isSignal(p));
}

/** A value other than the one the port holds, or null when its type cannot be varied. */
export function probeValue(port: CatalogPort, current: ParamValue | undefined): ParamValue | null {
  const t = portType(port);
  const cur: ParamValue | undefined =
    current ?? (port.default !== undefined ? { kind: 'literal', value: port.default as string | number | boolean } : undefined);
  const num = cur && (cur.kind === 'literal' || cur.kind === 'dimension') && typeof cur.value === 'number' ? cur.value : 0;
  if (cur?.kind === 'dimension') return { kind: 'dimension', value: cur.value + 7, unit: cur.unit };
  if (t === 'dimension') {
    const type = port.type as { defaultUnit?: string; units?: string[] };
    return { kind: 'dimension', value: num + 7, unit: type.defaultUnit ?? type.units?.[0] ?? 'px' };
  }
  if (t === 'number') return { kind: 'literal', value: num + 7 };
  if (t === 'boolean') return { kind: 'literal', value: !(cur?.kind === 'literal' && cur.value === true) };
  if (t === 'string' || t === '*') return { kind: 'literal', value: 'zq probe' };
  if (t === 'color') return { kind: 'literal', value: '#123457' };
  if (t === 'enum') {
    const enums = (typeof port.type === 'object' && port.type.enums) || [];
    const held = cur?.kind === 'literal' ? cur.value : undefined;
    const other = enums.find((e) => e.value !== held);
    return other ? { kind: 'literal', value: other.value as string | number | boolean } : null;
  }
  return null;
}

const signature = (app: EmittedApp): string => JSON.stringify([app.files, app.notes]);

/**
 * One emit of the graph as it stands, as its signature. 🔴 **A fresh shallow copy of the IR every
 * time**: `indexPageStacks` caches per IR object (`plan.ts` `stackIndexCache`), so re-emitting the
 * SAME object after a parameter change reads the index built before it — Page Stack's `name` and
 * `useRoutes` read silent until this. The CLI parses once and emits once, never mutating, so a new
 * key per emit is the honest model of it.
 */
const fresh = (emit: Emit, ir: ExportIR, catalog: Catalog): string => signature(emit({ ...ir }, catalog));
const byName = (a: ParamIR, b: ParamIR): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const withParam = (params: ParamIR[], name: string, value: ParamValue): ParamIR[] =>
  [...params.filter((p) => p.name !== name), { name, value }].sort(byName);

const switchable = (p: CatalogPort): boolean => portType(p) === 'boolean' || portType(p) === 'enum';
const said = (name: string, v: ParamValue): string => `${name}=${JSON.stringify((v as { value: unknown }).value)}`;

/**
 * The contexts a silent port is retried under, each as [how it reads, the parameters]:
 * every boolean / enum sibling flipped on its own; then, for a port in a panel group, every
 * boolean of that group switched on at once, alone and with each enum of the group varied on top —
 * a shadow token waits for BOTH Shadow Enabled and Source = token.
 */
function contextsFor(def: CatalogNode, port: CatalogPort, wired: Set<string>, saved: ParamIR[]): Array<[string, ParamIR[]]> {
  const held = (p: CatalogPort) => saved.find((s) => s.name === p.name)?.value;
  const siblings = (def.inputs ?? []).filter((s) => s.name !== port.name && !isSignal(s) && !wired.has(s.name) && switchable(s));
  const out: Array<[string, ParamIR[]]> = [];
  for (const sibling of siblings) {
    const v = probeValue(sibling, held(sibling));
    if (v) out.push([said(sibling.name, v), withParam(saved, sibling.name, v)]);
  }
  const group = (port as { group?: string }).group;
  if (!group) return out;
  const inGroup = siblings.filter((s) => (s as { group?: string }).group === group);
  let on = saved;
  const ons: string[] = [];
  for (const s of inGroup.filter((s) => portType(s) === 'boolean')) {
    on = withParam(on, s.name, { kind: 'literal', value: true });
    ons.push(`${s.name}=true`);
  }
  if (ons.length > 0) out.push([ons.join(' + '), on]);
  for (const s of inGroup.filter((s) => portType(s) === 'enum')) {
    const v = probeValue(s, on.find((p) => p.name === s.name)?.value);
    if (v) out.push([[...ons, said(s.name, v)].join(' + '), withParam(on, s.name, v)]);
  }
  return out;
}

/**
 * One port on one node in one graph: REACHES, REACHES UNDER a sibling, or SILENT.
 * `node.parameters` is restored before returning, whatever happens.
 */
function gradePort(
  emit: Emit,
  ir: ExportIR,
  catalog: Catalog,
  def: CatalogNode,
  node: NodeIR,
  port: CatalogPort,
  wired: Set<string>,
  base: string,
  siblings: boolean
): PortReading {
  const saved = node.parameters;
  const current = saved.find((p) => p.name === port.name)?.value;
  const value = probeValue(port, current);
  if (!value) return { verdict: 'unprobed', how: portType(port) };
  try {
    node.parameters = withParam(saved, port.name, value);
    if (fresh(emit, ir, catalog) !== base) return { verdict: 'reaches' };
    if (!siblings) return { verdict: 'silent' };
    for (const [how, context] of contextsFor(def, port, wired, saved)) {
      node.parameters = context;
      let before: string;
      try {
        before = fresh(emit, ir, catalog);
      } catch {
        continue; // the context itself does not emit; it opens nothing
      }
      node.parameters = withParam(context, port.name, value);
      if (fresh(emit, ir, catalog) !== before) return { verdict: 'reaches-under', how };
    }
    return { verdict: 'silent' };
  } catch (error) {
    return { verdict: 'threw', how: String(error).slice(0, 160) };
  } finally {
    node.parameters = saved;
  }
}

const bare = (id: string, type: string, parent?: string): NodeIR => ({
  id,
  type,
  catalogRef: type,
  parameters: [],
  declaredPorts: [],
  portKnowledge: 'complete',
  ...(parent ? { parent, children: [] } : {})
});

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string, kind: 'value' | 'signal'): ConnectionIR =>
  ({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind }) as ConnectionIR;

/** The synthetic context: `cheer`'s Home with one probe node placed and wired. */
function synthetic(parse: Parse, catalog: Catalog, def: CatalogNode, mode: 'minimal' | 'wired', fixtures: string) {
  const ir = parse(path.join(fixtures, CONTEXT_FIXTURE), catalog);
  const home = ir.components.find((c) => c.path === CONTEXT_PAGE) as ComponentIR;
  const rootId = (home.visualRoots ?? [])[0] as string;
  const root = home.nodes.find((n) => n.id === rootId) as NodeIR;
  const place = (n: NodeIR): void => {
    home.nodes.push(n);
    root.children = [...(root.children ?? []), n.id];
  };
  const probe = bare('zqprobe', def.typeName);
  const wires: ConnectionIR[] = [];
  if (def.isVisual && PARENT_OF[def.typeName]) {
    const group = bare('zqgroup', PARENT_OF[def.typeName], rootId);
    group.children = [probe.id];
    place(group);
    Object.assign(probe, { parent: group.id, children: [] });
  } else if (def.isVisual) {
    Object.assign(probe, { parent: rootId, children: [] });
    root.children = [...(root.children ?? []), probe.id];
  }
  if (def.isVisual && CHILD_OF[def.typeName]) {
    home.nodes.push(bare('zqchild', CHILD_OF[def.typeName], probe.id));
    probe.children = ['zqchild'];
  }
  const valueOuts = (def.outputs ?? []).filter((p) => !isSignal(p));
  const signalOuts = (def.outputs ?? []).filter(isSignal);
  const signalIns = (def.inputs ?? []).filter(isSignal);
  if (mode === 'minimal') {
    if (!def.isVisual && valueOuts[0]) {
      place(bare('zqtext', 'Text', rootId));
      wires.push(wire(probe.id, valueOuts[0].name, 'zqtext', 'text', 'value'));
    }
    if (!def.isVisual && signalIns[0]) {
      place(bare('zqbutton', 'net.noodl.controls.button', rootId));
      wires.push(wire('zqbutton', 'onClick', probe.id, signalIns[0].name, 'signal'));
    }
  } else {
    valueOuts.forEach((o, i) => {
      place(bare(`zqtext${i}`, 'Text', rootId));
      wires.push(wire(probe.id, o.name, `zqtext${i}`, 'text', 'value'));
    });
    signalIns.forEach((o, i) => {
      place(bare(`zqbutton${i}`, 'net.noodl.controls.button', rootId));
      wires.push(wire(`zqbutton${i}`, 'onClick', probe.id, o.name, 'signal'));
    });
    signalOuts.forEach((o, i) => {
      home.nodes.push(bare(`zqcounter${i}`, 'Counter'));
      place(bare(`zqcount${i}`, 'Text', rootId));
      wires.push(wire(probe.id, o.name, `zqcounter${i}`, 'increase', 'signal'));
      wires.push(wire(`zqcounter${i}`, 'currentCount', `zqcount${i}`, 'text', 'value'));
    });
  }
  home.nodes.push(probe);
  home.connections.push(...wires);
  return { ir, probe, wired: new Set(wires.filter((w) => w.toId === probe.id).map((w) => w.toProperty)) };
}

/** Placed instances per port the corpus arm also retries under each sibling; the rest get the direct try (name order, so deterministic). */
const CORPUS_TRIES = 8;

const rank: Record<Verdict, number> = { reaches: 4, 'reaches-under': 3, silent: 2, threw: 1, unprobed: 0 };
const opened = (r: PortReading | undefined): boolean => r?.verdict === 'reaches' || r?.verdict === 'reaches-under';

export interface ProbeOptions {
  catalog: Catalog;
  ledger: { entries: Array<{ typeName: string; status: string }> };
  parse: Parse;
  emit: Emit;
  /** Limit to these types (a spec's control); all translated picker types when absent. */
  only?: string[];
  /** Skip the corpus arm (a spec's control that needs only one context). */
  syntheticOnly?: boolean;
  /** The fixture tree; `tests/fixtures` when absent. */
  fixtures?: string;
}

export function probeParameters(options: ProbeOptions): Reading {
  const { catalog, parse, emit } = options;
  const root = options.fixtures ?? FIXTURES;
  const types = translatedPickerTypes(catalog, options.ledger).filter((n) => !options.only || options.only.includes(n.typeName));
  const reading: Reading = new Map();
  const keep = (key: string, r: PortReading): void => {
    const had = reading.get(key);
    if (!had || rank[r.verdict] > rank[had.verdict]) reading.set(key, r);
  };

  for (const def of types) {
    if (NOT_PLACED.has(def.typeName)) continue;
    for (const mode of ['minimal', 'wired'] as const) {
      const ports = gradedPorts(def).filter((p) => !opened(reading.get(`${def.typeName}.${p.name}`)));
      if (ports.length === 0) break;
      const { ir, probe, wired } = synthetic(parse, catalog, def, mode, root);
      let base: string;
      try {
        base = fresh(emit, ir, catalog);
      } catch {
        continue;
      }
      for (const port of ports) {
        if (wired.has(port.name)) continue;
        keep(`${def.typeName}.${port.name}`, { ...gradePort(emit, ir, catalog, def, probe, port, wired, base, true), where: mode });
      }
    }
  }
  if (options.syntheticOnly) return reading;

  const byType = new Map(types.map((n) => [n.typeName, n]));
  const corpusTries = new Map<string, number>();
  const fixtures = fs
    .readdirSync(root)
    .filter((d) => fs.existsSync(path.join(root, d, 'nodegx.project.json')))
    .sort();
  for (const fixture of fixtures) {
    const ir = parse(path.join(root, fixture), catalog);
    let base: string;
    try {
      base = fresh(emit, ir, catalog);
    } catch {
      continue;
    }
    for (const component of ir.components) {
      for (const node of component.nodes) {
        const def = byType.get(node.type);
        if (!def) continue;
        const wired = new Set(component.connections.filter((c) => c.toId === node.id).map((c) => c.toProperty));
        for (const port of gradedPorts(def)) {
          const key = `${def.typeName}.${port.name}`;
          if (opened(reading.get(key)) || wired.has(port.name)) continue;
          // The sibling retry costs a re-emit per boolean / enum sibling; past CORPUS_TRIES instances a port gets the direct try only.
          const tries = (corpusTries.get(key) ?? 0) + 1;
          corpusTries.set(key, tries);
          keep(key, { ...gradePort(emit, ir, catalog, def, node, port, wired, base, tries <= CORPUS_TRIES), where: `corpus:${fixture}` });
        }
      }
    }
  }
  return reading;
}
