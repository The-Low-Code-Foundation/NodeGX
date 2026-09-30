# NSP-005 — The export adapter: run the emitted code for one node, headless

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: 📋 not started. Starts with a spike (§3.1) — the approach is not settled.**

## 1. The person sentence

> **The React repo NodeGX exports is graded against the same spec as the editor's runtime, node
> by node, without opening a browser.**

## 2. Why it is hard

Phase 18 emits **components**, not nodes. Some nodes survive as a library call (`dateLib`,
`timerLib`); some become `@nodegx/core` values and signals; and some **compile away entirely** —
String Format and Condition become inline expressions (`logic.test.ts`, Step 6). There is no
"Counter object" in the output to call `.set()` on.

So the adapter has to build the smallest **graph** that exercises one node, export it, and drive
the result:

```
Component Inputs ──▶ [ node under test ] ──▶ Component Outputs
```

## 3. What to build

### 3.1 Spike (first, time-boxed to one session)

Build that three-node component as an `ExportIR` in memory (the `logic.test.ts` helpers already
build and wire IR by hand), run `emitApp`, and try two ways of driving it:

- **(a) Without React.** If the emitted component's logic lives in `@nodegx/core` values and
  signals that can be reached without rendering, drive those directly. Fast; may not be reachable
  for every node.
- **(b) With React, headless.** Transpile (as `date-family.test.ts:63-100` already does with
  `ts.transpileModule` + `new Function`), render with a test renderer, and drive the component's
  props / read its outputs. Slower; works for anything that renders.

Write down which works for the pilot five, and why, before building the adapter.

### 3.2 The adapter

Implements NSP-002's `TargetAdapter`: `mount` builds and exports the wrapper component, `set`
drives a Component Input, `signal` pulses one, `trace` reads Component Outputs in order.

## 4. Acceptance criteria

1. The spike's finding is written in §6 with the numbers (ms per mount, per sequence) for both
   ways.
2. The pilot five run through the export adapter at the PR-CI budget.
3. Every mismatch is a §6 row. **Export mismatches are routed to phase 18's ledger, not fixed
   here** (README §8).
4. `nodegx-core-parity.test.ts`'s scenario runs unchanged through the new runner (the old test
   can stay; this proves the runner subsumes it).

## 5. Watch for

- **The wrapper is not neutral.** Component Inputs and Outputs have their own semantics (C11 late
  catch-up, component-output relay order). If a mismatch appears on *every* node, suspect the
  wrapper first — run the wrapper with a pass-through node (a Number variable) as a control.
- Typecheck noise: `datetostring.ts` does not typecheck under the export package's strict config
  (see the comment in `date-family.test.ts`). Transpile, don't import.
- Memory: *the editor's `test:ci` webpack typechecks a sibling package's tests* — a spec file
  with an export-only type can redden the editor's gate. Run `test:main` before closing.

## 6. Built

*(empty)*
