# NSP-001 — The spec format and the interpreter

**Opened 2026-09-29.** **Depends on NSP-000.** Needs **R1** (where specs live) and **R2** (formats).
**Status: 📋 not started.**

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

## 5. Built

*(empty)*
