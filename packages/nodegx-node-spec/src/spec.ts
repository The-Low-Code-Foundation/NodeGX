/**
 * The spec format — `defineNode()` (NSP-001 §2.1).
 *
 * A node's behaviour as data plus pure functions: ports, types, defaults, state, and reducers
 * `(state, inputs, …) → { set, emit, outcome }`. No `this`, no frames, no dirty flags, no clock,
 * no randomness of its own — a node that needs time, entropy or a server reads them from the
 * WORLD it is handed (`WorldView`, world.ts; NSP-007) and asks for its effects in the patch
 * (`after`, `request`, `abort`), so the reducer stays a pure function of what it was given. For
 * a pure node the spec IS the reference implementation; the interpreter (`interpreter.ts`) runs it.
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
import type { RecordChange, RegistryScript, RegistryView } from './registry';

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
export type ReducerOutcome = Outcome | 'deferred' | 'pending';

/**
 * `pending` (NSP-007) — the outcome is decided by the WORLD, frames later: HTTP Request's `Fetch`
 * reports when the answer lands, or when its own timeout fires. A pending invocation is resolved
 * by a world handler's `outcomes` (`WorldHandlers`), oldest first per port, and is recorded in the
 * frame it is resolved in; unlike `deferred`, a settle may leave it open. An invocation nobody ever
 * resolves is never recorded — which is also what the runtime does with a token nobody reports.
 */

// ------------------------------------------------------------------------------------------------
// the world, as a spec sees it (NSP-007; world.ts is the world itself)

/**
 * What a reducer may READ of the world — and, through `registry`, WRITE (NSP-012). Pure in the
 * run: the same seed, the same script and the same steps read the same values. The registry is
 * the one seam a reducer mutates directly rather than through its patch, because the data
 * nodes' behaviour IS the order of their reads and writes against it (registry.ts): a reducer
 * is pure in (state, inputs, registry-before) → (patch, registry-after).
 */
