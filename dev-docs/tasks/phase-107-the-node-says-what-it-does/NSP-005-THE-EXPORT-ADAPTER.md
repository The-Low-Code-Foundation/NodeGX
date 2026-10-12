# NSP-005 — The export adapter: run the emitted code for one node, headless

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: ✅ built s6 (2026-09-30) — the spike answered §3.1 (neither way runs the task file's wrapper: the exporter DEFERS it for all five); the adapter grades a node inside a declared REACH; Counter and Switch conform on the export at 200 and at 10,000 inside theirs, four export/runtime rows (E1–E4) routed to phase 18; And, Condition, String Format have no drivable shape and say so in the exporter's own words. §6.**

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

## 6. Built — s6, 2026-09-30

### 6.1 The spike (§3.1), and what it found instead of the answer it was asked for

The three-node wrapper — Component Inputs → node → Component Outputs, every port wired — was built as an in-memory
`ExportIR` (a `Group` root added: a component with no visual root is not emitted at all, "logic-only components defer
to EXP-003") and run through `emitApp` for each of the five. **The exporter defers it for all five**, each with its own
sentence in the notes:

| node | what the exporter says about the wrapper |
|---|---|
| Counter | *its countChanged signal is consumed — change-conditional pulses are not translated*; *its Start Value is wired — the first arrival seeds the count*; every `in:X->n:X` value wire *has no deterministic translation in step 5* |
| Switch | *its switched signal is consumed*; *its State input is wired — the setter announces a switch even though nothing switched* |
| And | *the And has no inputs wired or authored* (its inputs are derived; a wire from Component Inputs is not a feed it reads); *a logic truth value lands only in a truthiness sink* |
| Condition | *a Condition mixing Evaluate or branch wiring with value outputs has no single honest translation*; with Run On Value Change ticked its Evaluate wire is dropped |
| String Format | *the format string is wired, not literal*; with no format, *not a literal* — a constant either way |

So the question in §3.1 — (a) without React or (b) with React, headless — has a prior question: **the exporter translates
a node only in the graph shapes its slices cover, never the node's whole surface.** A wrapper that exposes every port
exposes exactly the wires the exporter defers. Three more shapes were tried (values only; params only; a *rendered*
wrapper with a Button per signal input and a Text per value output): the value-input wire from Component Inputs defers
the node in every one. **The one shape that emits running code for a pilot node is the latch**: literal params, a Button
per signal input (`onClick` is a rendered element event), the value output into a Component Outputs value port (the
exporter emits an `on<Port>Changed` callback prop with a `useEffect` on the state var). Counter and Switch have it.

**(a) without React: closed for every pilot node.** The emitted latch is `useState` inside the component; nothing reaches it
without rendering. It would be open for a node the exporter lifts into a module-level `value()` (the Variables), none of
which is a pilot node. **(b) with React, headless: works** — `ts.transpileModule` on the emitted `.tsx` (`jsx: react-jsx`,
the `.module.css` import stubbed), `react-dom/client` `createRoot` into a jsdom document, `act` around every render and
click, the callback prop as the observation.

### 6.2 The numbers (AC1)

| | reading (s6, this machine) |
|---|---|
| `emitApp` on a one-component project + `transpileModule` (a cache miss) | Counter 10–90 ms, Switch 9–11 ms (first call of the process pays the JIT: up to 300 ms) |
| a mount from the cache (a render) | 0.6–2.6 ms (17 ms the very first) |
| a step (one click under `act`) | 0.14–1.9 ms; 200 clicks in 28–182 ms |
| Counter, 200 sequences + mutants, in jest | 0.8 s |
| Switch, 200 sequences + mutants, in jest | 0.5 s |
| **the deep run: Counter at 10,000** | **CONFORMS, 24.5 s, 0 divergences** (known rows: E1 628, E2 179, E3 88) |
| **the deep run: Switch at 10,000** | **CONFORMS, 12.0 s, 0 divergences** (E1 478, E4 672) |
| (a) without React | n/a — no pilot node is reachable |

Emission is cached per (type, params) in the target, so a run of 200 sequences pays the exporter once per distinct
param set; the deep run is a render and a few clicks per sequence.

### 6.3 What was built

- **Reach** — `packages/nodegx-node-spec/src/runner/reach.ts`: a target may declare, per node, the params it accepts at
  mount, the ports it can be driven on, the outputs it observes, and the inputs whose outcomes it observes. The runner
  (`ConformanceOptions.reach`) generates sequences inside it, marks a hand scenario outside it `outside` (counted, never
  hidden; `Report.reach`, the report prints the reach), **projects the reference trace onto it** before every comparison,
  and runs the mutant phase on the projected traces — so a mutant the reach cannot see SURVIVES and is printed *not graded
  by this reach*, the honesty number, never held against the target; a reducer whose port is outside the reach is listed
  as `outsideReducers`, not UNREACHED. A target with full reach passes no `reach` and nothing changes (the generator's
  pinned digest holds). `tests/reach.test.ts` grades it on a narrowed interpreter (10 tests), including the two rules
  that matter: without the reach the same narrow target does NOT conform, and the four `countChanged` drop-emit mutants
  survive under Counter's latch reach — the pulse the export cannot show.
- **The export target** — `packages/nodegx-export/tests/helpers/node-spec-target.ts`: `EXPORT_REACH` (Counter: `startValue`
  / increase, decrease, reset / `currentCount`; Switch: `onFromStart` / on, off, flip / `state`; no outcomes — the latch
  has no Done port), `NO_REACH` (the exporter's sentences for And, Condition, String Format; `mount` throws them),
  `latchComponent` + `probeProject` (the IR), `emitProbe` (cached emit + transpile), `exportTarget()` — `set` throws (a
  value input reaches an exported latch only as a literal param), `signal` clicks the button whose label is the port,
  `settle` records the last callback value per output when its canonical form changed. Params: literals in the IR;
  `undefined` recorded as a `set` with no value and omitted from the IR (the file format cannot say it); anything else
  `{ kind: 'json' }`, which the latch's `literalParam` does not read.
- **The gate** — `packages/nodegx-export/tests/node-spec-conformance.test.ts`: Counter and Switch at 200 with mutants and
  the `known` rows below; the three refusals with the exporter's notes printed; the cache/mount timing; the deep run
  behind `NSP_DEEP`. `npx tsc -p packages/nodegx-export/tsconfig.json --noEmit` reads 0 (the editor's `test:ci` webpack
  typechecks these tests — memory).

### 6.4 The rows (AC3) — routed to phase 18, recorded here

Every generated divergence between the export and the spec at 200 and at 10,000 falls in one of four classes. Each is a
`known` row in the gate with a narrow predicate (port, value type, first differing event), so it is counted every run and
the day it stops firing the gate says so. **None is fixed here** (README §8) — the rows are written for phase 18 in
[`FROM-P107-NODE-SPEC-ROWS.md`](../phase-18-code-export-v2/FROM-P107-NODE-SPEC-ROWS.md).

| row | node | what differs | counted at 200 / 10,000 |
|---|---|---|---|
| **E1** | Counter, Switch | **the project file carries literals only**: a param that is an object, an array or `undefined` cannot reach the exporter (`{ kind: 'json' }` is not read by the latch; `undefined` has no file form). The runtime counts NaN from `{}` on a Counter and boots a Switch ON from `{ a: 1 }`; the export boots 0 / off. Partly the generator's reach (a file never holds `undefined`), partly real: a `json`-kind Start Value is silently 0 | 18 + 8 / 628 + 478 |
| **E2** | Counter | **a non-numeric Start Value string** (`'abc'`): the exported latch boots `Number(raw) \|\| 0` = 0 and counts from there; the runtime's Counter counts NaN for ever. The export silently "fixes" a broken counter | 7 / 179 |
| **E3** | Counter | **negative zero**: a Start Value of `-0` stays `-0` in the runtime and becomes `0` in the export (`\|\| 0`). Invisible to a person, visible to the trace | 1 / 88 |
| **E4** | Switch | **a string or number Start State**: the exporter reads `literalParam === true`; the runtime reads truthiness — `'true'`, `1`, `'3'` and even `'false'` boot the runtime's Switch ON and the export's OFF | 12 / 672 |

What the reach cannot grade, printed by the gate as the honesty number: Counter **6 / 14** mutants killed (the eight
survivors drop or flip `countChanged` and the Done / Unchanged outcomes — the export consumes neither), Switch **11 / 26**
(the `switched` family and outcomes). Those pulses are *not translated in this slice* by design (CONTROLLED-STATE-TARGET);
the number says how much of the node the export carries, which is the number this task exists to produce.

### 6.5 Acceptance, honestly

- **AC1** ✅ §6.1–6.2: which way works and why, with the numbers, for both ways — and the finding above them.
- **AC2** ✅ for the two pilot nodes the export has a shape for, at 200 in the gate (1.3 s for both) and at 10,000 once;
  ⚠️ for And, Condition and String Format the honest reading is *no drivable shape* — the gate asserts the exporter's
  own refusal, and the phase's number counts them as **0 on the export** until phase 18 gives them one (§6.4's rows say
  what would have to change; the And could be reached through a Variable feed and a truthiness sink, a Condition through
  Evaluate-only wiring — a next step, not this session's).
- **AC3** ✅ four rows, counted, routed, none fixed here.
- **AC4** ⚠️ *not as written*: `nodegx-core-parity.test.ts`'s scenario drives three synthetic test-only nodes
  (`parity.Source` / `Transform` / `Sink`) against hand-built `@nodegx/core` values — there is no spec for those nodes, so
  the runner cannot play its scenario. What the criterion meant is delivered differently: the export target IS the
  `@nodegx/core`-side comparison for real picker nodes, and the old test stays as the primitives' own contract.
- **§5's warnings** ✅ the wrapper is not neutral — measured: it is deferred outright, so the adapter mounts the latch
  shape instead; `datetostring.ts` is not imported (transpile only); the export package's `tsc` reads 0.
