# NSP-001 — The spec format and the interpreter

**Opened 2026-09-29.** **Depends on NSP-000.** Needs **R1** (where specs live) and **R2** (formats).
**Status: ✅ BUILT s1 (2026-09-30)** under R1 (a) / R2 (a) as recommended — **not yet ruled**; see §5. Package `packages/nodegx-node-spec` (`@nodegx/node-spec`).

## 1. The person sentence

> **A node's behaviour fits on one screen, reads like the rules a person would say out loud, and
> runs.**

## 2. What to build

A new package (R1 (a): `packages/nodegx-node-spec`), strict TypeScript, no dependency on the
runtime, the editor or React.

### 2.1 `defineNode()`

Illustrative — the shape, not the final API:

```ts
export default defineNode({
  type: 'Counter',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/counter.ts',   // the code it was read from
  state: { count: 0, start: 0, startSeen: false },

  inputs: {
    startValue:    { type: 'number',  default: 0 },
    limitsEnabled: { type: 'boolean', default: false },
    limitsMin:     { type: 'number',  default: 0 },
    limitsMax:     { type: 'number',  default: 0 },
    increase: { type: 'signal', outcome: true },
    decrease: { type: 'signal', outcome: true },
    reset:    { type: 'signal', outcome: true },
  },
  outputs: {
    currentCount: { type: 'number', from: (s) => s.count },
    countChanged: { type: 'signal' },
  },

  on: {
    startValue: (s, v) =>
      s.startSeen ? { set: { start: v } }
                  : { set: { start: v, count: v, startSeen: true }, emit: ['countChanged'] },
    increase: (s, i) =>
      i.limitsEnabled && s.count >= i.limitsMax
        ? { outcome: 'unchanged' }
        : { set: { count: s.count + 1 }, emit: ['countChanged'], outcome: 'done' },
    // …
  },
});
```

Rules the type system enforces:
- A reducer is **pure**: it receives frozen state and inputs and returns a patch. No `this`,
  no clock, no randomness (those arrive through the world, NSP-007).
- Every `outcome: true` input returns exactly one outcome on every path (the ERG-001 contract).
- `emit` names only declared signal outputs; `set` names only declared state keys.
- Every spec carries `source` (the file it was read from) and `version`.
- **Coercion is declared, not implied.** Where the runtime does `Number(value)`, the port says
  `coerce: 'number'` and the interpreter applies the runtime's own coercion table
  (`expression-type-coercion.ts` is the reference), so `"3"`, `null` and `undefined` behave as they
  do in the runtime.

### 2.2 The interpreter

