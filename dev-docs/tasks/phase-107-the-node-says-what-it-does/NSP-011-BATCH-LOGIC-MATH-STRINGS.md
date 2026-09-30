# NSP-011 — Batch: logic, math, strings, variables, converters

**Opened 2026-09-29.** **Depends on NSP-004** (and R4 = continue).
**Status: ✅ built s4 (2026-09-30) — 13 / 13 conform on the runtime at 200 with every mutant killed; 3 runtime-bug rows (C4, C5, C6→R7) + 3 doc-vs-code (D6–D8), none graded by an existing test; AC2 (the export adapter) waits for NSP-005; the deep run waits for a quiet box (§6.4).**

## 1. The person sentence

> **Every small node people wire together to make a decision — compare, invert, format, remap,
> hold a value — says what it does and is checked.**

## 2. The nodes (from the census)

**13**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T1 pure / state machine (13):** Boolean · Boolean To String · Color · Color Blend · Inverter · Log (`net.noodl.Log`) · Number · Number Remapper · Or · String · String Mapper · Substring · Value Changed

Census notes:
- **Boolean** — carries the coercion table — spec first
- **Color** — carries the coercion table — spec first
- **Log** — the console line is an effect routed to the world (NSP-007), checked not ignored
- **Number** — carries the coercion table — spec first
- **Number Remapper** — first node where units (C10) matter
- **String** — carries the coercion table — spec first
- **Value Changed** — defined by equality; the rule for objects, NaN and -0 feeds the canonicaliser

(The pilot five — Counter, Switch, And, Condition, String Format — are NSP-004's.)

## 3. What is special here

- **The four Variables** (Boolean, Color, Number, String) look trivial and carry the coercion
  table. Spec them first; every other node's `coerce:` rules lean on them.
- **Value Changed** is defined by *equality*, which needs a rule for objects, `NaN` and `-0`.
  Write the rule from the runtime, cite it, and put it in the canonicaliser (NSP-002) if it
  differs.
- **Number Remapper** is where **units** (C10) first matter.
- **Log** has a side effect (the console). Spec its outputs; route the console line to the world
  (NSP-007) as an effect, so it is checked rather than ignored.

## 4. Acceptance criteria (every batch)

1. Every node in §2 is **specced** by the ledger's definition (NSP-009: spec, mutants killed,
   conforms on the runtime at the R5 budget) **or exempt with a reason**.
2. Every node is run on the export adapter; each mismatch is a row in §6 routed to phase 18.
3. Every divergence from the runtime is a row with its replay file and a proposed R3 answer; no
   runtime change rides inside this task.
4. The ledger floor is raised in the closing commit, and the README's status line says the new
   number.

## 5. Watch for

- Memory: *a CSS property whose default equals the test value matches everything* — the same trap
  for scenarios: a scenario that writes a port's **default** proves nothing about that port.
  The generator must also write non-defaults.

## 6. Built — s4, 2026-09-30

**Where.** `packages/nodegx-node-spec/src/nodes/{inverter,or,boolean-to-string,substring,number-remapper,value-changed,log,
string-mapper,color-blend}.ts` and the Variables family as `variable-base.ts` + `{boolean,number,string,color}.ts` (one file per
node, R1 (a); the base mirrors `variablebase.ts` line for line), registered in `nodes/index.ts` (18 specs); `scenarios/<type>.json`
for each (96 hand scenarios; 145 with the pilot's); `tests/batch.test.ts` (the interpreter side: every batch spec conforms, the deferred outcome, the
canonical scenario files, `ports(params)` for the three numbered families, and each §6.2 row pinned). The runtime reading is
`packages/noodl-runtime/test/node-spec/conformance.test.ts`, now over EVERY registered spec (`NSP_ONLY` takes a comma-separated
list), with the three viewer-provided nodes (Color, Value Changed, Color Blend — `providedBy: noodl-viewer-react` in the census)
registered from the viewer's own source by `withViewerNodes` in `test/helpers/node-spec-target.ts`, so a spec of a viewer node is
graded against the code the app runs and no copy is kept.

### 6.1 The numbers (AC1, AC3)

