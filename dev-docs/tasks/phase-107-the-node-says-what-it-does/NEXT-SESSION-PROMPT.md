# P107 — next session

**Written 2026-10-03 (s30).** Read the [README](README.md) §2–§7. s30's record is [NSP-014 §6.28–§6.30](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s29's is §6.25–§6.27). The world's BACKEND seam, now with FILES, is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s29; **s30: a patch's `backend` may be a LIST (several calls, in order)** | s1 … s30 |
| NSP-002 traces + adapter + runtime target | ✅; **s30: canonical `$file` / `$cloudFile` (tagged); scenario values `{ "$file" }` / `{ "$cloudFile" }` through two optional target hooks (`file`, `cloudFile`); the target plays `uploadFile` / `signFileUrl`** | s2 … s30 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; s29 `opens` | s2 … s29 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s30 refreshed the hashes (adapter.ts, canonical.ts, spec.ts, world.ts), the three rounds green | `fec895706`, s21 … s30 |
| NSP-007 the world | ✅; AUTH (s26–s29) + **FILES (s30: the contract's file operations, a failure as ONE envelope, the not-a-file refusal)**; AC1's export half ✗ | s13, s16 … s30 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 19 of 24 — s30: Cloud File, Upload File, Sign File URL conform. Left: Open File Picker, Cloud Function, WebSocket, Server-Sent Events, Subscribe To Changes** | s8, s21 … s30 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**101 of 147 conform on the runtime (68.7%)** (T1 46/46 · T2 10/11 · T3 18/39 · T4 27/27; 0 exempt). Graph 76 / 76.

## Commits this session (on `cline-dev`)

- the s30 commit: two kill scenarios (CollectionClear, DbModel2 — §6.30); `packages/nodegx-node-spec` (canonical.ts, adapter.ts, spec.ts, world.ts, interpreter.ts,
  adapters/interpreter.ts; `nodes/cloud-file.ts`, `nodes/upload-file.ts`, the index; three scenario files; canonical and
  adapter tests; the hashes), the runtime target (`test/helpers/node-spec-target.ts`), the three bug files (C51, C52,
  D26), NSP-014 §6.28–§6.30, the README and this handoff.
- **The census was NOT regenerated into the commit:** regenerating it picked up a peer's uncommitted viewer-react work
  (Button, Columns … test counts; dynamic ports 68 → 69). Nothing in it depends on specs, so it was restored from HEAD.
  Regenerate once that work is committed.

## Gate readings

NSP-014 §6.30. In short: all three conform on the runtime, on seeds 20729 and 13, and at 10,000; every mutant killed.
The whole runtime `test/node-spec/`: first run 186 passed / 2 red — mutant survivors on TODAY's rotated seed in
CollectionClear and DbModel2 (not this session's specs; both conform at 20728), each closed by a hand scenario; second
run **188 passed, exit 0**. Package jest 784 passed. **Expect the daily rotation to expose more such holes**: a red
mutant on a new day's seed in an untouched spec is a missing scenario, not a regression — check it at yesterday's seed first.

## What s30 settled

1. **The files reach the backend as the contract's operations** (`uploadFile`, `signFileUrl`) through the same routed
   store as the Record family, so they joined BACKEND (R9) — no new seam.
2. **A file operation fails with ONE envelope** (`FileError`), not `(message, detail)`. That is where C51 lives: the REST
   adapter's `fail` has no status, so Error Status Code is 0 on three backends and Parse's CODE on the fourth.
3. **A stored file is tagged in a trace** (`$cloudFile`), unlike other class instances: the nodes that take one drop a
   plain object with the same keys, so the difference is behaviour.
4. **Every Upload File press in a frame is its own call** (measured): hence a patch's `backend` list.
5. **Reach was poor before weighting** (6 Dones in 400 sequences) — the hand scenarios carry the success paths.

## What s31 does

- **Open File Picker** (T2, viewer-react `openfilepicker.ts`) needs a FILE PICKER seam — the person choosing a file. What it
  CALLS: `document.createElement('input')` in `initialize` (Node has no `document`); on Open it sets `accept` / `capture`,
  assigns `onchange` / `oncancel` and calls `input.click()` (which may THROW — a sandboxed frame → Failure
  `open-file-picker/open-failed`). The person then picks (→ `change` with one file: Done; the five outputs), backs out of a
  re-pick (→ `change` with an EMPTY FileList: Unchanged) or cancels (→ `cancel`: Unchanged). A second Open before the
  first answered supersedes it: the first is Unchanged. `path` is Electron's addition (`undefined` in a browser). Sketch:
  a world `picker` script — the n-th Open answered `{ file: FileDesc } | 'empty' | 'cancel' | 'never' | { throws: message }`
  at `after`; a `picker` trace event per click carrying `{ accept, capture }` as handed. Probe the real node first.
- Then **Cloud Function** (`CloudFunction2`): read what it calls (a contract operation? HTTP?).
- Then WebSocket / SSE / Subscribe To Changes (a stream seam).
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written):
- **C27 + C29 together** (one ruling: "hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21.
- Then C22, D19 (second half), C11 **with C37**, C12, C15, C16, C20, C7, D14, D16.
- The Record family: C34, C36, C35, C33, D22.
- Query Records: C38, C39, C40 + C41 together.
- Filter Records: **C42**, C44, C43.
- The user nodes: **C47**, C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23, D24, C50, D25 (with C47).
- **The files (s30): C52 (the one an author meets — Cloud File's Name), C51 (Error Status Code), D26 (with C47 + D25).**
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
