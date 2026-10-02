# P107 — next session

**Written 2026-10-03 (s29).** Read the [README](README.md) §2–§7. s29's record is [NSP-014 §6.25–§6.27](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s28's is §6.22–§6.24). The world's AUTH seam, now with THE RETURN LEG, is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s27; **s29: `opens` (an outcome no input opened, port `''`), `world.mount`, `world.authReturn`, `WorldView.authReturn`** | s1 … s29 |
| NSP-002 traces + adapter + runtime target | ✅; **s29: T16 fixed (a node is hooked from its first outcome or signal call, inside `initialize` too); `'?'` → `''`; `consumeAuthReturn` stood in** | s2 … s29 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; **s29: the two new handlers wrapped, `opens` in the shape and flipped** | s2 … s29 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s29 refreshed the hashes (schema, spec.ts, trace.ts, world.ts), the three rounds green | `fec895706`, s21 … s29 |
| NSP-007 the world | ✅; AUTH (s26–s28) + **THE RETURN LEG (s29: a backend script's `return` — a provider error, or a code exchange)**; AC1's export half ✗ | s13, s16 … s29 |
| NSP-008 the graph | ✅ — 76 / 76 (s29: t09 re-recorded, what T16 moved) | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 16 of 24 — s29: Sign In With v2 (the return leg) conforms; C50 graded by a scenario. Left: the four file nodes, WebSocket / SSE / Subscribe To Changes** | s8, s21 … s29 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**98 of 147 conform on the runtime (66.7%)** (T1 46/46 · T2 10/11 · T3 15/39 · T4 27/27; 0 exempt). Unchanged by s29:
Sign In With was counted in s28. Graph 76 / 76.

## Commits this session (on `cline-dev`)

- the s29 commit, in `packages/nodegx-node-spec`: world.ts (THE RETURN LEG: `return` script, `AuthReturnState`,
  `consumeReturn`, the `return` AuthStep, `ReturnLanding`); spec.ts (`opens`, `world.mount`, `world.authReturn`,
  `WorldView.authReturn`); trace.ts and the schema (the port `''` sentence); interpreter.ts; runner/mutants.ts; Sign In
  With v2 (`user-handovers.ts`) with +11 scenarios; t09 re-recorded; the hashes.
- Also in it: the runtime target (T16, the `''` port, the `consumeAuthReturn` stand-in), the C50 ledger note, NSP-014
  §6.25–§6.27, the README, the census, and this handoff.

## Gate readings

NSP-014 §6.27. In short:
- Sign In With v2 CONFORMS on the runtime first run, on seeds 20728 and 13, and at 10,000 (27 / 27 mutants).
- The WHOLE runtime `test/node-spec/` ran once: 183 passed and 2 red, the t09 pair. Those were re-recorded in a full
  graph run, and then graph was 87 / 87.
- Package jest: 18 suites, 760 passed. Export node-spec tests: 12 passed. Both `tsc` exit 0.
- **Not re-run after the re-record:** the whole runtime suite's conformance half. It was already green in that run, and
  the re-record touched only a graph file.

## What s29 settled (and where the handoff was right or wrong)

1. **The handoff's design held**, with two departures:
   - The mount-time read is not "a WorldView read that queues an auth notice for the first settle". That would have put
     the return's outcome AFTER a first-frame press's outcome, where the runtime reports it first (at `initialize`).
     Instead it is a mount handler (`world.mount`) that runs where the node's `initialize` does: after `init`, before the
     params.
   - The return's event is not an `AuthNotice` to `world.auth` either. The User spec's `auth` handler pulses a derived
     port per event type, and the runtime's subscription is per event. So it has its own handler (`world.authReturn`).
2. **The proposed port `''` was right.** Its first patch field is `opens` (a world handler's patch only; the
   interpreter refuses it anywhere else).
3. **T16 fixed. It moved a graph, and that was the truth:** a signal sent inside `initialize` reaches a wire made at
   build time, because `connectInput` replays a signal sent this update (node.ts :554-556). Parent Component Object's
   init-time `changed` / `fetched` were missing from two t09 expectations, recorded through the hole. A target hole can
   hide in a RECORDED expectation as well as in a single-node trace: after fixing one, run the whole graph suite before
   believing it.
4. REST's exchange never sets a `notice` (only the Parse wire's adapter does), so a script that carries one plays the
   Parse wire.
5. The handoff said C50's scenario "shows two Failures; the row stays". Done: it is graded, not a `row`, because the
   spec follows the runtime.

## What s30 does

- **The files**: Cloud File, Upload File, Sign File URL, Open File Picker (the last is T2 and needs a FILE PICKER seam
  — the person choosing a file). Read what each CALLS first (s18): which contract operation does it hand over (R9)?
- Then WebSocket / SSE / Subscribe To Changes (a stream seam).
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written):
- **C27 + C29 together** (one ruling: "hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21.
- Then C22, D19 (second half), C11 **with C37**, C12, C15, C16, C20, C7, D14, D16.
- The Record family: C34, C36, C35, C33, D22.
- Query Records: C38, C39, C40 + C41 together.
- **Filter Records: C42 (the one an author meets), C44, C43.**
- **The user nodes: C47 (the one an author meets), C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23, D24,
  C50 (Sign In With fires Failure twice on a cancelled sign-in — now graded, a fix is v3), D25 (with C47).**
- Then R7, R8, R4's confirmation and G1.

The list: `node scripts/bugs.js --from P107`.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same session (BEFORE the census).
  The play sinks `console.*` — print with `process.stdout.write`. A graph probe: `playGraph(withViewerNodes(runtimeTarget()),
  scenario)`; a graph `advance` step names a node (`{ node, advance }`).
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44).
- A format change that hooks earlier (T16) can move RECORDED graph expectations: run the whole runtime suite, and if a graph moves, ask whether the app's wire sees it before re-recording (in a FULL run; restore escape-only files from HEAD).
- Deep-run every new spec before its handoff; grade new specs' mutants on two seeds; print two runtime traces before
  trusting a first-run green; **record a graph scenario in a FULL graph run or re-check it in one** (T13: alone ≠ full).