| node | spec lines (code) | hand scenarios | PR-CI reading (200, seed 20726, mutants) | deep (10,000, seed 20726, shrink; s5) | rows |
|---|---|---|---|---|---|
| Boolean | base 217 (142) + 36 (27) | 12 | conforms, 40/40 | conforms, 0 div, 37.4 s | C5 |
| Number | + 36 (27) | 8 | conforms, 40/40 | conforms, 0 div, 39.4 s | C5 |
| String | + 47 (37) | 8 | conforms, 40/40 | conforms, 0 div, 42.8 s | C5 |
| Color | + 43 (27) | 6 | conforms, 40/40 | conforms, 0 div, 40.6 s | C5 |
| Boolean To String | 78 (49) | 7 | conforms, 6/6 | conforms, 0 div, 37.1 s | D6 |
| Color Blend | 167 (113) | 10 | conforms, 2/2 | conforms, 0 div, 37.9 s | D8 |
| Inverter | 53 (31) | 3 | conforms, 1/1 | conforms, 0 div, 35.8 s | — (decision 2 came from here) |
| Log | 109 (70) | 5 | conforms, 2/2; 1 scenario + 4 sequences attributed to C6 | conforms, 0 div, 38.6 s; C6 **115** | C6 |
| Number Remapper | 124 (90) | 6 | conforms, 6/6 | conforms, 0 div, 36.9 s | — |
| Or | 73 (41) | 5 | conforms, 1/1 | conforms, 0 div, 36.2 s | — |
| String Mapper | 127 (89) | 11 | conforms, 15/15; 2 scenarios + 37 sequences attributed to C4 | conforms, 0 div, 38.8 s; C4 **1,932** | C4 |
| Substring | 79 (49) | 7 | conforms, 5/5; 2 scenarios + 26 sequences attributed to C4 | conforms, 0 div, 36.3 s; C4 **1,350** | C4, D7 |
| Value Changed | 56 (27) | 5 | conforms, 4/4; 1 scenario + 4 sequences attributed to C6 | conforms, 0 div, 36.5 s; C6 **91** | C6, D9 |

**13 / 13 conform on the runtime at the R5 budget, every mutant killed, 0 unreached** (`npx jest test/node-spec` in
`packages/noodl-runtime`: 2 suites, 38 passed, 18 skipped; the package: 10 suites, 249). The pilot five still conform (the
format changes below are behaviour-neutral for them: same mutant counts, 23 / 26 / 4 / 16 / 2). The runtime target also
captures Log's line on its handle (`logs`) and the suite asserts it is written with the level, the message and the data —
the effect is checked, not ignored (§3), though not yet graded through the world (NSP-007).