export interface WorldView {
  /** The clock, in milliseconds; moves only on an `advance` step. */
  now(): number;
  /** [0, 1) from the seeded source. */
  random(): number;
  bytes(n: number): Uint8Array;
  /** A version-4 UUID from the seeded source — what `crypto.randomUUID` hands a node on a target. */
  uuid(): string;
  /** The shared records and arrays (registry.ts). Reads create (`Model.get` is create-on-read); writes notify watchers. */
  registry: RegistryView;
  /**
   * Subscribes THIS instance to a record's or an array's `change` (the runtime's `model.on('change')`
   * / `collection.on('change')`): the spec's `world.change` handler is called for each. Idempotent
   * per target; `unwatch` is the `off`. Imperative, not a patch field, because a node subscribes
   * and then writes in one setter (an Array binding, then copying) and the write must reach it.
   */
  watch(target: WatchTarget): void;
  unwatch(target: WatchTarget): void;
  /**
   * Records an output's CURRENT value as sent, now — the runtime's `flagOutputDirty` (node.ts
   * :832-835), which snapshots at the call. `Patch.send` reads at the reducer's end, which is the
   * same thing unless the reducer WRITES THE REGISTRY after flagging: an Array node binds (sends
   * `Items`) and then copies into the array; the wire keeps the pre-copy snapshot until the node
   * flags `Items` again (collectionnode2.ts :273, then :325). A spec that writes after flagging
   * sends here, at the flag, handing the STATE the output reads at that moment — the reducer's
   * working copy, since the runtime's getter reads the node's live internals mid-setter; absent,
   * the instance's state before the patch. A declared or a derived output name.
   */
  send(port: string, state?: Readonly<Record<string, unknown>>): void;
  /**
   * NSP-013 s13 — the play's browser viewport (world.ts VIEWPORT), or `undefined` for a server
   * render (no `window`): what `window.innerWidth` / `innerHeight` read now.
   */
  viewport(): { width: number; height: number } | undefined;
  /**
   * Subscribes THIS instance to the viewport's `resize` (`window.addEventListener('resize', …)`):
   * the spec's `world.resize` handler is called at each scripted resize, after the size moved.
   * Idempotent; a play with no viewport has nothing to listen to and the call does nothing (the
   * runtime would throw on a missing `window` — a spec reads `viewport()` first, as a node checks
   * `typeof window`). `unlisten` is the `removeEventListener`.
   */
  listen(event: 'resize'): void;
  unlisten(event: 'resize'): void;
  /**
   * NSP-015 s16 — `navigator.userActivation.isActive` (world.ts LOCATION): whether the press came
   * from a person, a fact of the play. `undefined` when the browser has no `userActivation`, and
   * when there is no window at all.
   */
  userActivation(): boolean | undefined;
  /**
   * NSP-015 s17 — what `window.open(…, target, features)` would hand back in this play (world.ts
   * LOCATION): `true` a window, `false` `null` (`noopener` / `noreferrer` in the features, or the
   * popup blocker refused). A node that checks the handle (`if (!opened)`) reads this before it
   * names the `open` in its patch; the open is recorded either way. `false` with no window.
   */
  opens(target: unknown, features: unknown): boolean;
  /**
   * NSP-015 s17 — whether `history.pushState(…, url)` would be accepted in this play (world.ts
   * LOCATION): `false` for a url on another origin, which the browser refuses by throwing. `false`
   * with no window.
   */
  pushes(url: unknown): boolean;
  /** NSP-015 s17 — the project's settings (world.ts PROJECT): what `NoodlRuntime.instance.getProjectSettings()` reads. */
  projectSettings(): Readonly<Record<string, unknown>>;
  /**
   * NSP-015 s18 — what the Component Stacks tell a push or a replace handed under `stack` for
   * `target` (world.ts STACK): `done`, `unchanged` or a `failure`; `undefined` when no stack is
   * registered under the name — the request is queued and never answered in the play. A node that
   * names the `stack` effect reads this to settle its presses.
   */
  stackAnswer(op: 'push' | 'replace', stack: unknown, target: unknown): import('./world').StackAnswer | undefined;
  /**
   * NSP-015 s18 — what the pop `ahead` calls from now (0 = the next) is told by the stack that pushed
   * this node's page (world.ts STACK); `undefined` when the node does not sit in a pushed page (no
   * back callback was installed). Reads; the `back` effect is what consumes.
   */
  backAnswer(ahead?: number): import('./world').StackAnswer | undefined;
  /**
   * NSP-015 s19 — what the Routers tell a navigate handed under `router` for `target` (world.ts
   * ROUTE), read when the handler hands it on (+1 ms): `done`, `unchanged` or a `failure`;
   * `undefined` when no router answers to the name — queued, never answered in the play.
   */
  routeAnswer(router: unknown, target: unknown, openInNewTab: unknown): import('./world').StackAnswer | undefined;
  /**
   * NSP-015 s20 — what `context.showPopup` does with a popup handed for `target` (world.ts POPUP): `nohost` (the
   * app has no popup host — it returns at once, opening nothing), `opened`, or the `error` its promise rejects with
   * (the component cannot be built). Read when the node shows; the `popup` effect records the call.
   */
  popupAnswer(target: unknown): import('./world').PopupAnswer;
  /** NSP-015 s20 — the popups this node sits inside, nearest first, by component name (world.ts POPUP `inside`); empty when none. */
  popupsInside(): readonly string[];
  /**
   * NSP-014 s21 — the backend a node's Backend input names (world.ts BACKEND): the id the call would go to, or
   * `undefined` when the project has no such backend (falsy and `_active_` are the active one).
   */
  backendFor(backendId: unknown): string | undefined;
  /** NSP-014 s22 — the id of the user signed in, as the Record family's access rules read it (world.ts BACKEND, USER); `undefined`: nobody. */
  backendUser(): string | undefined;
  /** NSP-014 s26 — what `backend`'s session store holds now (world.ts AUTH): the signed-in user's fields, flat; `undefined`: nobody is signed in there. */
  session(backend: string): Readonly<Record<string, unknown>> | undefined;
  /**
   * NSP-014 s26 — reaches the app's user service (world.ts AUTH, THE SERVICE): the first reach in a play MAKES it, and with
   * it the start-up check when the active backend holds a session. Idempotent. A node calls it where its runtime code first
   * reaches `UserService.forScope`.
   */
  userService(): void;
  /**
   * NSP-014 s29 — what the user service's `oauthReturn` getter hands now (world.ts AUTH, THE RETURN LEG): `{ inProgress:
   * false }` on an ordinary page load; on a sign-in coming back, `inProgress` until the exchange lands, then `succeeded` and
   * its `outcome` / `notice`, or `error`. A node calls it where its runtime code reads the getter (after `userService()` —
   * the service consumes the return as it is made).
   */
  authReturn(): import('./world').AuthReturnState;
}

/** One registry entry to watch: a record by id or an array by name (the raw id, as the registry keeps it). */
export type WatchTarget = { model: unknown } | { collection: unknown };

/** What a watched entry notifies (registry.ts): a record names the key that moved; an array only says it changed. */
export type ChangeEvent = ({ kind: 'model'; id: unknown } & RecordChange) | { kind: 'collection'; id: unknown };

/** A request a reducer asks the world to make. `id` is the spec's own name for it (an `abort` and the response name it); it is not on the wire. */
export interface SpecRequest {
  id: string;
  method?: unknown;
  url: unknown;
  headers?: Record<string, unknown>;
  body?: unknown;
}

/**
 * NSP-014 s21 — an operation a reducer hands a backend (world.ts BACKEND, R9): `op` the backend contract's method
 * (`delete`, `query`, …), `backend` the id it goes to (`WorldView.backendFor`), `args` the options as the node hands
 * them. `id` is the spec's own name for the call (the answer names it); it is not on the wire.
 */
