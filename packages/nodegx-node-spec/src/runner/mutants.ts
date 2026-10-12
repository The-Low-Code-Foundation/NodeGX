/**
 * Mutants — the proof that a node's suite can fail (NSP-003 §2.4), following
 * `nodegx-backend-contract/conformance/mutants.ts`: one plausible way a second implementation gets
 * the node wrong, per reducer BRANCH, and the suite must catch every one against the spec
 * interpreter. A mutant that survives means that node's suite has a hole shaped like the defect,
 * and the node does not count as specced.
 *
 * What a "branch" is, for a pure reducer: the distinct SHAPES of patch it returned while the suite
 * ran — which state keys it set, which signals it emitted, which outcome it reported. Branches are
 * DISCOVERED by running the suite against the unmutated spec with every reducer wrapped to record
 * its patch shapes (`discoverBranches`). A branch the suite never reaches is reported as such,
 * because a mutant of it would survive trivially — that is the hole, named before any mutant runs.
 *
 * The mutations, per branch (each applied only when the reducer would have returned THAT branch):
 *   - `drop-emit`      the branch's signals are not emitted (the "forgot to pulse" defect)
 *   - `drop-set`       the branch's state change is not applied (the "value never moves" defect)
 *   - `flip-outcome`   done ↔ unchanged, failure → done (the "wrong outcome" defect, ERG-001)
 *   - `swap-branch`    the reducer returns a SIBLING branch's last recorded patch instead — the
 *                      "condition inverted" defect (the Counter limit guard reading `>` for `>=`)
 *   - `drop-request`   the branch's request is never issued (NSP-007: the "forgot to fetch" defect)
 *   - `drop-backend`   the branch's backend call is never made (NSP-014 s21: the same defect, one seam over)
 *   - `drop-picker`    the branch's click on the file input is never made (NSP-014 s31: the dialog never opens)
 *   - `drop-subscribe` / `drop-unsubscribe`  the branch's subscription is never opened / never disposed (NSP-014 s33)
 *   - `drop-socket`    the branch's calls on its WebSockets are never made — no connect, no send, no close (NSP-014 s34)
 *   - `drop-subscribe-first`  the branch's subscription is made AFTER its backend calls, not before (NSP-014 s35)
 * A mutation that would leave the patch unchanged (drop-emit on a branch with no emit) is not
 * generated: it could only survive, and would say nothing.
 *
 * The world handlers (NSP-007, `spec.world.timer` / `spec.world.response`; NSP-012's
 * `spec.world.change`) are reducers like any
 * other here, named `world.timer`, `world.response`, `world.change`, (s13) `world.resize`, (s19) `world.page`, (s20) `world.popup` and (NSP-014 s21) `world.backend`, (s24) `world.store`, (s26) `world.auth`, (s29) `world.authReturn` and `world.mount`, (s31) `world.picker`, (s33) `world.realtime`, (s34) `world.socket` and `world.stream`, (NSP-016 s42) `world.group`; whether a branch issues a request
 * — or calls a backend — is part of its shape. A branch's `after` / `cancel` / `abort` effects are NOT in the shape and have no
 * mutant of their own yet (a dropped timeout timer shows only in a sequence that waits past it
 * with an answer that never comes) — named in NSP-007 §5 as the runner's next hole.
 */

import type { AnyNodeSpec, ErasedReducer, WorldView } from '../spec';

export type MutationKind = 'drop-emit' | 'drop-set' | 'flip-outcome' | 'swap-branch' | 'drop-request' | 'drop-backend' | 'drop-picker' | 'drop-subscribe' | 'drop-unsubscribe' | 'drop-socket' | 'drop-subscribe-first' | 'drop-answers' | 'drop-resume';

export interface Branch {
  reducer: string;
  /** The shape key: `set` keys sorted, `emit` list, `outcome`. */
  shape: string;
  /** The last patch the branch returned, for `swap-branch`. */
  example: PatchLike;
  /** How many times the suite reached it. */
  hits: number;
}

export interface Mutant {
  reducer: string;
  branch: string;
  kind: MutationKind;
  /** For `swap-branch`: the sibling branch's shape. */
  swappedWith?: string;
  spec: AnyNodeSpec;
}