Runs one spec as a node in isolation: holds state, applies input writes and signal pulses,
computes outputs, and records a trace (NSP-002's format). It implements the per-node parts of the
core contract: **C2** (every send delivered, in order), **C3** (`undefined` is never sent) and
**C4** (every pulse fires). Graph-level clauses are NSP-008's.

## 3. Acceptance criteria

1. `defineNode` compiles under `strict: true` with no `any`; a spec that emits an undeclared
   signal, sets an undeclared state key, or misses an outcome on some path **fails to typecheck**
   (three `@ts-expect-error` specs prove it).
2. The interpreter runs a Counter spec and produces a trace for a scripted sequence.
3. Two runs of the same sequence produce byte-identical traces.
4. The package's tests run in `test:packages` and in `test:main` (exit status read, not the
   output's last line).

## 4. Watch for

- **Don't build a DSL.** If the spec language needs its own debugger, it has failed. TypeScript
  data plus pure functions.
- **Units** (C10): some values travel as `{ value, unit }` objects. The port types must be able to
  say so, or Number Remapper and the layout nodes cannot be specced later.
- Dynamic ports (String Format's `{name}` inputs, Expression's variables) need a way to declare
  "ports derived from a parameter" — design it here, used in NSP-004.

## 5. Built — s1, 2026-09-30

**Where:** `packages/nodegx-node-spec` — `src/spec.ts` (the format), `src/coerce.ts` (the declared coercion table,
every rule citing its runtime line), `src/trace.ts` (the event type NSP-002's schema will formalise),
`src/interpreter.ts` (`mount / set / signal / settle / trace / run`), `src/nodes/counter.ts` (the worked example,
read from `counter.ts` with line citations), `src/nodes/index.ts` (the registry NSP-009 counts). Strict TS,
`noImplicitReturns`, no dependency on the runtime, the editor or React; no `any` (two `as never` casts at the
interpreter's erased call sites, explained in `AnyNodeSpec`'s docblock).

**Acceptance criteria, measured:**

| AC | reading |
|---|---|
| 1 types | `tsc -p packages/nodegx-node-spec --noEmit` exit 0. `tests/types.test.ts` holds **six** `@ts-expect-error` lines (undeclared `emit`, undeclared `set` key, missing outcome, a branch falling off the end under `noImplicitReturns`, a signal input with no reducer, an outcome returned by a non-outcome input). **Proven graded both ways**: removing the rule-1 directive → the suite fails on `TS2322 '"nope"' is not assignable to '"fired"'`; planting a directive over a correct line → fails on `TS2578 Unused '@ts-expect-error'`. That works because ts-jest here type-checks (no `isolatedModules`) — `jest.config.js` says so and why |
| 2 Counter runs | `tests/counter.test.ts`: a 10-step script from `{ startValue: 5 }` produces the 24-event trace written out in full (seed pulse on the first settle; increase+decrease in one frame → no value event but both pulses and both outcomes; reset → done; reset at start → unchanged with Count Changed silent, FH-022) |
| 3 determinism | two runs byte-identical (`JSON.stringify`); ~~the caller's param literal order does not change the trace (mount applies params in declaration order)~~ **reversed in s2 (NSP-002 §5 decision 5): params apply in the caller's key order, the runtime's own; the test now asserts the `set` order follows the literal and the observations are unchanged** |
| 4 gates | `npx jest` **44/44**, `lerna run test --scope @nodegx/node-spec` exit 0; the `--scope` entry and `typecheck:node-spec` / `spec-census` / `spec-census:check` scripts added to the root `package.json` and the two lockfile rows added — **committed through the index from HEAD** (`git show HEAD:package.json` + edits, `hash-object` / `update-index --cacheinfo`) because the working-tree root `package.json` is a peer's stray Nightbook manifest since 2026-09-28 (see the NEXT-SESSION-PROMPT). `test:main`: see the handoff for the reading |

**The format, as built (differs from §2.1's sketch in one place, for a measured reason):**

```ts
export const Counter = defineNode({
  type: 'Counter', version: 1, source: 'packages/noodl-runtime/src/nodes/std-library/counter.ts',
  state: { count: 0, start: 0, startSeen: false },
  inputs: { increase: { type: 'signal', outcome: true }, startValue: { type: 'number', default: 0, coerce: 'js-number' }, … },
  outputs: { currentCount: { type: 'number', from: (s) => s.count }, countChanged: { type: 'signal' } }
}).on({
  increase: (s, i) => i.limitsEnabled && s.count >= i.limitsMax ? { outcome: 'unchanged' }
                                                                 : { set: { count: s.count + 1 }, emit: ['countChanged'], outcome: 'done' },
  startValue: (s, v) => s.startSeen ? { set: { start: v } } : { set: { start: v, count: v, startSeen: true }, emit: ['countChanged'] }
});
```

- **Two calls, not one literal.** Measured with three probe files (TS 5.9.3): with `on` inside the same literal, TS
  types the reducers before `I` is fixed, every key-filtered mapped type appears to hold every key, and each reducer
  is typed against the *union* of the three reducer signatures — `inputs` came out `unknown`, a value reducer's
  `value` came out `number | Inputs<I>`. Variants tried and failed the same way: without `const` type params;
  key-remapped mapped types (`as` clauses); `NoInfer` on `I` only; `NoInfer` on all three; a two-argument
  `defineNode(decl, on)`. `NoInfer<Reducers<…>>` on the property fixed the parameters but widened
  `emit: ['countChanged']` to `string[]` (every emit would need `as const`). The curried form gives typed parameters
  *and* literal checks with nothing on the spec. The seam is also the right one: the declaration is what a
  non-TypeScript target reads; the reducers are what only the interpreter runs.
- **Coercion is a declared kind, not a port type.** The runtime coerces two ways — a setter's own `Number(value)`
  (`"abc"` → `NaN`, `null` → `0`) and `coerceToType` (both → the fallback) — so `coerce: 'js-number' | 'typed-number' | …`,
  eight kinds, each citing its line. Counter uses `js-number` and `js-boolean`. NSP-011's four Variables are where
  the `typed-*` kinds get their first real use.
- **Signal reducers are required, value reducers optional** (rule 4, enforced by the type of `on`); a value input
  without a reducer just stores.
- **Frame model:** reducers run at once and *queue* emits/outcomes; `settle` records values that changed (canonical
  compare; `undefined` never sent, C3) ~~in output declaration order~~ **sorted by port name (changed in NSP-002 §5
  decision 4, s2)**, then signals (C2, C4), then outcomes. That
  grouping is a rule of the trace FORMAT so a runtime that pulses synchronously inside a setter still compares equal
  — NSP-002's runtime adapter must group the same way; written into `trace.ts` and NSP-002 §4.
- **Dynamic ports** designed as `derived: { inputs(params) → decls, on(state, port, value, derivedValues) → patch }`
  passed as `.on(reducers, derived)` — ~~as `.on(reducers, derived)`~~ **s3 (NSP-004): the second argument is
  `extras: { derived?, afterInputs? }`**, `derived` grew `discover(port)` (a port the target registers on first
  write — And's `input <n>`, String Format's any-name) and `candidates` (names the generator may drive), and
  `afterInputs(state, inputs) → patch` is the frame-end reducer the `scheduleAfterInputsHaveUpdated` families need
  (Condition first). NSP-004 §5 has the reasons; the interpreter routes a write to a derived port through it and refuses a derived
  port that shadows a declared one. First real use: String Format, NSP-004.
- **Units (C10):** `type: 'dimension'` ports carry `number | { value, unit }` (`UnitValue`). Nothing uses it yet.
- **Run-time guards mirror every type rule** (a spec can arrive as data): undeclared `set` key / `emit` name, a
  missing or unexpected outcome, a signal input with no reducer, a param that is not an input — each a `SpecError`
  naming the key (`tests/counter.test.ts`). State and inputs are deep-frozen, so a mutating reducer throws.

**Added at the end of s1, from R6 (the editor is a target):** `PortMeta` (`displayName`, `group`, `description`)
on every port declaration, `outcomes` and `inspect` on the node declaration, and `tests/catalog-parity.test.ts`
— for every registered spec, the ports the editor draws today (the catalog) must equal the spec's, with the
outcome ports derived from `outcomes`. Counter passes it. The test reads `node-catalog.json` as data, so the
package still depends on nothing in the runtime.

**Not in this task:** the JSON schema and canonicaliser (NSP-002), the runtime adapter (NSP-002), scenarios as JSON
files and mutants (NSP-003). `run(spec, params, steps)` already takes a JSON-shaped `Step[]` so NSP-003 can read
scenarios from disk without a new format.

**Grown in s4 (NSP-011, 2026-09-30) — two things, both in `spec.ts` with their reasons:** an outcome may be
**`'deferred'`** (`ReducerOutcome`) and the frame-end reducer then returns `outcomes: [{ port, outcome, error? }]`
(`AfterInputsPatch`) — the Variables' `Set` learns done / unchanged only from the frame's final value; the interpreter keeps
rule 3 at run time (an unresolved slot, a resolution nobody deferred, or a `deferred` with no `afterInputs` is a
`SpecError` at settle). And a patch may carry **`send: [<value outputs>]`** — the runtime's `flagOutputDirty` calls, named
only where they are conditional (Boolean To String), because a wire holds the last DEFINED value a frame sent (NSP-002 §5
addendum). NSP-011 §6.3 has the derivations.

**s14 (2026-10-01, NSP-013's States):** a derived input may be a **signal** — `derived.inputs` / `discover` declare
`{ type: 'signal', outcome? }`, the port is pulsed with `signal()` (a `set()` on it is refused) and reaches
**`derived.signal(state, port, derived, world)`**, which owes an outcome on every path when its declaration says
`outcome: true` (checked at run time; `ResolvedOutcome.port` accepts a derived name). And a patch may carry
**`pulses`** — declared and derived pulses in ONE order (`'stateChanged'`, `{ derived: 'reached-B' }`), queued after
`emitDerived` and `emit`, for a node that interleaves the two. The generator pulses derived signals only for a spec
that declares one; the mutants wrap `derived.signal` and read `pulses` into a branch's shape. NSP-013 §6.1g.
