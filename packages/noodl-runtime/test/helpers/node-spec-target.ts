/**
 * The interpreted runtime as a target (phase 107, NSP-002 §2.2).
 *
 * Implements `TargetAdapter` from `@nodegx/node-spec` over a real `NoodlRuntime`, so that a node
 * spec's scenario can be played on the runtime and its trace compared line by line with the spec
 * interpreter's. It lives HERE, in the runtime's test tree, for the reason
 * `nodegx-core-parity.test.ts` gives: this is where the runtime compiles headlessly, and the spec
 * package must depend on nothing in the runtime (R1 (a)).
 *
 * Mount by type name (AC1): a `NoodlRuntime` is constructed, which runs `registerNodes` — the
 * runtime's own registration list — so `mount('Counter')` reaches the same definition the
 * viewer and the cloud runner reach, and no list is kept here. `types()` says what is mountable.
 *
 * How the runtime's behaviour is mapped onto the trace format (trace.ts / adapter.ts):
 *
 *   - **values**: `sendValue` (which `flagOutputDirty` and `flagAllOutputsDirty` go through) is
 *     intercepted and the value snapshotted canonically at send time — what a WIRE would carry.
 *     At `settle` the LAST value sent per output in the frame is recorded if it changed since the
 *     last settle, sorted by port name. Reading getters at settle instead would hide the defect
 *     class "state moved but nothing told downstream"; sends are what downstream sees.
 *   - **the first settle** also reads every value output's getter that nothing sent, because a
 *     graph connection made before the first frame delivers the getter's current value
 *     (`connectInput`, node.ts) — that is how a Counter with no Start Value publishes its 0.
 *   - **signals**: `sendSignalOnOutput` is intercepted, in emission order. Pulses on the four
 *     outcome ports that occur INSIDE `reportOutcome` are folded into the outcome event; a
 *     hand-rolled `sendSignalOnOutput('failure')` outside one is an ordinary signal event.
 *   - **outcomes**: `beginOutcome` is intercepted to stamp the invoking input's name on the token
 *     (the trace's `port` is the INPUT), `reportOutcome` to record `{ t: 'outcome' }` once per
 *     token with the outcome the runtime actually settled on (after `Treat Unchanged as`).
 *     `completed` is never recorded (schema decision). A `failure` carries its error CODE.
 *   - **stimulus** goes through `setInputValue` directly — the node-harness's own shape — not
 *     through the input queue. So two graph-level behaviours are deliberately NOT reproduced
 *     here and belong to NSP-008: C8 first-update consolidation of queued values, and
 *     nodescope's `inputPriority` / `runOnChange-` parameter ordering.
 *   - **settle** is one frame exactly as `_doUpdate` runs it (`currentFrameTime` from the clock,
 *     `frameStart`, `context.update()` — C5's drain and then the TIMER PASS — `frameEnd`), a
 *     microtask and a macrotask yield for the async nodes, and one more DRAIN (`frameStart`,
 *     `updateDirtyNodes()`, `frameEnd` — no timer pass) — the viewer's shape: an async
 *     completion schedules a NEW frame. The second half is a drain and not a frame on purpose
 *     (NSP-007): a settle is ONE tick of the scheduler's clock, the way the spec reads it, so a
 *     Delay of Duration 0 shows `Started` in one settle and `Finished` in the next, as it does in
 *     the app across two animation frames. `settle()` is the target's, so every mounted instance
 *     is flushed on each call.
 *   - **the world** (NSP-007): `install(world)` makes the platform clock the world's
 *     (`getCurrentTime`), installs the world's globals (`setTimeout`, `fetch`, `crypto`,
 *     `Math.random`, `Date.now` — world.ts `installWorld`) and attributes every request the world
 *     sees to the node whose `update()` is running (an HTTP Request fetches from its after-inputs
 *     callback, inside its update). `advance(h, ms)` yields to the event loop (what the world
 *     already delivered lands), then moves the clock. A `request` event is recorded in the frame
 *     it was issued in, after the outcomes.
 *   - **runtime errors** raised on a mounted node are kept on its handle (`errors`), outside the
 *     trace: the trace is behaviour on the wire; the error channel is the runner's to read.
 *   - **log lines** (`net.noodl.Log`, NSP-011): the scope carries a `runContext.log` sink, the one
 *     the cloud runner attaches (log.ts :175-179), so a Log node's line lands on its handle
 *     (`logs`) instead of the console — an effect kept beside the trace until NSP-007 routes it
 *     through the world. Checked, not ignored (NSP-011 §3).
 *   - **the scope**: a node in a graph has a `NodeScope`; five runtime-provided picker nodes read
 *     it at mount (`nodeScope.modelScope || Model` — Variable, Set Variable, Component Object,
 *     User, Query Records). A lone node gets the scope a browser app's root component has: no
 *     model scope (so the global `Model`), and a component owner named after the handle. What a
 *     scope MEANS for behaviour is NSP-008's (the graph); this only lets the node construct.
 *   - **the registry** (NSP-012): the runtime's records and arrays are two PROCESS-WIDE tables
 *     (`Model._models`, `Collection._collections`), so `install(world)` empties both for the play
 *     and seeds them from the world's script — the one registry per play that registry.ts
 *     promises; the anonymous (weak) tiers cannot be emptied from here and need not be: nothing
 *     a play mints is named by a later one. A derived OUTPUT the spec declares for the params
 *     (`derived.outputs`) is registered at mount (`registerOutputIfNeeded`), as a graph wiring it
 *     would make the runtime do — a lone node here has every port its params derive. The node is
 *     handed a graph `model` holding its mount params, the one thing two Object nodes read from
 *     the graph rather than from an input (modelcrudbase.ts :461), and a component owner with an
 *     empty root list so the "From repeater" walk (foreachitem.ts) misses and says so, as it does
 *     for a node outside any Repeater, instead of throwing inside a scheduled callback.
 *   - **graphs** (NSP-008): `mountGraph` mounts every node as `mount` does and then makes every
 *     wire with `connectInput` — the runtime's own connection, so the wire's seed (C11), the
 *     per-port input queues (C2, C7), the first-update consolidation (C8) and the breakers (C9)
 *     are all the runtime's; nothing is reproduced here. Stimulus still goes through
 *     `setInputValue` directly; what travels BETWEEN nodes goes through the queues. `connect` is
 *     the same call made later — a scenario's `wire` step. After every node is mounted and every
 *     wire made, each node's `nodeScopeDidInitialize` runs in declaration order — the hook
 *     `NodeScope.setComponentModel` runs once a component's whole graph is in place (nodescope.ts
 *     :487-490), which is how a Global Store left on its defaults attaches at all.
 *   - **the component tree** (NSP-012, graph.ts COMPONENTS): a graph that declares `components`
 *     gets one real `NodeScope` per component instance and one for the root; a child instance is
 *     placed inside its parent's scope the way a loaded app places it — as an entry of the scope's
 *     `nodes` and as a child of a visual node of that scope (a `node-spec/host` entry standing for
 *     the Group it would hang under), and its name is a registered component model — so Send
 *     Event's `parent` / `children` / `siblings` walk (nodescope.ts `sendEventFromThisScope`) and
 *     the "From repeater" scope chain (componentwalk.ts) run unchanged over it. A component's
 *     `item` is `Model.get(id)` from the seeded registry, hung on the instance as `_forEachModel`,
 *     exactly as a Repeater or Run Tasks hangs it (runtasks.ts :407-408). What a component IS is
 *     not modelled (NSP-015's boundary).
 *   - **the three process-wide managers** behind the store, history and action nodes
 *     (`globalStoreManager`, `stateHistoryManager`, `actionRegistry`) are reset at `install` like
 *     the registry tables, and the history manager's clock becomes the world's — one play, one
 *     store, one history, one allow-list.
 */

