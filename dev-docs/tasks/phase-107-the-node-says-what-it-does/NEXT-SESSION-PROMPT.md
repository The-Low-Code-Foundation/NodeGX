# P107 — next session

**Written 2026-10-03 (s31).** Read the [README](README.md) §2–§7. s31's record is [NSP-014 §6.31–§6.33](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s30's is §6.28–§6.30). The world's newest seam, PICKER, is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s30; **s31: the `picker` need, effect, handler and pool; `OutcomePatch.settles` (a press settling the pending press of its own input it supersedes)** | s1 … s31 |
| NSP-002 traces + adapter + runtime target | ✅; **s31: the `picker` trace event (LOCATION group); the runtime target attributes a click by the node's `_internal.inputElement`** | s2 … s31 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; s29 `opens`; **s31 `world.picker` wrapped, a click and `settles` in a branch's shape, `drop-picker`** | s2 … s31 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s31 refreshed the hashes (trace.schema.json, spec.ts, trace.ts, world.ts), the three rounds green | `fec895706`, s21 … s31 |
| NSP-007 the world | ✅; AUTH (s26–s29), FILES (s30) + **PICKER (s31, the 13th seam)**; AC1's export half ✗ | s13, s16 … s31 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 20 of 24 — s31: Open File Picker conforms. Left: Cloud Function, WebSocket, Server-Sent Events, Subscribe To Changes** | s8, s21 … s31 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**102 of 147 conform on the runtime (69.4%)** (T1 46/46 · **T2 11/11** · T3 18/39 · T4 27/27; 0 exempt). Graph 76 / 76.

## Commits this session (on `cline-dev`)

- the s31 commit: `packages/nodegx-node-spec` (world.ts PICKER; trace.ts, schema.ts, schema/trace.schema.json — the
  `picker` event; spec.ts, interpreter.ts — the need, view, effect, handler, pool and `settles`; runner/compare.ts,
  generate.ts, mutants.ts; `nodes/open-file-picker.ts` + the index; `scenarios/Open File Picker.json`; world.test.ts
  +5, batch-records.test.ts; the hashes), the runtime target (`test/helpers/node-spec-target.ts`), the two bug files
  (C53, D27), NSP-014 §6.31–§6.33, the README and this handoff.
- **The census is still NOT regenerated into a commit:** the peer's viewer-react work is still uncommitted (dynamic
  ports 68 → 69, test counts). Restored from HEAD again. Regenerate once that work lands.

## Gate readings

NSP-014 §6.33. In short: first run on the runtime 15 / 15 scenarios and 200 / 200 with ONE mutant survivor (closed by a
16th scenario); then conforms on today's seed, 20729 and 13, and at 10,000; 26 / 26 mutants. Whole runtime `test/node-spec/`
**189 passed, exit 0**. Package jest **794 passed, exit 0** after the hash refresh. Export node-spec 12 passed; both
`tsc --noEmit` exit 0.

## What s31 settled

1. **A person is a world seam like a server.** The node reaches the person through ONE element it makes at its making;
   the world plays the element (reflected attributes, handler properties, `click()`) and the person's answers. A play has
   a `document` only when its script has a `picker`, so no other spec's play changed.
2. **What a click records is what the ELEMENT holds, not what the node last set.** That is the only reason C53 is
   visible: the node SKIPS an assignment, and the element keeps the old value.
3. **An answer meets whatever handler the element holds when it lands** (DOM semantics), so a first dialog's answer
   can complete a SECOND Open — a race the handoff's "n-th Open" sketch would have hidden. Graded both ways.
4. **The format needed `settles`.** A second Open makes the first Unchanged INSIDE its own handler, before its own
   in-call Failure; a world handler's `outcomes` would have reported it after, out of report order.
5. **s24's trap again**, in a new place: `wrapReducers` copies world handlers by NAME. A new handler kind must be added
   there (and to `reducerNames`) or the copy never hears the world. It failed loudly this time ("no world.picker handler").

## What s32 does

- **Cloud Function** (`CloudFunction2`, T3): READ WHAT IT CALLS first (s18's rule; s30's paid again). Is it the
  backend contract's operation (then it joins BACKEND — `@noodl/backend-contract` has `callFunction`?), or a raw
  `fetch` to `/functions/<name>` (then NETWORK already plays it)? Probe the real node on the runtime before any spec.
- Then **WebSocket / Server-Sent Events / Subscribe To Changes** — a STREAM seam (a connection that answers many times).
  Read all three before designing: one seam or two?
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component
  Stack, s11–s14 at `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written):
- **C27 + C29 together** (one ruling: "hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21.
- Then C22, D19 (second half), C11 **with C37**, C12, C15, C16, C20, C7, D14, D16.
- The Record family: C34, C36, C35, C33, D22.
- Query Records: C38, C39, C40 + C41 together.
- Filter Records: **C42**, C44, C43.
- The user nodes: **C47**, C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23, D24, C50, D25 (with C47).
- The files (s30): **C52**, C51, D26 (with C47 + D25).
- **The file dialog (s31): C53 (one node for camera and file list — clearing Capture keeps the camera), D27 (rides with it).**
- Then R7, R8, R4's confirmation and G1.

The list: `node scripts/bugs.js --from P107`.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same session (BEFORE the census).
  The play sinks `console.*` — print with `process.stdout.write`. A graph probe: `playGraph(withViewerNodes(runtimeTarget()),
  scenario)`; a graph `advance` step names a node (`{ node, advance }`).
- **The census reads the WORKING TREE:** a peer's uncommitted node source moves it. Diff it before committing; restore
  from HEAD what is not yours (s30).
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44).
- An ABSENCE scenario needs a firing control beside it, or the runner refuses it ("an arm with no predicate grades
  nothing") — s30's Cloud File drop scenario.
- A format change that hooks earlier (T16) can move RECORDED graph expectations: run the whole runtime suite, and if a graph moves, ask whether the app's wire sees it before re-recording (in a FULL run; restore escape-only files from HEAD).
- Deep-run every new spec before its handoff; grade new specs' mutants on two seeds; print two runtime traces before
  trusting a first-run green; measure REACH on generated sequences; **record a graph scenario in a FULL graph run or re-check it in one** (T13: alone ≠ full).
- **A new world-handler kind is added in FOUR places**, or a mutant copy goes deaf: spec.ts `WorldHandlers` AND the erased
  `AnyNodeSpec.world` type, interpreter.ts `handleInbound`, and runner/mutants.ts `reducerNames` + `wrapReducers` (s24, s31).