export interface PatchLike {
  set?: Record<string, unknown>;
  emit?: readonly string[];
  /** NSP-012: derived pulses, part of the shape like `emit`. */
  emitDerived?: readonly string[];
  /** NSP-013 s14: declared and derived pulses in one order — part of the shape like `emit`. */
  pulses?: ReadonlyArray<string | { derived: string }>;
  outcome?: string;
  error?: string;
  /** An `afterInputs` patch: the deferred outcomes it resolves (spec.ts `AfterInputsPatch`). */
  outcomes?: ReadonlyArray<{ port: string; outcome: string; error?: string }>;
  /** NSP-007: a request the branch issues. */
  request?: unknown;
  /** NSP-014 s21: a backend call the branch makes. */
  backend?: unknown;
  /** NSP-014 s29: invocations no input opened, reported at once (spec.ts `AfterInputsPatch.opens`). */
  opens?: ReadonlyArray<{ outcome: string; error?: string }>;
  /** NSP-014 s31: a click on the file input (spec.ts `Patch.picker`). */
  picker?: unknown;
  /** NSP-014 s31: this input's pending invocations settled before its own opens (spec.ts `OutcomePatch.settles`). */
  settles?: ReadonlyArray<{ outcome: string; error?: string }>;
  /** NSP-014 s33: a subscription opened, and the ones disposed (spec.ts `Patch.subscribe` / `unsubscribe`). */
  subscribe?: unknown;
  unsubscribe?: readonly string[];
  /** NSP-014 s35: the subscriptions made before the backend calls (spec.ts `Patch.subscribeFirst`). */
  subscribeFirst?: boolean;
  /** NSP-014 s34: calls on WebSockets (spec.ts `Patch.socket`). */
  socket?: ReadonlyArray<{ op: string }>;
  /** NSP-016 s56: answers to callers, and an awaited promise (spec.ts `Patch.answers`, `Patch.resume`). */
  answers?: ReadonlyArray<{ op: string; value?: string }>;
  resume?: string;
}

/** `synced` (spec.ts `NodeDecl.synced`): state keys a branch key leaves out — the page's syncs, not the reducer's work. */
const NO_SYNCED: ReadonlySet<string> = new Set();
const syncedOf = (spec: AnyNodeSpec): ReadonlySet<string> => new Set(spec.synced ?? []);

export function shapeOf(patch: unknown, synced: ReadonlySet<string> = NO_SYNCED): string {
  const p = (patch && typeof patch === 'object' ? patch : {}) as PatchLike;
  return JSON.stringify({
    set: p.set ? Object.keys(p.set).filter((k) => !synced.has(k)).sort() : [],
    // WHICH signals, not how many — the rule `outcomes` already has: an Object node pulsing
    // `changed` once per key written is one branch, not one per count (NSP-012)
    emit: [...new Set([...(p.emitDerived ?? []), ...(p.emit ?? []), ...(p.pulses ?? []).map((x) => (typeof x === 'string' ? x : x.derived))])],
    outcome: p.outcome ?? null,
    // the resolved outcomes are part of the shape — WHICH outcomes, not how many: "Set → done" and
    // "Set → unchanged" are two branches; four Sets all unchanged is the same branch as one
    outcomes: p.outcomes ? [...new Set(p.outcomes.map((o) => `${o.port}:${o.outcome}`))].sort() : [],
    request: p.request !== undefined,
    // NSP-014 s21 — present only when the branch calls a backend, so every earlier spec's shapes are the strings they were
    ...(p.backend !== undefined ? { backend: true } : {}),
    // s29 — likewise only when the branch opens an invocation: WHICH outcomes it reports, as `outcomes`
    ...(p.opens !== undefined && p.opens.length > 0 ? { opens: [...new Set(p.opens.map((o) => o.outcome))].sort() } : {}),
    // s31 — likewise only when the branch clicks a file input, or settles earlier presses of its input
    ...(p.picker !== undefined ? { picker: true } : {}),
    ...(p.settles !== undefined && p.settles.length > 0 ? { settles: [...new Set(p.settles.map((o) => o.outcome))].sort() } : {}),
    // s33 — likewise only when the branch opens or disposes a subscription
    ...(p.subscribe !== undefined ? { subscribe: true } : {}),
    ...(p.unsubscribe !== undefined && p.unsubscribe.length > 0 ? { unsubscribe: true } : {}),
    // s35 — likewise only when the branch makes its subscriptions before its backend calls
    ...(p.subscribeFirst ? { subscribeFirst: true } : {}),
    // s34 — likewise only when the branch makes calls on a WebSocket: WHICH calls, not how many
    ...(p.socket !== undefined && p.socket.length > 0 ? { socket: [...new Set(p.socket.map((o) => o.op))].sort() } : {}),
    // NSP-016 s56 — likewise only when the branch answers a caller (WHICH answers, not how many). Not whether it awaits (`resume`):
    // an await is the state's progress, like a write — in the shape it split every branch by whether the queue started working there,
    // and each split was a branch only a scenario of its own could reach (seeds 13, 20733, 20729, 7 each found another)
    ...(p.answers !== undefined && p.answers.length > 0 ? { answers: [...new Set(p.answers.map((a) => (a.op === 'returned' ? 'returned' : `${a.op}:${a.value}`)))].sort() } : {})
  });
}

