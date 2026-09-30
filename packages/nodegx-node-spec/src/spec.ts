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
 *
 * An authoring rule, from the stranger (NSP-006 §5): write the RULE in plain words before the
 * citation. A target's author may not have the cited file — the line numbers are for the person
 * checking the spec against the runtime, never the only place a behaviour is stated.
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

/**
 * What an invoking reducer may report: a terminal outcome, or `deferred` — the outcome is decided
 * at frame end by `afterInputs` (NSP-011). The Variables' `Set` is the first case: it schedules
 * `setValueTo(latestValue)` (variablebase.ts :200-206) and only the frame's FINAL value says
 * whether that was `done` or `unchanged`. Rule 3 still holds at run time: the interpreter refuses
 * a settle that leaves a deferred outcome unresolved, or resolves one nobody deferred.
 */
export type ReducerOutcome = Outcome | 'deferred';

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
type ValueOutputKeys<O> = Exclude<keyof O, SignalKeys<O>>;
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
  /**
   * Which value outputs this write SENDS — the runtime's `flagOutputDirty` calls in the setter.
   * Absent means all of them (a node that flags on every write, or whose outputs are never
   * `undefined` mid-frame, needs nothing here). It matters in exactly one case, found by
   * Boolean To String (NSP-011): a wire carries the last DEFINED value a frame sent, so when an
   * output is `undefined` at frame end, WHICH earlier writes sent decides what the wire holds —
   * `trueString` is flagged only while it is the selected string (:46-48). Not part of a
   * branch's shape for the mutants (a `send` difference is unobservable except in that case).
   */
  send?: ReadonlyArray<ValueOutputKeys<O>>;
}

export interface OutcomePatch<S, O> extends Patch<S, O> {
  /** Required — rule 3. `deferred` hands the decision to `afterInputs` (see `ReducerOutcome`). */
  outcome: ReducerOutcome;
  /** With `outcome: 'failure'`, the error the node reports. */
  error?: string;
}

/** An outcome `afterInputs` resolves for an invocation that reported `deferred`. */
export interface ResolvedOutcome<I> {
  port: OutcomeKeys<I>;
  outcome: Outcome;
  error?: string;
}

/**
 * What the frame-end reducer returns: an ordinary patch, plus the outcomes it resolves — one per
 * `deferred` invocation of that port this frame, in invocation order. An invocation the reducer
 * does not resolve, or a resolution with no invocation behind it, is a spec error at settle.
 */
export interface AfterInputsPatch<S, I, O> extends Patch<S, O> {
  outcomes?: ReadonlyArray<ResolvedOutcome<I>>;
}

// ------------------------------------------------------------------------------------------------
// reducers — required for signal inputs, optional for value inputs (rule 4)
//
// A value reducer runs AFTER the write: `inputs[port]` already holds the coerced value being
// written (the same value as its `value` argument); `state` is the state before the patch. A
// signal reducer sees the inputs as they stand. (Asked by the stranger, NSP-006 §5.)

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

/**
 * How a TARGET uses these (NSP-006 §5): it registers `inputs(params)` at mount, each at its
 * declared default, and every other name `discover` accepts on its first write; a port is coerced
 * by whichever declaration registered it. A DECLARED input always wins over a derived port of the
 * same name — a write consults the declaration first — and a spec whose `inputs(params)` or
 * `discover` mints a declared name is a spec error (String Format's `{format}` reads an unset
 * placeholder, never the `format` input).
 */
export interface DerivedPorts<S, O> {
  /**
   * The ports an EDITOR draws for these params — R6's `ports(params)`, what the runtime today
   * computes only inside a live viewer (`sendDynamicPorts`; NSP-020). String Format: one port
   * per `{placeholder}` in `format`. And: `input 0 … input N+1`, one spare beyond the highest
   * mentioned, as `collectPorts` (nodedefinition.ts) does.
   */
  inputs: (params: Readonly<Record<string, unknown>>) => Record<string, ValueInputDecl>;
  on: (state: Readonly<S>, port: string, value: unknown, derived: Readonly<Record<string, unknown>>) => Patch<S, O>;
  /**
   * A port the target registers ON FIRST WRITE, whatever the params — the runtime's
   * `registerInputIfNeeded` (node.ts): And accepts any `input <n>`, String Format any name at
   * all, and stores the value for a format that may only later mention it. Returns the port's
   * declaration, or `undefined` for a name the target would refuse. Without this, a spec's
   * derived ports are fixed at mount, which is not what either runtime mechanism does (NSP-004).
   */
  discover?: (port: string) => ValueInputDecl | undefined;
  /**
   * Port names the GENERATOR may write to, beyond `inputs(params)`, because `discover` accepts
   * them. The generator cannot invent `input 3` or a placeholder name; the spec offers a few.
   */
  candidates?: readonly string[];
}

/**
 * The frame-end reducer — the runtime's `scheduleAfterInputsHaveUpdated` idiom (Condition,
 * Expression, Function, String Format … the twelve `hasScheduled…` families, NDA-017 §2
 * constraint 3). A value or signal reducer records that a frame needs work (`set: { scheduled:
 * true }`); the interpreter calls this ONCE per `settle`, before the frame's observations are
 * recorded, and the reducer does the work against the frame's FINAL inputs and state. It is
 * how "two triggers in one frame produce one test" is written without a frame in the spec.
 * Outcomes are reported by the invoking reducer (they queue to the same settle) — unless it
 * reported `deferred`, in which case THIS reducer resolves them (`AfterInputsPatch.outcomes`),
 * the way a Variable's `Set` learns `done` / `unchanged` only from the frame's final value.
 * Its `emit`s queue AFTER the pulses the frame's reducers already queued, and its `set` is
 * observed like any step's (NSP-006 §5).
 */
export type AfterInputs<S, I, O> = (state: Readonly<S>, inputs: Inputs<I>) => AfterInputsPatch<S, I, O>;

/** What `.on()` takes beside the reducers. */
export interface Extras<S, I, O> {
  derived?: DerivedPorts<S, O>;
  afterInputs?: AfterInputs<S, I, O>;
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
  afterInputs?: AfterInputs<S, I, O>;
}

export interface NodeBuilder<S extends object, I extends InputsDecl, O extends OutputsDecl<S>> {
  /** The behaviour: one reducer per signal input, optionally one per value input; derived ports and the frame-end reducer in `extras`. */
  on(reducers: Reducers<S, I, O>, extras?: Extras<S, I, O>): NodeSpec<S, I, O>;
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
    on: (reducers, extras) => {
      const spec: NodeSpec<S, I, O> = { ...decl, on: reducers };
      if (extras?.derived) spec.derived = extras.derived;
      if (extras?.afterInputs) spec.afterInputs = extras.afterInputs;
      return spec;
    }
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
    discover?: (port: string) => ValueInputDecl | undefined;
    candidates?: readonly string[];
  };
  afterInputs?: (state: never, inputs: never) => unknown;
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
