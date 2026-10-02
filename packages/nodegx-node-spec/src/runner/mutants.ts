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
 * A mutation that would leave the patch unchanged (drop-emit on a branch with no emit) is not
 * generated: it could only survive, and would say nothing.
 *
 * The world handlers (NSP-007, `spec.world.timer` / `spec.world.response`; NSP-012's
 * `spec.world.change`) are reducers like any
 * other here, named `world.timer`, `world.response`, `world.change`, (s13) `world.resize`, (s19) `world.page`, (s20) `world.popup` and (NSP-014 s21) `world.backend`, (s24) `world.store`, (s26) `world.auth`, (s29) `world.authReturn` and `world.mount`; whether a branch issues a request
 * — or calls a backend — is part of its shape. A branch's `after` / `cancel` / `abort` effects are NOT in the shape and have no
 * mutant of their own yet (a dropped timeout timer shows only in a sequence that waits past it
 * with an answer that never comes) — named in NSP-007 §5 as the runner's next hole.
 */

import type { AnyNodeSpec, ErasedReducer } from '../spec';

export type MutationKind = 'drop-emit' | 'drop-set' | 'flip-outcome' | 'swap-branch' | 'drop-request' | 'drop-backend';

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
}

export function shapeOf(patch: unknown): string {
  const p = (patch && typeof patch === 'object' ? patch : {}) as PatchLike;
  return JSON.stringify({
    set: p.set ? Object.keys(p.set).sort() : [],
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
    ...(p.opens !== undefined && p.opens.length > 0 ? { opens: [...new Set(p.opens.map((o) => o.outcome))].sort() } : {})
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
    out.world = w;
  }
  return out;
}

/**
 * Wraps a spec so that every patch its reducers return is recorded as a branch. Run the suite
 * against the returned spec, then read `branches`.
 */
export function discoverBranches(spec: AnyNodeSpec): { spec: AnyNodeSpec; branches: Map<string, Branch> } {
  const branches = new Map<string, Branch>();
  const wrapped = wrapReducers(spec, (name, original) => (...args: never[]) => {
    const patch = original(...args);
    const shape = shapeOf(patch);
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

function mutatePatch(patch: PatchLike, kind: MutationKind, sibling?: PatchLike): PatchLike {
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
      return flipped;
    }
    case 'swap-branch': {
      // Keep this branch's outcome obligation satisfied: an outcome input must still report one.
      const swapped: PatchLike = { ...(sibling as PatchLike) };
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
    default:
      return patch;
  }
}

/** Every mutant the discovered branches admit, each a spec with exactly one branch broken. */
export function mutantsOf(spec: AnyNodeSpec, branches: Map<string, Branch>): Mutant[] {
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
    if ((ex.outcome !== undefined && ex.outcome !== 'deferred' && ex.outcome !== 'pending') || (ex.outcomes && ex.outcomes.length > 0) || (ex.opens && ex.opens.length > 0)) kinds.push(['flip-outcome', undefined]);
    if (ex.request !== undefined) kinds.push(['drop-request', undefined]);
    if (ex.backend !== undefined) kinds.push(['drop-backend', undefined]);
    for (const sibling of byReducer.get(b.reducer) ?? []) {
      if (sibling.shape !== b.shape) kinds.push(['swap-branch', sibling]);
    }
    for (const [kind, sibling] of kinds) {
      const mutated = wrapReducers(spec, (name, original) =>
        name !== b.reducer
          ? original
          : (...args: never[]) => {
              const patch = original(...args);
              return shapeOf(patch) === b.shape ? mutatePatch(patch as PatchLike, kind, sibling?.example) : patch;
            }
      );
      out.push({ reducer: b.reducer, branch: b.shape, kind, swappedWith: sibling?.shape, spec: mutated });
    }
  }
  return out;
}