export interface SpecBackendCall {
  id: string;
  op: string;
  backend: string;
  args: Readonly<Record<string, unknown>>;
}

/** NSP-014 s21 — a backend's answer to a `SpecBackendCall`, delivered to `WorldHandlers.backend`: what the success callback is handed, or the failure's message (`undefined`: none) and (s22) the backend's `detail` when it gave one. */
export type BackendAnswerEvent = { id: string } & ({ ok: unknown } | { error: string | undefined; detail?: Record<string, unknown> });

/** The world's answer to a `SpecRequest`, delivered to `WorldHandlers.response`. */
export type WorldResponse = { id: string } & (
  | { status: number; statusText: string; headers: Record<string, string>; body: string | null }
  | { error: { name: string; message: string } }
  | { aborted: true }
);

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
  /**
   * What the port holds before anything is sent to it — `undefined` when absent. Also the
   * `fallback` of a `typed-*` coercion. Reducers read STATE, not this: a spec's `state` may seed
   * differently (String Format's `format` state starts `''` while its `format` input starts
   * `undefined`), and only a reducer that reads `inputs.<port>` before any write would tell.
   */
  default?: unknown;
  /** Which conversion the runtime applies on arrival. Declared, never implied — see coerce.ts. */
  coerce?: Coercion;
  /** For `enum` ports: the accepted values. */
  enums?: readonly string[];
  /**
   * Values the GENERATOR draws for this port beside its type's pool (generate.ts) — a URL for a
   * `url` port, a header name list for a `headers` port. The type's pool alone would never write
   * a URL. Without it the pool is unchanged, so a spec that declares none generates what it did.
   */
  examples?: readonly unknown[];
  /**
   * The port cannot be wired (the catalog's `allowEditOnly`, NSP-012): a value reaches it only
   * from the property panel, so the generator draws from `examples` — and, for an `enum`, its
   * declared values — and never from the cross-type pool a wire could deliver. A script port
   * handed `{}` by the generator was noise, not a finding.
   */
  editOnly?: boolean;
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
  /**
   * The output as a function of state — and of the world (NSP-012: an Array node's `items` IS the
   * registry's array; its state holds only the name). Read after every step that sends it and at
   * the first settle; `undefined` is never sent (C3). A reducer that reads the world here must
   * not write it.
   */
  from: (state: Readonly<S>, world: WorldView) => unknown;
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
  /**
   * Signal outputs to pulse, in order. Only declared signal outputs (rule 1) — or an outcome port
   * the spec lists in `outcomes`, pulsed OUTSIDE any invocation (NSP-012: Array Filter pulses
   * `failure` for a malformed pattern arriving on a value path, :451, where nobody invoked it and
   * no outcome is owed): recorded as a plain `signal` event, the way the runtime target records a
   * hand-rolled pulse on an outcome port.
   */
  emit?: ReadonlyArray<SignalKeys<O> | Outcome>;
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
  // ⚠️ A spec whose outputs read the REGISTRY (NSP-012) names `send` in EVERY patch (an empty
  // list for none): "absent means all" would read a shared entry another write moved, which the
  // runtime does not send until the node flags it — an Array node's `items` after an insert.
  /**
   * The same two for DERIVED outputs (`DerivedPorts.outputs`, NSP-012): an Object node pulses
   * `changed-<property>` and sends `prop-<property>` for ports its `properties` parameter names.
   * Checked at run time against the instance's derived outputs (the type system cannot name them).
   * `emitDerived` pulses queue BEFORE `emit`'s — the one order the format fixes, and the order the
   * Object node has (`changed-<p>` then `changed`, modelnode2.ts :111-115). When a patch names
   * EITHER `send` or `sendDerived`, only the outputs named in the two are read; absent both, all.
   */
  emitDerived?: readonly string[];
  sendDerived?: readonly string[];
  /**
   * NSP-013 s14 — declared and derived pulses in ONE order, for a node that interleaves them:
   * States pulses `State Changed` (declared) and then `Has Reached <state>` (derived) for every
   * state a frame passes through, which `emit` and `emitDerived` — derived first, always — cannot
   * say. An entry is a declared signal output (or an outcome port pulsed outside an invocation,
   * as `emit` allows) or `{ derived: <name> }`. Queued after `emitDerived` and `emit`; a spec that
   * needs it uses it alone.
   */
  pulses?: ReadonlyArray<SignalKeys<O> | Outcome | { derived: string }>;
  /**
   * Effects on the world (NSP-007), applied after `set` in this order. None is observable on the
   * wire by itself; each shows through what the world later hands back.
   *   `after`   world timers: `WorldHandlers.timer` is called with the `tag` when the clock passes
   *             `now + ms` (the JavaScript timer rule for `ms`, world.ts). A tag already pending
   *             is scheduled again beside it, as two `setTimeout` calls would be.
   *   `cancel`  drops every pending timer with the tag (`clearTimeout`).
   *   `request` a request over the wire — recorded as a `request` event in the frame it is issued
   *             in; the answer arrives at `WorldHandlers.response` with the request's `id`.
   *   `abort`   aborts requests by id: the answer, if still due, is dropped and `response` is
   *             called with `{ aborted }` (an `AbortController`).
   *   `open`    NSP-015 s16 — `window.open(url, target, features)`, recorded as an `open` event in
   *             the frame it is made, each as handed (world.ts LOCATION); a `target` or `features`
   *             left `undefined` is one the node did not hand. What the call returns is
   *             `WorldView.opens` (s17). Only with a window — read `viewport()` first, as a node
   *             checks `typeof window`.
   *   `push`    NSP-015 s17 — `history.pushState(state, title, url)`: a `history` event; the
   *             location's href moves (world.ts LOCATION). A url the browser refuses (another
   *             origin — `WorldView.pushes` says) is still recorded, as the call was made, and the
   *             href stays.
   *   `dispatch` NSP-015 s17 — `window.dispatchEvent(new <Event>(type))`: a `dispatch` event, after
   *             the push when a patch names both. Only with a window, as `open`.
   *   `stack`   NSP-015 s18 — a push or a replace handed to the Component Stacks
   *             (`NavigationHandler.navigate` / `.replace`, world.ts STACK): a `stack` event, as
   *             handed; what it is told is `WorldView.stackAnswer`. No window needed.
   *   `back`    NSP-015 s18 — pops through the back callback of the stack that pushed this node's
   *             page, in order: a `stack` event each; what each is told is `WorldView.backAnswer`.
   *             Only in a pushed page.
   *   `route`   NSP-015 s19 — a navigate handed to the Routers (`RouterHandler.navigate`, world.ts
   *             ROUTE): a `route` event, as handed. The handler hands it on 1 ms later — a spec asks
   *             the clock for that with `after` and reads `WorldView.routeAnswer` when it fires.
   *   `popup`   NSP-015 s20 — a popup shown (`context.showPopup(target, params, args)`) or closed (the close
   *             handler a Close Popup resolved, called with `(action, results)`), world.ts POPUP: a `popup`
   *             event, as handed. What a show does is `WorldView.popupAnswer`; what the person does to an open
   *             popup later arrives through `world.popup`. No window needed.
   *   `backend` NSP-014 s21 — an operation handed to a backend (world.ts BACKEND, R9): a `backend` event in the
   *             request group, as handed; the answer arrives at `WorldHandlers.backend` with the call's `id`.
   */
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
  popup?: import('./world').PopupCall;
  backend?: SpecBackendCall;
}

