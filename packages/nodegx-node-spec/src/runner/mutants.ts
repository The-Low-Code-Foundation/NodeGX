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
 * A mutation that would leave the patch unchanged (drop-emit on a branch with no emit) is not
 * generated: it could only survive, and would say nothing.
 */

import type { AnyNodeSpec, ErasedReducer } from '../spec';

export type MutationKind = 'drop-emit' | 'drop-set' | 'flip-outcome' | 'swap-branch';

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
  outcome?: string;
  error?: string;
}

export function shapeOf(patch: unknown): string {
  const p = (patch && typeof patch === 'object' ? patch : {}) as PatchLike;
  return JSON.stringify({
    set: p.set ? Object.keys(p.set).sort() : [],
    emit: p.emit ? [...p.emit] : [],
    outcome: p.outcome ?? null
  });
}

/** The reducers a spec has, by name — `derived` for the derived-port reducer. */
export function reducerNames(spec: AnyNodeSpec): string[] {
  const names = Object.keys(spec.on).filter((k) => typeof spec.on[k] === 'function');
  if (spec.derived) names.push('derived');
  return names;
}

/**
 * A copy of the spec whose reducers are wrapped by `wrap(name, original)`. The declaration is
 * shared (it is data); only `on` / `derived.on` are replaced.
 */
export function wrapReducers(spec: AnyNodeSpec, wrap: (name: string, original: ErasedReducer) => ErasedReducer): AnyNodeSpec {
  const on: Record<string, ErasedReducer | undefined> = {};
  for (const [name, fn] of Object.entries(spec.on)) on[name] = typeof fn === 'function' ? wrap(name, fn) : fn;
  const out: AnyNodeSpec = { ...spec, on };
  if (spec.derived) {
    const original = spec.derived.on as unknown as ErasedReducer;
    out.derived = { inputs: spec.derived.inputs, on: wrap('derived', original) as unknown as typeof spec.derived.on };
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
      b.example = patch as PatchLike;
    } else branches.set(key, { reducer: name, shape, example: patch as PatchLike, hits: 1 });
    return patch;
  });
  return { spec: wrapped, branches };
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
      const { emit: _e, ...rest } = patch;
      return rest;
    }
    case 'drop-set': {
      const { set: _s, ...rest } = patch;
      return rest;
    }
    case 'flip-outcome':
      return { ...patch, outcome: flip(patch.outcome) };
    case 'swap-branch': {
      // Keep this branch's outcome obligation satisfied: an outcome input must still report one.
      const swapped: PatchLike = { ...(sibling as PatchLike) };
      if (patch.outcome !== undefined && swapped.outcome === undefined) swapped.outcome = patch.outcome;
      if (patch.outcome === undefined) delete swapped.outcome;
      return swapped;
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
    if (ex.emit && ex.emit.length > 0) kinds.push(['drop-emit', undefined]);
    if (ex.set && Object.keys(ex.set).length > 0) kinds.push(['drop-set', undefined]);
    if (ex.outcome !== undefined) kinds.push(['flip-outcome', undefined]);
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
