/**
 * The React export as a target (phase 107, NSP-005).
 *
 * Implements `TargetAdapter` from `@nodegx/node-spec` over the CODE THIS PACKAGE EMITS: a node is
 * mounted by building the smallest component the exporter translates it in, running `emitApp`,
 * transpiling the emitted `.tsx` and rendering it headlessly with `react-dom` inside jsdom. It
 * lives here, in the exporter's test tree, for the reason the runtime's target lives in the
 * runtime's (packages/noodl-runtime/test/helpers/node-spec-target.ts): this is where the
 * exporter compiles, and the spec package depends on nothing (R1 (a)).
 *
 * WHAT THE SPIKE FOUND (NSP-005 §3.1, s6 2026-09-30), and why this adapter has a REACH per node:
 *
 *   The task file's wrapper — Component Inputs → node → Component Outputs, every port wired — is
 *   DEFERRED by the exporter for all five pilot nodes, each with its own sentence: a value input
 *   wired from a Component Input "has no deterministic translation in step 5"; a Counter or
 *   Switch whose change pulse is consumed is "not translated in this slice"; a wired Start Value
 *   or State input defers the latch; a Condition "mixing Evaluate or branch wiring with value
 *   outputs has no single honest translation"; a String Format whose format is wired is not
 *   translated; an And fed from Component Inputs "has no inputs wired or authored". The exporter
 *   translates a node only in the GRAPH SHAPES its slices cover, never the node's whole surface.
 *
 *   The one shape that emits running code for a pilot node is the LATCH: literal params, a Button
 *   per signal input (`onClick` is a rendered element event), the value output into a Component
 *   Outputs value port (a `on<Port>Changed` callback prop). Counter and Switch have it; And,
 *   Condition and String Format have no shape this adapter can drive (their inputs come only
 *   through wires the exporter defers, or through literal params that make the node a constant).
 *
 *   (a) without React is closed for every pilot node: the emitted latch is a `useState` inside
 *   the component, reachable only by rendering. (b) with React, headless, is what this is.
 *
 * So each node declares its REACH (`EXPORT_REACH`, reach.ts in the spec package): the params the
 * shape carries, the ports it can be driven on, the outputs it observes. The runner generates
 * inside it, projects the reference onto it, and reports the mutants the reach cannot see as the
 * honesty number. A node with no entry cannot be mounted; `mount` throws the reason.
 *
 * How the emitted code is mapped onto the trace format (trace.ts / adapter.ts):
 *   - **params** are literals in the IR (`{ kind: 'literal' }` for string / number / boolean;
 *     anything else the IR carries as `{ kind: 'json' }`, which the latch's `literalParam` does
 *     not read — a divergence the runner shows, routed to phase 18). A param set to `undefined`
 *     is recorded as a `set` with no value and OMITTED from the IR (the file format cannot say
 *     "undefined"). Params are recorded in the params object's key order, per the contract.
 *   - **signals** click the emitted `<button>` whose label is the port, inside `act`.
 *   - **values** arrive through the `on<Port>Changed` callback the exporter emits for a Component
 *     Outputs value port (`useEffect` on the state var — it fires at mount with the boot value and
 *     on every change). The last value seen per output is kept; at `settle` the value is recorded
 *     if its canonical form differs from the last recorded — the first settle records everything
 *     defined (C8). Nothing here passes through `undefined` mid-frame, so the last-defined rule
 *     and the settle-time rule coincide.
 *   - **the node's signal outputs** (countChanged, switched …) are outside the reach: consuming
 *     them defers the latch. They are never observed; the runner's projection drops them from
 *     the reference and the mutant phase reports what that hides.
 *   - **settle** is one `act` flush; React commits synchronously under `act`, so a frame here is
 *     "the steps since the last settle".
 *
 * Emission and transpilation are cached per (type, params) — a mount that hits the cache is a
 * render (about 1–3 ms); a miss is `emitApp` + `transpileModule` (about 10–90 ms, spike §6).
 */

import * as ts from 'typescript';

