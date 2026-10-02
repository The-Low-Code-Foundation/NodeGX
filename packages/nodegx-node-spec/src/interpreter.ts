/**
 * The interpreter — runs one spec as a node in isolation (NSP-001 §2.2).
 *
 * Holds state, applies input writes and signal pulses through the spec's reducers, computes
 * outputs, and records a trace (trace.ts). It implements the per-node parts of the core contract
 * (`packages/nodegx-core/CONTRACT.md`):
 *   C2  every send delivered, in order — every `emit` becomes exactly one `signal` event, in order;
 *   C3  `undefined` is never sent — an output whose `from(state)` is `undefined` produces no event;
 *   C4  every pulse fires — a pulse is never coalesced with the previous one.
 * Graph-level clauses are NSP-008's.
 *
 * Frame model: `set` and `signal` run their reducer at once and QUEUE what the reducer emitted;
 * `settle()` then records, in the format's canonical order, the values that changed since the
 * last settle (sorted by port name), the queued signals, and the queued outcomes. A value is
 * recorded when it changed (compared canonically, canonical.ts) — so a reducer that sets a state
 * key to the value it already had produces no `value` event, and the first settle records every
 * output that is not `undefined` (C8, the first update consolidates).
 *
 * What a frame's value IS (NSP-011, from Inverter): the runtime sends an output at every write
 * that flags it (`flagOutputDirty` → `sendValue`, node.ts :832-835) and NEVER sends `undefined`
 * (:820-822, C3). So a wire carries the LAST DEFINED value a frame produced — a node whose state
 * ends the frame unset (Inverter handed `null` then `undefined`) still shows its last answer
 * downstream, while a connection made later would read the getter's `undefined`. The spec
 * models the wire (NSP-002 decision 6): outputs are observed after every step, and at settle the
 * last defined observation per port is what is recorded — the settle-time value when it is
 * defined, an intermediate one when it is not. For a spec whose outputs are never undefined
 * mid-frame this is exactly the settle-time value.
 *
 * WHEN OUTPUTS ARE SAMPLED (NSP-012 closed NSP-006's row F1): after every step and after every
 * handler, the outputs that step SENDS are read (`Patch.send` / `sendDerived`; all of them when
 * the patch names neither); at the FIRST settle, every output nothing has sent yet is read once
 * — the connection-time read a wire made before the first frame gets (node.ts `connectInput`),
 * which is what the runtime target does and all a target without a getter can do. A LATER settle
 * reads nothing: what a frame sends is what its steps sent. Until NSP-012 the interpreter read
 * every output again at every settle; the two readings were one for every spec whose outputs
 * are a function of state alone, and are not for one whose output IS a registry entry — an
 * Array node's `items` moves when another node inserts, and the wire does not carry that until
 * the node sends it again (it sends `count`, not `items` — collectionnode2.ts :80-85).
 *
 * `mount(spec, params)` creates the instance with the spec's initial state and each value input
 * at its declared default, then applies `params` as ordinary writes (recorded as `set` events)
 * in the order of the params object's keys — which is what the runtime does with a node's
 * parameters before its first frame (`Object.keys(parameters)`, nodescope.ts), and what every
 * adapter does (adapter.ts). s1 normalised this to declaration order for trace stability; NSP-002
 * reversed it so the interpreter and the runtime are driven identically. Mount does NOT settle;
 * the scenario's first `settle` is where the first frame's events land (NSP-002 §4, C8).
 *
 * THE WORLD (NSP-007, world.ts). An instance holds one `World`; a spec that declares no `needs`
 * gets a fresh default one and never notices. Reducers read it (`now()`, `random()`, `uuid()`) and
 * ask for effects in their patch (`after`, `cancel`, `request`, `abort`), applied here after the
 * patch's `set`. What the world hands back — a timer firing, an answer landing — is queued in the
 * instance's INBOX by the world and DELIVERED to the spec's world handlers (`spec.world.timer`,
 * `spec.world.response`) the way a target's event loop would:
 *   - a TIMER's handler runs at the moment the clock fires it, inside `advance` — a `setTimeout`
 *     callback is synchronous at its due time, and a timeout that ties with an answer must win
 *     on every target;
 *   - an ANSWER lands in the inbox (a promise resolution) and is delivered on `advance` — before
 *     the clock moves (what was already resolved lands before real time passes) and again after
 *     it (what the move resolved lands before the next step; the runtime target yields to its
 *     event loop at the same two moments) — and at `settle`, after the frame-end reducer, until
 *     nothing more is in the inbox (an answer scripted to land at once lands in the settle whose
 *     frame issued the request).
 * A handler's patch is applied like any reducer's; its `outcomes` settle `pending` invocations
 * (oldest first per port). Outcomes are recorded in the order they were REPORTED (trace.ts).
 * A `request` effect is recorded as a `request` event in the frame it was issued in; a `backend` effect
 * (NSP-014 s21) as a `backend` event beside it, its answer delivered to `spec.world.backend` like a response.
 *
 * THE REGISTRY (NSP-012, registry.ts). Reducers reach it through `world.registry` and WRITE to it
 * directly; a write notifies every OTHER instance watching the entry (`world.watch`) synchronously
 * — a node never hears its own write; its reaction to it is written beside the write — and the
 * interpreter hands the notification to the spec's `change` handler as soon as the reducer that
 * caused it returns — after its patch, before the next step — and again for what the handler's
 * own writes cause. At `settle` the frame-end reducer runs, the changes its writes caused are
 * delivered, and if any were, the frame-end reducer runs AGAIN (the scheduler's callback loop,
 * nodecontext.ts `updateDirtyNodes` :453-490, up to its ten passes). `world.send(port)` records
 * an output as sent at the call — where the runtime flags it, before a later write in the same
 * reducer moves what it reads. Derived OUTPUTS (`derived.outputs(params)`) are observed like
 * declared ones and reached through `sendDerived` / `emitDerived`. Values that arrive from
 * outside (a step, a param) are never frozen: the runner hands the same objects to the next target.
 *
 * Deterministic by construction: no clock of its own, no randomness of its own, no I/O — two
 * runs of one sequence on one script are byte-identical (AC3).
 */

