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
 *     exactly as a Repeater or Run Tasks hangs it (runtasks.ts :407-408).
 *   - **the boundary** (NSP-015, graph.ts BOUNDARY): each instance is the runtime's own
 *     `ComponentInstanceNode` (s10's was a stand-in owner); once its nodes are mounted it finds
 *     its `Component Inputs` / `Component Outputs` and registers the declared ports as
 *     `setComponentModel` does, and becomes a handle — a subject — so a wire, a step or a claim
 *     can name it. Its params are set after the wires. A component SIGNAL port crosses as the
 *     runtime carries it (`true` then `false`, sent at once) and is recorded as a `signal` event,
 *     on the instance's signal outputs and on the matching `Component Inputs` outputs.
 *   - **definitions** (NSP-015, graph.ts DEFINITIONS): a component a node instantiates ITSELF by
 *     name (Run Tasks' template) is registered as a real `ComponentModel` from export data, so the
 *     runtime builds every instance with its own `setComponentModel`; the context's graph model
 *     gets the empty `variants` list a loaded project always has.
 *   - **the Component Stacks** (NSP-015 s18, world.ts STACK): `install` gives the play a FRESH real
 *     `NavigationHandler` (its `instance` is a process-wide static, and its queue of what no stack took
 *     would outlive the play), records each push / replace at the handler as handed, and registers a
 *     stand-in stack per scripted name that answers by the script — `unchanged` / a failure inside the
 *     call, `done` a microtask later, as a real stack does after building the page. A Pop Component
 *     Stack mounted in a play whose script puts it in a pushed page gets the world's back callback, as
 *     the stack installs its own on every one in the page it builds (navigation-stack.tsx :981-991).
 *   - **the three process-wide managers** behind the store, history and action nodes
 *     (`globalStoreManager`, `stateHistoryManager`, `actionRegistry`) are reset at `install` like
 *     the registry tables, and the history manager's clock becomes the world's — one play, one
 *     store, one history, one allow-list.
 *   - **the backends** (NSP-014 s21, world.ts BACKEND, R9): the record nodes' REAL `CloudStore` and the REAL
 *     resolution (`CloudStore.forBackend` → resolveBackend.pure.ts) — the project's `backendServices` are the
 *     script's ids, converged (`version: 2`, the first active), each typed `directus` so it resolves to the REST
 *     adapter and takes the NEUTRAL filter, and no `cloudservices` endpoint (the legacy store is not a world the
 *     seam plays). Only the WIRE is stood in: `RestDataAdapter`'s operation methods (`BACKEND_OPS`) become the
 *     world's — the call recorded as handed (`handle.id`, the options without callbacks), the scripted answer
 *     delivered a microtask after its moment (an adapter's callbacks run from a promise), and after a success
 *     the contract's event emitted as the adapter emits it (RestDataAdapter.ts :1216-1219). The per-backend
 *     stores are dropped at `install` (`CloudStore.invalidateBackends`): they are process-wide.
 */

import { AsyncLocalStorage } from 'async_hooks';

import type { NodeInstance, NodeMetadata, OutcomeFailureOptions, OutcomeToken, RuntimeErrorEventLike } from '@noodl/types';

import type { RuntimeNode } from '../../src/internal';
import type { BackendCall, ComponentDecl, ComponentDefinition, GraphNodeDecl, GraphTarget, Handle, LocationCall, RequestRecord, StackAnswer, TraceEvent, Wire, World } from '../../../nodegx-node-spec/src';
import { parseEndpoint, specFor } from '../../../nodegx-node-spec/src';
import { backendEvent, canonicalise, installWorld, locationEvent, OUTCOME_PORTS } from '../../../nodegx-node-spec/src';

import NoodlRuntime = require('../../noodl-runtime');
import NodeDefinition = require('../../src/nodedefinition');
import Model = require('../../src/model');
import Collection = require('../../src/collection');
import NodeScope = require('../../src/nodescope');
import ComponentInstanceNode = require('../../src/nodes/componentinstance');
import ComponentModel = require('../../src/models/componentmodel');
import Node = require('../../src/node');

import { globalStoreManager } from '../../src/nodes/std-library/agent/globalstore';
import { stateHistoryManager } from '../../src/nodes/std-library/agent/statehistory';
import { actionRegistry } from '../../src/nodes/std-library/agent/action-dispatcher';

/** The Push Component To Stack side of a request (navigation-handler.ts `StackNavigateArgs`), as a stand-in stack sees it. */
interface StackArgs {
  target?: unknown;
  params?: unknown;
  transition?: unknown;
  hasNavigated?(): void;
  hasUnchanged?(): void;
  hasFailed?(code: string, message: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NavigationHandler = require('../../../noodl-viewer-react/src/nodes/navigation/navigation-handler').default as {
  new (): { navigate(name: unknown, args: StackArgs): void; replace(name: unknown, args: StackArgs): void; registerPageStack(name: unknown, stack: unknown): void };
  instance: unknown;
};

/**
 * STACK (world.ts, NSP-015 s18) for one play. The handler is the viewer's REAL `NavigationHandler`,
 * a fresh one (its `instance` is process-wide, and it queues what no stack took — a queue that would
 * outlive the play), so its rules — a blank name is `Main`, a name nobody registered is queued, every
 * stack under the name is asked — run as in the app and are graded against the world's model of them.
 * The node's call is recorded at the handler, AS HANDED (`navigate` is a push); each name the script
 * registers gets a stand-in stack (`registerPageStack`, which resets it — a stand-in has no page to
 * reset) that answers by the script: `unchanged` / a failure inside the call (a real stack's checks run
 * before its first `await`, navigation-stack.tsx :916-966), `done` a microtask later (after it built the
 * page, :968-1027). Returns the undo.
 */
function installStacks(w: World, record: (e: TraceEvent) => void): () => void {
  w.stack.onCall(record);
  const saved = NavigationHandler.instance;
  const handler = new NavigationHandler();
  for (const op of ['navigate', 'replace'] as const) {
    const real = handler[op].bind(handler);
    handler[op] = (name: unknown, args: StackArgs) => {
      w.stack.record({ call: op === 'navigate' ? 'push' : 'replace', stack: name, target: args.target, params: args.params, transition: args.transition });
      real(name, args);
    };
  }
  const answer = (op: 'push' | 'replace') => (args: StackArgs) => {
    const a = w.stack.answerFor(op, args.target);
    if (a === 'done') void Promise.resolve().then(() => args.hasNavigated?.());
    else if (a === 'unchanged') (args.hasUnchanged ?? args.hasNavigated)?.();
    else args.hasFailed?.(a.failure.code, a.failure.message);
  };
  NavigationHandler.instance = handler;
  for (const name of w.stack.script.names ?? []) handler.registerPageStack(name, { navigate: answer('push'), replace: answer('replace'), reset: () => undefined });
  return () => {
    NavigationHandler.instance = saved;
  };
}

/** The Navigate side of a request (router-handler.ts `NavigateArgs`), as a stand-in router sees it. */
interface RouteArgs {
  target?: unknown;
  params?: unknown;
  openInNewTab?: unknown;
  hasNavigated?(): void;
  hasUnchanged?(): void;
  hasFailed?(code: string, message: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RouterHandler = require('../../../noodl-viewer-react/src/nodes/navigation/router-handler').RouterHandler as {
  new (): { navigate(name: unknown, args: RouteArgs): void; registerRouter(name: unknown, router: unknown): void };
  instance: unknown;
};

/**
 * ROUTE (world.ts, NSP-015 s19) for one play, as `installStacks` does STACK. The handler is the viewer's REAL
 * `RouterHandler`, a fresh one (its `instance` is process-wide and its queue would outlive the play), so its
 * rules — the 1 ms `setTimeout` (the world's clock: `installWorld` owns the timers), one registered name takes
 * everything, a name with no router is queued — run as in the app. The node's call is recorded at the handler,
 * AS HANDED; each name the script registers gets a stand-in router (`registerRouter`, which resets it — a
 * stand-in has no start page) that answers by the script: a failure or `unchanged` inside the call (a real
 * Router's checks run before its first `await`, router.tsx :846-895), `done` a microtask later (once it built
 * the page, :897-936). Returns the undo.
 */
function installRouters(w: World, record: (e: TraceEvent) => void): () => void {
  w.router.onCall(record);
  const saved = RouterHandler.instance;
  const handler = new RouterHandler();
  const real = handler.navigate.bind(handler);
  handler.navigate = (name: unknown, args: RouteArgs) => {
    w.router.record({ router: name, target: args.target, params: args.params, openInNewTab: args.openInNewTab });
    real(name, args);
  };
  const router = {
    navigate: (args: RouteArgs) => {
      const a = w.router.answerFor(args.target, args.openInNewTab);
      if (a === 'done') void Promise.resolve().then(() => args.hasNavigated?.());
      else if (a === 'unchanged') args.hasUnchanged?.();
      else args.hasFailed?.(a.failure.code, a.failure.message);
    },
    reset: () => undefined
  };
  RouterHandler.instance = handler;
  for (const name of w.router.script.names ?? []) handler.registerRouter(name, router);
  return () => {
    RouterHandler.instance = saved;
  };
}

/**
 * POPUP (world.ts, NSP-015 s20) — the stand-in for the viewer's popup container (`createPrimitiveNode('Group')`,
 * nodecontext.ts :1261): it takes the three inputs `showPopup` sets and keeps the popup it is handed (the rAF
 * attach, :1327-1331) as its child, so deleting it deletes the popup, as the real Group's teardown does. It
 * draws nothing; nothing a popup's opener observes reads it.
 */
const GROUP_STAND_IN = NodeDefinition.defineNode({
  name: 'Group',
  category: 'node-spec',
  initialize(this: { _internal: { children: unknown[] } }) {
    this._internal.children = [];
  },
  inputs: { flexDirection: { type: 'string', set: () => undefined }, cssClassName: { type: 'string', set: () => undefined }, position: { type: 'string', set: () => undefined } },
  methods: {
    addChild(this: { _internal: { children: Array<{ parent?: unknown }> } }, child: { parent?: unknown }) {
      this._internal.children.push(child);
      child.parent = this;
    },
    removeChild(this: { _internal: { children: Array<{ parent?: unknown }> } }, child: { parent?: unknown }) {
      this._internal.children = this._internal.children.filter((c) => c !== child);
      child.parent = undefined;
    },
    getChildren(this: { _internal: { children: unknown[] } }) {
      return this._internal.children.slice();
    }
  }
} as never);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RestDataAdapter } = require('../../src/api/backends/RestDataAdapter') as { RestDataAdapter: { prototype: Record<string, unknown> } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CloudStore = require('../../src/api/cloudstore') as { invalidateBackends(scope?: unknown): void };

/** What a backend operation's options carry back (`@noodl/backend-contract` `Callbacks`). */
interface BackendOptions extends Record<string, unknown> {
  success: (...args: unknown[]) => void;
  error: (message?: string) => void;
}

/**
 * The operations the world plays (world.ts BACKEND), each with what the REST adapter does on success: the
 * success callback, then the contract's event (RestDataAdapter.ts). Grows with NSP-014's batch, one operation
 * at a time, each read from the adapter before it is added.
 */
const BACKEND_OPS: Readonly<Record<string, (o: BackendOptions, ok: unknown, emit: (e: Record<string, unknown>) => void) => void>> = {
  // RestDataAdapter.ts :1202-1222 — `success()` with nothing, then `delete { objectId, collection }`
  delete: (o, _ok, emit) => {
    o.success();
    emit({ type: 'delete', objectId: o.objectId, collection: o.collection });
  },
  // RestDataAdapter.ts :1584-1597 `relationChanged` — `success(record)`, then `save { objectId, object, collection }`
  addRelation: (o, ok, emit) => {
    o.success(ok);
    emit({ type: 'save', objectId: o.objectId, object: ok, collection: o.collection });
  },
  removeRelation: (o, ok, emit) => {
    o.success(ok);
    emit({ type: 'save', objectId: o.objectId, object: ok, collection: o.collection });
  }
};

/**
 * BACKEND (world.ts, NSP-014 s21, R9) for one play: the project's backends are the script's (converged
 * `backendServices`, the first active, each `directus` so it resolves to the REST adapter; no `cloudservices`
 * endpoint), the per-backend stores dropped, and the REST adapter's operations the world's. Returns the undo.
 */
function installBackend(w: World, graphModel: { getMetaData(k: string): unknown; setMetaData(k: string, v: unknown): void }, record: (c: BackendCall) => void): () => void {
  w.backend.onCall(record);
  const savedMeta = { cloudservices: graphModel.getMetaData('cloudservices'), backendServices: graphModel.getMetaData('backendServices') };
  graphModel.setMetaData('cloudservices', undefined);
  graphModel.setMetaData('backendServices', {
    version: 2,
    activeBackendId: w.backend.ids[0],
    backends: w.backend.ids.map((id) => ({ id, name: id, type: 'directus', url: `https://${id}.backend.example` }))
  });
  CloudStore.invalidateBackends();
  const proto = RestDataAdapter.prototype;
  const saved: Record<string, unknown> = {};
  for (const [op, onSuccess] of Object.entries(BACKEND_OPS)) {
    saved[op] = proto[op];
    proto[op] = function (this: { emitAdapterEvent(e: Record<string, unknown>): void }, handle: { id: string }, options: BackendOptions) {
      w.backend.issue({ op, backend: handle.id, args: options }, (d) => {
        void Promise.resolve().then(() => ('ok' in d ? onSuccess(options, d.ok, (e) => this.emitAdapterEvent(e)) : options.error(d.error)));
      });
    };
  }
  return () => {
    for (const [op, fn] of Object.entries(saved)) proto[op] = fn;
    CloudStore.invalidateBackends();
    graphModel.setMetaData('cloudservices', savedMeta.cloudservices);
    graphModel.setMetaData('backendServices', savedMeta.backendServices);
  };
}

/** What a stack's `back` returns to a Pop Component Stack (navigation-stack.tsx `StackBackResult`) for the world's answer. */
function backResult(a: StackAnswer): unknown {
  if (a === 'done') return { ok: true };
  if (a === 'unchanged') return { ok: false, unchanged: true };
  return { ok: false, code: a.failure.code, message: a.failure.message };
}

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
  // NSP-014 s21 — the class a record was loaded with (cloudstore.js `_fromJSON`)
  for (const [id, cls] of Object.entries(script.classes ?? {})) (Model.get(id) as unknown as { _class: string })._class = cls;
}

/**
 * The picker nodes the VIEWER provides (census `providedBy: noodl-viewer-react`) that this phase
 * has specced (NSP-011: Color, Value Changed, Color Blend; NSP-007: Delay; NSP-012: the event
 * pair and Repeater Item; NSP-013: Repeat, Animate To Value, Screen Resolution, States). `NoodlRuntime` registers the
 * runtime's own list; the viewer's `register-nodes.js` adds these on top in the app. The same
 * definition objects are registered here, loaded from the viewer's source through jest's require
 * (ts-jest compiles them under this package's config), so a spec of a viewer node is graded
 * against the code the app runs, and no copy is kept. A viewer node specced later is added here.
 */
export const VIEWER_NODES = ['variables/color', 'valuechanged', 'colorblend', 'timer', 'eventsender', 'eventreceiver', 'data/foreachactions', 'repeat', 'animate-to-value', 'screenresolution', 'states', 'componentutils/parentcomponentobject', 'componentutils/setparentcomponentobjectproperties', 'externallink'] as const;

/** NSP-015 s17 — the viewer's navigation nodes this phase has specced, from `src/nodes/navigation/` (s17 Navigate To Path … s20 Show / Close Popup). */
export const VIEWER_NAVIGATION_NODES = ['navigate-to-path', 'navigate', 'navigate-back', 'router-navigate', 'page-inputs', 'showpopup', 'closepopup'] as const;

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
  for (const file of VIEWER_NAVIGATION_NODES) register(require('../../../noodl-viewer-react/src/nodes/navigation/' + file));
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
  /** NSP-015 — the frame's LOCATION calls (`window.open`, `history.pushState`, `window.dispatchEvent`; world.ts), after its requests, in the order made. */
  location: TraceEvent[];
}

interface State {
  h: RuntimeHandle;
  trace: TraceEvent[];
  frame: Frame;
  lastSent: Record<string, string>;
  settles: number;
  currentInput: string | undefined;
  inOutcome: number;
  /**
   * NSP-015 — outputs that carry a SIGNAL as values: a component's signal port crosses the
   * boundary the way the runtime carries every pulse between nodes — `true`, then `false`, sent
   * at once (componentinstance.ts `setOutputFromComponentOutput` → `flagOutputDirty`; the
   * receiving signal input fires on the rising edge). The port's kind is the component's
   * declaration; a sent `true` is recorded as a `signal` event and no value is recorded.
   */
  signalOutputs?: Set<string>;
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
  // NSP-013 s14 — the viewer always gives the context its project's styles (viewer.jsx :185, :322);
  // the headless runtime gives none, and States' colour tween calls `context.styles.resolveColor` in
  // the scheduler's timer pass, so without one every colour transition threw there. This is a
  // project with no colour styles: `resolveColor` hands back what it is given (styles.ts :122-127).
  // node.ts :431 resolves every `color` input through it too — the identity, so Color and Color
  // Blend read exactly what they read before. Named palette colours are not graded (NSP-013 §6.4).
  (context as unknown as { styles: { resolveColor(color: unknown): unknown } }).styles = { resolveColor: (color) => color };
  // NSP-015 s15 — likewise the project's variants: `importEditorData` always sets the list
  // (graphmodel.ts :171, `exportData.variants || []`), and a component built by its model reads it
  // for every node (nodescope.ts `setNodeParameters` → `variants.getVariant` → `this.variants.find`);
  // the headless runtime loads no project, so the list was undefined and every instance a node
  // makes by name (Run Tasks' template) threw there. This is a project with no variants.
  const graphModel = (context as unknown as { graphModel: { variants?: unknown[]; componentToBundleMap?: Map<string, string>; componentIndex?: Record<string, unknown> } }).graphModel;
  if (graphModel && !graphModel.variants) graphModel.variants = [];
  // NSP-015 s20 — likewise its bundles: `importEditorData` sets the component index and the map from a component to
  // the bundle holding it (graphmodel.ts :158-161); with neither, a component the context does not have threw
  // `Cannot read properties of undefined (reading 'get')` where the app says `Can't find component model for <name>`
  // (nodecontext.ts :620-623) — Show Popup's Error carries that message. This is a project with no bundles.
  if (graphModel && !graphModel.componentToBundleMap) graphModel.componentToBundleMap = new Map();
  if (graphModel && !graphModel.componentIndex) graphModel.componentIndex = {};
  const states = new Map<string, State>();
  const byNodeId = new Map<string, State>();
  let next = 0;
  /** NSP-015 s20 — the subject whose `update()` is on the stack right now (synchronously); `undefined` between updates. */
  let inUpdate: State | undefined;
  /** The node whose `update()` is running (or whose update started the promise chain that is running) — where a request the world sees is attributed. */
  const updating = new AsyncLocalStorage<State>();

  context.errorBus.subscribe((event: RuntimeErrorEventLike) => {
    const s = byNodeId.get(event.nodeId);
    if (s) s.h.errors.push(event);
  });

  const newFrame = (): Frame => ({ values: new Map(), signals: [], outcomes: [], requests: [], location: [] });

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
    if (!input) return derivedSignal(s, port);
    const t = input.type;
    return !!t && (t === 'signal' || (typeof t === 'object' && (t as { name?: string }).name === 'signal'));
  }
  /**
   * NSP-013 s14 — a port the type's metadata does not list is one the node registers itself
   * (`registerInputIfNeeded`), with a setter and no type: States' `to-<state>` is an
   * `EdgeTriggeredInput`, a signal by its setter alone. What it IS is the spec's derived
   * declaration for the graph's parameters — the same thing the editor draws the port from.
   */
  function derivedSignal(s: State, port: string): boolean {
    const derived = specFor(s.h.type)?.derived;
    if (!derived) return false;
    const params = ((s.h.node as unknown as { model?: { parameters?: Record<string, unknown> } }).model?.parameters ?? {}) as Record<string, unknown>;
    const decl = derived.inputs(params)[port] ?? derived.discover?.(port);
    return !!decl && decl.type === 'signal';
  }
  function isSignalOutput(s: State, port: string): boolean {
    if (s.signalOutputs?.has(port)) return true;
    const output = s.h.metadata.outputs[port];
    const t = output && output.type;
    return !!t && (t === 'signal' || (typeof t === 'object' && (t as { name?: string }).name === 'signal'));
  }

  function intercept(s: State): void {
    const node = s.h.node;
    // NSP-015 — `ComponentInstanceNode`'s prototype is built from property DESCRIPTORS
    // (componentinstance.ts `Object.create(Node.prototype, { update: { value } … })`), which are
    // read-only, so an assignment on the instance throws; an own writable property shadows them
    for (const m of ['setInputValue', 'update', 'sendValue', 'sendSignalOnOutput', 'beginOutcome', 'reportOutcome'] as const) {
      Object.defineProperty(node, m, { value: node[m], writable: true, configurable: true });
    }
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
    node.update = () => {
      const outer = inUpdate;
      inUpdate = s;
      try {
        return updating.run(s, originalUpdate);
      } finally {
        inUpdate = outer;
      }
    };
    const originalSendValue = node.sendValue.bind(node);
    node.sendValue = (name: string, value: unknown) => {
      if (s.signalOutputs?.has(name)) {
        if (value === true) s.frame.signals.push(name);
      } else if (value !== undefined && node.hasOutput(name)) s.frame.values.set(name, canonicalise(value));
      originalSendValue(name, value);
    };
    const originalSignal = node.sendSignalOnOutput.bind(node);
    node.sendSignalOnOutput = (name: string) => {
      // NSP-015 s20 — a port the node does not have sends nothing (node.ts `sendSignalOnOutput` returns at once): Show
      // Popup's close action names a port the popup's Close Popup declared, and one the opener lacks was recorded here
      if (!node.hasOutput(name)) return originalSignal(name);
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
    for (const l of s.frame.location) s.trace.push(l);
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

  /** A BACKEND call the world saw (world.ts, NSP-014 s21), in the request group, attributed as a request is. */
  function recordBackend(call: BackendCall): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a backend call (${call.op}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    s.frame.requests.push(backendEvent(call));
  }

  /** A LOCATION call the world saw (an open, a push, a dispatch), as the trace records it, attributed as a request is. */
  function recordLocation(call: LocationCall): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a location call (${call.call}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    s.frame.location.push(locationEvent(call));
  }

  /** A STACK call the world saw (a push, a replace, a pop; world.ts, NSP-015 s18), in the LOCATION group, attributed as a request is. */
  function recordStack(event: TraceEvent): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a stack call (${String((event as { op?: unknown }).op)}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    s.frame.location.push(event);
  }

  /**
   * A POPUP call the world saw (a show, a close; world.ts, NSP-015 s20), in the LOCATION group — attributed to the
   * subject whose `update()` is running RIGHT NOW (both calls are made synchronously from a frame-end callback), and
   * DROPPED when none is: a Show Popup inside a popup a graph built is not a subject. Not by the async context a request
   * uses — a popup is built inside its opener's promise chain, and the async context then named the opener for every
   * call the popup's own nodes made (found s20 on the nested-popups scenario).
   */
  function recordPopup(event: TraceEvent): void {
    // no sole-subject fallback: a graph of ONE subject whose popup holds a Show Popup is exactly where it misattributed
    if (inUpdate) inUpdate.frame.location.push(event);
  }

  /** POPUP (world.ts) for the play: the popups `showPopup` built in the root scope, in the order built — what the person's close addresses. */
  let popups: RuntimeNode[] = [];
  /** Inside a `showPopup` call: its `createNode` builds a popup (the call reaches it synchronously, before its first `await`). */
  let showing = 0;

  /**
   * POPUP (world.ts, NSP-015 s20) — `scope` is the ROOT component's scope, where `showPopup` builds every popup and
   * its container (nodecontext.ts :1215): made the context's root component, its `createNode` watched for the
   * popups a show builds. A lone play gets a fresh one (`installPopups`); a graph with components gets the tree's.
   */
  function popupRoot(scope: InstanceType<typeof NodeScope>, owner: Owner): void {
    (context as unknown as { rootComponent: unknown }).rootComponent = owner;
    const create = scope.createNode.bind(scope);
    scope.createNode = (async (...args: Parameters<typeof create>) => {
      const popup = showing > 0;
      const node = await create(...args);
      if (popup) popups.push(node as unknown as RuntimeNode);
      return node;
    }) as typeof scope.createNode;
  }

  /**
   * POPUP (world.ts, NSP-015 s20) for one play. `NodeContext.showPopup` stays the RUNTIME's — its stack, its slot
   * policy, its next-frame `leave` are what is graded — and only what lies outside the runtime is stood in: the
   * app's popup host (`setPopupCallbacks`; none when the script says `host: false`), the container `Group`
   * (GROUP_STAND_IN), `requestAnimationFrame` (the next frame's start, as a browser runs it before the next paint),
   * a fresh root scope (a popup's id is a `guid()` — the world's random stream — so a scope that outlived a play
   * refused the next play's first popup as a duplicate), and the project's components (an empty model per name). A
   * show is recorded at the call, as handed; the person's events are world timers calling the n-th popup's
   * published close handler or the host's Escape (`cancelTopPopup`). Returns the undo.
   */
  function installPopups(w: World): () => void {
    const ctx = context as unknown as {
      rootComponent: unknown;
      popupStack: unknown[];
      showPopup: (target: unknown, params: unknown, args?: Record<string, unknown>) => unknown;
      cancelTopPopup(): boolean;
      setPopupCallbacks(cb: { onShow?: unknown; onClose?: unknown }): void;
      componentModels: Record<string, unknown>;
    };
    w.popup.onCall(recordPopup);
    const savedRoot = ctx.rootComponent;
    const savedGroup = context.nodeRegister.peek('Group');
    context.nodeRegister.register(GROUP_STAND_IN);
    const g = globalThis as unknown as { requestAnimationFrame?: unknown };
    const savedRaf = g.requestAnimationFrame;
    g.requestAnimationFrame = (cb: (t: number) => void) => {
      context.scheduleNextFrame(() => cb(w.clock.now()));
      return 0;
    };
    const rootOwner: Owner = { name: 'node-spec/root', getInstanceId: () => 'node-spec/root', getRoots: () => [] as never[] };
    popupRoot(scopeFor(rootOwner, []), rootOwner);
    popups = [];
    ctx.popupStack = [];
    ctx.setPopupCallbacks(w.popup.host ? { onShow: () => undefined, onClose: () => undefined } : { onShow: undefined, onClose: undefined });
    const models: string[] = [];
    for (const name of w.popup.script.components ?? []) {
      if (Object.prototype.hasOwnProperty.call(ctx.componentModels, name)) continue;
      ctx.componentModels[name] = new ComponentModel(name);
      models.push(name);
    }
    const realShow = ctx.showPopup;
    ctx.showPopup = function (this: unknown, target, params, args) {
      w.popup.record({ op: 'show', target, params, stackPolicy: args?.stackPolicy, closeOnEscape: args?.closeOnEscape, modal: args?.modal, accessibleName: args?.accessibleName });
      showing++;
      try {
        return realShow.call(this, target, params, args);
      } finally {
        showing--;
      }
    };
    for (const { at, event } of w.popup.events) {
      w.clock.schedule(at, () => {
        if (event.kind === 'escape') {
          ctx.cancelTopPopup();
          return;
        }
        const popup = popups[event.popup ?? popups.length - 1] as unknown as { _popupCloseHandler?: (action: unknown, results: unknown) => void } | undefined;
        popup?._popupCloseHandler?.(event.action, { ...event.results });
      });
    }
    return () => {
      delete (ctx as { showPopup?: unknown }).showPopup;
      for (const name of models) delete ctx.componentModels[name];
      ctx.setPopupCallbacks({ onShow: undefined, onClose: undefined });
      ctx.popupStack = [];
      popups = [];
      if (savedRaf === undefined) delete g.requestAnimationFrame;
      else g.requestAnimationFrame = savedRaf;
      context.nodeRegister.restore('Group', savedGroup);
      ctx.rootComponent = savedRoot;
    };
  }

  /**
   * POPUP (world.ts, NSP-015 s20) — a lone Close Popup sits inside the script's popups (`inside`, nearest first): its
   * component's parent is the first, each popup's parent the next — the walk `componentAncestors` makes
   * (componentwalk.ts :47-75, the non-visual hop). Each popup has a published close handler; the one the node
   * resolves is recorded by the node's own `resolvePopup` (below), so the handler itself does nothing.
   */
  function insidePopups(owner: { parentNodeScope?: unknown }, names: readonly string[]): void {
    let parent: { componentOwner: unknown } | undefined;
    for (let i = names.length - 1; i >= 0; i--) {
      const popup: Record<string, unknown> = { name: names[i], getInstanceId: () => `node-spec/popup/${i}`, getRoots: () => [] as never[], parentNodeScope: parent, _popupCloseHandler: () => undefined };
      popup.nodeScope = { componentOwner: popup };
      parent = { componentOwner: popup };
    }
    owner.parentNodeScope = parent;
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
    // POPUP (world.ts, NSP-015 s20) — a lone Close Popup inside the script's popups
    if (!scope && type === 'NavigationClosePopup' && world && world.popup.inside.length > 0) insidePopups(nodeScope.componentOwner as { parentNodeScope?: unknown }, world.popup.inside);
    const node = context.nodeRegister.createNode(type, id, nodeScope as never) as unknown as RuntimeNode;
    if (!node.nodeScope) node.nodeScope = nodeScope as never;
    // a node in a component's scope is one of the scope's nodes — what `getNodesWithType` reads
    if (scope) scope.nodes[id] = node as never;
    // STACK (world.ts, NSP-015 s18) — a Pop Component Stack in a page a stack pushed: the stack installs
    // its back callback on every one in the page it builds (navigation-stack.tsx :981-991); here the world's
    if (type === 'PageStackNavigateBack' && world?.stack.inPushedPage) {
      const w = world;
      (node as unknown as { _setBackCallback(cb: (a: { backAction?: unknown; results?: unknown }) => unknown): void })._setBackCallback((a) => backResult(w.stack.back(a.backAction, a.results)));
    }
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
    // POPUP (world.ts, NSP-015 s20) — a Close Popup's call to the handler it resolved, recorded AS HANDED, before the call
    if (type === 'NavigationClosePopup') {
      type Resolution = { popup?: { name?: unknown }; close?: (action: unknown, results: unknown) => void };
      const n = node as unknown as { resolvePopup(): Resolution };
      const resolve = n.resolvePopup.bind(node);
      n.resolvePopup = () => {
        const r = resolve();
        const close = r.close;
        if (close && world) {
          const w = world;
          r.close = (action, results) => {
            w.popup.record({ op: 'close', popup: r.popup?.name, action, results });
            close(action, results);
          };
        }
        return r;
      };
    }
    const h = adopt(node, id, type, context.nodeRegister.getNodeMetadata(type), params, logs);
    // ROUTE (world.ts, NSP-015 s19) — a Page Inputs in a page a Router built: the Router hands it the page's
    // params once the page's nodes exist (router.tsx :923-927), and again on a reset onto the same page (:528-531)
    if (type === 'PageInputs' && world) {
      const w = world;
      const hand = (p: Record<string, unknown>) => (node as unknown as { _setPageParams(p: Record<string, unknown>): void })._setPageParams({ ...p });
      for (const p of w.router.pages) {
        if (p.at > 0) w.clock.schedule(p.at, () => hand(p.params));
        else hand(p.params);
      }
    }
    return h;
  }

  /** Makes `node` a handle: recorded, intercepted, its `params` applied as `set` events. */
  function adopt(node: RuntimeNode, id: string, type: string, metadata: NodeMetadata, params: Record<string, unknown>, logs: LogLine[]): RuntimeHandle {
    const h: RuntimeHandle = { id, type, node, metadata, errors: [], logs };
    const s: State = { h, trace: [], frame: newFrame(), lastSent: {}, settles: 0, currentInput: undefined, inOutcome: 0 };
    states.set(id, s);
    byNodeId.set(id, s);
    intercept(s);
    for (const name of Object.keys(params)) target.set(h, name, params[name]);
    return h;
  }

  /** The owner of the ROOT scope — what the propagation walk and the scope chain read of the app's top component. */
  interface Owner {
    name: string;
    nodeScope?: InstanceType<typeof NodeScope>;
    parentNodeScope?: InstanceType<typeof NodeScope>;
    children?: unknown[];
    getInstanceId(): string;
    getRoots(): never[];
  }

  /** A component instance as the target holds it: the runtime's own node (componentinstance.ts). */
  type Instance = InstanceType<typeof ComponentInstanceNode> & RuntimeNode & {
    _forEachModel?: unknown;
    _internal: { instanceId: string; componentInputs: RuntimeNode[]; componentOutputs: RuntimeNode[] };
    registerComponentInputPort(port: { name: string }): void;
    registerComponentOutputPort(port: { name: string }): void;
  };

  /** A real scope around `owner`, with the log sink; `owner.nodeScope` is set to it. */
  function scopeFor(owner: Owner, logs: LogLine[]): InstanceType<typeof NodeScope> {
    const scope = new NodeScope(context as never, owner);
    (scope as unknown as { runContext: unknown }).runContext = { log: logSink(logs) };
    owner.nodeScope = scope;
    return scope;
  }

  /**
   * The component tree (graph.ts COMPONENTS): one instance per declared component, each the
   * runtime's own `ComponentInstanceNode` (NSP-015 — s10 built a stand-in owner; the boundary needs
   * the real one: its input setters feed `Component Inputs`, `Component Outputs` writes its
   * outputs), placed in its parent's scope as a loaded app places it — an entry of `nodes` and of
   * `componentInstanceChildren` under its id (nodescope.ts :305-312) and a child of a visual node
   * of that scope (the `node-spec/host` entry, standing for the Group), its name a component model
   * the context knows (`hasComponentModelWithName`, what the `children` / `siblings` walk asks).
   * Its instance id is `node-spec/instance/<id>` (the runtime's is a process-wide counter; the
   * Component Object record is keyed on it and must not move between plays). Returns the root
   * scope and each instance.
   */
  function componentTree(components: Readonly<Record<string, ComponentDecl>>, orphanLogs: LogLine[]) {
    const rootOwner: Owner = { name: 'node-spec/root', getInstanceId: () => 'node-spec/root', getRoots: () => [] as never[] };
    const root = scopeFor(rootOwner, orphanLogs);
    const instances: Record<string, Instance> = {};
    const hostOf = (scope: InstanceType<typeof NodeScope>): Owner => {
      const id = 'node-spec/host';
      const nodes = scope.nodes as unknown as Record<string, Owner>;
      if (!nodes[id]) nodes[id] = { name: id, children: [], getInstanceId: () => id, getRoots: () => [] as never[] };
      return nodes[id];
    };
    const build = (cid: string): Instance => {
      if (instances[cid]) return instances[cid];
      const decl = components[cid];
      const parentScope = decl.parent !== undefined ? build(decl.parent).nodeScope : root;
      const instance = new ComponentInstanceNode(context as never, cid, parentScope) as unknown as Instance;
      instance.name = decl.component ?? cid;
      instance._internal.instanceId = `node-spec/instance/${cid}`;
      (instance.nodeScope as unknown as { runContext: unknown }).runContext = { log: logSink(orphanLogs) };
      // the stand-in graph model a loaded instance has (its parameters; `_onNodeDeleted` calls `removeListenersWithRef`)
      (instance as unknown as { model?: unknown }).model = { type: instance.name, parameters: { ...(decl.params ?? {}) }, removeListenersWithRef: () => undefined };
      if (decl.item !== undefined) instance._forEachModel = Model.get(decl.item);
      instances[cid] = instance;
      (parentScope.nodes as unknown as Record<string, unknown>)[cid] = instance;
      (parentScope.componentInstanceChildren as unknown as Record<string, unknown>)[cid] = instance;
      hostOf(parentScope).children!.push(instance);
      // the context's component-model table, written directly: a target plays many scenarios and
      // `registerComponentModel` refuses a name it has seen; only `hasComponentModelWithName` reads it here
      const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
      if (!defined.includes(instance.name)) models[instance.name] = { name: instance.name, on: () => undefined, removeListenersWithRef: () => undefined };
      return instance;
    };
    for (const cid of Object.keys(components)) build(cid);
    return { root, rootOwner, instances };
  }

  /** The component models the previous play's definitions registered — removed when the next graph mounts. */
  let defined: string[] = [];

  /**
   * NSP-015 — the DEFINITIONS (graph.ts): each registered as the app's project registers a
   * component — a real `ComponentModel` built from export data (componentmodel.ts
   * `createFromExportData`: ports, nodes with their parameters, connections) in the context's
   * component-model table — so a node that instantiates a component by name (Run Tasks'
   * `nodeScope.createNode(template)` → `createComponentInstanceNode` → `getComponentModel`) builds
   * it with the runtime's own `setComponentModel`. Written into the table directly for the reason
   * the instance stand-ins are: a target plays many scenarios and `registerComponentModel` refuses
   * a name it has seen.
   */
  async function registerDefinitions(definitions: Readonly<Record<string, ComponentDefinition>>): Promise<void> {
    const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
    for (const name of defined) delete models[name];
    defined = [];
    for (const [name, def] of Object.entries(definitions)) {
      const port = (plug: 'input' | 'output') => ([portName, kind]: [string, string]) => ({ name: portName, plug, type: kind === 'signal' ? { name: 'signal' } : '*' });
      const model = await ComponentModel.createFromExportData({
        name,
        ports: [...Object.entries(def.inputs ?? {}).map(port('input')), ...Object.entries(def.outputs ?? {}).map(port('output'))] as never,
        nodes: Object.entries(def.nodes).map(([id, n]) => ({ id, type: n.type, parameters: { ...(n.params ?? {}) } })) as never,
        connections: (def.wires ?? []).map((w) => {
          const from = parseEndpoint(w.from);
          const to = parseEndpoint(w.to);
          return { sourceId: from.node, sourcePort: from.port, targetId: to.node, targetPort: to.port };
        })
      });
      models[name] = model;
      defined.push(name);
    }
  }

  /**
   * NSP-015 — the boundary, once the instance's own nodes are mounted: what `setComponentModel`
   * does after `nodeScope.setComponentModel` (componentinstance.ts :91-95) — find the scope's
   * `Component Inputs` / `Component Outputs` nodes, register the component's ports — and then the
   * instance becomes a handle, a subject like a node. Its metadata is the component's ports (the
   * port's kind is the component model's port type: what makes a `signal()` step legal on it).
   */
  function boundary(cid: string, instance: Instance, decl: ComponentDecl, logs: LogLine[]): RuntimeHandle {
    const scope = instance.nodeScope as unknown as InstanceType<typeof NodeScope>;
    instance._internal.componentInputs = scope.getNodesWithType('Component Inputs') as unknown as RuntimeNode[];
    instance._internal.componentOutputs = scope.getNodesWithType('Component Outputs') as unknown as RuntimeNode[];
    for (const name of Object.keys(decl.inputs ?? {})) instance.registerComponentInputPort({ name });
    for (const name of Object.keys(decl.outputs ?? {})) instance.registerComponentOutputPort({ name });
    const ports = (kinds: Record<string, string> | undefined) =>
      Object.fromEntries(Object.entries(kinds ?? {}).map(([name, kind]) => [name, { name, type: kind === 'signal' ? 'signal' : '*' }]));
    const metadata = { inputs: ports(decl.inputs), outputs: ports(decl.outputs) } as unknown as NodeMetadata;
    const signals = (kinds: Record<string, string> | undefined) => new Set(Object.keys(kinds ?? {}).filter((name) => kinds![name] === 'signal'));
    // a signal input of the component is a signal OUTPUT of each Component Inputs inside it
    for (const ci of instance._internal.componentInputs) {
      const st = states.get(ci.id);
      if (st) st.signalOutputs = signals(decl.inputs);
    }
    const h = adopt(instance, cid, `component:${instance.name}`, metadata, {}, logs);
    states.get(cid)!.signalOutputs = signals(decl.outputs);
    return h;
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
      w.location?.onCall(recordLocation);
      // PROJECT (world.ts, NSP-015 s17) — the settings a node reads through `NoodlRuntime.instance`:
      // the app has one runtime, so the static is this target's for the play, and its project's
      // settings are the script's (graphmodel.ts `setSettings`, what `importEditorData` calls)
      (NoodlRuntime as unknown as { instance: unknown }).instance = rt;
      (rt as unknown as { graphModel: { setSettings(s: Record<string, unknown>): void } }).graphModel.setSettings({ ...w.projectSettings });
      // STACK (world.ts, NSP-015 s18) — the REAL handler, fresh for the play (it is a process-wide static and
      // queues what no stack took), the node's call recorded as handed, and a stand-in stack per scripted name
      const restoreStacks = installStacks(w, recordStack);
      // ROUTE (world.ts, NSP-015 s19) — likewise the REAL RouterHandler, fresh, with a stand-in router per scripted name
      const restoreRouters = installRouters(w, recordStack);
      // POPUP (world.ts, NSP-015 s20) — the REAL `showPopup`, its host, container, frame and root scope stood in
      const restorePopups = installPopups(w);
      // BACKEND (world.ts, NSP-014 s21) — the REAL CloudStore and resolution; only the REST adapter's wire is the world's
      const restoreBackend = installBackend(w, (rt as unknown as { graphModel: { getMetaData(k: string): unknown; setMetaData(k: string, v: unknown): void } }).graphModel, recordBackend);
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
        restoreStacks();
        restoreRouters();
        restorePopups();
        restoreBackend();
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
      // NSP-015 s19 (T9): ONE timer at a time, not one due TIME at a time — two timers due at the same moment (two
      // Navigates' +1 ms) fired in one sweep, and the first's microtask answer landed after the second's.
      const target = world.clock.now() + Math.max(0, ms);
      while (world.clock.step(target)) await yieldToEventLoop();
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
        // NSP-015 — an instance's own teardown resets its whole scope (componentinstance.ts
        // `_onNodeDeleted` → `nodeScope.reset()`), deleting the nodes inside; the runner disposes
        // each of those itself, so an instance is torn down as a node only
        if (h.type.startsWith('component:')) Node.prototype._onNodeDeleted.call(h.node);
        else h.node._onNodeDeleted();
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

    async mountGraph(nodes: Readonly<Record<string, GraphNodeDecl>>, wires: readonly Wire[], components?: Readonly<Record<string, ComponentDecl>>, definitions?: Readonly<Record<string, ComponentDefinition>>) {
      const handles: Record<string, RuntimeHandle> = {};
      const orphanLogs: LogLine[] = [];
      await registerDefinitions(definitions ?? {});
      // a flat graph mounts as before (lone scopes); a graph with components gets the tree — and so
      // does one with definitions, which a node instantiates in its own scope (a real `NodeScope`)
      const hasDefinitions = !!definitions && Object.keys(definitions).length > 0;
      const tree = (components && Object.keys(components).length) || hasDefinitions ? componentTree(components ?? {}, orphanLogs) : undefined;
      // POPUP (world.ts, NSP-015 s20) — the tree's root is the app's root component: a popup is built in its scope
      if (tree) popupRoot(tree.root, tree.rootOwner);
      for (const id of Object.keys(nodes)) {
        const decl = nodes[id];
        const scope = tree ? (decl.in !== undefined ? (tree.instances[decl.in].nodeScope as unknown as InstanceType<typeof NodeScope>) : tree.root) : undefined;
        handles[id] = mountIn(decl.type, decl.params ?? {}, scope, id);
      }
      // NSP-015 — each instance's ports once its nodes exist; then it is a subject (graph.ts BOUNDARY)
      if (tree) for (const cid of Object.keys(components ?? {})) handles[cid] = boundary(cid, tree.instances[cid], components![cid], orphanLogs);
      for (const w of wires) {
        const from = parseEndpoint(w.from);
        const to = parseEndpoint(w.to);
        if (!(from.node in handles) || !(to.node in handles)) throw new Error(`runtime: wire ${w.from} → ${w.to} names a node the graph does not declare`);
        target.connect!(handles[from.node], from.port, handles[to.node], to.port);
      }
      // NSP-015 — the parent sets each instance's parameters (nodescope.ts `setNodeParameters`),
      // after the wires: inside the instance its own wires exist by then (`setComponentModel` made
      // them before the parent got the node back)
      if (tree) for (const cid of Object.keys(components ?? {})) for (const [name, value] of Object.entries(components![cid].params ?? {})) target.set(handles[cid], name, value);
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