/** The reducers a spec has, by name — `derived` for the derived-port reducer, `afterInputs` for the frame-end one, `world.*` for the world handlers. */
export function reducerNames(spec: AnyNodeSpec): string[] {
  const names = Object.keys(spec.on).filter((k) => typeof spec.on[k] === 'function');
  if (spec.derived) names.push('derived');
  if (spec.derived?.signal) names.push('derived.signal');
  if (spec.afterInputs) names.push('afterInputs');
  if (spec.world?.timer) names.push('world.timer');
  if (spec.world?.response) names.push('world.response');
  if (spec.world?.change) names.push('world.change');
  if (spec.world?.resize) names.push('world.resize');
  if (spec.world?.page) names.push('world.page');
  if (spec.world?.popup) names.push('world.popup');
  if (spec.world?.backend) names.push('world.backend');
  if (spec.world?.store) names.push('world.store');
  if (spec.world?.auth) names.push('world.auth');
  if (spec.world?.authReturn) names.push('world.authReturn');
  if (spec.world?.mount) names.push('world.mount');
  if (spec.world?.place) names.push('world.place');
  if (spec.world?.picker) names.push('world.picker');
  if (spec.world?.realtime) names.push('world.realtime');
  if (spec.world?.socket) names.push('world.socket');
  if (spec.world?.stream) names.push('world.stream');
  if (spec.world?.group) names.push('world.group');
  if (spec.world?.resume) names.push('world.resume');
  // NSP-016 s37 — the person's acts (spec.ts THE PERSON), one reducer each
  for (const act of Object.keys(spec.person ?? {})) names.push(`person.${act}`);
  return names;
}

/**
 * A copy of the spec whose reducers are wrapped by `wrap(name, original)`. The declaration is
 * shared (it is data); only `on` / `derived.on` / `afterInputs` are replaced.
 */