import type { Step } from './adapter';
import { canonicalise, canonicalKey } from './canonical';
import { coerce } from './coerce';
import { isRegistryEntry } from './registry';
import type { AnyNodeSpec, BackendAnswerEvent, ChangeEvent, Outcome, InputDecl, ReducerOutcome, SignalOutputDecl, SpecBackendCall, SpecRequest, ErasedValueOutput, WatchTarget, WorldResponse, WorldView } from './spec';
import { isSignalInput } from './spec';
import type { TraceEvent } from './trace';
import { backendEvent, installTimeZone, locationEvent, openReturnsWindow, pushTarget, World, type Delivery, type LocationCall, type PopupCall, type PopupEvent } from './world';

/** One thing the world handed back, waiting to be delivered to the spec. */
type Inbound = { kind: 'timer'; tag: string } | { kind: 'response'; response: WorldResponse } | { kind: 'backend'; answer: BackendAnswerEvent } | { kind: 'resize' } | { kind: 'page'; params: Readonly<Record<string, unknown>> } | { kind: 'popup'; event: PopupEvent };

interface OutcomeSlot {
  port: string;
  outcome: ReducerOutcome;
  error?: string;
  /** Report order (trace.ts): set when the outcome became terminal. */
  reportedAt?: number;
}

/** The scheduler's cap on after-update passes in one frame (nodecontext.ts `iterations < 10`). */
const MAX_PASSES = 10;

export interface Instance {
  readonly spec: AnyNodeSpec;
  readonly world: World;
  /** The world as this instance's reducers see it — bound to the instance for `watch`. */
  readonly view: WorldView;
  state: Readonly<Record<string, unknown>>;
  inputs: Readonly<Record<string, unknown>>;
  /** Derived (dynamic) ports declared for this instance's params, if the spec has any. */
  derivedInputs: Readonly<Record<string, InputDecl>>;
  derivedValues: Readonly<Record<string, unknown>>;
  /** Derived outputs for this instance's params (NSP-012). */
  derivedOutputs: Readonly<Record<string, ErasedValueOutput | SignalOutputDecl>>;
  readonly trace: TraceEvent[];
  pending: { signals: string[]; outcomes: OutcomeSlot[]; requests: TraceEvent[]; location: TraceEvent[] };
  /** The last DEFINED canonical value each output produced this frame (see the frame model above). */
  frameLast: Record<string, unknown>;
  lastSent: Record<string, string>;
  settles: number;
  reports: number;
  /** The world's deliveries not yet handed to the spec. */
  inbox: Inbound[];
  /** Pending world timers by tag → clock handles (a tag may be scheduled more than once). */
  timers: Map<string, number[]>;
  /** The spec's request ids → the world's, for `abort`. */
  requests: Map<string, number>;
  /** Registry notifications not yet handed to the spec's `change` handler (NSP-012). */
  changes: ChangeEvent[];
  /** What this instance watches: `model:<id>` / `collection:<name>` → the unsubscribe. */
  watches: Map<string, () => void>;
  /** NSP-013 s13: the unsubscribe of this instance's `resize` listener (`WorldView.listen`), when it listens. */
  resizeOff?: () => void;
}

export class SpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecError';
  }
}

/** Canonical comparison key for "did this value change" — the canonicaliser's (canonical.ts). */
export const valueKey = canonicalKey;

/** A `set` event, with `value` omitted when undefined was written (schema: `set` may omit it). */
function setEvent(port: string, value: unknown): TraceEvent {
  const c = canonicalise(value);
  return c === undefined ? { t: 'set', port } : { t: 'set', port, value: c };
}

/**
 * Values that arrived from OUTSIDE — a scenario's step, the generator's pool — and may be handed to
 * another target after this one (the runner plays the reference first): never frozen here, or the
 * runtime target meets a frozen array it cannot subscribe to (NSP-012). Marked on arrival.
 */
const external = new WeakSet<object>();
function markExternal(value: unknown): void {
  if (!value || typeof value !== 'object' || external.has(value) || isRegistryEntry(value)) return;
  external.add(value);
  for (const v of Object.values(value as Record<string, unknown>)) markExternal(v);
}