export interface OutcomePatch<S, O> extends Patch<S, O> {
  /** Required — rule 3. `deferred` hands the decision to `afterInputs` (see `ReducerOutcome`). */
  outcome: ReducerOutcome;
  /** With `outcome: 'failure'`, the error the node reports. */
  error?: string;
}

/**
 * An outcome `afterInputs` resolves for an invocation that reported `deferred`. `port` names a
 * declared `outcome: true` input — or a DERIVED one (NSP-013 s14: States' `To <state>`), whose
 * name the type system cannot know; the interpreter refuses a port no invocation deferred.
 */
export interface ResolvedOutcome<I> {
  port: OutcomeKeys<I> | (string & {});
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
  /**
   * NSP-014 s29 — invocations NO INPUT opened, each opened and reported here at once, after `outcomes`: the outcome a
   * node reports for something that did not start on this page (Sign In With's return leg — signinwith.ts :191-201 calls
   * it "the one place … where something other than a port opens an invocation"). Recorded with the port `''` (trace.ts).
   * Only a world handler's patch (`WorldHandlers`, `mount` among them) may open one; a reducer's outcome is its input's.
   */
  opens?: ReadonlyArray<{ outcome: Outcome; error?: string }>;
}

// ------------------------------------------------------------------------------------------------
// reducers — required for signal inputs, optional for value inputs (rule 4)
//
// A value reducer runs AFTER the write: `inputs[port]` already holds the coerced value being
// written (the same value as its `value` argument); `state` is the state before the patch. A
// signal reducer sees the inputs as they stand. (Asked by the stranger, NSP-006 §5.)

//
// Every reducer is handed the WORLD as its last argument (NSP-007) — `now()`, `random()`,
// `uuid()` — and may ignore it; the eighteen specs before NSP-007 do.

export type Reducers<S, I, O> = {
  [K in OutcomeKeys<I>]: (state: Readonly<S>, inputs: Inputs<I>, world: WorldView) => OutcomePatch<S, O>;
} & {
  [K in PlainSignalKeys<I>]: (state: Readonly<S>, inputs: Inputs<I>, world: WorldView) => Patch<S, O>;
} & {
  [K in ValueKeys<I>]?: (state: Readonly<S>, value: ValueOf<I[K]>, inputs: Inputs<I>, world: WorldView) => Patch<S, O>;
};

