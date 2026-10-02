# P107 — next session

**Written 2026-10-02 (end of s25).** Read the [README](README.md) §2–§7. s25's record is [NSP-014 §6.13–§6.15](NSP-014-BATCH-DATA-AND-CLOUD.md);
the new step value (`{ "$array": name }`) is in the contract at the top of [adapter.ts](../../../packages/nodegx-node-spec/src/adapter.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s24; **s25: the interpreter answers `registryArray(name)`** | s1 … s25 |
| NSP-002 traces + adapter + runtime target | ✅; **s25: a scenario value `{ "$array": name }` is that registry array (`play` resolves it, `registryArray` on both targets); `canonicalise` builds a plain array always; T13 (the session store made before the world) fixed** | s2 … s25 |
| NSP-003 the runner | ✅; s24 `wrapReducers` | s2 … s24 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s25 refreshed the hashes (exactly adapter.ts, canonical.ts), the three rounds green | `fec895706`, s21, s22, s24, s25 |
| NSP-007 the world | ✅; BACKEND (s21) + `detail` + USER (s22) + `events` (s24); AC1's export half ✗ | s13, s16 … s24 |
| NSP-008 the graph | ✅ — **70 / 70** (s25: +4 in `s09-the-filter-follows.json`, two of them rows) | s15, s20, s23 … s25 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 9 of 24 — s25: Filter Records (T1 now 46 / 46); rows C42, C43, C44** | s8, s21 … s25 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**91 of 147 conform on the runtime (61.9%)** (T1 **46/46** · T2 10/11 · T3 8/39 · T4 27/27; 0 exempt). Graph 70 / 70.

## Commits this session (on `cline-dev`)

- the s25 commit — Filter Records (spec, 30 scenarios, graph s09), the `$array` step value, the canonical fix, T13, the
  known rows C10 / C43 / C44, ledger C42–C44 (+ C10 names Filter Records), NSP-014 §6.13–§6.15, README, this handoff.

## Gate readings

NSP-014 §6.15. In short: the WHOLE runtime conformance suite twice (s24's NOT RUN closed at the start; again after the
changes): exit 0, 72 specs CONFORM, the survivor set identical; Filter Records CONFORMS at 200 on seeds 20728 / 20729 /
20730 (157 / 157 mutants each) and at 10,000 (§6.15); package jest 18 suites / 717 passed; runtime-target + graph 96
passed; both `tsc` exit 0; census fresh.

## What s25 settled (and where the handoff was wrong)

1. **"`events` or `change`?" — both.** Filter Records listens for the store's `save` on ONE store and for its bound
   array's `change`. The world's `events` serve the first as built; the second is graph-only (s09).
2. **It is deaf to saves unless its Backend was written — row C42**, and the picker is hidden with one backend. Measured
   with a control pair that differs in that one parameter. The spec states it as the runtime does.
3. **A single-node play could not hand a node records.** Plain JSON rows fail the matcher (`model.get is not a function`);
   `{ "$array": name }` is now a step value every target resolves against the world's registry.
4. **Two holes the new scenarios exposed:** T13 (a process-wide `SessionStore` made inside the first play drew from the
   world's stream: green alone, red in a full run) and `canonicalise` keeping an Array subclass through `.map`. Both fixed.
   **A probe that reads `new Error().stack` under jest draws from the world's stream itself** (source-map's quick-sort,
   T8) — diff draws with raw call sites (`Error.prepareStackTrace = (_e, cs) => cs`).
5. **Reach, measured again:** 0 of 400 generated sequences re-run Filter Records on a save. The 14 hand scenarios are the
   store path's 200-gate.

## What s26 does

- **The user nodes** — the next by reach (task file §2): **User** (`net.noodl.user.User`, runtime
  `std-library/user/user.ts`, 569 lines) and **Set User Properties** (runtime), then **Log In / Sign Up / Log Out /
  Request Magic Link / Sign In With** (viewer, `noodl-viewer-react/src/nodes/std-library/user/`). Read `user.ts` whole
  first and decide the seam: R9's rule ("the request, not the wire") says the trace carries the AUTH contract's operation
  as the node hands it — find that contract (`@noodl/backend-contract`, the auth adapter) before writing a world. The
  world already has `backend.user` (s22, the signed-in user as the access rules read it); a Log In CHANGES it — a session
  seam, probably USER grown, measured against what `SessionStore` does (T13's store).
- Then the files (Cloud File, Upload File, Sign File URL, Open File Picker), then WebSocket / SSE / Subscribe To Changes.
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`).

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19 (second half), C11 **with C37**,
C12, C15, C16, C20, C7, D14, D16; the Record family: C34, C36, C35, C33, D22; Query Records: C38, C39, C40 + C41 together;
**Filter Records: C42 (the one an author meets), C44, C43** (`node scripts/bugs.js --from P107`); R7; R8; R4's
confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same session. The play sinks
  `console.*` — print with `process.stdout.write`. A graph probe: `playGraph(withViewerNodes(runtimeTarget()), scenario)`.
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44).
- Deep-run every new spec before its handoff; grade new specs' mutants on two seeds; print two runtime traces before
  trusting a first-run green; **record a graph scenario in a FULL graph run or re-check it in one** (T13: alone ≠ full).