/** Freezes what a reducer sees — never a registry entry (shared and mutable by design) and never an external value. */
const deepFreeze = <T>(o: T): Readonly<T> => {
  if (o && typeof o === 'object' && !Object.isFrozen(o) && !isRegistryEntry(o) && !external.has(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
};

/** The instance whose reducer is running: its own writes are not handed back to it (registry.ts, the notification rule). */
let currentWriter: Instance | undefined;
function asWriter<T>(inst: Instance, fn: () => T): T {
  const previous = currentWriter;
  currentWriter = inst;
  try {
    return fn();
  } finally {
    currentWriter = previous;
  }
}

const watchKey = (t: WatchTarget): string => ('model' in t ? `model:${String(t.model)}` : `collection:${String(t.collection)}`);

/** The world as a reducer of THIS instance reads it: the four pure reads, the registry, and the instance's watch seam. */
function viewOf(inst: Instance): WorldView {
  const world = inst.world;
  return {
    now: () => world.clock.now(),
    random: () => world.random.next(),
    bytes: (n) => world.random.bytes(n),
    uuid: () => world.random.uuid(),
    registry: world.registry,
    send: (name, state) => observe(inst, [name], false, state),
    watch: (t) => {
      const key = watchKey(t);
      if (inst.watches.has(key)) return;
      const off =
        'model' in t
          ? world.registry.onRecord(t.model, (change) => {
              if (currentWriter !== inst) inst.changes.push({ kind: 'model', id: t.model, ...change });
            })
          : world.registry.onCollection(t.collection, () => {
              if (currentWriter !== inst) inst.changes.push({ kind: 'collection', id: t.collection });
            });
      inst.watches.set(key, off);
    },
    unwatch: (t) => {
      const key = watchKey(t);
      const off = inst.watches.get(key);
      if (!off) return;
      off();
      inst.watches.delete(key);
    },
    viewport: () => (world.viewport ? { width: world.viewport.width, height: world.viewport.height } : undefined),
    // a DOM event's listener runs at its dispatch, inside the `advance` that reaches the resize — as a timer's handler does
    listen: (event) => {
      if (event !== 'resize' || !world.viewport || inst.resizeOff) return;
      inst.resizeOff = world.viewport.listen(() => handleInbound(inst, { kind: 'resize' }));
    },
    unlisten: (event) => {
      if (event !== 'resize' || !inst.resizeOff) return;
      inst.resizeOff();
      inst.resizeOff = undefined;
    },
    userActivation: () => world.location?.activation,
    opens: (target, features) => !!world.location && openReturnsWindow(target, features, world.location.activation),
    pushes: (url) => !!world.location && pushTarget(url, world.location.href) !== null,
    projectSettings: () => world.projectSettings,
    stackAnswer: (op, stack, target) => world.stack.answer(op, stack, target),
    backAnswer: (ahead) => world.stack.backAnswer(ahead ?? 0),
    routeAnswer: (router, target, openInNewTab) => world.router.answer(router, target, openInNewTab),
    popupAnswer: (target) => world.popup.answer(target),
    popupsInside: () => world.popup.inside,
    backendFor: (backendId) => world.backend.resolve(backendId),
    backendUser: () => world.backend.user
  };
}

export function mount(spec: AnyNodeSpec, params: Record<string, unknown> = {}, world: World = new World()): Instance {
  const inputs: Record<string, unknown> = {};
  for (const [name, decl] of Object.entries(spec.inputs)) {
    if (!isSignalInput(decl)) inputs[name] = decl.default;
  }
  for (const v of Object.values(params)) markExternal(v);
  const frozenParams = deepFreeze({ ...params });
  const derivedInputs = spec.derived ? spec.derived.inputs(frozenParams) : {};
  const derivedValues: Record<string, unknown> = {};
  for (const [name, decl] of Object.entries(derivedInputs)) {
    if (name in spec.inputs) throw new SpecError(`${spec.type}: derived port "${name}" shadows a declared input`);
    if (!isSignalInput(decl)) derivedValues[name] = decl.default;
  }
  const derivedOutputs = spec.derived?.outputs ? spec.derived.outputs(frozenParams) : {};
  for (const name of Object.keys(derivedOutputs)) {
    if (name in spec.outputs) throw new SpecError(`${spec.type}: derived output "${name}" shadows a declared output`);
  }
  const inst: Instance = {
    spec,
    world,
    view: undefined as unknown as WorldView,
    state: deepFreeze({ ...spec.state }),
    inputs: deepFreeze(inputs),
    derivedInputs: deepFreeze(derivedInputs),
    derivedValues: deepFreeze(derivedValues),
    derivedOutputs: deepFreeze(derivedOutputs),
    trace: [],
    pending: { signals: [], outcomes: [], requests: [], location: [] },
    frameLast: {},
    lastSent: {},
    settles: 0,
    reports: 0,
    inbox: [],
    timers: new Map(),
    requests: new Map(),
    changes: [],
    watches: new Map()
  };
  (inst as { view: WorldView }).view = viewOf(inst);
  // the part of the initial state the world supplies (spec.ts `init`) — drawn at mount, before the params
  if (spec.init) {
    const initial = asWriter(inst, () => spec.init!(inst.view, frozenParams));
    for (const key of Object.keys(initial)) {
      if (!(key in spec.state)) throw new SpecError(`${spec.type}: init names undeclared state key "${key}"`);
    }
    inst.state = deepFreeze({ ...spec.state, ...initial });
  }
  // params in the caller's key order — the adapter contract (adapter.ts), and the runtime's own
  // order. Unknown params are refused before anything is applied; a port `derived.discover`
  // accepts is not unknown (the runtime's `registerInputIfNeeded` runs before `hasInput`).
  for (const name of Object.keys(params)) {
    if (!(name in spec.inputs) && !(name in derivedInputs) && !discoverable(inst, name)) {
      throw new SpecError(`${spec.type}: param "${name}" is not an input`);
    }
  }
  deliverChanges(inst);
  for (const name of Object.keys(params)) set(inst, name, params[name]);
  // ROUTE (world.ts, NSP-015 s19): the params the Router hands the page this node sits in — at the build
  // (now: they land with the first settle's deliveries), then each later one at its time on the clock
  if (spec.needs?.includes('router')) {
    for (const p of world.router.pages) {
      const item: Inbound = { kind: 'page', params: deepFreeze({ ...p.params }) };
      if (p.at > 0) world.clock.schedule(p.at, () => handleInbound(inst, item));
      else inst.inbox.push(item);
    }
  }
  // POPUP (world.ts, NSP-015 s20): what the person does to the popups, each at its time on the clock — handed
  // to a spec that opens popups (its `world.popup` handler); a Close Popup is closed BY one, never handed any
  if (spec.needs?.includes('popup') && spec.world?.popup) {
    for (const e of world.popup.events) {
      const item: Inbound = { kind: 'popup', event: deepFreeze({ ...e.event }) as PopupEvent };
      world.clock.schedule(e.at, () => handleInbound(inst, item));
    }
  }
  return inst;
}

function discoverable(inst: Instance, port: string): boolean {
  return !!inst.spec.derived?.discover && inst.spec.derived.discover(port) !== undefined;
}

/**
 * A port the target registers on first write (spec.ts `DerivedPorts.discover`). Registered here
 * into the instance's derived ports, at its declared default, before the write is applied.
 */
function discover(inst: Instance, port: string): InputDecl | undefined {
  const decl = inst.spec.derived?.discover?.(port);
  if (!decl) return undefined;
  if (port in inst.spec.inputs) throw new SpecError(`${inst.spec.type}: discovered port "${port}" shadows a declared input`);
  inst.derivedInputs = deepFreeze({ ...inst.derivedInputs, [port]: decl });
  if (!isSignalInput(decl)) inst.derivedValues = deepFreeze({ ...inst.derivedValues, [port]: decl.default });
  return decl;
}

export function set(inst: Instance, port: string, value: unknown): void {
  const { spec, view } = inst;
  markExternal(value);
  const declared = spec.inputs[port];
  if (declared) {
    if (isSignalInput(declared)) throw new SpecError(`${spec.type}: "${port}" is a signal input — use signal()`);
    inst.trace.push(setEvent(port, value));
    const coerced = coerce(declared.coerce, value, declared.default);
    inst.inputs = deepFreeze({ ...inst.inputs, [port]: coerced });
    const reducer = spec.on[port];
    if (typeof reducer === 'function') {
      const sends = apply(inst, port, asWriter(inst, () => (reducer as (s: unknown, v: unknown, i: unknown, w: WorldView) => unknown)(inst.state, coerced, inst.inputs, view)), false);
      observe(inst, sends);
      deliverChanges(inst);
    }
    // a value input with no reducer stores its value and nothing else: no state moved, no output
    // can have (an output is a function of state and the registry, never of an input), so nothing
    // is read — reading would re-sample a registry entry another write moved (NSP-012)
    return;
  }
  const derived = inst.derivedInputs[port] ?? discover(inst, port);
  if (derived && !isSignalInput(derived)) {
    inst.trace.push(setEvent(port, value));
    const coerced = coerce(derived.coerce, value, derived.default);
    inst.derivedValues = deepFreeze({ ...inst.derivedValues, [port]: coerced });
    if (!spec.derived) throw new SpecError(`${spec.type}: derived port without a derived reducer`);
    observe(inst, apply(inst, port, asWriter(inst, () => spec.derived!.on(inst.state as never, port, coerced, inst.derivedValues, view)), false));
    deliverChanges(inst);
    return;
  }
  if (derived) throw new SpecError(`${spec.type}: "${port}" is a signal input — use signal()`);
  throw new SpecError(`${spec.type}: no value input "${port}"`);
}

export function signal(inst: Instance, port: string): void {
  const { spec } = inst;
  const declared = spec.inputs[port];
  if (!declared) {
    // NSP-013 s14 — a derived signal input (spec.ts `DerivedPorts.signal`): States' `To <state>`
    const derived = inst.derivedInputs[port] ?? discover(inst, port);
    if (!derived) throw new SpecError(`${spec.type}: no input "${port}"`);
    if (!isSignalInput(derived)) throw new SpecError(`${spec.type}: "${port}" is a value input — use set()`);
    const reducer = spec.derived?.signal;
    if (typeof reducer !== 'function') throw new SpecError(`${spec.type}: derived signal input "${port}" and no derived.signal reducer`);
    inst.trace.push({ t: 'in', port });
    observe(inst, apply(inst, port, asWriter(inst, () => reducer(inst.state as never, port, inst.derivedValues, inst.view)), derived.outcome === true));
    deliverChanges(inst);
    return;
  }
  if (!isSignalInput(declared)) throw new SpecError(`${spec.type}: "${port}" is a value input — use set()`);
  const reducer = spec.on[port];
  if (typeof reducer !== 'function') throw new SpecError(`${spec.type}: signal input "${port}" has no reducer`);
  inst.trace.push({ t: 'in', port });
  observe(inst, apply(inst, port, asWriter(inst, () => (reducer as (s: unknown, i: unknown, w: WorldView) => unknown)(inst.state, inst.inputs, inst.view)), declared.outcome === true));
  deliverChanges(inst);
}

/**
 * The `advance` step (NSP-007, adapter.ts): what the world already delivered lands first, then
 * the clock moves by `ms` — every timer due on the way fires, and a timer's handler runs AT the
 * firing, the way a `setTimeout` callback does (so a timeout that ties with an answer wins, as
 * it does on a target) — then what the move delivered lands too. Nothing is recorded but the
 * step itself; the next settle shows what the landing did.
 */
export function advance(inst: Instance, ms: number): void {
  inst.trace.push({ t: 'advance', ms });
  deliver(inst);
  inst.world.clock.advance(ms);
  deliver(inst);
}

/** Every output of the instance: the declared ones and the derived ones (NSP-012). */
function outputDecl(inst: Instance, name: string): ErasedValueOutput | SignalOutputDecl | undefined {
  return inst.spec.outputs[name] ?? inst.derivedOutputs[name];
}
function outputNames(inst: Instance): string[] {
  return [...Object.keys(inst.spec.outputs), ...Object.keys(inst.derivedOutputs)];
}

/**
 * The frame's observation of the value outputs a step SENDS (spec.ts `Patch.send`; all of them
 * when the patch names none): a defined value replaces the port's last (C3: undefined is not a
 * send). `fillOnly` is the first settle's read: outputs nothing sent yet, read once.
 */
function observe(inst: Instance, only: readonly string[] | undefined, fillOnly = false, state: Readonly<Record<string, unknown>> = inst.state): void {
  for (const name of only ?? outputNames(inst)) {
    const decl = outputDecl(inst, name);
    if (!decl || decl.type === 'signal') continue;
    if (fillOnly && name in inst.frameLast) continue;
    const v = canonicalise(asWriter(inst, () => decl.from(state as never, inst.view)));
    if (v !== undefined) inst.frameLast[name] = v;
  }
}

interface PatchLike {
  set?: Record<string, unknown>;
  emit?: string[];
  emitDerived?: string[];
  pulses?: ReadonlyArray<string | { derived: string }>;
  outcome?: ReducerOutcome;
  error?: string;
  send?: readonly string[];
  sendDerived?: readonly string[];
  after?: ReadonlyArray<{ ms: unknown; tag: string }>;
  cancel?: readonly string[];
  request?: SpecRequest;
  abort?: readonly string[];
  open?: { url: unknown; target?: unknown; features?: unknown };
  push?: { url: unknown };
  dispatch?: string;
  stack?: { op: 'push' | 'replace'; stack: unknown; target: unknown; params: unknown; transition: unknown };
  back?: ReadonlyArray<{ action: unknown; results: unknown }>;
  route?: { router: unknown; target: unknown; params: unknown; openInNewTab: unknown };
  popup?: PopupCall;
  backend?: SpecBackendCall;
}

/** Applies a reducer's patch; returns the value outputs the write sends (`send` + `sendDerived`), or undefined for all. */
function apply(inst: Instance, port: string, patchUnknown: unknown, outcomeRequired: boolean): readonly string[] | undefined {
  const { spec } = inst;
  if (!patchUnknown || typeof patchUnknown !== 'object') {
    throw new SpecError(`${spec.type}.${port}: reducer returned ${String(patchUnknown)}, not a patch`);
  }
  const patch = patchUnknown as PatchLike;
  if (patch.set) {
    for (const key of Object.keys(patch.set)) {
      if (!(key in spec.state)) throw new SpecError(`${spec.type}.${port}: set names undeclared state key "${key}"`);
    }
    inst.state = deepFreeze({ ...inst.state, ...patch.set });
  }
  // derived pulses first, then declared ones — the one order the format fixes (spec.ts `emitDerived`)
  if (patch.emitDerived) {
    for (const name of patch.emitDerived) {
      const out = inst.derivedOutputs[name];
      if (!out || out.type !== 'signal') throw new SpecError(`${spec.type}.${port}: emitDerived names no derived signal output "${name}"`);
      inst.pending.signals.push(name);
    }
  }
  if (patch.emit) {
    for (const name of patch.emit) {
      const out = spec.outputs[name];
      // an outcome port pulsed OUTSIDE an invocation (Array Filter's value-path `failure`, NSP-012) is a plain signal
      const outcomePort = spec.outcomes !== undefined && (spec.outcomes as readonly string[]).includes(name);
      if (!outcomePort && (!out || out.type !== 'signal')) throw new SpecError(`${spec.type}.${port}: emit names undeclared signal output "${name}"`);
      inst.pending.signals.push(name);
    }
  }
  // NSP-013 s14 — declared and derived pulses in one order (spec.ts `pulses`)
  if (patch.pulses) {
    for (const p of patch.pulses) {
      if (typeof p === 'string') {
        const out = spec.outputs[p];
        const outcomePort = spec.outcomes !== undefined && (spec.outcomes as readonly string[]).includes(p);
        if (!outcomePort && (!out || out.type !== 'signal')) throw new SpecError(`${spec.type}.${port}: pulses names undeclared signal output "${p}"`);
        inst.pending.signals.push(p);
      } else {
        const name = (p as { derived: string }).derived;
        const out = inst.derivedOutputs[name];
        if (!out || out.type !== 'signal') throw new SpecError(`${spec.type}.${port}: pulses names no derived signal output "${name}"`);
        inst.pending.signals.push(name);
      }
    }
  }
  if (outcomeRequired) {
    const o = patch.outcome;
    if (o !== 'done' && o !== 'unchanged' && o !== 'failure' && o !== 'deferred' && o !== 'pending') {
      throw new SpecError(`${spec.type}.${port}: outcome input returned no outcome`);
    }
    if (o === 'deferred' && !spec.afterInputs) {
      throw new SpecError(`${spec.type}.${port}: deferred an outcome but the spec has no afterInputs to resolve it`);
    }
    if (o === 'pending' && !spec.world) {
      throw new SpecError(`${spec.type}.${port}: left an outcome pending but the spec has no world handlers to resolve it`);
    }
    const slot: OutcomeSlot = patch.error === undefined ? { port, outcome: o } : { port, outcome: o, error: patch.error };
    if (o !== 'deferred' && o !== 'pending') slot.reportedAt = inst.reports++;
    inst.pending.outcomes.push(slot);
  } else if (patch.outcome !== undefined) {
    throw new SpecError(`${spec.type}.${port}: returned an outcome but the input is not declared outcome: true`);
  }
  if (patch.send) {
    for (const name of patch.send) {
      const out = spec.outputs[name];
      if (!out || out.type === 'signal') throw new SpecError(`${spec.type}.${port}: send names undeclared value output "${name}"`);
    }
  }
  if (patch.sendDerived) {
    for (const name of patch.sendDerived) {
      const out = inst.derivedOutputs[name];
      if (!out || out.type === 'signal') throw new SpecError(`${spec.type}.${port}: sendDerived names no derived value output "${name}"`);
    }
  }
  effects(inst, port, patch);
  if (patch.send === undefined && patch.sendDerived === undefined) return undefined;
  return [...(patch.send ?? []), ...(patch.sendDerived ?? [])];
}

/** The world effects of a patch (spec.ts `Patch`): timers, requests, aborts, an open — in the order the patch names them. */
function effects(inst: Instance, port: string, patch: PatchLike): void {
  const { world, spec } = inst;
  for (const a of patch.after ?? []) {
    if (!spec.world?.timer) throw new SpecError(`${spec.type}.${port}: asked for a timer but the spec has no world.timer handler`);
    const tag = a.tag;
    const handle = world.clock.schedule(a.ms, () => {
      const list = inst.timers.get(tag);
      if (list) {
        const i = list.indexOf(handle);
        if (i >= 0) list.splice(i, 1);
      }
      // a timer's handler runs at the firing, like the callback it models (see `advance`)
      handleInbound(inst, { kind: 'timer', tag });
    });
    inst.timers.set(tag, [...(inst.timers.get(tag) ?? []), handle]);
  }
  for (const tag of patch.cancel ?? []) {
    for (const handle of inst.timers.get(tag) ?? []) world.clock.cancel(handle);
    inst.timers.delete(tag);
  }
  if (patch.request) {
    if (!spec.world?.response) throw new SpecError(`${spec.type}.${port}: issued a request but the spec has no world.response handler`);
    const r = patch.request;
    if (typeof r.id !== 'string' || inst.requests.has(r.id)) throw new SpecError(`${spec.type}.${port}: a request needs an id the instance has not used (${String(r.id)})`);
    const worldId = world.network.issue({ method: r.method, url: r.url, headers: r.headers, body: r.body }, (d: Delivery) => {
      inst.inbox.push({ kind: 'response', response: { id: r.id, ...d } as WorldResponse });
    });
    inst.requests.set(r.id, worldId);
    const record = world.network.requests[world.network.requests.length - 1];
    const event: TraceEvent = { t: 'request', method: canonicalise(record.method), url: record.url, headers: { ...record.headers } };
    if (record.body !== undefined) event.body = canonicalise(record.body);
    inst.pending.requests.push(event);
  }
  for (const id of patch.abort ?? []) {
    const worldId = inst.requests.get(id);
    if (worldId !== undefined) world.network.abort(worldId);
  }
  // BACKEND (world.ts, NSP-014 s21): the call recorded as handed, in the request group; the answer lands in the inbox
  if (patch.backend) {
    if (!spec.world?.backend) throw new SpecError(`${spec.type}.${port}: called a backend but the spec has no world.backend handler`);
    const c = patch.backend;
    if (typeof c.id !== 'string') throw new SpecError(`${spec.type}.${port}: a backend call needs an id`);
    const call = { op: c.op, backend: c.backend, args: c.args };
    world.backend.issue(call, (d) => inst.inbox.push({ kind: 'backend', answer: { id: c.id, ...d } as BackendAnswerEvent }));
    inst.pending.requests.push(backendEvent(call));
  }
  // LOCATION (world.ts): only with a window — a spec reads `viewport()` first, as a node checks `typeof window`
  if ((patch.open || patch.push || patch.dispatch !== undefined) && !world.location) {
    throw new SpecError(`${spec.type}.${port}: used the location in a play with no window`);
  }
  if (!world.location) return stackEffects(inst, port, patch);
  const location = world.location!;
  const record = (c: LocationCall) => inst.pending.location.push(locationEvent(c));
  if (patch.open) {
    const o = patch.open;
    location.open(o.url, o.target, o.features);
    record({ call: 'open', url: o.url, target: o.target, features: o.features });
  }
  if (patch.push) {
    // a refused push is still a call the node made: recorded, and the href stays (world.ts LOCATION)
    try {
      location.push(patch.push.url);
    } catch {
      /* the spec said what follows a refusal; the world only keeps the href */
    }
    record({ call: 'push', url: patch.push.url });
  }
  if (patch.dispatch !== undefined) {
    // recorded BEFORE the listeners run: a listener's own calls come after the dispatch, as they are made
    record({ call: 'dispatch', event: patch.dispatch });
    location.dispatch({ type: patch.dispatch });
  }
  stackEffects(inst, port, patch);
}

/** STACK (world.ts, NSP-015 s18): a push or replace recorded as handed, then the pops in order — each a `stack` event in the LOCATION group. */
function stackEffects(inst: Instance, port: string, patch: PatchLike): void {
  const { world, spec } = inst;
  if (patch.stack) {
    const c = patch.stack;
    if (c.op !== 'push' && c.op !== 'replace') throw new SpecError(`${spec.type}.${port}: a stack effect's op is push or replace, not ${String(c.op)}`);
    world.stack.record({ call: c.op, stack: c.stack, target: c.target, params: c.params, transition: c.transition });
    inst.pending.location.push(world.stack.calls[world.stack.calls.length - 1]);
  }
  for (const b of patch.back ?? []) {
    if (!world.stack.inPushedPage) throw new SpecError(`${spec.type}.${port}: popped a stack in a play where the node sits in no pushed page`);
    world.stack.back(b.action, b.results);
    inst.pending.location.push(world.stack.calls[world.stack.calls.length - 1]);
  }
  // ROUTE (world.ts, NSP-015 s19): a navigate recorded as handed — a `route` event in the same group
  if (patch.route) {
    world.router.record(patch.route);
    inst.pending.location.push(world.router.calls[world.router.calls.length - 1]);
  }
  // POPUP (world.ts, NSP-015 s20): a show or a close recorded as handed — a `popup` event in the same group
  if (patch.popup) {
    if (patch.popup.op !== 'show' && patch.popup.op !== 'close') throw new SpecError(`${spec.type}.${port}: a popup effect's op is show or close, not ${String((patch.popup as { op?: unknown }).op)}`);
    world.popup.record(patch.popup);
    inst.pending.location.push(world.popup.calls[world.popup.calls.length - 1]);
  }
}

/**
 * Hands the inbox — the world's answers, which land like promise resolutions — to the spec's
 * world handlers, in arrival order, until it is empty: a handler may issue a request the world
 * answers at once, which lands in the same delivery.
 */
function deliver(inst: Instance): void {
  let rounds = 0;
  while (inst.inbox.length > 0) {
    if (++rounds > 1000) throw new SpecError(`${inst.spec.type}: the world keeps delivering — a handler answers every delivery with a new request?`);
    handleInbound(inst, inst.inbox.shift()!);
  }
}

/** One delivery through its handler: the patch applied like any reducer's, its `outcomes` settling `pending` invocations. */
function handleInbound(inst: Instance, item: Inbound): void {
  const { spec, view } = inst;
  let patch: unknown;
  let name: string;
  if (item.kind === 'timer') {
    name = 'world.timer';
    if (!spec.world?.timer) throw new SpecError(`${spec.type}: a timer fired and the spec has no world.timer handler`);
    patch = asWriter(inst, () => spec.world!.timer!(inst.state as never, inst.inputs as never, item.tag, view));
  } else if (item.kind === 'resize') {
    name = 'world.resize';
    if (!spec.world?.resize) throw new SpecError(`${spec.type}: the viewport was resized and the spec listens with no world.resize handler`);
    patch = asWriter(inst, () => spec.world!.resize!(inst.state as never, inst.inputs as never, view));
  } else if (item.kind === 'popup') {
    name = 'world.popup';
    if (!spec.world?.popup) throw new SpecError(`${spec.type}: the person did something to a popup and the spec has no world.popup handler`);
    patch = asWriter(inst, () => spec.world!.popup!(inst.state as never, inst.inputs as never, item.event, view));
  } else if (item.kind === 'backend') {
    name = 'world.backend';
    if (!spec.world?.backend) throw new SpecError(`${spec.type}: a backend answered and the spec has no world.backend handler`);
    patch = asWriter(inst, () => spec.world!.backend!(inst.state as never, inst.inputs as never, item.answer, view));
  } else if (item.kind === 'page') {
    name = 'world.page';
    if (!spec.world?.page) throw new SpecError(`${spec.type}: a Router handed its page params and the spec has no world.page handler`);
    patch = asWriter(inst, () => spec.world!.page!(inst.state as never, inst.inputs as never, item.params, view));
  } else {
    name = 'world.response';
    if (!spec.world?.response) throw new SpecError(`${spec.type}: an answer landed and the spec has no world.response handler`);
    patch = asWriter(inst, () => spec.world!.response!(inst.state as never, inst.inputs as never, item.response, view));
    inst.requests.delete(item.response.id);
  }
  const sends = apply(inst, `<${name}>`, patch, false);
  resolveOpen(inst, name, (patch as { outcomes?: ReadonlyArray<{ port: string; outcome: Outcome; error?: string }> }).outcomes ?? [], ['pending']);
  observe(inst, sends);
  deliverChanges(inst);
}

/**
 * Hands the registry's notifications (NSP-012) to the spec's `change` handler, in notification
 * order, until none is left — a handler's own writes queue more. Returns how many were handed
 * over, so `settle` knows whether to run the frame-end reducer again.
 */
function deliverChanges(inst: Instance): number {
  let delivered = 0;
  while (inst.changes.length > 0) {
    if (++delivered > 1000) throw new SpecError(`${inst.spec.type}: the registry keeps notifying — a change handler writes what it watches?`);
    const event = inst.changes.shift()!;
    const { spec, view } = inst;
    if (!spec.world?.change) throw new SpecError(`${spec.type}: a watched entry changed and the spec has no world.change handler`);
    const patch = asWriter(inst, () => spec.world!.change!(inst.state as never, inst.inputs as never, event, view));
    const sends = apply(inst, '<world.change>', patch, false);
    resolveOpen(inst, 'world.change', (patch as { outcomes?: ReadonlyArray<{ port: string; outcome: Outcome; error?: string }> }).outcomes ?? [], ['pending']);
    observe(inst, sends);
  }
  return delivered;
}

export function settle(inst: Instance): void {
  inst.trace.push({ t: 'settle' });
  inst.settles++;
  // the frame-end reducer (spec.ts `AfterInputs`): the deferred work of the frame, done once
  // against the frame's final inputs and state, before the frame's observations are recorded —
  // and again after a registry change it caused was delivered (the scheduler's callback loop)
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    if (inst.spec.afterInputs) {
      const patch = asWriter(inst, () => (inst.spec.afterInputs as (s: unknown, i: unknown, w: WorldView) => unknown)(inst.state, inst.inputs, inst.view));
      const sends = apply(inst, '<afterInputs>', patch, false);
      // the frame-end reducer settles what was deferred to it — and may settle a PENDING invocation
      // whose world conversation ends before it starts (HTTP Request's no-URL failure, NSP-007)
      resolveOpen(inst, 'afterInputs', (patch as { outcomes?: ReadonlyArray<{ port: string; outcome: Outcome; error?: string }> }).outcomes ?? [], ['deferred', 'pending']);
      observe(inst, sends);
    }
    if (deliverChanges(inst) === 0 || !inst.spec.afterInputs) break;
  }
  const unresolved = inst.pending.outcomes.find((o) => o.outcome === 'deferred');
  if (unresolved) throw new SpecError(`${inst.spec.type}: "${unresolved.port}" deferred its outcome and afterInputs did not resolve it this frame`);
  // what the world delivered — answers scripted to land at once land in the frame that asked
  deliver(inst);
  // the first settle's connection-time read: every output nothing has sent (see the header)
  if (inst.settles === 1) observe(inst, undefined, true);
  for (const name of outputNames(inst).sort()) {
    if (!(name in inst.frameLast)) continue; // C3 — nothing defined was produced this frame
    const v = inst.frameLast[name];
    const key = JSON.stringify(v);
    if (inst.lastSent[name] === key) continue;
    inst.lastSent[name] = key;
    inst.trace.push({ t: 'value', port: name, value: v });
  }
  inst.frameLast = {};
  for (const s of inst.pending.signals) inst.trace.push({ t: 'signal', port: s }); // C2, C4
  // outcomes in REPORT order (trace.ts); a `pending` one stays for a later frame
  const reported = inst.pending.outcomes.filter((o) => o.reportedAt !== undefined).sort((a, b) => a.reportedAt! - b.reportedAt!);
  for (const o of reported) {
    const value = o.outcome as Outcome;
    inst.trace.push(o.error === undefined ? { t: 'outcome', port: o.port, value } : { t: 'outcome', port: o.port, value, error: o.error });
  }
  for (const r of inst.pending.requests) inst.trace.push(r);
  for (const l of inst.pending.location) inst.trace.push(l);
  inst.pending = { signals: [], outcomes: inst.pending.outcomes.filter((o) => o.reportedAt === undefined), requests: [], location: [] };
}

/**
 * A frame-end or world handler's `outcomes` fill the open slots the invoking reducers left, per
 * port oldest first (spec.ts `AfterInputsPatch`, `WorldHandlers`). Rule 3, kept at run time:
 * exactly one outcome per invocation — a resolution with no open invocation behind it is a spec
 * error, and `settle` refuses a `deferred` slot still open after the frame-end reducer.
 */
function resolveOpen(inst: Instance, by: string, outcomes: ReadonlyArray<{ port: string; outcome: Outcome; error?: string }>, kinds: ReadonlyArray<'deferred' | 'pending'>): void {
  for (const r of outcomes) {
    if (r.outcome !== 'done' && r.outcome !== 'unchanged' && r.outcome !== 'failure') {
      throw new SpecError(`${inst.spec.type}.<${by}>: resolved "${r.port}" to ${String(r.outcome)}, not an outcome`);
    }
    const slot = inst.pending.outcomes.find((o) => o.port === r.port && (kinds as readonly string[]).includes(o.outcome));
    if (!slot) {
      throw new SpecError(
        kinds.includes('deferred')
          ? `${inst.spec.type}.<${by}>: resolved an outcome for "${r.port}" that no invocation deferred this frame${inst.spec.world ? ' or left pending' : ''}`
          : `${inst.spec.type}.<${by}>: resolved an outcome for "${r.port}" that no invocation left pending`
      );
    }
    slot.outcome = r.outcome;
    slot.reportedAt = inst.reports++;
    if (r.error !== undefined) slot.error = r.error;
    else delete slot.error;
  }
}

/** A copy of the trace so far. */
export function trace(inst: Instance): TraceEvent[] {
  return inst.trace.map((e) => ({ ...e }));
}

/** Runs a scripted sequence from a fresh mount and returns its trace. */
export function run(spec: AnyNodeSpec, params: Record<string, unknown>, steps: readonly Step[], world?: World): TraceEvent[] {
  // a play under a world runs in its zone (NSP-013, world.ts TIME ZONE), as the adapter's does
  const restoreZone = world ? installTimeZone(world) : () => undefined;
  try {
    const inst = mount(spec, params, world);
    for (const step of steps) {
      if (step === 'settle') settle(inst);
      else if ('signal' in step) signal(inst, step.signal);
      else if ('advance' in step) advance(inst, step.advance);
      else set(inst, step.set, step.value);
    }
    return trace(inst);
  } finally {
    restoreZone();
  }
}