// ------------------------------------------------------------------------------------------------
// dynamic ports — ports derived from a parameter (String Format's `{name}` inputs, Expression's
// variables). Designed here, first used by NSP-004. The interpreter calls `inputs(params)` at
// mount and routes a write to a derived port through `on`.

/**
 * How a TARGET uses these (NSP-006 §5): it registers `inputs(params)` at mount, each at its
 * declared default, and every other name `discover` accepts on its first write; a port is coerced
 * by whichever declaration registered it. A DECLARED input always wins over a derived port of the
 * same name: a write consults the declaration first, and a target registers NO derived port under
 * a declared name (the interpreter refuses one as a spec error). So String Format's `{format}`
 * reads an unset placeholder (`''`), never the `format` input — one behaviour, not two.
 */
export interface DerivedPorts<S, O> {
  /**
   * The ports an EDITOR draws for these params — R6's `ports(params)`, what the runtime today
   * computes only inside a live viewer (`sendDynamicPorts`; NSP-020). String Format: one port
   * per `{placeholder}` in `format`. And: `input 0 … input N+1`, one spare beyond the highest
   * mentioned, as `collectPorts` (nodedefinition.ts) does.
   */
  inputs: (params: Readonly<Record<string, unknown>>) => Record<string, InputDecl>;
  /**
   * The OUTPUT ports these params derive (NSP-012): the Object node's `prop-<p>` value and
   * `changed-<p>` signal per property named. A target registers them at mount the way a graph
   * with every port wired would (the runtime registers a derived output only when a wire asks
   * for it, `registerOutputIfNeeded`; a lone node on the runtime target gets them all), and the
   * interpreter observes them like declared ones; a reducer reaches them through `sendDerived` /
   * `emitDerived`. A derived output's `from` is read like a declared one's.
   */
  outputs?: (params: Readonly<Record<string, unknown>>) => Record<string, OutputDecl<S>>;
  on: (state: Readonly<S>, port: string, value: unknown, derived: Readonly<Record<string, unknown>>, world: WorldView) => Patch<S, O>;
  /**
   * NSP-013 s14 — the reducer for a derived SIGNAL input: a port `inputs` or `discover` declares
   * `{ type: 'signal' }` (States' `To <state>`, one per state named, and any `to-<name>` on first
   * write). Such a port is pulsed — `signal()`, never `set()` — and reaches this, never `on`. With
   * `outcome: true` on its declaration the patch carries an outcome on every path (rule 3, checked
   * at run time only: the type system cannot name a derived port), reported against the port's
   * own name. A spec with no derived signal input needs none.
   */
  signal?: (state: Readonly<S>, port: string, derived: Readonly<Record<string, unknown>>, world: WorldView) => Patch<S, O> | OutcomePatch<S, O>;
  /**
   * A port the target registers ON FIRST WRITE, whatever the params — the runtime's
   * `registerInputIfNeeded` (node.ts): And accepts any `input <n>`, String Format any name at
   * all, and stores the value for a format that may only later mention it. Returns the port's
   * declaration, or `undefined` for a name the target would refuse. Without this, a spec's
   * derived ports are fixed at mount, which is not what either runtime mechanism does (NSP-004).
   */
  discover?: (port: string) => InputDecl | undefined;
  /**
   * Port names the GENERATOR may write to (or, for a derived signal, pulse), beyond `inputs(params)`, because `discover` accepts
   * them. The generator cannot invent `input 3` or a placeholder name; the spec offers a few.
   */
  candidates?: readonly string[];
}

/**
 * The frame-end reducer — the runtime's `scheduleAfterInputsHaveUpdated` idiom (Condition,
 * Expression, Function, String Format … the twelve `hasScheduled…` families, NDA-017 §2
 * constraint 3). A value or signal reducer records that a frame needs work (`set: { scheduled:
 * true }`); the interpreter calls this ONCE per `settle` — every settle, steps or none — before
 * the frame's observations are recorded, and the reducer does the work against the frame's FINAL
 * inputs and state. It is
 * how "two triggers in one frame produce one test" is written without a frame in the spec.
 * Outcomes are reported by the invoking reducer (they queue to the same settle) — unless it
 * reported `deferred`, in which case THIS reducer resolves them (`AfterInputsPatch.outcomes`),
 * the way a Variable's `Set` learns `done` / `unchanged` only from the frame's final value.
 * Its `emit`s queue AFTER the pulses the frame's reducers already queued, and its `set` is
 * observed like any step's (NSP-006 §5).
 */
export type AfterInputs<S, I, O> = (state: Readonly<S>, inputs: Inputs<I>, world: WorldView) => AfterInputsPatch<S, I, O>;

