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
 * A `request` effect is recorded as a `request` event in the frame it was issued in.
 *
 * Deterministic by construction: no clock of its own, no randomness of its own, no I/O — two
 * runs of one sequence on one script are byte-identical (AC3).
 */

import type { Step } from './adapter';
import { canonicalise, canonicalKey } from './canonical';
import { coerce } from './coerce';
import type { AnyNodeSpec, Outcome, InputDecl, ReducerOutcome, SpecRequest, WorldResponse, WorldView } from './spec';
import { isSignalInput } from './spec';
import type { TraceEvent } from './trace';
import { World, type Delivery } from './world';

/** One thing the world handed back, waiting to be delivered to the spec. */
type Inbound = { kind: 'timer'; tag: string } | { kind: 'response'; response: WorldResponse };

interface OutcomeSlot {
  port: string;
  outcome: ReducerOutcome;
  error?: string;
  /** Report order (trace.ts): set when the outcome became terminal. */
  reportedAt?: number;
}

export interface Instance {
  readonly spec: AnyNodeSpec;
  readonly world: World;
  state: Readonly<Record<string, unknown>>;
  inputs: Readonly<Record<string, unknown>>;
  /** Derived (dynamic) ports declared for this instance's params, if the spec has any. */
  derivedInputs: Readonly<Record<string, InputDecl>>;
  derivedValues: Readonly<Record<string, unknown>>;
  readonly trace: TraceEvent[];
  pending: { signals: string[]; outcomes: OutcomeSlot[]; requests: TraceEvent[] };
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

const deepFreeze = <T>(o: T): Readonly<T> => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
};

/** The world as a reducer reads it — the four pure reads and nothing that mutates. */
function viewOf(world: World): WorldView {
  return {
    now: () => world.clock.now(),
    random: () => world.random.next(),
    bytes: (n) => world.random.bytes(n),
    uuid: () => world.random.uuid()
  };
}

export function mount(spec: AnyNodeSpec, params: Record<string, unknown> = {}, world: World = new World()): Instance {
  const inputs: Record<string, unknown> = {};
  for (const [name, decl] of Object.entries(spec.inputs)) {
    if (!isSignalInput(decl)) inputs[name] = decl.default;
  }
  const derivedInputs = spec.derived ? spec.derived.inputs(deepFreeze({ ...params })) : {};
  const derivedValues: Record<string, unknown> = {};
  for (const [name, decl] of Object.entries(derivedInputs)) {
    if (name in spec.inputs) throw new SpecError(`${spec.type}: derived port "${name}" shadows a declared input`);
    derivedValues[name] = decl.default;
  }
  // the part of the initial state the world supplies (spec.ts `init`) — drawn at mount, before the params
  const initial = spec.init ? { ...spec.state, ...spec.init(viewOf(world)) } : { ...spec.state };
  for (const key of Object.keys(initial)) {
    if (!(key in spec.state)) throw new SpecError(`${spec.type}: init names undeclared state key "${key}"`);
  }
  const inst: Instance = {
    spec,
    world,
    state: deepFreeze(initial),
    inputs: deepFreeze(inputs),
    derivedInputs: deepFreeze(derivedInputs),
    derivedValues: deepFreeze(derivedValues),
    trace: [],
    pending: { signals: [], outcomes: [], requests: [] },
    frameLast: {},
    lastSent: {},
    settles: 0,
    reports: 0,
    inbox: [],
    timers: new Map(),
    requests: new Map()
  };
  // params in the caller's key order — the adapter contract (adapter.ts), and the runtime's own
  // order. Unknown params are refused before anything is applied; a port `derived.discover`
  // accepts is not unknown (the runtime's `registerInputIfNeeded` runs before `hasInput`).
  for (const name of Object.keys(params)) {
    if (!(name in spec.inputs) && !(name in derivedInputs) && !discoverable(inst, name)) {
      throw new SpecError(`${spec.type}: param "${name}" is not an input`);
    }
  }
  for (const name of Object.keys(params)) set(inst, name, params[name]);
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
  inst.derivedValues = deepFreeze({ ...inst.derivedValues, [port]: decl.default });
  return decl;
}

export function set(inst: Instance, port: string, value: unknown): void {
  const { spec } = inst;
  const world = viewOf(inst.world);
  const declared = spec.inputs[port];
  if (declared) {
    if (isSignalInput(declared)) throw new SpecError(`${spec.type}: "${port}" is a signal input — use signal()`);
    inst.trace.push(setEvent(port, value));
    const coerced = coerce(declared.coerce, value, declared.default);
    inst.inputs = deepFreeze({ ...inst.inputs, [port]: coerced });
    const reducer = spec.on[port];
    const sends =
      typeof reducer === 'function'
        ? apply(inst, port, (reducer as (s: unknown, v: unknown, i: unknown, w: WorldView) => unknown)(inst.state, coerced, inst.inputs, world), false)
        : undefined;
    observe(inst, sends);
    return;
  }
  const derived = inst.derivedInputs[port] ?? discover(inst, port);
  if (derived && !isSignalInput(derived)) {
    inst.trace.push(setEvent(port, value));
    const coerced = coerce(derived.coerce, value, derived.default);
    inst.derivedValues = deepFreeze({ ...inst.derivedValues, [port]: coerced });
    if (!spec.derived) throw new SpecError(`${spec.type}: derived port without a derived reducer`);
    observe(inst, apply(inst, port, spec.derived.on(inst.state as never, port, coerced, inst.derivedValues, world), false));
    return;
  }
  throw new SpecError(`${spec.type}: no value input "${port}"`);
}