import type { Handle, Reach, TargetAdapter, TraceEvent } from '../../../nodegx-node-spec/src';
import { canonicalise } from '../../../nodegx-node-spec/src';
import { isSignalInput, type AnyNodeSpec } from '../../../nodegx-node-spec/src/spec';
import { specFor } from '../../../nodegx-node-spec/src/nodes';
import { Catalog, loadCatalog } from '../../src/catalog';
import { emitApp } from '../../src/emit/emitApp';
import { ComponentIR, ExportIR, NodeIR, ParamValue, PortIR } from '../../src/ir/types';

/** The shape and reach of every node this target can mount. Absent = no shape of the export runs it headlessly. */
export const EXPORT_REACH: Readonly<Record<string, Reach>> = Object.freeze({
  Counter: { params: ['startValue'], inputs: ['increase', 'decrease', 'reset'], outputs: ['currentCount'] },
  Switch: { params: ['onFromStart'], inputs: ['on', 'off', 'flip'], outputs: ['state'] }
});

/** Why the other pilot nodes have no reach — the exporter's own sentences, from the spike's wrappers (NSP-005 §6). */
export const NO_REACH: Readonly<Record<string, string>> = Object.freeze({
  And: 'its inputs are derived ports that only a wire or a literal param can feed; a wire from Component Inputs "has no deterministic translation in step 5", and its result "lands only in a truthiness sink" — nothing drivable is emitted',
  Condition: 'a Condition "mixing Evaluate or branch wiring with value outputs has no single honest translation", and with Run On Value Change ticked its Evaluate trigger is dropped — nothing drivable is emitted',
  'String Format': 'a format wired from a Component Input is "not literal", and with a literal format the node is a constant with no drivable input — nothing drivable is emitted'
});

interface ExportHandle extends Handle {
  reach: Reach;
  root: { render(el: unknown): void; unmount(): void };
  container: any;
  /** The last value each output's callback delivered. */
  latest: Record<string, unknown>;
  /** The canonical key last RECORDED per output. */
  recorded: Record<string, string>;
  events: TraceEvent[];
}

// ---- jsdom + React, installed once for the process (jest's environment here is node) ----
let domReady = false;
let React: any;
let act: (cb: () => void | Promise<void>) => Promise<void>;
let createRoot: (container: unknown) => { render(el: unknown): void; unmount(): void };
let document: any;
let MouseEvent: any;
function ensureDom(): void {
  if (domReady) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM } = require('jsdom') as { JSDOM: new (html: string, options?: unknown) => any };
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
  g.HTMLElement = dom.window.HTMLElement;
  g.Node = dom.window.Node;
  g.Event = dom.window.Event;
  g.MouseEvent = dom.window.MouseEvent;
  g.IS_REACT_ACT_ENVIRONMENT = true;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  React = require('react');
  act = React.act;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createRoot = (require('react-dom/client') as { createRoot: typeof createRoot }).createRoot;
  document = dom.window.document;
  MouseEvent = dom.window.MouseEvent;
  domReady = true;
}

// ---- the IR: the latch shape around one node ----
let catalogCache: Catalog | undefined;
const catalog = (): Catalog => (catalogCache ??= loadCatalog());

function paramValue(value: unknown): ParamValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return { kind: 'literal', value };
  return { kind: 'json', value };
}

