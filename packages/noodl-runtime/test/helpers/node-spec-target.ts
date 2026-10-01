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
 *   - **graphs** (NSP-008): `mountGraph` mounts every node as `mount` does and then makes every
 *     wire with `connectInput` — the runtime's own connection, so the wire's seed (C11), the
 *     per-port input queues (C2, C7), the first-update consolidation (C8) and the breakers (C9)
 *     are all the runtime's; nothing is reproduced here. Stimulus still goes through
 *     `setInputValue` directly; what travels BETWEEN nodes goes through the queues. `connect` is
 *     the same call made later — a scenario's `wire` step.
 */

import { AsyncLocalStorage } from 'async_hooks';

import type { NodeInstance, NodeMetadata, OutcomeFailureOptions, OutcomeToken, RuntimeErrorEventLike } from '@noodl/types';

import type { RuntimeNode } from '../../src/internal';
import type { GraphNodeDecl, GraphTarget, Handle, RequestRecord, TraceEvent, Wire, World } from '../../../nodegx-node-spec/src';
import { parseEndpoint } from '../../../nodegx-node-spec/src';
import { canonicalise, installWorld, OUTCOME_PORTS } from '../../../nodegx-node-spec/src';

import NoodlRuntime = require('../../noodl-runtime');
import NodeDefinition = require('../../src/nodedefinition');

/**
 * The picker nodes the VIEWER provides (census `providedBy: noodl-viewer-react`) that this phase
 * has specced (NSP-011: Color, Value Changed, Color Blend). `NoodlRuntime` registers the
 * runtime's own list; the viewer's `register-nodes.js` adds these on top in the app. The same
 * definition objects are registered here, loaded from the viewer's source through jest's require
 * (ts-jest compiles them under this package's config), so a spec of a viewer node is graded
 * against the code the app runs, and no copy is kept. A viewer node specced later is added here.
 */
export const VIEWER_NODES = ['variables/color', 'valuechanged', 'colorblend', 'timer'] as const;

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

  const target: RuntimeTarget = {
    name: 'runtime',
    context,
    types: () => Object.keys((context.nodeRegister as unknown as { _constructors: Record<string, unknown> })._constructors),
    hasType: (type) => context.nodeRegister.hasNode(type),

    mount(type, params) {
      if (!context.nodeRegister.hasNode(type)) throw new Error(`runtime: no node type "${type}" is registered`);
      const id = `${type}#${next++}`;
      const logs: LogLine[] = [];
      const scope = {
        modelScope: undefined,
        componentOwner: { name: `node-spec/${id}`, getInstanceId: () => id },
        context,
        runContext: {
          log: (entry: { level: string; message: string; data?: unknown }) => {
            logs.push(entry.data === undefined ? { level: entry.level, message: entry.message } : { level: entry.level, message: entry.message, data: entry.data });
          }
        }
      };
      const node = context.nodeRegister.createNode(type, id, scope as never) as unknown as RuntimeNode;
      if (!node.nodeScope) node.nodeScope = scope as never;
      const h: RuntimeHandle = { id, type, node, metadata: context.nodeRegister.getNodeMetadata(type), errors: [], logs };
      const s: State = { h, trace: [], frame: newFrame(), lastSent: {}, settles: 0, currentInput: undefined, inOutcome: 0 };
      states.set(id, s);
      byNodeId.set(id, s);
      intercept(s);
      for (const name of Object.keys(params)) target.set(h, name, params[name]);
      return h;
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
      return () => {
        installed.restore();
        world = undefined;
      };
    },

    async advance(h, ms) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      if (!world) throw new Error('runtime: advance() without a world — install one for the play');
      s.trace.push({ t: 'advance', ms });
      await yieldToEventLoop(); // what the world already delivered lands before time passes
      world.clock.advance(ms);
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
    },

    mountGraph(nodes: Readonly<Record<string, GraphNodeDecl>>, wires: readonly Wire[]) {
      const handles: Record<string, RuntimeHandle> = {};
      for (const id of Object.keys(nodes)) handles[id] = target.mount(nodes[id].type, nodes[id].params ?? {});
      for (const w of wires) {
        const from = parseEndpoint(w.from);
        const to = parseEndpoint(w.to);
        if (!(from.node in handles) || !(to.node in handles)) throw new Error(`runtime: wire ${w.from} → ${w.to} names a node the graph does not declare`);
        target.connect!(handles[from.node], from.port, handles[to.node], to.port);
      }
      return handles;
    },

    connect(from, fromPort, to, toPort) {
      if (!states.has(from.id) || !states.has(to.id)) throw new Error('runtime: a wire to or from a disposed node');
      const source = from.node as unknown as NodeInstance;
      const sink = to.node as unknown as NodeInstance;
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