export function signal(inst: Instance, port: string): void {
  const { spec } = inst;
  const declared = spec.inputs[port];
  if (!declared) throw new SpecError(`${spec.type}: no input "${port}"`);
  if (!isSignalInput(declared)) throw new SpecError(`${spec.type}: "${port}" is a value input — use set()`);
  const reducer = spec.on[port];
  if (typeof reducer !== 'function') throw new SpecError(`${spec.type}: signal input "${port}" has no reducer`);
  inst.trace.push({ t: 'in', port });
  observe(inst, apply(inst, port, (reducer as (s: unknown, i: unknown, w: WorldView) => unknown)(inst.state, inst.inputs, viewOf(inst.world)), declared.outcome === true));
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

/**
 * The frame's observation of the value outputs a step SENDS (spec.ts `Patch.send`; all of them
 * when the patch names none): a defined value replaces the port's last (C3: undefined is not a send).
 */
function observe(inst: Instance, only?: readonly string[]): void {
  for (const name of only ?? Object.keys(inst.spec.outputs)) {
    const decl = inst.spec.outputs[name];
    if (!decl || decl.type === 'signal') continue;
    const v = canonicalise(decl.from(inst.state as never));
    if (v !== undefined) inst.frameLast[name] = v;
  }
}

interface PatchLike {
  set?: Record<string, unknown>;
  emit?: string[];
  outcome?: ReducerOutcome;
  error?: string;
  send?: readonly string[];
  after?: ReadonlyArray<{ ms: unknown; tag: string }>;
  cancel?: readonly string[];
  request?: SpecRequest;
  abort?: readonly string[];
}

/** Applies a reducer's patch; returns the value outputs the write sends (`send`), or undefined for all. */
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
  if (patch.emit) {
    for (const name of patch.emit) {
      const out = spec.outputs[name];
      if (!out || out.type !== 'signal') throw new SpecError(`${spec.type}.${port}: emit names undeclared signal output "${name}"`);
      inst.pending.signals.push(name);
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
  effects(inst, port, patch);
  return patch.send;
}

/** The world effects of a patch (spec.ts `Patch`): timers, requests, aborts — in the order the patch names them. */
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
  const { spec } = inst;
  const world = viewOf(inst.world);
  let patch: unknown;
  let name: string;
  if (item.kind === 'timer') {
    name = 'world.timer';
    if (!spec.world?.timer) throw new SpecError(`${spec.type}: a timer fired and the spec has no world.timer handler`);
    patch = spec.world.timer(inst.state as never, inst.inputs as never, item.tag, world);
  } else {
    name = 'world.response';
    if (!spec.world?.response) throw new SpecError(`${spec.type}: an answer landed and the spec has no world.response handler`);
    patch = spec.world.response(inst.state as never, inst.inputs as never, item.response, world);
    inst.requests.delete(item.response.id);
  }
  const sends = apply(inst, `<${name}>`, patch, false);
  resolveOpen(inst, name, (patch as { outcomes?: ReadonlyArray<{ port: string; outcome: Outcome; error?: string }> }).outcomes ?? [], ['pending']);
  observe(inst, sends);
}

export function settle(inst: Instance): void {
  inst.trace.push({ t: 'settle' });
  inst.settles++;
  // the frame-end reducer (spec.ts `AfterInputs`): the deferred work of the frame, done once
  // against the frame's final inputs and state, before the frame's observations are recorded
  if (inst.spec.afterInputs) {
    const patch = (inst.spec.afterInputs as (s: unknown, i: unknown, w: WorldView) => unknown)(inst.state, inst.inputs, viewOf(inst.world));
    const sends = apply(inst, '<afterInputs>', patch, false);
    // the frame-end reducer settles what was deferred to it — and may settle a PENDING invocation
    // whose world conversation ends before it starts (HTTP Request's no-URL failure, NSP-007)
    resolveOpen(inst, 'afterInputs', (patch as { outcomes?: ReadonlyArray<{ port: string; outcome: Outcome; error?: string }> }).outcomes ?? [], ['deferred', 'pending']);
    observe(inst, sends);
  }
  const unresolved = inst.pending.outcomes.find((o) => o.outcome === 'deferred');
  if (unresolved) throw new SpecError(`${inst.spec.type}: "${unresolved.port}" deferred its outcome and afterInputs did not resolve it this frame`);
  // what the world delivered — answers scripted to land at once land in the frame that asked
  deliver(inst);
  observe(inst); // the settle-time value, when defined, is the frame's last
  for (const name of Object.keys(inst.spec.outputs).sort()) {
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
  inst.pending = { signals: [], outcomes: inst.pending.outcomes.filter((o) => o.reportedAt === undefined), requests: [] };
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
  const inst = mount(spec, params, world);
  for (const step of steps) {
    if (step === 'settle') settle(inst);
    else if ('signal' in step) signal(inst, step.signal);
    else if ('advance' in step) advance(inst, step.advance);
    else set(inst, step.set, step.value);
  }
  return trace(inst);
}