/** Component Inputs-free: literal params, a button per signal input, value outputs to Component Outputs. */
export function latchComponent(spec: AnyNodeSpec, params: Record<string, unknown>): ComponentIR {
  const nodes: NodeIR[] = [];
  const connections: ComponentIR['connections'] = [];
  const children: string[] = [];
  const outPorts: PortIR[] = [];
  for (const [name, d] of Object.entries(spec.inputs)) {
    if (!isSignalInput(d)) continue;
    const id = `btn-${name}`;
    nodes.push({ id, type: 'net.noodl.controls.button', catalogRef: 'net.noodl.controls.button', parameters: [{ name: 'label', value: { kind: 'literal', value: name } }], declaredPorts: [], portKnowledge: 'complete', parent: 'root' });
    children.push(id);
    connections.push({ key: `${id}:onClick->n:${name}`, fromId: id, fromProperty: 'onClick', toId: 'n', toProperty: name, kind: 'signal' });
  }
  for (const [name, d] of Object.entries(spec.outputs)) {
    if (d.type === 'signal') continue;
    outPorts.push({ name, plug: 'input', kind: 'value', type: d.type });
    connections.push({ key: `n:${name}->out:${name}`, fromId: 'n', fromProperty: name, toId: 'out', toProperty: name, kind: 'value' });
  }
  const parameters = Object.keys(params)
    .filter((k) => params[k] !== undefined)
    .sort()
    .map((name) => ({ name, value: paramValue(params[name]) }));
  nodes.unshift({ id: 'root', type: 'Group', catalogRef: 'Group', parameters: [], declaredPorts: [], portKnowledge: 'complete', children });
  nodes.push({ id: 'n', type: spec.type, catalogRef: spec.type, parameters, declaredPorts: [], portKnowledge: 'complete' });
  nodes.push({ id: 'out', type: 'Component Outputs', catalogRef: 'Component Outputs', parameters: [], declaredPorts: outPorts, portKnowledge: 'complete' });
  return { id: `probe-${spec.type}`, path: 'Components/Probe', role: 'component', nodes, connections, visualRoots: ['root'], intent: { nodeComments: [], wireLabels: [], regions: [] } };
}

/** A project holding one component and nothing else; what `emitApp` needs and no more. */
export function probeProject(component: ComponentIR): ExportIR {
  return {
    project: { name: 'node-spec', catalogFormatVersion: catalog().catalogFormatVersion, exporterVersion: '0', settledRunOnValueChange: [], designTokens: [], collections: [], routers: [], cloudComponents: [], modules: [] },
    components: [component]
  };
}

export interface Emitted {
  tsx: string;
  notes: string[];
  component: (props: Record<string, unknown>) => unknown;
  emitMs: number;
}

const emitted = new Map<string, Emitted>();

