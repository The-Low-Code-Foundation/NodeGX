# P107 — next session

**Written 2026-10-02 (end of s24).** Read the [README](README.md) §2–§7. s24's record is [NSP-014 §6.10–§6.12](NSP-014-BATCH-DATA-AND-CLOUD.md);
the BACKEND rule (now with WRITES MADE ELSEWHERE) is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s24 — **s24: `WorldHandlers.store`; the interpreter's `listenToStore` (inbox delivered first)** | s1 … s24 |
| NSP-002 traces + adapter + runtime target | ✅; **s24: a scripted write goes through the REAL `_fromJSON` and the REAL store's `emitAdapterEvent`** | s2 … s24 |
| NSP-003 the runner | ✅; **s24: `wrapReducers` (mutants.ts) wraps `world.store` — it had dropped it silently** | s2 … s24 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s24 refreshed the hashes (exactly spec.ts, world.ts), the three rounds green | `fec895706`, s21, s22, s24 |
| NSP-007 the world | ✅; BACKEND (s21) + `detail` + USER (s22) + **`events` (s24)**; AC1's export half ✗ | s13, s16 … s24 |
| NSP-008 the graph | ✅ — **66 / 66** (s24: +2 in `s08-the-query-watches.json`, real writers) | s15, s20, s23, s24 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 8 of 24 — s24: Query Records slice B (watching the store); rows C40, C41** | s8, s21 … s24 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**90 of 147 conform on the runtime (61.2%, unchanged — slice B grades the rest of a node already counted)** (T1 45/46 ·
T2 10/11 · T3 8/39 · T4 27/27; 0 exempt). Graph 66 / 66.

## Commits this session (on `cline-dev`)

- the s24 commit — Query Records slice B (world `events`, `WorldHandlers.store`, the interpreter route, the runtime
  target's real-store route, `record-match.ts`, 14 scenarios, graph s08, the mutants.ts fix), hashes, ledger C40 + C41,
  NSP-014 §6.10–§6.12, README, this handoff.

## Gate readings

NSP-014 §6.12. In short: package jest 18 suites / 707 passed, exit 0; Query Records CONFORMS at 200 on seeds 20728 /
20729 / 20730 (37 / 37, 297 / 297) and at 10,000 (0 divergences, 23 → C6); the six other record specs CONFORM on the
changed target; runtime-target + graph 92 passed; both `tsc` exit 0; census fresh. **NOT RUN: the WHOLE runtime
conformance suite** (load 12–24 from a browser; it overruns its 600 s hook) — run it first on a quiet box (`uptime`).

## What s24 settled (and where the handoff was wrong)

1. **"The world routes another node's contract event through the interpreter" — wrong.** The interpreter is not a graph
   target (no `mountGraph`); a single-node play needs the write FROM THE WORLD. Built as BACKEND `events` (a world timer:
   the `_fromJSON` registry write, then the contract event to every store listener). The real writers are graded in
   graph s08 on the runtime — the world's composite and the real writers agree.
2. **"Limit drops from the right end" — wrong** (the handoff's own sentence). It drops the FIRST record unless the first
   sort key descends: row C40. And a saved member never re-sorts: C41.
3. **A world handler the mutant machinery does not list is DROPPED** from the reference play and every mutant — silently.
   The sign was three survivors on an unrelated checkbox. Fixed; any new world handler goes into `wrapReducers` too.
4. **Reach, measured:** 0 of 400 generated sequences act on a write; 70 of 10,000 do. The 14 hand scenarios are slice B's
   200-gate; the deep run is its random grade. Measure reach (a wrapped-handler tally) before trusting any new 200/200.
5. The interpreter's `advance` fires every timer in one sweep, inbox after — a world-timer listener must `deliver()` the
   inbox first (a scenario caught the first draft: answer at 10, write at 15).

## What s25 does

- **First, on a quiet box:** the whole runtime conformance suite (all 70 specs), to close s24's NOT RUN.
- **Filter Records** (`FilterDBModels`, T1, 834 lines — "one subscription, no requests") — it filters the STORE's
  records locally: the matcher is `src/nodes/record-match.ts` (shared, as stated in its header). Read
  `filterdbmodelsnode.ts` whole first; check whether it listens to the same store events (then the world's `events` serve it
  as is) or to the registry's own `change` (then `world.change`).
- Then the rest of NSP-014 (16 left): pick by reach — the user nodes and files next, per the task file §2.
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`).

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19 (second half), C11 **with C37**,
C12, C15, C16, C20, C7, D14, D16; **the Record family: C34, C36, C35, C33, D22; Query Records: C38 (measure first whether
the editor stores its default script), C39, and C40 + C41 together (the live rows: Limit's end, a moved sort field)**
(`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream (P109's at s23) — do not
  overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command. The play sinks
  `console.*` — print with `process.stdout.write`. `play(withViewerNodes(runtimeTarget()), type, params, steps, new World(…))`
  plays a port the spec refuses (s23's Javascript-filter probe did) — a probe, not a scenario.
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37).
- Deep-run every new spec before its handoff; grade new specs' mutants on two seeds; print two runtime traces before
  trusting a first-run green.