**Divergences found: 3 on the wire (C4, C5, C6) + 3 doc-vs-code (D6, D7, D8) + 1 description edge (D9), 0 graded by any
existing test.** Substring's own docblock and port description *say* it raises on null (C4) — a described defect is still a
defect. C5 and C6 were found by the generator (C6 on Value Changed's first run: `2` after a unit object fired three times).

**Time (session clock, 2026-09-30):** 15:24 start; 15:24–15:40 reading the 13 sources, the base, node.ts and the s3 files;
15:40–15:52 the deferred-outcome extension (spec, interpreter, mutants); 15:52–16:00 the 13 specs (≈ 30 s each with the
source open — the Variables family is one file plus four tiny ones); 16:00–16:05 parity green for all 18 on the first run
and the 13 scenario files; 16:05–16:20 the interpreter-side suite and the mutant fixes (§6.3 decision 7); 16:20–16:40 the
runtime readings: 12 divergences on Inverter, 1 on Boolean To String, 1 survivor on String Mapper → decisions 2, 3, 4;
then this section. Cost per node is unchanged from NSP-004; the format work (≈ 45 min) was, again, the real cost — and
again it is general (every `hasScheduled…` family with outcomes needs decision 1; every node whose output can be
`undefined` mid-frame needs decision 2).

### 6.2 The rows — for Richard to rule on (R3 (a): nothing in the runtime changed)

| row | node | what, with the line | how it was found / where it is pinned | proposed answer |
|---|---|---|---|---|
| **C4** | Substring, String Mapper | Four setters call `value.toString()`: Substring `string` (:77), String Mapper `inputString` (:70) and both numbered families (:42, :54). `null` throws inside `setInputValue` — nothing stored, the frame dies at that write; Substring also throws on `undefined` (the others map it to `''`/`undefined`). Substring's description says it "raises an error rather than yielding an empty result" | scenarios marked `row` in `Substring.json` (2) and `String Mapper.json` (2); 26 + 37 generated sequences at 200; predicate: the throw's message names `toString` and the difference is at or one after the bad set (a param throws in `mount`, at index 0) | **runtime bug**: `String(value)` for a string that has one, and a decision for null — abstain (what the spec models) or `''`. A wire never delivers `undefined` (`sendValue` drops it, node.ts :820) but a deleted parameter does (`_onNodeModelParameterUpdated` → the port's default, which Substring's `string` has: `''`) |
| **C5** | Boolean, Number, String, Color | `initialize` seeds `latestValue = 0` (variablebase.ts :121) and the value setter compares against it (DEF-046, :164-168). So a FIRST Value of `0` is never stored (a String handed the number 0 stays `''`, a Boolean stays unset), and a `Set` pulsed before any Value stores that seed through `cast`: `'0'` in a String, the NUMBER 0 in a Color, `false` in a Boolean — Changed fires and Done is reported for a value nobody sent | by reading; pinned in every Variable's scenarios (*a FIRST value of 0 is ignored*; *Set before any Value stores the seed*) and `tests/batch.test.ts`; the spec models it (the runtime wins) | **runtime bug**: seed `latestValue = undefined` (:121 gives no reason for 0). Then the first 0 is a change (`valueDidChange(undefined, 0)`), and a Set before any Value abstains (`setValueTo(undefined)` returns false → `unchanged`), which is what the contract's own table says (:249-254) |
| **C6 → R7** | Value Changed, Log — and every `*` / `number` port | node.ts `setInputValue` (:410-420): once a port has held a `{ value, unit }` object, every later value that is not `NaN` is MERGED into a fresh copy — `2` arrives as `{ value: 2, unit: 'px' }`, `null` as `{ value: null, unit: 'px' }`, `true` as `{ value: true, … }`. Value Changed then fires on every repeated `2` (a new object each time); Log's Value passes the merged object through. The comment says "inputs with units always expect objects"; a `*` port never asked for one | generated, first run, Value Changed seed rotation 20726; scenarios marked `row` in `Value Changed.json` and `net.noodl.Log.json`; 4 + 4 sequences at 200; predicate: a unit object set on the port, then a later set on the same port of something that is not one, difference after it | **a ruling, R7 (README §7)**: is the merge a PORT RULE every target must copy (then it moves into the adapter contract and the interpreter, and the stranger's target implements it) or a runtime quirk to narrow to ports that DECLARE units? Recommendation: narrow — a `*` port that turns primitives into unit objects is a defect class no author can predict |
| **D6** | Boolean To String | Port description (:69): "anything that is not true counts as false". The getter (:86) applies truthiness: `'yes'`, `1`, `{}` pick String for true | scenario *a truthy non-boolean picks String for true* | **docs wrong** (or `=== true` in the getter — a behaviour change) |
| **D7** | Substring | Description (:57): "-1, the default, runs to the end of the string". The check (:93) is `=== -1` on the RAW value: End wired as the text `'-1'` (a text field, an expression) yields `''` — `substr(0, '-1' - 0)` is a negative length | scenario *End '-1' as text is not -1* | **runtime bug, small**: `Number(value) === -1`, or convert on arrival |
| **D8** | Color Blend | A non-numeric Blend Value renders `'#NaNNaNNaN'` (:155-158: `clamp(NaN)` is `NaN`, `colors[NaN]` is a hole, `Math.floor(NaN).toString(16)` is `'NaN'`) — P79 E2's exact failure shape ("`#NaNNaNNaN` — no warning, no fallback") through the other input | scenario *a non-numeric Blend Value renders '#NaNNaNNaN'* | **runtime bug**: `Number(value)` on arrival and a `NaN` guard that keeps the last colour (or shows Color 0) and reports once, as the colour path does |
| **D9** | Value Changed | Description (:47): "including the first time it arrives". `lastValue` starts `undefined` (:15), so a first arrival of `undefined` is not a change (`undefined === undefined`) | scenario *a first arrival of undefined is NOT a change* | **intended** (a wire never delivers `undefined`); the sentence could say "a value" |

Two things NOT rows, recorded for NSP-007: Log's `level` fallback (:106) and its line are an effect the world grades (the
target keeps the line on the handle for now); Color Blend's `var(--token)` resolves through the DOCUMENT (color-reader.ts
:32-46) — the spec and the headless runtime both read nothing and fall to the author's own fallback, a browser target would
resolve a defined token and diverge; that is a world need with no arm yet.

**Found, not fixed (R3 (a)):** C4, C5, C6, D6, D7, D8 above. The runtime, the viewer, their descriptions and comments are
untouched.

### 6.3 Decisions made here (the format grew two things, the runner three, the target one)

1. **A deferred outcome — `outcome: 'deferred'` + `afterInputs` returns `outcomes: [{ port, outcome }]`.** The Variables'
   `Set` mints its token at the pulse (ERG-001) but learns `done` / `unchanged` only at frame end, from the frame's FINAL
   value (variablebase.ts :200-206) — two pulses are two invocations (done, then unchanged), and a value arriving after
   the pulse in the same frame is what gets stored. NSP-004's "outcomes still come from the invoking reducer" could not
   say that. Rule 3 is kept at run time: the interpreter refuses a settle that leaves a deferred slot unresolved, a
   resolution with no deferred invocation behind it, and a `deferred` on a spec with no `afterInputs`. The resolved
   outcomes are part of the frame-end reducer's branch shape (WHICH outcomes, not how many: four unchanged Sets are the
   branch of one) and get `flip-outcome` mutants; the deferring reducer gets none. Every `hasScheduled…` family that
   reports an outcome at frame end (T3's async nodes, later, in a later frame — NSP-007's world) is this shape.