/** The emitted probe for a node and its params — from the cache when the same pair was emitted before. */
export function emitProbe(spec: AnyNodeSpec, params: Record<string, unknown>): Emitted {
  const key = `${spec.type}\u0000${JSON.stringify(canonicalise(params) ?? null)}`;
  const hit = emitted.get(key);
  if (hit) return hit;
  const t0 = performance.now();
  const app = emitApp(probeProject(latchComponent(spec, params)), catalog());
  const tsx = app.files['src/components/Probe.tsx'];
  if (tsx === undefined) throw new Error(`the exporter emitted no src/components/Probe.tsx for ${spec.type}: ${app.notes.join(' | ')}`);
  const js = ts.transpileModule(tsx, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported: Record<string, unknown> = {};
  const mod = { exports: exported };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const req = (id: string) => (id.endsWith('.css') ? new Proxy({}, { get: (_t, k) => String(k) }) : require(id));
  // eslint-disable-next-line no-new-func
  new Function('exports', 'module', 'require', js)(exported, mod, req);
  const component = (mod.exports as { Probe?: Emitted['component'] }).Probe;
  if (typeof component !== 'function') throw new Error(`the emitted Probe.tsx for ${spec.type} exports no Probe component`);
  const result: Emitted = { tsx, notes: app.notes.filter((n) => n.includes('Components/Probe') && !n.includes('no route reaches')), component, emitMs: performance.now() - t0 };
  emitted.set(key, result);
  return result;
}

const callbackProp = (port: string) => `on${port.charAt(0).toUpperCase()}${port.slice(1)}Changed`;

/** A fresh export target. */
export function exportTarget(): TargetAdapter<ExportHandle> {
  ensureDom();
  const live = new Map<string, ExportHandle>();
  let next = 0;
  const handleOf = (h: ExportHandle): ExportHandle => {
    const found = live.get(h.id);
    if (!found) throw new Error(`no live instance ${h.id}`);
    return found;
  };
  return {
    name: 'export',
    mount(type, params) {
      const reach = EXPORT_REACH[type];
      if (!reach) throw new Error(`no shape of the export runs ${type} headlessly: ${NO_REACH[type] ?? 'no entry in EXPORT_REACH'}`);
      const spec = specFor(type);
      if (!spec) throw new Error(`no spec for ${type}`);
      for (const k of Object.keys(params)) {
        if (!reach.params.includes(k)) throw new Error(`${type} on the export takes no param "${k}" (reach: ${reach.params.join(', ')})`);
      }
      const { component } = emitProbe(spec, params);
      const h: ExportHandle = { id: `${type}#${next++}`, type, reach, root: undefined as never, container: undefined, latest: {}, recorded: {}, events: [] };
      for (const k of Object.keys(params)) {
        const v = params[k];
        h.events.push(v === undefined ? { t: 'set', port: k } : { t: 'set', port: k, value: canonicalise(v) });
      }
      const props: Record<string, unknown> = {};
      for (const port of reach.outputs) {
        props[callbackProp(port)] = (v: unknown) => {
          h.latest[port] = v;
        };
      }
      h.container = document.createElement('div');
      document.body.appendChild(h.container);
      h.root = createRoot(h.container);
      // act's sync form: the render, its effects and the first callback all land before it returns
      void act(() => {
        h.root.render(React.createElement(component, props));
      });
      live.set(h.id, h);
      return h;
    },
    set(h, port) {
      const inst = handleOf(h);
      throw new Error(`${inst.type} on the export has no drivable value input "${port}" (reach: ${inst.reach.inputs.join(', ')}) — a value input reaches an exported latch only as a literal param`);
    },
    signal(h, port) {
      const inst = handleOf(h);
      if (!inst.reach.inputs.includes(port)) throw new Error(`${inst.type} on the export has no drivable port "${port}" (reach: ${inst.reach.inputs.join(', ')})`);
      const button = Array.from(inst.container.querySelectorAll('button') as Iterable<any>).find((b) => b.textContent === port);
      if (!button) throw new Error(`the emitted ${inst.type} has no <button>${port}</button>`);
      inst.events.push({ t: 'in', port });
      void act(() => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    },
    async settle() {
      await act(async () => {
        /* flush */
      });
      for (const inst of live.values()) {
        inst.events.push({ t: 'settle' });
        for (const port of [...inst.reach.outputs].sort()) {
          if (!(port in inst.latest) || inst.latest[port] === undefined) continue;
          const value = canonicalise(inst.latest[port]);
          const key = JSON.stringify(value);
          if (inst.recorded[port] === key) continue;
          inst.recorded[port] = key;
          inst.events.push({ t: 'value', port, value });
        }
      }
    },
    trace(h) {
      return handleOf(h).events.map((e) => ({ ...e }));
    },
    dispose(h) {
      const inst = live.get(h.id);
      if (!inst) return;
      void act(() => {
        inst.root.unmount();
      });
      inst.container.remove();
      live.delete(h.id);
    }
  };
}

// ---------------------------------------------------------------------------------------------
// NSP-008 — a GRAPH on the export: the scenario's nodes and wires emitted as ONE component.
//
// The shape: every node with its literal params; a <button> per signal input of every node,
// labelled `<id>.<port>`, wired into it (element events are the one trigger the exporter always
// takes); the wires as connections; every value output of every node lifted into a Component
// Outputs port `<id>_<port>` (a callback prop). The spike (NSP-008 §6.3) found the exporter emits
// three of the fourteen graphs whole and refuses the rest with a sentence each — a consumed
// change pulse, a value wire between two logic nodes "with no deterministic translation", an
// Inverter that "drives nothing statically translatable" — so `canPlay` returns the exporter's
// own notes and the runner counts the scenario `outside`. A `set` step and a `wire` step are
// outside by construction (no value input is drivable; a component is emitted whole).
//
// The reach: value outputs the exporter LIFTED (the callback props the emitted interface
// declares); no signal, no outcome. The runner projects the runtime's recording onto it.
// ---------------------------------------------------------------------------------------------

import type { GraphNodeDecl, GraphReach, GraphScenario, GraphTarget, Wire } from '../../../nodegx-node-spec/src';
import { parseEndpoint } from '../../../nodegx-node-spec/src';

export interface ExportGraphHandle extends Handle {
  graph: ExportGraph;
}

interface ExportGraph {
  key: string;
  ids: string[];
  root: { render(el: unknown): void; unmount(): void };
  container: any;
  /** `<id>.<port>` → the last value its callback delivered. */
  latest: Record<string, unknown>;
  /** `<id>.<port>` → the canonical key last RECORDED. */
  recorded: Record<string, string>;
  events: Record<string, TraceEvent[]>;
  lifted: Set<string>;
  live: Set<string>;
}

interface EmittedGraph {
  tsx: string;
  notes: string[];
  component: (props: Record<string, unknown>) => unknown;
  /** `<id>.<port>` → callback prop, for every value output the exporter lifted. */
  lifted: Map<string, string>;
  /** The notes that say part of the graph did not survive. */
  refused: string[];
}

/** The exporter's prop for a Component Outputs port `<id>_<port>`: `on` + each `_`-word capitalised + `Changed` (observed on the spike). */
const liftedProp = (id: string, port: string) => 'on' + `${id}_${port}`.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Changed';

export function graphComponent(nodes: Readonly<Record<string, GraphNodeDecl>>, wires: readonly Wire[]): ComponentIR {
  const irNodes: NodeIR[] = [];
  const connections: ComponentIR['connections'] = [];
  const children: string[] = [];
  const outPorts: PortIR[] = [];
  for (const [id, n] of Object.entries(nodes)) {
    const spec = specFor(n.type);
    if (!spec) throw new Error(`no spec for ${n.type}`);
    const params = Object.keys(n.params ?? {})
      .filter((k) => n.params![k] !== undefined)
      .map((name) => ({ name, value: paramValue(n.params![name]) }));
    irNodes.push({ id, type: n.type, catalogRef: n.type, parameters: params, declaredPorts: [], portKnowledge: 'complete' });
    for (const [port, d] of Object.entries(spec.inputs)) {
      if (!isSignalInput(d)) continue;
      const bid = `btn-${id}-${port}`;
      irNodes.push({ id: bid, type: 'net.noodl.controls.button', catalogRef: 'net.noodl.controls.button', parameters: [{ name: 'label', value: { kind: 'literal', value: `${id}.${port}` } }], declaredPorts: [], portKnowledge: 'complete', parent: 'root' });
      children.push(bid);
      connections.push({ key: `${bid}:onClick->${id}:${port}`, fromId: bid, fromProperty: 'onClick', toId: id, toProperty: port, kind: 'signal' });
    }
    for (const [port, d] of Object.entries(spec.outputs)) {
      if (d.type === 'signal') continue;
      const name = `${id}_${port}`;
      outPorts.push({ name, plug: 'input', kind: 'value', type: d.type });
      connections.push({ key: `${id}:${port}->out:${name}`, fromId: id, fromProperty: port, toId: 'out', toProperty: name, kind: 'value' });
    }
  }
  for (const w of wires) {
    const from = parseEndpoint(w.from);
    const to = parseEndpoint(w.to);
    const spec = specFor(nodes[from.node].type)!;
    const kind = spec.outputs[from.port]?.type === 'signal' ? 'signal' : 'value';
    connections.push({ key: `${from.node}:${from.port}->${to.node}:${to.port}`, fromId: from.node, fromProperty: from.port, toId: to.node, toProperty: to.port, kind });
  }
  irNodes.unshift({ id: 'root', type: 'Group', catalogRef: 'Group', parameters: [], declaredPorts: [], portKnowledge: 'complete', children });
  irNodes.push({ id: 'out', type: 'Component Outputs', catalogRef: 'Component Outputs', parameters: [], declaredPorts: outPorts, portKnowledge: 'complete' });
  return { id: 'probe-graph', path: 'Components/Probe', role: 'component', nodes: irNodes, connections, visualRoots: ['root'], intent: { nodeComments: [], wireLabels: [], regions: [] } };
}

const emittedGraphs = new Map<string, EmittedGraph>();

export function emitGraph(nodes: Readonly<Record<string, GraphNodeDecl>>, wires: readonly Wire[]): EmittedGraph {
  const key = JSON.stringify([canonicalise(nodes as never) ?? null, wires]);
  const hit = emittedGraphs.get(key);
  if (hit) return hit;
  const app = emitApp(probeProject(graphComponent(nodes, wires)), catalog());
  const tsx = app.files['src/components/Probe.tsx'];
  if (tsx === undefined) throw new Error(`the exporter emitted no src/components/Probe.tsx for the graph: ${app.notes.join(' | ')}`);
  const notes = app.notes.filter((n) => n.includes('Components/Probe') && !n.includes('no route reaches'));
  // A refusal of the probe's OWN lift (`-> out:<id>_<port>`, the `out` node, "output … not
  // lifted") means that output is unobservable — the reach's edge, not the graph's. A refusal of
  // a scenario node, its button, or one of its wires means the graph did not survive: outside.
  const refused = notes.filter((n) => /\b(dropped|deferred)\b/.test(n) && !/->out:|node out \(Component Outputs\)|: output "/.test(n));
  const transpile = (source: string) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  // The component may import the exporter's own `../lib/<name>` (a Log node's `log`); those files
  // are in the emitted app too, and are served from it. Instantiated ONCE, lazily: a graph the
  // exporter refused is never run.
  const libs = new Map<string, unknown>();
  const load = (js: string, self: string): unknown => {
    const exported: Record<string, unknown> = {};
    const mod = { exports: exported };
    const req = (id: string): unknown => {
      if (id.endsWith('.css')) return new Proxy({}, { get: (_t, k) => String(k) });
      const m = /^\.\.\/lib\/([\w-]+)$/.exec(id);
      if (m) {
        const file = `src/lib/${m[1]}.ts`;
        if (!libs.has(file)) {
          const source = app.files[file] ?? app.files[`src/lib/${m[1]}.tsx`];
          if (source === undefined) throw new Error(`${self} imports ${id} and the emitted app has no ${file}`);
          libs.set(file, load(transpile(source), file));
        }
        return libs.get(file);
      }
      return require(id);
    };
    // eslint-disable-next-line no-new-func
    new Function('exports', 'module', 'require', js)(exported, mod, req);
    return mod.exports;
  };
  let instance: EmittedGraph['component'] | undefined;
  const component: EmittedGraph['component'] = (props) => {
    if (!instance) {
      const exports = load(transpile(tsx), 'src/components/Probe.tsx') as { Probe?: EmittedGraph['component'] };
      if (typeof exports.Probe !== 'function') throw new Error('the emitted Probe.tsx for the graph exports no Probe component');
      instance = exports.Probe;
    }
    return instance(props);
  };
  const lifted = new Map<string, string>();
  for (const [id, n] of Object.entries(nodes)) {
    const spec = specFor(n.type)!;
    for (const [port, d] of Object.entries(spec.outputs)) {
      if (d.type === 'signal') continue;
      const prop = liftedProp(id, port);
      if (new RegExp(`\\b${prop}\\?:`).test(tsx)) lifted.set(`${id}.${port}`, prop);
    }
  }
  const result: EmittedGraph = { tsx, notes, component, lifted, refused };
  emittedGraphs.set(key, result);
  return result;
}

/** A fresh graph target over the export. */
export function exportGraphTarget(): GraphTarget<ExportGraphHandle> {
  ensureDom();
  const graphs = new Map<string, ExportGraph>();
  let next = 0;
  const graphOf = (h: ExportGraphHandle): ExportGraph => {
    const g = graphs.get(h.graph.key);
    if (!g || !g.live.has(h.id)) throw new Error(`no live node ${h.id}`);
    return g;
  };
  const target: GraphTarget<ExportGraphHandle> = {
    name: 'export',

    canPlay(sc: GraphScenario) {
      // NSP-012: the export has no world (no seeded registry, no store, no clock) and emits ONE
      // component — a scenario that declares a world or a tree of component instances is outside
      if (sc.world !== undefined) return 'the export has no world to install — a scenario that declares one (a registry, a store, a clock) is outside';
      // NSP-015 s15: the boundary is in the format now; THIS harness emits the graph as one component,
      // so a tree of instances (and the ports between them) needs a multi-component emit — the harness's limit
      if ((sc.components && Object.keys(sc.components).length) || (sc.definitions && Object.keys(sc.definitions).length)) return 'this harness emits ONE component — a tree of component instances needs a multi-component emit (NSP-015 AC2, not built)';
      for (const step of sc.steps) {
        if (step === 'settle') continue;
        if ('wire' in step) return 'the export emits a component whole — no wire is made after mount';
        if ('advance' in step) return 'the export has no world clock to advance';
        if ('set' in step) return `a value input reaches the export only as a literal param — set on ${step.node}.${step.set} is not drivable`;
      }
      // NSP-013 s13: this harness builds the emitted graph from reducer specs; a node graded by graph
      // scenarios only (On App Error) has none — the HARNESS's limit, named as such, not the exporter's
      const unspecced = [...new Set(Object.values(sc.nodes).map((n) => n.type).filter((t) => !specFor(t)))];
      if (unspecced.length) return `this harness emits only nodes with a reducer spec — ${unspecced.join(', ')} has none (graded by graph scenarios on the runtime)`;
      const { refused } = emitGraph(sc.nodes, sc.wires ?? []);
      if (refused.length) return `the exporter refused part of the graph: ${refused.map((n) => n.replace('Components/Probe: ', '')).join(' | ')}`;
      return undefined;
    },

    graphReach(sc: GraphScenario): GraphReach {
      const { lifted } = emitGraph(sc.nodes, sc.wires ?? []);
      return { signals: false, outcomes: false, output: (subject, port) => lifted.has(`${subject}.${port}`) };
    },

    mountGraph(nodes, wires) {
      const { component, lifted } = emitGraph(nodes, wires);
      const key = `graph#${next++}`;
      const g: ExportGraph = { key, ids: Object.keys(nodes), root: undefined as never, container: undefined, latest: {}, recorded: {}, events: {}, lifted: new Set(lifted.keys()), live: new Set(Object.keys(nodes)) };
      const handles: Record<string, ExportGraphHandle> = {};
      for (const id of g.ids) {
        g.events[id] = [];
        const params = nodes[id].params ?? {};
        for (const k of Object.keys(params)) {
          const v = params[k];
          g.events[id].push(v === undefined ? { t: 'set', port: k } : { t: 'set', port: k, value: canonicalise(v) });
        }
        handles[id] = { id, type: nodes[id].type, graph: g };
      }
      const props: Record<string, unknown> = {};
      for (const [output, prop] of lifted) {
        props[prop] = (v: unknown) => {
          g.latest[output] = v;
        };
      }
      g.container = document.createElement('div');
      document.body.appendChild(g.container);
      g.root = createRoot(g.container);
      void act(() => {
        g.root.render(React.createElement(component, props));
      });
      graphs.set(key, g);
      return handles;
    },

    mount() {
      throw new Error('the export graph target mounts graphs (mountGraph); one node is exportTarget()');
    },
    set(h, port) {
      throw new Error(`${h.type} on the export has no drivable value input "${port}" — a value input reaches an exported component only as a literal param`);
    },
    signal(h, port) {
      const g = graphOf(h);
      const label = `${h.id}.${port}`;
      const button = Array.from(g.container.querySelectorAll('button') as Iterable<any>).find((b) => b.textContent === label);
      if (!button) throw new Error(`the emitted graph has no <button>${label}</button>`);
      g.events[h.id].push({ t: 'in', port });
      void act(() => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    },
    async settle() {
      await act(async () => {
        /* flush */
      });
      for (const g of graphs.values()) {
        for (const id of g.ids) {
          if (!g.live.has(id)) continue;
          g.events[id].push({ t: 'settle' });
          const ports = [...g.lifted].filter((o) => o.startsWith(`${id}.`)).map((o) => o.slice(id.length + 1)).sort();
          for (const port of ports) {
            const output = `${id}.${port}`;
            if (!(output in g.latest) || g.latest[output] === undefined) continue;
            const value = canonicalise(g.latest[output]);
            const k = JSON.stringify(value);
            if (g.recorded[output] === k) continue;
            g.recorded[output] = k;
            g.events[id].push({ t: 'value', port, value });
          }
        }
      }
    },
    trace(h) {
      return graphOf(h).events[h.id].map((e) => ({ ...e }));
    },
    dispose(h) {
      const g = graphs.get(h.graph.key);
      if (!g || !g.live.has(h.id)) return;
      g.live.delete(h.id);
      if (g.live.size === 0) {
        void act(() => {
          g.root.unmount();
        });
        g.container.remove();
        graphs.delete(g.key);
      }
    }
  };
  return target;
}