/**
 * The world's callbacks into a spec (NSP-007): what a node does when a timer it asked for fires
 * and when an answer to a request it made lands. Each returns an ordinary patch plus the
 * `pending` outcomes it settles (`outcomes`, oldest pending invocation of that port first —
 * the way `afterInputs` settles `deferred` ones). Called between steps as the world delivers:
 * on `advance` (after what was already delivered has landed, before the clock moves) and at
 * `settle` (after the frame-end reducer, until nothing more is due at the current time). What can
 * be due at a settle is only what is ALREADY DELIVERED — an answer the network script gives at once
 * (no `after`) to a request this frame issued, and whatever that answer's handler causes; a timer,
 * a resize or a delayed answer never is (a settle does not move the clock, and every world timer is
 * at least 1 ms — world.ts CLOCK).
 */
export interface WorldHandlers<S, I, O> {
  timer?: (state: Readonly<S>, inputs: Inputs<I>, tag: string, world: WorldView) => AfterInputsPatch<S, I, O>;
  response?: (state: Readonly<S>, inputs: Inputs<I>, response: WorldResponse, world: WorldView) => AfterInputsPatch<S, I, O>;
  /**
   * NSP-012 — a watched record or array changed (`WorldView.watch`) — written by ANOTHER node.
   * A node's own writes are never handed to its handler: its reaction to them is written beside
   * the write, in the reducer that writes (registry.ts, the notification rule). Called right after
   * the reducer whose write caused it returns, in notification order, and again for
   * what the handler's own writes cause. A handler that only RECORDS the change for the frame end
   * (`set: { scheduled: true }`) is what the runtime's `scheduleAfterInputsHaveUpdated` idiom
   * reads as: the interpreter runs `afterInputs` again after a delivery that followed it, up to
   * the scheduler's ten passes (nodecontext.ts `updateDirtyNodes`), so the frame end that the
   * runtime's second pass is lands in the same settle.
   */
  change?: (state: Readonly<S>, inputs: Inputs<I>, event: ChangeEvent, world: WorldView) => AfterInputsPatch<S, I, O>;
  /** NSP-013 s13 — the viewport was resized (`WorldView.listen`): called at the resize, `world.viewport()` already the new size. */
  resize?: (state: Readonly<S>, inputs: Inputs<I>, world: WorldView) => AfterInputsPatch<S, I, O>;
  /**
   * NSP-015 s19 — the Router whose page this node sits in handed it params (world.ts ROUTE `page`):
   * the script's first entries when the page is built (the mount; they land in the first settle),
   * later ones at their time on the clock. Only a spec that needs `router` is handed any.
   */
  page?: (state: Readonly<S>, inputs: Inputs<I>, params: Readonly<Record<string, unknown>>, world: WorldView) => AfterInputsPatch<S, I, O>;
  /**
   * NSP-015 s20 — the person did something to the popups (world.ts POPUP `events`), at its time on the clock: a Close
   * Popup inside the `popup`-th popup opened in the play (`undefined`: the last one opened) called its close handler
   * with `action` and `results`, or the person pressed Escape. Only a spec that needs `popup` and has this handler is
   * handed any; what it does with the popups it opened is the spec's (the context's slot policy).
   */
  popup?: (state: Readonly<S>, inputs: Inputs<I>, event: import('./world').PopupEvent, world: WorldView) => AfterInputsPatch<S, I, O>;
  /** NSP-014 s21 — a backend answered a call this node made (`backend` effect), at the answer's moment (world.ts BACKEND). */
  backend?: (state: Readonly<S>, inputs: Inputs<I>, answer: BackendAnswerEvent, world: WorldView) => AfterInputsPatch<S, I, O>;
  /**
   * NSP-014 s24 — a write made elsewhere in the app reached the store's listeners (world.ts BACKEND, `events`): called
   * at its time on the clock, AFTER the registry holds the write, with the contract's event and the backend it came
   * from. Every instance of a spec that needs `backend` and has this handler hears every event, in mount order;
   * whether the node watches that backend's store is the spec's (a store a node never bound tells it nothing).
   */
  store?: (state: Readonly<S>, inputs: Inputs<I>, event: import('./world').StoreEvent, world: WorldView) => AfterInputsPatch<S, I, O>;
  /**
   * NSP-014 s26 — a session event reached the user service's listeners (world.ts AUTH): `loggedIn`, `loggedOut`,
   * `sessionGained` or `sessionLost`, at the step of the landing that raised it. Every instance of a spec that needs
   * `backend` and has this handler hears every one, in mount order, whichever backend raised it.
   */
  auth?: (state: Readonly<S>, inputs: Inputs<I>, event: import('./world').AuthNotice, world: WorldView) => AfterInputsPatch<S, I, O>;
  /**
   * NSP-014 s29 — the user service's `oauthReturn` event (world.ts AUTH, THE RETURN LEG), with the state it carries, at the
   * step that announced it. Only an instance of a spec that needs `backend` and has this handler hears it, in mount order —
   * the runtime's subscription is to this one event (signinwith.ts :85), not to the four session events `auth` hears.
   */
  authReturn?: (state: Readonly<S>, inputs: Inputs<I>, ret: import('./world').AuthReturnState, world: WorldView) => AfterInputsPatch<S, I, O>;
  /**
   * NSP-014 s29 — the end of the node's `initialize`: what it DOES at its making beyond the state `init` sets — called once,
   * at mount, after `init` and before the params, its patch applied like any handler's (its sends and reports land in the
   * first settle). Sign In With applies a return the service already holds (signinwith.ts :86-88). A node that only sets
   * state at its making needs none.
   */
  mount?: (state: Readonly<S>, inputs: Inputs<I>, world: WorldView) => AfterInputsPatch<S, I, O>;
}

