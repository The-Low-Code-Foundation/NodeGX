# P107 — next session

**Written 2026-10-03 (s36).** Read the [README](README.md) §2–§7. s36's record is in four places: [NSP-012 §6.6](NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md)
(C59 + C60 fixed), [NSP-014 §6.46](NSP-014-BATCH-DATA-AND-CLOUD.md) (D29 fixed), [NSP-016 §7.1](NSP-016-VISUAL-NODES.md) and
[RESEARCH-LAYOUT-SEMANTICS.md](RESEARCH-LAYOUT-SEMANTICS.md) (the visual nodes' research and R10).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch; **s36: `scripts/node-spec/visual-census.js` (the T5 inputs, classed)** | `3bd71e837`, s21, `bf90b170d` |
| NSP-001 the spec + interpreter | ✅ s1 … s35 | s1 … s35 |
| NSP-002 traces + adapter + runtime target | ✅ (s34 last) | s2 … s34 |
| NSP-003 the runner | ✅ (s35 last) | s2 … s35 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b (s35's hashes) | `fec895706`, s21 … s35 |
| NSP-007 the world | ✅ (s34 last); AC1's export half ✗ | s13, s16 … s34 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15; s35 Array Filter v2; **s36: C59 + C60 fixed — Array Filter v3, Array Map v2** | s15, s35, `a6f629a2e` |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| NSP-014 records, users, files, HTTP, streams | 🟡 24 of 24 conform; **s36: D29 fixed — Query Records v2**. Left: AC2's export half (P18) | s8, s21 … s35, `4763f5a00` |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| **NSP-016 the visual nodes** | **🟡 s36: AC1 (research) + AC2 (R10 ruled). AC3 (logic specs) is the build; AC4 waits for NSP-017** | `bf90b170d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-017 … NSP-019, NSP-021 | — | — |

**106 of 147 conform on the runtime (72.1%)** (T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27; 0 exempt). Graph 76 / 76. Left: the
19 visual nodes (NSP-016, T5), the 17 cloud-only nodes (NSP-022, T3), the 5 escape hatches (NSP-017, T6).

## Commits this session (on `cline-dev`)

- `a6f629a2e` — **C59 + C60 fixed** (Richard: *"Yes, fix both"*): Array Filter and Array Map read a record as before and any
  other row as it is. Runtime one line each, line-count neutral (no cite moved); specs v3 / v2; renamed scenarios and two
  null-row scenarios.
- `4763f5a00` — **D29 fixed** (*"Yes, say connecting"*): Query Records reads the handle's status after subscribing
  (dbcollectionnode2.ts :714, one ADDED line). Spec v2; its 70 cites past :713 and 19 in `DbCollection2.json` shifted by
  a script and spot-checked; three v1-worded scenarios renamed from printed traces.
- `bf90b170d` — **NSP-016 research + R10**: RESEARCH-LAYOUT-SEMANTICS.md, `visual-params.json` (hand-kept classes),
  `visual-census.json` (generated), `scripts/node-spec/visual-census.js` (`--check`), README §7 R10 + the three ruled rows.
- The handoff commit: this file, the D29 ledger hash.

## Gate readings (2026-10-03, load 3.2–5.6, this session's jest only; all taken BEFORE a P112 peer's node-spec edits at 22:15)

- C59 + C60: control (spec changed, runtime not) **red** — Array Filter 15, Array Map 7 generated divergences. Treatment:
  both CONFORM at seeds 20729 / 13 / 20730 and at 10,000 / 10,000 (0 divergences; mutants 98 / 98, 33 / 33).
- D29: control **red** (39 / 58 scenarios, 19 generated divergences). Treatment: CONFORMS at three seeds (58 / 58) and at
  10,000 (0 divergences, mutants 1323 / 1325 — s35's two declared equivalents; s35's deep run did NOT conform, this one does).
- Package `nodegx-node-spec`: 18 suites, 837 passed, exit 0 (twice). Runtime: the WHOLE jest suite twice, 183 suites,
  3,210 passed, exit 0 (511 s; its one "DOES NOT CONFORM" line is AC1's planted Counter defect). `tsc --noEmit` exit 0,
  both packages.
- `node scripts/node-spec/visual-census.js --check`: 274 inputs, every one classed.

## What s36 settled

1. **The rulings asked first paid off at once.** The next batch, C59 + C60 and D29 went to Richard as ONE AskUserQuestion,
   in plain words, and came back in one answer. Each fix shipped alone: spec first, control red, then the runtime, green.
2. **A runtime fix that ADDS a line moves every cite after it.** A one-line fix inside an existing line (C59, C60) moves
   nothing. D29's added line shifted 89 cites, done by a script that skips cites prefixed by another file's name and then
   spot-checked against the file. Prefer a line-neutral fix when it reads as well. When it does not, shift by script and
   spot-check.
3. **The visual nodes' layout is not the hard part.** 96.6% of the templates' 11,041 layout settings fall in the subset
   Yoga, SwiftUI, Compose and Flutter share; the one real gap is `flexWrap: wrap` on rows (173). **What a parameter spec
   cannot see is the CSS beside the parameters**: 9 of 10 shelf templates carry a hand-written sheet (`CSS Definition`, or a
   Function injecting `<style>`): 1,084 rules, 185 KB, `!important` 445 times, and 17% of visual nodes take a class
   from it. That is NSP-017's question, and it bounds any geometry grading.
4. **`as` (the HTML tag) is semantics, not styling**: `h1` / `h2` / `section` / `main` = heading levels and landmarks, which
   native platforms say as accessibility roles. A spec should carry it as a role, not drop it as web-only. It is classed
   web-only in `visual-params.json` today; reconsider when the build writes classes into `PortMeta`.
5. **The picker stamps defaults** on Text, Button, Checkbox and Text Input (`ElementConfigRegistry.applyDefaults`). A
   template value is not proof an author chose it.

## What s37 does

**NSP-016 AC3: the logic specs for the 19 visual nodes (R10), starting with the seam.**
- **First, coordinate.** A P112 session (`opennoodl-14`, OWN-002) has uncommitted edits at 22:15 in node-spec `graph.ts`,
  `index.ts`, `runner/conformance.ts`, `runner/scenario.ts`, `schema.ts` and `world.ts` (+ new `browser.ts`,
  `graph-files.ts`, `runner/scenario-files.ts`, `sha2.ts`). Four of those are guarded format files. `git status` +
  `stat` before touching any of them; if they are still open, send ONE short message before editing `world.ts`. When they
  land, the stranger hashes must have been refreshed with the three rounds green. Check that in their commit.
- **The PERSON face** (design, from reading s36): a control's events come from its React component calling a prop
  callback the node made (`outputProps` → `props.onClick`; Checkbox's `props.checkedChanged`, Dropdown's
  `props.valueChanged`, Slider's `props.updateOutputValue`). The component also holds rules of its own. A disabled button
  never calls `onClick`; the DOM `disabled` attribute does that. **Stand in for the component and you copy those rules
  instead of grading them.** So render the real component: react-dom + jsdom + `act`, as the export target already does
  (s6: 1–3 ms a mount from a cache). A person act is a DOM event on the element a person sees (click, input, change, key),
  recorded in the trace as what the person did. The corpus harness (`noodl-runtime/test/corpus/graph-harness.ts`, ERG-001
  rows) shows how these nodes are made and what the viewer context needs stubbed (`styles`, `setNodeFocused`, the Group's
  three scroll-plugin mocks). The runtime jest env is `node`: a per-file jsdom docblock or a scoped jsdom.
- **Order:** Button (one signal) → Checkbox (value + Check / Uncheck + Unchanged) → Text Input → Dropdown, Slider,
  Radio Button (+ Group) → Group / Text / Image / Circle / Icon / Columns / Video (pointer + drop + scroll actions:
  65 logic inputs in all, `visual-census.json` lists them per node) → Drag → Repeater, Component Stack, Page Router,
  Component Children (each needs a component boundary or a stack; check what NSP-015's seams already give).
- **R10's second half:** write each input's class from `visual-params.json` into the spec's port metadata. That is a
  `PortMeta` field, so it is a FORMAT change: the hash refresh and three stranger rounds, in the same commit.
- **Not this task:** geometry (AC4), until NSP-017 says what a CSS Definition sheet is.

**Cheap, on a QUIET box only:** the deep runs s20 listed (clock-driven specs, Pop Component Stack, s11–s14 at
`NSP_DEEP=10000`); the D24 probe; the name sweep as a package test.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written):
- **C27 + C29 together** ("hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21.
- Then C22, D19 (second half), C11 **with C37**, C12, C15, C16, C20, C7, D14, D16.
- The Record family: C34, C36, C35, C33, D22.
- Query Records: C38, C39, C40 + C41 together.
- Filter Records: **C42**, C44, C43.
- The user nodes: **C47**, C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23, D24, C50, D25 (with C47).
- The files: **C52**, C51, D26. The file dialog: C53, D27. Cloud Function: **C54**, D28. Subscribe To Changes: C55.
- Server-Sent Events: C58, C56, C57.
- Then R7, R8, R4's confirmation and G1.
- **New from s36's research (not a row yet, worth raising with NSP-017):** the templates' CSS sheets — should a template
  be allowed to restyle nodes with `!important` at all, or should what the sheets do (grids, hover / press states,
  phone-only rules) become node parameters?

The list: `node scripts/bugs.js --from P107`.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts` (or `packages/nodegx-node-spec/tests/zz-*`),
  deleted in the same session (BEFORE the census). The play sinks `console.*` — print with `process.stdout.write`.
- **A survivor list across seeds is cheap on the interpreter**: a zz test calling `runConformance(spec, interpreterAdapter(…),
  { sequences: N, seed: S, mutants: true, equivalent })` and printing `report.mutants.survivors` (s34 used it at 200 on ten
  seeds and at 10,000). Mutants are graded on the interpreter in both runners, so a survivor there IS the runtime run's.
- **The census reads the WORKING TREE:** a peer's uncommitted node source moves it. Diff it before committing.
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44, **C57**).
- An ABSENCE scenario needs a firing control beside it, or the runner refuses it.
- **JSON has no `undefined`**: a scenario param of `null` is NOT a blank port (`Number(null)` is 0). Write the blank as a
  `{ "set": "<port>" }` step instead (s34 lost a scenario to it).
- **An `object`-typed port parses a JSON string before the setter sees it** (`node.ts`): declare `coerce: 'object-literal'`.
- A world FACE swallows or reports a throw from the node's handler and goes on (s32, s33, s34).
- A new patch EFFECT also needs the mutants' shape (only-when-present) and a drop kind; a new world-handler kind goes in FOUR
  places (spec.ts `WorldHandlers` AND the erased `AnyNodeSpec.world`, interpreter.ts `handleInbound`, runner/mutants.ts
  `reducerNames` + `wrapReducers`).
- Catalog parity compares port descriptions VERBATIM, and defaults.
- Deep-run every new spec before its handoff; grade new specs' mutants on several seeds; print two runtime traces before
  trusting a first-run green; measure REACH on generated sequences; plant defects in a COPY of the runtime node when a first
  run is clean.