import { AsyncLocalStorage } from 'async_hooks';

import type { NodeInstance, NodeMetadata, OutcomeFailureOptions, OutcomeToken, RuntimeErrorEventLike } from '@noodl/types';

import type { RuntimeNode } from '../../src/internal';
import type { ComponentDecl, GraphNodeDecl, GraphTarget, Handle, RequestRecord, TraceEvent, Wire, World } from '../../../nodegx-node-spec/src';
import { parseEndpoint, specFor } from '../../../nodegx-node-spec/src';
import { canonicalise, installWorld, OUTCOME_PORTS } from '../../../nodegx-node-spec/src';

import NoodlRuntime = require('../../noodl-runtime');
import NodeDefinition = require('../../src/nodedefinition');
import Model = require('../../src/model');
import Collection = require('../../src/collection');
import NodeScope = require('../../src/nodescope');

import { globalStoreManager } from '../../src/nodes/std-library/agent/globalstore';
import { stateHistoryManager } from '../../src/nodes/std-library/agent/statehistory';
import { actionRegistry } from '../../src/nodes/std-library/agent/action-dispatcher';

/**
 * NSP-012 — one registry per play: the runtime's two named tables emptied, then seeded from the
 * script exactly as registry.ts seeds its own (named records with their data; named arrays with
 * their members by id). `Model.get` / `Collection.get` are the runtime's, so what a node then
 * reaches is what the app would reach.
 */
