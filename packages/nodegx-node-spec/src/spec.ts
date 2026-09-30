/**
 * The spec format — `defineNode()` (NSP-001 §2.1).
 *
 * A node's behaviour as data plus pure functions: ports, types, defaults, state, and reducers
 * `(state, inputs, …) → { set, emit, outcome }`. No `this`, no frames, no dirty flags, no clock,
 * no randomness (those arrive through the world, NSP-007). For a pure node the spec IS the
 * reference implementation; the interpreter (`interpreter.ts`) runs it.
 *
 * Rules the TYPE SYSTEM enforces (graded by tests/types.test.ts, one `@ts-expect-error` each):
 *   1. `emit` names only declared signal outputs.
 *   2. `set` names only declared state keys.
 *   3. A reducer for an input declared `outcome: true` returns an outcome on every path
 *      (the ERG-001 contract: exactly one outcome per invocation). With `noImplicitReturns`, a
 *      branch that falls off the end is also a compile error.
 *   4. A signal input MUST have a reducer; a value input MAY (the default is "store it").
 *
 * Rules the interpreter enforces at run time, because a spec can also arrive as data:
 *   - the same three, again, with a thrown error naming the offending key;
 *   - a reducer receives FROZEN state and inputs and cannot mutate either.
 *
 * Not a DSL. If the spec language ever needs its own debugger, it has failed (NSP-001 §4).
 */

import type { Coercion } from './coerce';

// ------------------------------------------------------------------------------------------------
// port types — the catalog's `portTypeNames` (node-catalog.json) minus `signal`, which is its own
// declaration shape below. `dimension` is the unit-carrying type (C10): a value may travel as a
// number or as `{ value, unit }`; see `UnitValue`.

export type ValueType =
  | '*'
  | 'array'
  | 'boolean'
  | 'cloudfile'
  | 'color'
  | 'component'
  | 'date'
  | 'dimension'
  | 'domelement'
  | 'enum'
  | 'font'
  | 'icon'
  | 'image'
  | 'mediastream'
  | 'number'
  | 'object'
  | 'optionslist'
  | 'pages'
  | 'proplist'
  | 'reference'
  | 'source'
  | 'string'
  | 'stringlist'
  | 'textStyle';

/** C10 — some values travel with a unit. Kept whole by the canonicaliser (NSP-002). */
export interface UnitValue {
  value: number;
  unit: string;
}

/** The three terminal outcomes (ERG-001). Exactly one per invocation of an `outcome: true` input. */
export type Outcome = 'done' | 'unchanged' | 'failure';

// ------------------------------------------------------------------------------------------------
// declarations

/**
 * What an EDITOR needs to draw a port — the same fields the catalog carries today. The editor is
 * a client of the spec like any target (README §1, third sentence; R6): anything it shows about a
 * node it must be able to learn here, never from the runtime's registration code. Optional in the
 * type so a spec can be written behaviour-first; the catalog-parity gate (tests/catalog-parity)
 * is what says when a node's spec is complete enough for the editor.
 */
export interface PortMeta {
  displayName?: string;
  group?: string;
  description?: string;
}

export interface ValueInputDecl extends PortMeta {
  type: ValueType;
  /** What the port holds before anything is sent to it. Also the `fallback` of a `typed-*` coercion. */
  default?: unknown;
  /** Which conversion the runtime applies on arrival. Declared, never implied — see coerce.ts. */
  coerce?: Coercion;
  /** For `enum` ports: the accepted values. */
  enums?: readonly string[];
}

export interface SignalInputDecl extends PortMeta {
  type: 'signal';
  /** The input reports an outcome (ERG-001) — its reducer must return one on every path. */
  outcome?: boolean;
}

export type InputDecl = ValueInputDecl | SignalInputDecl;
export type InputsDecl = Record<string, InputDecl>;

export interface ValueOutputDecl<S> extends PortMeta {
  type: ValueType;
  /** The output as a function of state. Called at settle; `undefined` is never sent (C3). */
  from: (state: Readonly<S>) => unknown;
}

export interface SignalOutputDecl extends PortMeta {
  type: 'signal';
}

