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
 * last settle, the queued signals, and the queued outcomes. A value is recorded when it changed
 * (compared canonically) — so a reducer that sets a state key to the value it already had
 * produces no `value` event, and the first settle records every output that is not `undefined`
 * (C8, the first update consolidates).
 *
 * `mount(spec, params)` creates the instance with the spec's initial state and each value input
 * at its declared default, then applies `params` as ordinary writes (recorded as `set` events)
 * in the spec's input declaration order — which is what the runtime does with a node's
 * parameters before its first frame. Mount does NOT settle; the scenario's first `settle` is where
 * the first frame's events land (NSP-002 §4, C8).
 *
 * Deterministic by construction: no clock, no randomness, no I/O — two runs of one sequence are
 * byte-identical (AC3).
 */

import { coerce } from './coerce';
import type { AnyNodeSpec, Outcome, InputDecl } from './spec';
import { isSignalInput } from './spec';
import type { TraceEvent } from './trace';

export interface Instance {
  readonly spec: AnyNodeSpec;
  state: Readonly<Record<string, unknown>>;
  inputs: Readonly<Record<string, unknown>>;
  /** Derived (dynamic) ports declared for this instance's params, if the spec has any. */
  derivedInputs: Readonly<Record<string, InputDecl>>;
  derivedValues: Readonly<Record<string, unknown>>;
  readonly trace: TraceEvent[];
  pending: { signals: string[]; outcomes: Array<{ port: string; outcome: Outcome; error?: string }> };
  lastSent: Record<string, string>;
  settles: number;
}

export class SpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecError';
  }
}

/** Canonical comparison key for "did this value change" — NSP-002 owns the full canonicaliser. */
export function valueKey(v: unknown): string {
  if (typeof v === 'number') return Object.is(v, -0) ? 'n:-0' : `n:${v}`;
  if (v instanceof Date) return `d:${v.toISOString()}`;
  if (v === undefined) return 'u';
  return `j:${JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? sortKeys(x as Record<string, unknown>) : x))}`;
}
function sortKeys(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) out[k] = o[k];
  return out;
}

const deepFreeze = <T>(o: T): Readonly<T> => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
};

export function mount(spec: AnyNodeSpec, params: Record<string, unknown> = {}): Instance {
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
  const inst: Instance = {
    spec,
    state: deepFreeze({ ...spec.state }),
    inputs: deepFreeze(inputs),
    derivedInputs: deepFreeze(derivedInputs),
    derivedValues: deepFreeze(derivedValues),
    trace: [],
    pending: { signals: [], outcomes: [] },
    lastSent: {},
    settles: 0
  };
  // params, in declaration order (declared inputs first, then derived), so a trace is stable
  // whatever order the caller's object literal had.
  const order = [...Object.keys(spec.inputs), ...Object.keys(derivedInputs)];
  for (const name of order) {
    if (Object.prototype.hasOwnProperty.call(params, name)) set(inst, name, params[name]);
  }
  for (const name of Object.keys(params)) {
    if (!order.includes(name)) throw new SpecError(`${spec.type}: param "${name}" is not an input`);
  }
  return inst;
}

export function set(inst: Instance, port: string, value: unknown): void {
  const { spec } = inst;
  const declared = spec.inputs[port];
  if (declared) {
    if (isSignalInput(declared)) throw new SpecError(`${spec.type}: "${port}" is a signal input — use signal()`);
    inst.trace.push({ t: 'set', port, value });
    const coerced = coerce(declared.coerce, value, declared.default);
    inst.inputs = deepFreeze({ ...inst.inputs, [port]: coerced });
    const reducer = spec.on[port];
    if (typeof reducer === 'function') {
      apply(inst, port, (reducer as (s: unknown, v: unknown, i: unknown) => unknown)(inst.state, coerced, inst.inputs), false);
    }
    return;
  }
  const derived = inst.derivedInputs[port];
  if (derived && !isSignalInput(derived)) {
    inst.trace.push({ t: 'set', port, value });
    const coerced = coerce(derived.coerce, value, derived.default);
    inst.derivedValues = deepFreeze({ ...inst.derivedValues, [port]: coerced });
    if (!spec.derived) throw new SpecError(`${spec.type}: derived port without a derived reducer`);
    apply(inst, port, spec.derived.on(inst.state as never, port, coerced, inst.derivedValues), false);
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
  apply(inst, port, (reducer as (s: unknown, i: unknown) => unknown)(inst.state, inst.inputs), declared.outcome === true);
}

function apply(inst: Instance, port: string, patchUnknown: unknown, outcomeRequired: boolean): void {
  const { spec } = inst;
  if (!patchUnknown || typeof patchUnknown !== 'object') {
    throw new SpecError(`${spec.type}.${port}: reducer returned ${String(patchUnknown)}, not a patch`);
  }
  const patch = patchUnknown as { set?: Record<string, unknown>; emit?: string[]; outcome?: Outcome; error?: string };
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
    if (patch.outcome !== 'done' && patch.outcome !== 'unchanged' && patch.outcome !== 'failure') {
      throw new SpecError(`${spec.type}.${port}: outcome input returned no outcome`);
    }
    inst.pending.outcomes.push(
      patch.error === undefined ? { port, outcome: patch.outcome } : { port, outcome: patch.outcome, error: patch.error }
    );
  } else if (patch.outcome !== undefined) {
    throw new SpecError(`${spec.type}.${port}: returned an outcome but the input is not declared outcome: true`);
  }
}

export function settle(inst: Instance): void {
  inst.trace.push({ t: 'settle' });
  inst.settles++;
  for (const [name, decl] of Object.entries(inst.spec.outputs)) {
    if (decl.type === 'signal') continue;
    const v = decl.from(inst.state as never);
    if (v === undefined) continue; // C3
    const key = valueKey(v);
    if (inst.lastSent[name] === key) continue;
    inst.lastSent[name] = key;
    inst.trace.push({ t: 'value', port: name, value: v });
  }
  for (const s of inst.pending.signals) inst.trace.push({ t: 'signal', port: s }); // C2, C4
  for (const o of inst.pending.outcomes) {
    inst.trace.push(o.error === undefined ? { t: 'outcome', port: o.port, value: o.outcome } : { t: 'outcome', port: o.port, value: o.outcome, error: o.error });
  }
  inst.pending = { signals: [], outcomes: [] };
}

/** A copy of the trace so far. */
export function trace(inst: Instance): TraceEvent[] {
  return inst.trace.map((e) => ({ ...e }));
}

/** One scripted step of a scenario (NSP-003 reads these from JSON). */
export type Step = { set: string; value: unknown } | { signal: string } | 'settle';

/** Runs a scripted sequence from a fresh mount and returns its trace. */
export function run(spec: AnyNodeSpec, params: Record<string, unknown>, steps: readonly Step[]): TraceEvent[] {
  const inst = mount(spec, params);
  for (const step of steps) {
    if (step === 'settle') settle(inst);
    else if ('signal' in step) signal(inst, step.signal);
    else set(inst, step.set, step.value);
  }
  return trace(inst);
}