export function wrapReducers(spec: AnyNodeSpec, wrap: (name: string, original: ErasedReducer) => ErasedReducer): AnyNodeSpec {
  const on: Record<string, ErasedReducer | undefined> = {};
  for (const [name, fn] of Object.entries(spec.on)) on[name] = typeof fn === 'function' ? wrap(name, fn) : fn;
  const out: AnyNodeSpec = { ...spec, on };
  if (spec.derived) {
    const original = spec.derived.on as unknown as ErasedReducer;
    out.derived = { ...spec.derived, on: wrap('derived', original) as unknown as typeof spec.derived.on };
    if (spec.derived.signal) out.derived.signal = wrap('derived.signal', spec.derived.signal as unknown as ErasedReducer) as unknown as typeof spec.derived.signal;
  }
  if (spec.afterInputs) {
    out.afterInputs = wrap('afterInputs', spec.afterInputs as unknown as ErasedReducer) as unknown as typeof spec.afterInputs;
  }
  if (spec.world) {
    const w: NonNullable<AnyNodeSpec['world']> = {};
    if (spec.world.timer) w.timer = wrap('world.timer', spec.world.timer as unknown as ErasedReducer) as unknown as typeof spec.world.timer;
    if (spec.world.response) w.response = wrap('world.response', spec.world.response as unknown as ErasedReducer) as unknown as typeof spec.world.response;
    if (spec.world.change) w.change = wrap('world.change', spec.world.change as unknown as ErasedReducer) as unknown as typeof spec.world.change;
    if (spec.world.resize) w.resize = wrap('world.resize', spec.world.resize as unknown as ErasedReducer) as unknown as typeof spec.world.resize;
    if (spec.world.page) w.page = wrap('world.page', spec.world.page as unknown as ErasedReducer) as unknown as typeof spec.world.page;
    if (spec.world.popup) w.popup = wrap('world.popup', spec.world.popup as unknown as ErasedReducer) as unknown as typeof spec.world.popup;
    if (spec.world.backend) w.backend = wrap('world.backend', spec.world.backend as unknown as ErasedReducer) as unknown as typeof spec.world.backend;
    // NSP-014 s24 — a handler left off this copy is not only unmutated: the copy no longer HEARS the store, so the reference
    // play and every mutant ran with the writes made elsewhere silently dropped (s24 found it by three survivors on the box)
    if (spec.world.store) w.store = wrap('world.store', spec.world.store as unknown as ErasedReducer) as unknown as typeof spec.world.store;
    // NSP-014 s26 — the same rule for the session events (world.ts AUTH): a copy without it never hears a login
    if (spec.world.auth) w.auth = wrap('world.auth', spec.world.auth as unknown as ErasedReducer) as unknown as typeof spec.world.auth;
    // s29 — and the return leg's two (a copy without them never hears a sign-in come back, and never applies one at its making)
    if (spec.world.authReturn) w.authReturn = wrap('world.authReturn', spec.world.authReturn as unknown as ErasedReducer) as unknown as typeof spec.world.authReturn;
    if (spec.world.mount) w.mount = wrap('world.mount', spec.world.mount as unknown as ErasedReducer) as unknown as typeof spec.world.mount;
    // NSP-016 s37 — placed on the page (a copy without it is never drawn)
    if (spec.world.place) w.place = wrap('world.place', spec.world.place as unknown as ErasedReducer) as unknown as typeof spec.world.place;
    // s31 — the file dialog's answer (world.ts PICKER): a copy without it never hears the person choose
    if (spec.world.picker) w.picker = wrap('world.picker', spec.world.picker as unknown as ErasedReducer) as unknown as typeof spec.world.picker;
    // s33 — what a subscription tells (world.ts REALTIME): a copy without it never hears a change
    if (spec.world.realtime) w.realtime = wrap('world.realtime', spec.world.realtime as unknown as ErasedReducer) as unknown as typeof spec.world.realtime;
    // s34 — what a WebSocket fires (world.ts SOCKET): a copy without it never hears a socket open
    if (spec.world.socket) w.socket = wrap('world.socket', spec.world.socket as unknown as ErasedReducer) as unknown as typeof spec.world.socket;
    // s34 — what a streamed body says (world.ts NETWORK): a copy without it never hears a chunk
    if (spec.world.stream) w.stream = wrap('world.stream', spec.world.stream as unknown as ErasedReducer) as unknown as typeof spec.world.stream;
    // NSP-016 s42 — the graph's writes to the group the node sits in (world.ts GROUP): a copy without it never hears one
    if (spec.world.group) w.group = wrap('world.group', spec.world.group as unknown as ErasedReducer) as unknown as typeof spec.world.group;
    // NSP-016 s56 — an awaited promise landing (spec.ts `resume`): a copy without it never finishes a build
    if (spec.world.resume) w.resume = wrap('world.resume', spec.world.resume as unknown as ErasedReducer) as unknown as typeof spec.world.resume;
    out.world = w;
  }
  // NSP-016 s37 — the person's acts: a copy without one would refuse the act the original answers
  if (spec.person) {
    const p: Record<string, (state: never, inputs: never, value: unknown, world: WorldView) => unknown> = {};
    for (const [name, fn] of Object.entries(spec.person)) p[name] = wrap(`person.${name}`, fn as unknown as ErasedReducer) as unknown as typeof fn;
    out.person = p;
  }
  return out;
}