/** What `.on()` takes beside the reducers. */
export interface Extras<S, I, O> {
  derived?: DerivedPorts<S, O>;
  afterInputs?: AfterInputs<S, I, O>;
  world?: WorldHandlers<S, I, O>;
}

/**
 * What the GENERATOR draws from for a node that needs the world (generate.ts): the answers its
 * network script may give, the delays before they land, the clock advances between steps. A
 * spec with `needs` and no pool gets the defaults in generate.ts.
 */
export interface WorldPool {
  responses?: readonly import('./world').Answer[];
  delays?: readonly number[];
  advances?: readonly number[];
  /** NSP-012: the registries a `registry` spec's sequences start from (one is drawn per sequence; the defaults include an empty one). */
  registries?: readonly RegistryScript[];
  /** NSP-013: the IANA zones a `timezone` spec's sequences run in (one is drawn per sequence; the defaults cross a DST change and a half-hour offset). */
  timeZones?: readonly string[];
  /** NSP-013 s13: the viewports a `viewport` spec's sequences start from (one is drawn per sequence; `null` is a server render — no window). */
  viewports?: ReadonlyArray<import('./world').ViewportScript | null>;
  /** NSP-015 s16: the user activations a `location` spec's sequences play with (one is drawn per sequence; `null` is a browser with no `userActivation`). */
  activations?: ReadonlyArray<boolean | null>;
  /** NSP-015 s17: the project settings a `project` spec's sequences play with (one is drawn per sequence; the default is `{}` alone). */
  projectSettings?: ReadonlyArray<Record<string, unknown>>;
  /** NSP-015 s18: the Component Stacks a `stack` spec's sequences play with (one is drawn per sequence; the default is none registered alone). */
  stacks?: ReadonlyArray<import('./world').StackScript>;
  /** NSP-015 s19: the Routers a `router` spec's sequences play with (one is drawn per sequence; the default is none registered alone). */
  routers?: ReadonlyArray<import('./world').RouterScript>;
  /** NSP-015 s20: the popup worlds a `popup` spec's sequences play with (one is drawn per sequence; the default is a host and no popup components). */
  popups?: ReadonlyArray<import('./world').PopupScript>;
  /** NSP-014 s21: the backend worlds a `backend` spec's sequences play with (one is drawn per sequence; the default answers every call `{ ok: null }` at once). */
  backends?: ReadonlyArray<import('./world').BackendScript>;
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
  /**
   * The part of the initial state that comes FROM THE WORLD (NSP-007): UUID draws its first id at
   * creation (uuid.ts `initialize`), so its spec draws one here. Merged over `state` at mount,
   * before the params are applied. A spec without one has a static initial state. NSP-012 adds
   * two things: a node that subscribes at creation does it here (Variable binds the globals
   * record in `initialize`, so its `init` reaches the registry and `watch`es it); and the mount
   * PARAMS are handed over, for the one thing the runtime reads from the graph's parameters
   * rather than from an input (`this.model.parameters.properties`, modelcrudbase.ts :461).
   */
  init?: (world: WorldView, params: Readonly<Record<string, unknown>>) => Partial<S>;
  inputs: I;
  outputs: O;
  /**
   * Which outcomes this node's `outcome: true` inputs can report. The runtime exposes one signal
   * output per outcome named here plus `completed` (`outcome.ts`); the catalog-parity gate
   * derives those ports from this list. Omit when no input is `outcome: true`.
   */
  outcomes?: readonly Outcome[];
  /** What the editor's hover/inspect shows for an instance — the runtime's `getInspectInfo`. */
  inspect?: (state: Readonly<S>, world: WorldView) => string;
  /**
   * What of the world this node's behaviour depends on (T2/T3). The runner builds a scripted
   * world for a spec that declares any (NSP-007) and refuses to play it on a target that has no
   * seam for one (`TargetAdapter.install`) — running a clock-dependent node against the real
   * clock is flaky, and flaky grades nothing (NSP-003 §4). `backend` is still refused: its seam
   * arrives with NSP-014. `registry` (NSP-012): the node reads or writes the shared records and
   * arrays — a target must start each play from the script's registry and nothing else, or a
   * record a previous play named is still there.
   */
  needs?: readonly WorldNeed[];
  /** What the generator draws for the world of this node's sequences (`WorldPool`). */
  worldPool?: WorldPool;
}