/** The outcome ports the runtime declares for a node (ERG-001): always `done` + `completed`; `unchanged` and `failure` only when the node can. */
export const OUTCOME_PORTS = ['done', 'unchanged', 'failure', 'completed'] as const;

export type OutputDecl<S> = ValueOutputDecl<S> | SignalOutputDecl;
export type OutputsDecl<S> = Record<string, OutputDecl<S>>;

// ------------------------------------------------------------------------------------------------
// key selectors

type SignalKeys<T> = { [K in keyof T]: T[K] extends { type: 'signal' } ? K : never }[keyof T];
type OutcomeKeys<I> = { [K in keyof I]: I[K] extends { type: 'signal'; outcome: true } ? K : never }[keyof I];
type PlainSignalKeys<I> = Exclude<SignalKeys<I>, OutcomeKeys<I>>;
type ValueKeys<I> = Exclude<keyof I, SignalKeys<I>>;

/** The TypeScript type a reducer sees for a port of a given declared type. */
export type ValueOf<D> = D extends { type: 'number' }
  ? number
  : D extends { type: 'string' | 'enum' | 'color' }
  ? string
  : D extends { type: 'boolean' }
  ? boolean
  : D extends { type: 'dimension' }
  ? number | UnitValue
  : unknown;

/** The value inputs as a reducer reads them: current, coerced values. */
export type Inputs<I> = { readonly [K in ValueKeys<I>]: ValueOf<I[K]> };

// ------------------------------------------------------------------------------------------------
// patches

export interface Patch<S, O> {
  /** State keys to replace. Only declared keys (rule 2). */
  set?: Partial<S>;
  /** Signal outputs to pulse, in order. Only declared signal outputs (rule 1). */
  emit?: ReadonlyArray<SignalKeys<O>>;
}

export interface OutcomePatch<S, O> extends Patch<S, O> {
  /** Required — rule 3. */
  outcome: Outcome;
  /** With `outcome: 'failure'`, the error the node reports. */
  error?: string;
}

// ------------------------------------------------------------------------------------------------
// reducers — required for signal inputs, optional for value inputs (rule 4)

export type Reducers<S, I, O> = {
  [K in OutcomeKeys<I>]: (state: Readonly<S>, inputs: Inputs<I>) => OutcomePatch<S, O>;
} & {
  [K in PlainSignalKeys<I>]: (state: Readonly<S>, inputs: Inputs<I>) => Patch<S, O>;
} & {
  [K in ValueKeys<I>]?: (state: Readonly<S>, value: ValueOf<I[K]>, inputs: Inputs<I>) => Patch<S, O>;
};

// ------------------------------------------------------------------------------------------------
// dynamic ports — ports derived from a parameter (String Format's `{name}` inputs, Expression's
// variables). Designed here, first used by NSP-004. The interpreter calls `inputs(params)` at
// mount and routes a write to a derived port through `on`.

export interface DerivedPorts<S, O> {
  inputs: (params: Readonly<Record<string, unknown>>) => Record<string, ValueInputDecl>;
  on: (state: Readonly<S>, port: string, value: unknown, derived: Readonly<Record<string, unknown>>) => Patch<S, O>;
}

// ------------------------------------------------------------------------------------------------
// the spec

export interface NodeDecl<S extends object, I extends InputsDecl, O extends OutputsDecl<S>> {
  /** The catalog `typeName`, e.g. `Counter`, `net.noodl.HTTP`. */
  type: string;
  /** Bumped when behaviour changes (NSP-010: a behaviour change is a version). */
  version: number;
  /** The runtime file this spec was read from (R3 (a): specs are written from the code, citing lines). */
  source: string;
  /** Initial state — what the runtime's `initialize` sets. */
  state: S;
  inputs: I;
  outputs: O;
  /**
   * Which outcomes this node's `outcome: true` inputs can report. The runtime exposes one signal
   * output per outcome named here plus `completed` (`outcome.ts`); the catalog-parity gate
   * derives those ports from this list. Omit when no input is `outcome: true`.
   */
  outcomes?: readonly Outcome[];
  /** What the editor's hover/inspect shows for an instance — the runtime's `getInspectInfo`. */
  inspect?: (state: Readonly<S>) => string;
  /**
   * What of the world this node's behaviour depends on (T2/T3). The runner refuses a spec that
   * declares any of these until NSP-007 gives it a scripted world — running a clock-dependent
   * node without a fake clock is flaky, and flaky grades nothing (NSP-003 §4).
   */
  needs?: readonly WorldNeed[];
}