/**
 * Wraps a spec so that every patch its reducers return is recorded as a branch. Run the suite
 * against the returned spec, then read `branches`.
 */
export function discoverBranches(spec: AnyNodeSpec): { spec: AnyNodeSpec; branches: Map<string, Branch> } {
  const branches = new Map<string, Branch>();
  const synced = syncedOf(spec);
  const wrapped = wrapReducers(spec, (name, original) => (...args: never[]) => {
    const patch = original(...args);
    const shape = shapeOf(patch, synced);
    const key = `${name}|${shape}`;
    const b = branches.get(key);
    if (b) {
      b.hits++;
      // keep the RICHEST example: a `swap-branch` that returns a sibling's patch setting
      // `undefined` is invisible on the wire (C3, an unset output sends nothing), so an example
      // whose `set` values are all defined is the one that can be told apart (NSP-011, String Mapper)
      if (defined(patch as PatchLike) > defined(b.example)) b.example = patch as PatchLike;
    } else branches.set(key, { reducer: name, shape, example: patch as PatchLike, hits: 1 });
    return patch;
  });
  return { spec: wrapped, branches };
}

/** How many of a patch's `set` values are defined. */
function defined(patch: PatchLike): number {
  return patch.set ? Object.values(patch.set).filter((v) => v !== undefined).length : 0;
}

function flip(outcome: string | undefined): string | undefined {
  if (outcome === 'done') return 'unchanged';
  if (outcome === 'unchanged') return 'done';
  if (outcome === 'failure') return 'done';
  return outcome;
}

function mutatePatch(patch: PatchLike, kind: MutationKind, sibling?: PatchLike, synced: ReadonlySet<string> = NO_SYNCED): PatchLike {
  switch (kind) {
    case 'drop-emit': {
      const { emit: _e, emitDerived: _d, pulses: _p, ...rest } = patch;
      return rest;
    }
    case 'drop-set': {
      const { set: _s, ...rest } = patch;
      return rest;
    }
    case 'flip-outcome': {
      // the invoking reducer's outcome, or — on an `afterInputs` branch — every outcome it resolves
      const flipped: PatchLike = { ...patch };
      if (patch.outcome !== undefined && patch.outcome !== 'deferred' && patch.outcome !== 'pending') flipped.outcome = flip(patch.outcome);
      if (patch.outcomes) flipped.outcomes = patch.outcomes.map((o) => ({ ...o, outcome: flip(o.outcome) as string }));
      if (patch.opens) flipped.opens = patch.opens.map((o) => ({ ...o, outcome: flip(o.outcome) as string }));
      if (patch.settles) flipped.settles = patch.settles.map((o) => ({ ...o, outcome: flip(o.outcome) as string }));
      return flipped;
    }
    case 'swap-branch': {
      // Keep this branch's outcome obligation satisfied: an outcome input must still report one.
      const swapped: PatchLike = { ...(sibling as PatchLike) };
      // The page's syncs (spec.ts `synced`) are not the reducer's work: a swap moves the work and keeps THIS branch's
      // syncs — a sibling recorded with the element disabled must not disable it here (s37: that stale value made a
      // swap on a Checkbox's blur invisible to the Blur action that would have told it apart).
      if (synced.size > 0) {
        const kept: Record<string, unknown> = {};
        for (const k of Object.keys(patch.set ?? {})) if (synced.has(k)) kept[k] = (patch.set as Record<string, unknown>)[k];
        const moved: Record<string, unknown> = {};
        for (const k of Object.keys(swapped.set ?? {})) if (!synced.has(k)) moved[k] = (swapped.set as Record<string, unknown>)[k];
        const set = { ...kept, ...moved };
        if (Object.keys(set).length > 0) swapped.set = set;
        else delete swapped.set;
      }
      if (patch.outcome !== undefined && swapped.outcome === undefined) swapped.outcome = patch.outcome;
      if (patch.outcome === undefined) delete swapped.outcome;
      return swapped;
    }
    case 'drop-request': {
      const { request: _r, ...rest } = patch;
      return rest;
    }
    case 'drop-backend': {
      const { backend: _b, ...rest } = patch;
      return rest;
    }
    case 'drop-picker': {
      const { picker: _p, ...rest } = patch;
      return rest;
    }
    case 'drop-subscribe': {
      const { subscribe: _s, ...rest } = patch;
      return rest;
    }
    case 'drop-unsubscribe': {
      const { unsubscribe: _u, ...rest } = patch;
      return rest;
    }
    case 'drop-socket': {
      const { socket: _s, ...rest } = patch;
      return rest;
    }
    case 'drop-subscribe-first': {
      const { subscribeFirst: _f, ...rest } = patch;
      return rest;
    }
    // NSP-016 s56 — the answers to callers, and the await
    case 'drop-answers': {
      const { answers: _a, ...rest } = patch;
      return rest;
    }
    case 'drop-resume': {
      const { resume: _r, ...rest } = patch;
      return rest;
    }
    default:
      return patch;
  }
}