/**
 * The parts of the world NSP-007 scripts, the registry NSP-012 adds, and the two NSP-013 adds:
 * `timezone` — the node reads a calendar in the host's local zone (`getHours`, `setMonth`, an
 * `Intl` call with no `timeZone`), so the play runs in the zone the script names (world.ts
 * TIME ZONE: `UTC` when the script names none); `digest` — the node asks the host for a SHA-2
 * digest (`crypto.subtle.digest`), which the world answers itself so the answer lands in the
 * microtask after the call and never on a thread the clock cannot see (world.ts DIGEST). s13 adds
 * `viewport` — the node reads the browser window's size or listens for its resize, so the play has
 * a scripted viewport, or none (a server render: no `window`) (world.ts VIEWPORT). NSP-015 s16 adds
 * `location` — the node opens a URL or reads whether the press came from a person (world.ts
 * LOCATION); the play has a window or none, as for `viewport`, and an activation or none. s17
 * adds `project` — the node reads a project setting (world.ts PROJECT). s18 adds `stack` — the node
 * hands a Component Stack a request (world.ts STACK). s19 adds `router` — the node hands the Routers a
 * navigate, or sits in a Router's page (world.ts ROUTE). s20 adds `popup` — the node shows a popup, or sits
 * inside one (world.ts POPUP). NSP-014 s21 makes `backend` real — the node hands a backend an operation (world.ts
 * BACKEND, R9).
 */
export type WorldNeed = 'clock' | 'random' | 'network' | 'registry' | 'timezone' | 'digest' | 'viewport' | 'location' | 'project' | 'stack' | 'router' | 'popup' | 'backend';

export interface NodeSpec<S extends object, I extends InputsDecl, O extends OutputsDecl<S>> extends NodeDecl<S, I, O> {
  on: Reducers<S, I, O>;
  derived?: DerivedPorts<S, O>;
  afterInputs?: AfterInputs<S, I, O>;
  world?: WorldHandlers<S, I, O>;
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
      if (extras?.world) spec.world = extras.world;
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
  init?: (world: WorldView, params: Readonly<Record<string, unknown>>) => Record<string, unknown>;
  inputs: InputsDecl;
  outputs: Record<string, ErasedValueOutput | SignalOutputDecl>;
  outcomes?: readonly Outcome[];
  inspect?: (state: never, world: WorldView) => string;
  needs?: readonly WorldNeed[];
  worldPool?: WorldPool;
  on: Record<string, ErasedReducer | undefined>;
  derived?: {
    inputs: (params: Readonly<Record<string, unknown>>) => Record<string, InputDecl>;
    outputs?: (params: Readonly<Record<string, unknown>>) => Record<string, ErasedValueOutput | SignalOutputDecl>;
    on: (state: never, port: string, value: unknown, derived: Readonly<Record<string, unknown>>, world: WorldView) => unknown;
    signal?: (state: never, port: string, derived: Readonly<Record<string, unknown>>, world: WorldView) => unknown;
    discover?: (port: string) => InputDecl | undefined;
    candidates?: readonly string[];
  };
  afterInputs?: (state: never, inputs: never, world: WorldView) => unknown;
  world?: {
    timer?: (state: never, inputs: never, tag: string, world: WorldView) => unknown;
    response?: (state: never, inputs: never, response: WorldResponse, world: WorldView) => unknown;
    change?: (state: never, inputs: never, event: ChangeEvent, world: WorldView) => unknown;
    resize?: (state: never, inputs: never, world: WorldView) => unknown;
    page?: (state: never, inputs: never, params: Readonly<Record<string, unknown>>, world: WorldView) => unknown;
    popup?: (state: never, inputs: never, event: import('./world').PopupEvent, world: WorldView) => unknown;
    backend?: (state: never, inputs: never, answer: BackendAnswerEvent, world: WorldView) => unknown;
    store?: (state: never, inputs: never, event: import('./world').StoreEvent, world: WorldView) => unknown;
    auth?: (state: never, inputs: never, event: import('./world').AuthNotice, world: WorldView) => unknown;
    authReturn?: (state: never, inputs: never, ret: import('./world').AuthReturnState, world: WorldView) => unknown;
    mount?: (state: never, inputs: never, world: WorldView) => unknown;
  };
}
export interface ErasedValueOutput extends PortMeta {
  type: ValueType;
  from: (state: never, world: WorldView) => unknown;
}
export type ErasedReducer = (...args: never[]) => unknown;

export function isSignalInput(d: InputDecl): d is SignalInputDecl {
  return d.type === 'signal';
}
export function isSignalOutput<S>(d: OutputDecl<S>): d is SignalOutputDecl {
  return d.type === 'signal';
}