/** The parts of the world NSP-007 scripts. */
export type WorldNeed = 'clock' | 'random' | 'network' | 'backend';

export interface NodeSpec<S extends object, I extends InputsDecl, O extends OutputsDecl<S>> extends NodeDecl<S, I, O> {
  on: Reducers<S, I, O>;
  derived?: DerivedPorts<S, O>;
}

export interface NodeBuilder<S extends object, I extends InputsDecl, O extends OutputsDecl<S>> {
  /** The behaviour: one reducer per signal input, optionally one per value input, and derived ports. */
  on(reducers: Reducers<S, I, O>, derived?: DerivedPorts<S, O>): NodeSpec<S, I, O>;
}

/**
 * Declares a node spec: `defineNode({ type, version, source, state, inputs, outputs }).on({ … })`.
 *
 * Why two calls and not one literal (measured 2026-09-30, TS 5.9.3, in a probe kept in
 * NSP-001 §5): with `on` inside the same literal, TS types the reducers before `I` is fixed,
 * every key-filtered mapped type appears to hold every key, and each reducer is contextually
 * typed against the UNION of the three signatures — `inputs` comes out `unknown` and a value
 * reducer's `value` comes out `number | Inputs<I>`. `NoInfer<Reducers<…>>` on the property
 * fixes the parameters but then `emit: ['countChanged']` widens to `string[]` unless every emit
 * is `as const`. Fixing `S`, `I` and `O` with the first call and typing the reducers in the
 * second gives both: typed parameters and literal `emit`/`set` checks, with no annotations on
 * the spec. The declaration is the part a non-TypeScript target reads; the reducers are the part
 * only the interpreter runs — the seam is in the right place anyway.
 *
 * `I` and `O` are `const` type parameters so `type: 'signal'` and `outcome: true` survive as
 * literals; that is what makes the key selectors above work.
 */
export function defineNode<S extends object, const I extends InputsDecl, const O extends OutputsDecl<S>>(
  decl: NodeDecl<S, I, O>
): NodeBuilder<S, I, O> {
  return {
    on: (reducers, derived) => (derived ? { ...decl, on: reducers, derived } : { ...decl, on: reducers })
  };
}

/**
 * A spec with its type parameters erased — what a registry, the interpreter or an adapter holds.
 *
 * Not `NodeSpec<object, …>`: `from` and the reducers take the state as a parameter, so a spec
 * with a concrete state type is NOT assignable to one typed over `object` (contravariance).
 * `never` in parameter position is what every concrete signature IS assignable to; the one
 * place that calls these — the interpreter — casts its erased state to `never` at the call.
 */
export interface AnyNodeSpec {
  type: string;
  version: number;
  source: string;
  state: Readonly<Record<string, unknown>>;
  inputs: InputsDecl;
  outputs: Record<string, ErasedValueOutput | SignalOutputDecl>;
  outcomes?: readonly Outcome[];
  inspect?: (state: never) => string;
  needs?: readonly WorldNeed[];
  on: Record<string, ErasedReducer | undefined>;
  derived?: {
    inputs: (params: Readonly<Record<string, unknown>>) => Record<string, ValueInputDecl>;
    on: (state: never, port: string, value: unknown, derived: Readonly<Record<string, unknown>>) => unknown;
  };
}
export interface ErasedValueOutput extends PortMeta {
  type: ValueType;
  from: (state: never) => unknown;
}
export type ErasedReducer = (...args: never[]) => unknown;

export function isSignalInput(d: InputDecl): d is SignalInputDecl {
  return d.type === 'signal';
}
export function isSignalOutput<S>(d: OutputDecl<S>): d is SignalOutputDecl {
  return d.type === 'signal';
}