/** Every mutant the discovered branches admit, each a spec with exactly one branch broken. */
export function mutantsOf(spec: AnyNodeSpec, branches: Map<string, Branch>): Mutant[] {
  const synced = syncedOf(spec);
  const out: Mutant[] = [];
  const byReducer = new Map<string, Branch[]>();
  for (const b of branches.values()) {
    const list = byReducer.get(b.reducer) ?? [];
    list.push(b);
    byReducer.set(b.reducer, list);
  }
  for (const b of branches.values()) {
    const ex = b.example;
    const kinds: Array<[MutationKind, Branch | undefined]> = [];
    if ((ex.emit && ex.emit.length > 0) || (ex.emitDerived && ex.emitDerived.length > 0) || (ex.pulses && ex.pulses.length > 0)) kinds.push(['drop-emit', undefined]);
    if (ex.set && Object.keys(ex.set).length > 0) kinds.push(['drop-set', undefined]);
    // a `deferred` outcome has nothing to flip (its resolution is afterInputs' branch, mutated there)
    if ((ex.outcome !== undefined && ex.outcome !== 'deferred' && ex.outcome !== 'pending') || (ex.outcomes && ex.outcomes.length > 0) || (ex.opens && ex.opens.length > 0) || (ex.settles && ex.settles.length > 0)) kinds.push(['flip-outcome', undefined]);
    if (ex.request !== undefined) kinds.push(['drop-request', undefined]);
    if (ex.backend !== undefined) kinds.push(['drop-backend', undefined]);
    if (ex.picker !== undefined) kinds.push(['drop-picker', undefined]);
    if (ex.subscribe !== undefined) kinds.push(['drop-subscribe', undefined]);
    if (ex.unsubscribe !== undefined && ex.unsubscribe.length > 0) kinds.push(['drop-unsubscribe', undefined]);
    if (ex.socket !== undefined && ex.socket.length > 0) kinds.push(['drop-socket', undefined]);
    if (ex.subscribeFirst) kinds.push(['drop-subscribe-first', undefined]);
    if (ex.answers !== undefined && ex.answers.length > 0) kinds.push(['drop-answers', undefined]);
    if (ex.resume !== undefined) kinds.push(['drop-resume', undefined]);
    for (const sibling of byReducer.get(b.reducer) ?? []) {
      if (sibling.shape !== b.shape) kinds.push(['swap-branch', sibling]);
    }
    for (const [kind, sibling] of kinds) {
      const mutated = wrapReducers(spec, (name, original) =>
        name !== b.reducer
          ? original
          : (...args: never[]) => {
              const patch = original(...args);
              return shapeOf(patch, synced) === b.shape ? mutatePatch(patch as PatchLike, kind, sibling?.example, synced) : patch;
            }
      );
      out.push({ reducer: b.reducer, branch: b.shape, kind, swappedWith: sibling?.shape, spec: mutated });
    }
  }
  return out;
}