function resetRegistry(world: World): void {
  const models = Model._models as Record<string, unknown>;
  for (const key of Object.keys(models)) delete models[key];
  const collections = Collection._collections as Record<string, unknown>;
  for (const key of Object.keys(collections)) delete collections[key];
  const script = world.script.registry;
  if (!script) return;
  for (const [id, data] of Object.entries(script.models ?? {})) {
    const m = Model.get(id);
    for (const key of Object.keys(data)) m.set(key, data[key]);
  }
  for (const [name, members] of Object.entries(script.collections ?? {})) {
    const c = Collection.get(name);
    for (const id of members) c.add(Model.get(id));
  }
}

/**
 * The picker nodes the VIEWER provides (census `providedBy: noodl-viewer-react`) that this phase
 * has specced (NSP-011: Color, Value Changed, Color Blend; NSP-007: Delay; NSP-012: the event
 * pair and Repeater Item; NSP-013: Repeat, Animate To Value). `NoodlRuntime` registers the
 * runtime's own list; the viewer's `register-nodes.js` adds these on top in the app. The same
 * definition objects are registered here, loaded from the viewer's source through jest's require
 * (ts-jest compiles them under this package's config), so a spec of a viewer node is graded
 * against the code the app runs, and no copy is kept. A viewer node specced later is added here.
 */
export const VIEWER_NODES = ['variables/color', 'valuechanged', 'colorblend', 'timer', 'eventsender', 'eventreceiver', 'data/foreachactions', 'repeat', 'animate-to-value'] as const;

/**
 * Picker nodes whose SOURCE is in this package but which only the viewer's `register-nodes.js`
 * registers (its :64-65 note: "HTTP node — temporarily here for debugging (normally in
 * noodl-runtime)") — so `NoodlRuntime` does not know them and the census says the viewer provides
 * them. Registered here from this package's source, as the viewer does (NSP-007: HTTP Request).
 */
export const VIEWER_REGISTERED_RUNTIME_NODES = ['data/httpnode'] as const;

type NodeModuleLike = { node: Parameters<typeof NodeDefinition.defineNode>[0] };