2. **A frame's value is the last DEFINED value it sent — and `Patch.send` says which writes send.** Found by Inverter (12
   divergences at 200): the runtime sends on every `flagOutputDirty` (node.ts :832-835, synchronously at the write) and
   never sends `undefined` (:820-822, C3), so `null` then `undefined` in one frame leaves `true` on the wire while the
   getter says `undefined` — the two readers disagree (the C2 shape), and the spec models the WIRE (NSP-002 decision 6).
   The interpreter now observes every value output after each step and records, at settle, the last defined observation
   per port. That is exact for a node that flags on every write and for one whose outputs are never undefined mid-frame
   (all of the pilot). Boolean To String flags `currentValue` on a string write only while that string is selected
   (:46-48, :60-62), and the one sequence at 200 that told the difference (`trueString: undefined`, then a truthy
   selector) is why a reducer may now name `send: ['currentValue']` / `send: []` — the runtime's own flag calls, spelled
   out only where they are conditional. Not part of a branch's shape (a `send` difference is invisible except in this
   case, and a mutant of it could only survive).
3. **Scenario files are canonical JSON, both ways.** `{ "$num": "NaN" }` / `{ "$num": "-0" }` / `{ "$date": … }` in a
   scenario's params or steps arrive as the value (`revive` in canonical.ts, applied by `loadScenarios`), and `writeReplay`
   canonicalises — a shrunk divergence found with `NaN` or `-0` would otherwise have been written as `null` and replayed
   as a different bug. Value Changed's *NaN fires every time* is the first scenario to need it.
4. **The mutants keep the RICHEST example per branch.** `swap-branch` returns a sibling's recorded patch; when that patch
   sets `undefined` (String Mapper's `mapped` from a mapping to a hole) the swap is invisible (C3) and the mutant survives
   by seed — 14 / 15 at 20726, 15 / 15 at 11. `discoverBranches` now keeps the example with the most defined `set` values.
5. **Unobservable state is not carried** (NSP-004 decision 7, applied twice): Log's `message` / `level` / `data` reach
   nothing a wire sees (the interpreter keeps every value input anyway; the arrival rules are written as `effectiveLevel`
   for NSP-007), and a Variable store that changed nothing sets only the pending value — three `drop-set` survivors were
   each a store of a value the state already held.
6. **The viewer's nodes are registered from the viewer's source**, not copied: `withViewerNodes(runtimeTarget())`
   (jest's require compiles `noodl-viewer-react/src/nodes/std-library/{variables/color,valuechanged,colorblend}.ts` under
   the runtime's config; Color imports the runtime's `variablebase` through `@noodl/runtime`). The list is the census's
   `providedBy` column for the specced nodes; the AC1 mountability test now asserts the three are absent from the bare
   runtime and present with the viewer.
7. **The target keeps Log's line beside the trace** (`RuntimeHandle.logs`, through the scope's `runContext.log` sink the
   cloud runner attaches) rather than letting it reach the console. Checked (the suite reads it), not graded (NSP-007).
8. **`formatParams` prints an `undefined` param** — `JSON.stringify` drops the key, and the Boolean To String divergence
   read as unreproducible for an hour because its `trueString: undefined` param was invisible in the report.

### 6.4 Acceptance, honestly

- **AC1** ✅ 13 / 13 specced by the ledger's definition on the runtime at the R5 budget (§6.1), **and at the deep
  budget** — s5, 2026-09-30 16:25–16:34, load average 4–5, commit `c1998f2fa`: `NSP_DEEP=10000 NSP_REPLAY_DIR=<scratch>
  npx jest test/node-spec/conformance.test.ts -t deep` over the 13 → **13 / 13 CONFORM at 10,000 (seed 20726), 0
  divergences, 0 replay files written, every mutant killed (13 passed, 496.6 s, exit 0)**. The known rows scale with the
  budget and nothing else appeared: C4 1,932 (String Mapper) + 1,350 (Substring); C6 115 (Log) + 91 (Value Changed);
  C5 has no known count because it is not a divergence: the spec models the runtime's seed (R3 (a)), and the row is
  pinned by scenarios both targets agree on. Per-node times in §6.1.
- **AC2** ⏳ not run — the export adapter is NSP-005, not built. Nothing here is graded on the export.
- **AC3** ✅ every divergence is a row (§6.2) with its scenario marked `row` and a narrow `known` predicate in the runtime
  suite that asserts it STILL FIRES; the first example is kept unshrunk (the row mechanism does not shrink a known class).
- **AC4** ⏳ the ledger is NSP-009, not built; README §6 carries the number by hand: **18 of 147**.