/** The target with the viewer-provided picker nodes registered as well. */
export function withViewerNodes(target: RuntimeTarget): RuntimeTarget {
  const register = (mod: { default?: NodeModuleLike } & Partial<NodeModuleLike>) => {
    // an `export default { node }` module (the viewer's TS files) or an `export =` one (httpnode.ts)
    const m = mod.default ?? (mod as NodeModuleLike);
    target.context.nodeRegister.register(NodeDefinition.defineNode(m.node));
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  for (const file of VIEWER_NODES) register(require('../../../noodl-viewer-react/src/nodes/std-library/' + file));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  for (const file of VIEWER_REGISTERED_RUNTIME_NODES) register(require('../../src/nodes/std-library/' + file));
  return target;
}

export interface RuntimeHandle extends Handle {
  readonly node: RuntimeNode;
  readonly metadata: NodeMetadata;
  /** Everything raised on the runtime error channel by this node, in order. Live. */
  readonly errors: RuntimeErrorEventLike[];
  /** Every line this node wrote through the scope's log sink, in order. Live. */
  readonly logs: LogLine[];
}

/** What `net.noodl.Log` hands the sink (runcontext.ts `RuntimeLogEntry`), minus the node id the handle already knows. */
export interface LogLine {
  level: string;
  message: string;
  data?: unknown;
}

export interface RuntimeTarget extends GraphTarget<RuntimeHandle> {
  /** Every type this runtime registered — the population `mount` accepts. */
  types(): string[];
  hasType(type: string): boolean;
  readonly context: InstanceType<typeof NoodlRuntime>['context'];
}

interface Frame {
  values: Map<string, unknown>;
  signals: string[];
  outcomes: TraceEvent[];
  requests: TraceEvent[];
}

interface State {
  h: RuntimeHandle;
  trace: TraceEvent[];
  frame: Frame;
  lastSent: Record<string, string>;
  settles: number;
  currentInput: string | undefined;
  inOutcome: number;
}

type StampedToken = OutcomeToken & { port?: string };

const OUTCOME_UNSPECIFIED = 'outcome/unspecified-failure';
const OUTCOME_UNCHANGED_AS_FAILURE = 'outcome/unchanged-as-failure';

export interface RuntimeTargetOptions {
  /** `browser` registers the nine client-session nodes as well; `cloud` does not (noodl-runtime.ts). */
  type?: 'browser' | 'cloud';
}

export function runtimeTarget(options: RuntimeTargetOptions = {}): RuntimeTarget {
  /** The world of the current play (NSP-007), or none — then the clock reads 0, as it always did. */
  let world: World | undefined;
  /** The real timers, captured before a world replaces the globals — the settle's yields must reach the event loop. */
  const realSetTimeout = setTimeout;
  const rt = new NoodlRuntime({
    type: options.type || 'browser',
    platform: {
      // Nothing drives frames; `settle()` is the frame boundary.
      requestUpdate: () => undefined,
      getCurrentTime: () => (world ? world.clock.now() : 0),
      objectToString: (o: unknown) => JSON.stringify(o)
    }
  });
  const context = rt.context;
  const states = new Map<string, State>();
  const byNodeId = new Map<string, State>();
  let next = 0;
  /** The node whose `update()` is running (or whose update started the promise chain that is running) — where a request the world sees is attributed. */
  const updating = new AsyncLocalStorage<State>();

  context.errorBus.subscribe((event: RuntimeErrorEventLike) => {
    const s = byNodeId.get(event.nodeId);
    if (s) s.h.errors.push(event);
  });

  const newFrame = (): Frame => ({ values: new Map(), signals: [], outcomes: [], requests: [] });

  /**
   * One frame as `NoodlRuntime._doUpdate` runs it (noodl-runtime.ts :743-753): the frame time
   * from the clock, `frameStart`, `context.update()` — the drain (nodecontext.ts :453-490) and
   * then the timer pass (:500-503) — `frameEnd`. The events matter: `scheduleNextFrame`
   * (nodecontext.ts :548-551) is `once('frameStart')`, and it is how a node the breaker tripped
   * is re-flagged for the next frame (C9, node.ts :629-644) — a settle that only drained left
   * such a node dead for good, which the runtime never does (NSP-008 found it on the self-wired
   * Counter). The timer pass is what a Delay lives by (NSP-007).
   */
  const frame = () => {
    context.currentFrameTime = world ? world.clock.now() : 0;
    context.eventEmitter.emit('frameStart');
    context.update();
    context.eventEmitter.emit('frameEnd');
  };
  /** The second half of a settle: the drain an async completion's new frame does, without a second tick of the clock. */
  const drain = () => {
    context.eventEmitter.emit('frameStart');
    context.updateDirtyNodes();
    context.eventEmitter.emit('frameEnd');
  };
  const yieldToEventLoop = async () => {
    await Promise.resolve();
    await new Promise((resolve) => realSetTimeout(resolve, 0));
  };

  function isSignalInput(s: State, port: string): boolean {
    const input = s.h.metadata.inputs[port];
    const t = input && input.type;
    return !!t && (t === 'signal' || (typeof t === 'object' && (t as { name?: string }).name === 'signal'));
  }
  function isSignalOutput(s: State, port: string): boolean {
    const output = s.h.metadata.outputs[port];
    const t = output && output.type;
    return !!t && (t === 'signal' || (typeof t === 'object' && (t as { name?: string }).name === 'signal'));
  }

  function intercept(s: State): void {
    const node = s.h.node;
    // The invoking input of an outcome (trace.ts: an outcome's `port` is the INPUT that was
    // invoked). A direct `signal()` names it; a pulse arriving over a WIRE (NSP-008) reaches the
    // node through the drain's `setInputValue(name, true)` (node.ts :718), so the rising edge of
    // any signal input is where the name is learnt — the same edge for both.
    const originalSetInputValue = node.setInputValue.bind(node);
    node.setInputValue = (name: string, value: unknown) => {
      const previous = s.currentInput;
      if (value === true && isSignalInput(s, name)) s.currentInput = name;
      try {
        originalSetInputValue(name, value);
      } finally {
        s.currentInput = previous;
      }
    };
    // Which node is updating — an HTTP Request's fetch is reached from its after-inputs callback,
    // inside its update, through a promise chain (`conditionalHeaders(url).then(fetch)`): the
    // async context set here follows that chain, where a plain variable would not.
    const originalUpdate = node.update.bind(node);
    node.update = () => updating.run(s, originalUpdate);
    const originalSendValue = node.sendValue.bind(node);
    node.sendValue = (name: string, value: unknown) => {
      if (value !== undefined && node.hasOutput(name)) s.frame.values.set(name, canonicalise(value));
      originalSendValue(name, value);
    };
    const originalSignal = node.sendSignalOnOutput.bind(node);
    node.sendSignalOnOutput = (name: string) => {
      if (!(s.inOutcome > 0 && (OUTCOME_PORTS as readonly string[]).includes(name))) s.frame.signals.push(name);
      originalSignal(name);
    };
    const originalBegin = node.beginOutcome.bind(node);
    node.beginOutcome = (inputData?: Record<string, unknown>) => {
      const token = originalBegin(inputData) as StampedToken;
      token.port = s.currentInput;
      return token;
    };
    const originalReport = node.reportOutcome.bind(node);
    node.reportOutcome = (token: OutcomeToken, outcome, failure?: OutcomeFailureOptions) => {
      const first = token.reported === undefined;
      s.inOutcome++;
      try {
        originalReport(token, outcome, failure);
      } finally {
        s.inOutcome--;
      }
      if (first && token.reported !== undefined) {
        const port = (token as StampedToken).port ?? s.currentInput ?? '?';
        const event: TraceEvent = { t: 'outcome', port, value: token.reported };
        if (token.reported === 'failure') {
          event.error = outcome === 'unchanged' ? OUTCOME_UNCHANGED_AS_FAILURE : (failure && failure.code) || OUTCOME_UNSPECIFIED;
        }
        s.frame.outcomes.push(event);
      }
    };
  }

  function flush(s: State): void {
    s.trace.push({ t: 'settle' });
    const values = new Map(s.frame.values);
    if (s.settles === 0) {
      // The connection-time read: what a wire made before the first frame is handed.
      for (const output of s.h.node._outputList) {
        if (values.has(output.name) || isSignalOutput(s, output.name) || (OUTCOME_PORTS as readonly string[]).includes(output.name)) continue;
        let v: unknown;
        try {
          v = output.value;
        } catch {
          continue;
        }
        if (v !== undefined) values.set(output.name, canonicalise(v));
      }
    }
    for (const name of [...values.keys()].sort()) {
      const v = values.get(name);
      if (v === undefined) continue; // C3
      const key = JSON.stringify(v);
      if (s.lastSent[name] === key) continue;
      s.lastSent[name] = key;
      s.trace.push({ t: 'value', port: name, value: v });
    }
    for (const name of s.frame.signals) s.trace.push({ t: 'signal', port: name });
    for (const o of s.frame.outcomes) s.trace.push(o);
    for (const r of s.frame.requests) s.trace.push(r);
    s.frame = newFrame();
    s.settles++;
  }

  /** A request the world saw, as the trace records it, attributed to the node that is updating. */
  function recordRequest(record: RequestRecord): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a request (${record.method} ${record.url}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    const event: TraceEvent = { t: 'request', method: canonicalise(record.method), url: record.url, headers: { ...record.headers } };
    if (record.body !== undefined) event.body = canonicalise(record.body);
    s.frame.requests.push(event);
  }

  /** A line a node wrote through its scope's log sink lands on that node's handle; the entry names the node (runcontext.ts). */
  const logSink = (fallback: LogLine[]) => (entry: { level: string; message: string; data?: unknown; nodeId?: string }) => {
    const line: LogLine = entry.data === undefined ? { level: entry.level, message: entry.message } : { level: entry.level, message: entry.message, data: entry.data };
    const owner = entry.nodeId !== undefined ? byNodeId.get(entry.nodeId) : undefined;
    (owner ? owner.h.logs : fallback).push(line);
  };

  /**
   * A lone node's scope: the one a browser app's root component has — no model scope (so the
   * global `Model`), a component owner named after the handle whose walk stops here (`getRoots`
   * and no `parentNodeScope`), and the log sink.
   */
  const loneScope = (id: string, logs: LogLine[]) => ({
    modelScope: undefined,
    componentOwner: { name: `node-spec/${id}`, getInstanceId: () => id, getRoots: () => [] as never[] },
    context,
    runContext: { log: logSink(logs) }
  });

  /**
   * Mounts one node into `scope` (a lone scope when absent), applying `params` as `set` events.
   * `graphId`: a graph node is mounted under its scenario id, as a loaded app mounts a node under
   * its project id — what a node that REPORTS ids reads (On App Error's Node Id, NSP-013 s13); a
   * lone node keeps the generated `<type>#<n>`.
   */
  function mountIn(type: string, params: Record<string, unknown>, scope?: InstanceType<typeof NodeScope>, graphId?: string): RuntimeHandle {
    if (!context.nodeRegister.hasNode(type)) throw new Error(`runtime: no node type "${type}" is registered`);
    if (graphId !== undefined && states.has(graphId)) throw new Error(`runtime: a node "${graphId}" is still mounted — a previous play leaked it`);
    const id = graphId ?? `${type}#${next++}`;
    const logs: LogLine[] = [];
    const nodeScope = scope ?? loneScope(id, logs);
    const node = context.nodeRegister.createNode(type, id, nodeScope as never) as unknown as RuntimeNode;
    if (!node.nodeScope) node.nodeScope = nodeScope as never;
    // a node in a component's scope is one of the scope's nodes — what `getNodesWithType` reads
    if (scope) scope.nodes[id] = node as never;
    // the graph's parameters, for the two nodes that read them off `this.model` (NSP-012)
    // `removeListenersWithRef` because `_onNodeDeleted` calls it FIRST (node.ts :1312-1315): without it
    // every teardown threw on its first line, `dispose` swallowed the throw, and no node's delete
    // listeners ever ran — Delay's and Repeat's timers were never stopped (NSP-013 s12, T7)
    (node as unknown as { model?: unknown }).model = { type, parameters: { ...params }, removeListenersWithRef: () => undefined };
    // the derived outputs the spec declares for these params — registered as a wire would make the runtime do
    const spec = specFor(type);
    if (spec?.derived?.outputs) {
      for (const name of Object.keys(spec.derived.outputs(params))) (node as unknown as NodeInstance).registerOutputIfNeeded(name);
    }
    const h: RuntimeHandle = { id, type, node, metadata: context.nodeRegister.getNodeMetadata(type), errors: [], logs };
    const s: State = { h, trace: [], frame: newFrame(), lastSent: {}, settles: 0, currentInput: undefined, inOutcome: 0 };
    states.set(id, s);
    byNodeId.set(id, s);
    intercept(s);
    for (const name of Object.keys(params)) target.set(h, name, params[name]);
    return h;
  }

  /** The owner a real `NodeScope` is built around — what the propagation walk and the scope chain read of a component instance. */
  interface Owner {
    name: string;
    nodeScope?: InstanceType<typeof NodeScope>;
    parentNodeScope?: InstanceType<typeof NodeScope>;
    children?: Owner[];
    getInstanceId(): string;
    getRoots(): never[];
    _forEachModel?: unknown;
  }

  /** A real scope around `owner`, with the log sink; `owner.nodeScope` is set to it. */
  function scopeFor(owner: Owner, logs: LogLine[]): InstanceType<typeof NodeScope> {
    const scope = new NodeScope(context as never, owner);
    (scope as unknown as { runContext: unknown }).runContext = { log: logSink(logs) };
    owner.nodeScope = scope;
    return scope;
  }

  /**
   * The component tree (graph.ts COMPONENTS): one scope per declared instance, each placed in its
   * parent's scope as a loaded app places it — an entry of `nodes` (nodescope.ts :310-312) and a
   * child of a visual node of that scope (the `node-spec/host` entry, standing for the Group),
   * its name a component model the context knows (`hasComponentModelWithName`, what the
   * `children` / `siblings` walk asks). Returns the root scope and the scope of each component.
   */
  function componentTree(components: Readonly<Record<string, ComponentDecl>>, orphanLogs: LogLine[]) {
    const rootOwner: Owner = { name: 'node-spec/root', getInstanceId: () => 'node-spec/root', getRoots: () => [] as never[] };
    const root = scopeFor(rootOwner, orphanLogs);
    const scopes: Record<string, InstanceType<typeof NodeScope>> = {};
    const hostOf = (scope: InstanceType<typeof NodeScope>): Owner => {
      const id = 'node-spec/host';
      const nodes = scope.nodes as unknown as Record<string, Owner>;
      if (!nodes[id]) nodes[id] = { name: id, children: [], getInstanceId: () => id, getRoots: () => [] as never[] };
      return nodes[id];
    };
    const build = (cid: string): InstanceType<typeof NodeScope> => {
      if (scopes[cid]) return scopes[cid];
      const decl = components[cid];
      const parentScope = decl.parent !== undefined ? build(decl.parent) : root;
      const owner: Owner = { name: cid, parentNodeScope: parentScope, getInstanceId: () => `node-spec/instance/${cid}`, getRoots: () => [] as never[] };
      if (decl.item !== undefined) owner._forEachModel = Model.get(decl.item);
      scopes[cid] = scopeFor(owner, orphanLogs);
      (parentScope.nodes as unknown as Record<string, Owner>)[`node-spec/instance/${cid}`] = owner;
      (parentScope.componentInstanceChildren as unknown as Record<string, Owner>)[`node-spec/instance/${cid}`] = owner;
      hostOf(parentScope).children!.push(owner);
      // the context's component-model table, written directly: a target plays many scenarios and
      // `registerComponentModel` refuses a name it has seen; only `hasComponentModelWithName` reads it here
      (context as unknown as { componentModels: Record<string, unknown> }).componentModels[cid] = { name: cid, on: () => undefined, removeListenersWithRef: () => undefined };
      return scopes[cid];
    };
    for (const cid of Object.keys(components)) build(cid);
    return { root, scopes };
  }

  const target: RuntimeTarget = {
    name: 'runtime',
    context,
    types: () => Object.keys((context.nodeRegister as unknown as { _constructors: Record<string, unknown> })._constructors),
    hasType: (type) => context.nodeRegister.hasNode(type),

    mount(type, params) {
      return mountIn(type, params);
    },

    set(h, port, value) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      const node = h.node as unknown as NodeInstance;
      node.registerInputIfNeeded(port);
      if (!node.hasInput(port)) throw new Error(`${h.type}: no input "${port}" on the runtime`);
      if (isSignalInput(s, port)) throw new Error(`${h.type}: "${port}" is a signal input — use signal()`);
      const c = canonicalise(value);
      s.trace.push(c === undefined ? { t: 'set', port } : { t: 'set', port, value: c });
      node.setInputValue(port, value);
    },

    signal(h, port) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      const node = h.node as unknown as NodeInstance;
      node.registerInputIfNeeded(port);
      if (!node.hasInput(port)) throw new Error(`${h.type}: no input "${port}" on the runtime`);
      if (!isSignalInput(s, port)) throw new Error(`${h.type}: "${port}" is a value input — use set()`);
      s.trace.push({ t: 'in', port });
      s.currentInput = port;
      try {
        // The rising edge is the event; the falling edge re-arms the detector (edgetriggeredinput.ts).
        node.setInputValue(port, true);
        node.setInputValue(port, false);
      } finally {
        s.currentInput = undefined;
      }
    },

    async settle() {
      frame();
      await yieldToEventLoop();
      drain();
      for (const s of states.values()) flush(s);
    },

    install(w) {
      if (world) throw new Error('runtime: a world is already installed — one play at a time');
      world = w;
      w.network.onRequest(recordRequest);
      const installed = installWorld(w);
      // the three process-wide managers behind the store, history and action nodes (NSP-012 T4): one play, one of each
      globalStoreManager.reset({ clearState: true });
      stateHistoryManager.reset();
      actionRegistry.reset();
      stateHistoryManager.setClock(() => w.clock.now());
      resetRegistry(w);
      // NSP-013 s12 — the last frame's time is the context's, so it outlived the play that ran the
      // frame: a Repeat started before a play's first settle read the PREVIOUS play's last frame time
      // (repeat.ts :120-122) and ticked early or late. Found only once the runner's sequences stopped
      // repeating across days (T4); a fresh context starts at 0 (nodecontext.ts :257), so each play does.
      context.currentFrameTime = 0;
      // NSP-013 s12 (T8) — the play's console goes to a sink. Jest formats a logged Error through
      // `source-map`, whose quick-sort calls `Math.random` — which during a play IS the world's
      // stream — once per process, while the map cache is cold: the first play that logs one (an
      // array port's bad literal, node.ts :456) lost world draws to the host and minted other ids.
      // What the runtime prints is not in the trace; nothing a node does reads it back.
      const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const hostConsole = consoleMethods.map((m) => console[m]);
      for (const m of consoleMethods) console[m] = () => undefined;
      return () => {
        consoleMethods.forEach((m, i) => (console[m] = hostConsole[i]));
        installed.restore();
        stateHistoryManager.setClock(null);
        world = undefined;
      };
    },

    async advance(h, ms) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      if (!world) throw new Error('runtime: advance() without a world — install one for the play');
      s.trace.push({ t: 'advance', ms });
      await yieldToEventLoop(); // what the world already delivered lands before time passes
      // Timer by timer, yielding between (world.ts CLOCK, T6 — NSP-013 s12): one sweep fired an
      // answer due at +100 and a timeout due at +30000 back to back, and the answer's `.then` chain
      // never ran before the timeout aborted it. An event loop runs those microtasks in between.
      const target = world.clock.now() + Math.max(0, ms);
      for (let due = world.clock.nextDue(); due !== undefined && due <= target; due = world.clock.nextDue()) {
        world.clock.advance(due - world.clock.now());
        await yieldToEventLoop();
      }
      world.clock.advance(target - world.clock.now());
      await yieldToEventLoop(); // and what the move delivered lands before the next step
    },

    trace(h) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      return s.trace.map((e) => ({ ...e }));
    },

    dispose(h) {
      const s = states.get(h.id);
      if (!s) return;
      states.delete(h.id);
      byNodeId.delete(h.id);
      try {
        h.node._onNodeDeleted();
      } catch {
        // a node whose teardown assumes a scope it never had; the instance is unreachable anyway
      }
      // NSP-013 s12 (T7) — the play is over, so is its work. A disposed node left in the context's
      // dirty list or after-update callbacks ran in the NEXT play's first frame and drew from THAT
      // play's random stream (Filter Collection minted other ids: a divergence that vanished on a
      // fresh target). Timers too: a teardown that throws part-way (see the stand-in `model` at
      // mount) leaves them in the scheduler, and a play must not inherit them either.
      const c = context as unknown as { _dirtyNodes: unknown[]; callbacksAfterUpdate: unknown[]; timerScheduler: { runningTimers: unknown[]; newTimers: unknown[] } };
      c._dirtyNodes = [];
      c.callbacksAfterUpdate = [];
      c.timerScheduler.runningTimers = [];
      c.timerScheduler.newTimers = [];
    },

    mountGraph(nodes: Readonly<Record<string, GraphNodeDecl>>, wires: readonly Wire[], components?: Readonly<Record<string, ComponentDecl>>) {
      const handles: Record<string, RuntimeHandle> = {};
      const orphanLogs: LogLine[] = [];
      // a flat graph mounts as before (lone scopes); a graph with components gets the tree
      const tree = components && Object.keys(components).length ? componentTree(components, orphanLogs) : undefined;
      for (const id of Object.keys(nodes)) {
        const decl = nodes[id];
        const scope = tree ? (decl.in !== undefined ? tree.scopes[decl.in] : tree.root) : undefined;
        handles[id] = mountIn(decl.type, decl.params ?? {}, scope, id);
      }
      for (const w of wires) {
        const from = parseEndpoint(w.from);
        const to = parseEndpoint(w.to);
        if (!(from.node in handles) || !(to.node in handles)) throw new Error(`runtime: wire ${w.from} → ${w.to} names a node the graph does not declare`);
        target.connect!(handles[from.node], from.port, handles[to.node], to.port);
      }
      // nodescope.ts :487-490 — once the whole graph is in place, in declaration order
      for (const id of Object.keys(nodes)) {
        const node = handles[id].node as unknown as { nodeScopeDidInitialize?: () => void };
        if (node.nodeScopeDidInitialize) node.nodeScopeDidInitialize();
      }
      return handles;
    },

    connect(from, fromPort, to, toPort) {
      if (!states.has(from.id) || !states.has(to.id)) throw new Error('runtime: a wire to or from a disposed node');
      const source = from.node as unknown as NodeInstance;
      const sink = to.node as unknown as NodeInstance;
      // nodescope.ts `addConnection` :133-153 — a wire registers a runtime-discovered OUTPUT as well as the input (Receive Event's payload ports)
      source.registerOutputIfNeeded(fromPort);
      if (!source.hasOutput(fromPort)) throw new Error(`${from.type}: no output "${fromPort}" on the runtime`);
      sink.registerInputIfNeeded(toPort);
      if (!sink.hasInput(toPort)) throw new Error(`${to.type}: no input "${toPort}" on the runtime`);
      // node.ts `connectInput`: registers the connection on the source's output and seeds the sink
      // with the source's current value unless it is undefined (C11, C3) — or replays a signal sent
      // during THIS update, which a wire made between frames never meets.
      to.node.connectInput(toPort, from.node, fromPort);
    }
  };
  return target;
}
