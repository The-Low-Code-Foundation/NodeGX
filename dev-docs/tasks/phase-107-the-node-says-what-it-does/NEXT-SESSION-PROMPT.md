# P107 — next session

**Written 2026-10-02 (end of s23).** Read the [README](README.md) §2–§7. s23's record is [NSP-014 §6.7–§6.9](NSP-014-BATCH-DATA-AND-CLOUD.md);
the BACKEND rule is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts) (unchanged in s23).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s22 (s23 changed no format file) | s1 … s22 |
| NSP-002 traces + adapter + runtime target | ✅; **s23: `BACKEND_OPS` + `fetch`, `query` (its `ok` is `{ results, count }`); every success handed a COPY of the world's answer (Record's success deletes `objectId` from what it is handed)** | s2 … s23 |
| NSP-003 the runner | ✅ (s21) | s2 … s21 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s23 moved no guarded file (the hashes gate green) | `fec895706`, s21, s22 |
| NSP-007 the world | ✅; BACKEND (s21) + `detail` + USER (s22); AC1's export half ✗ | s13, s16 … s22 |
| NSP-008 the graph | ✅ — **64 / 64** (s23: +4 in `s07-the-record-watches.json`) | s15, s20, s23 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 8 of 24 — s23: Record (`DbModel2`) and Query Records (`DbCollection2`) slice A (the query); rows C37, C38, C39, D22** | s8, s21, s22, s23 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**90 of 147 conform on the runtime (61.2%)** (T1 45/46 · T2 10/11 · **T3 8/39** · T4 27/27; 0 exempt). Counted s23 from the
70 specs × tiers.json (T1 45 · T2 9 · T3 8 · T4 8) + On App Error + the 19 graph-graded T4 nodes. Graph 64 / 64.

## Commits this session (on `cline-dev`)

- `4b448e016` — Record conforms (spec, 25 scenarios, 3 graph scenarios, `fetch` in the target, the answer copy, row C37 as a
  known row, ledger C37 + D22, NSP-014 §6.7–6.9, README).
- the s23 close commit — Query Records slice A (spec, 23 scenarios, the First Record Id graph scenario, `query` in the
  target, the AC5/AC6 test reading a plain `Failure` pulse), ledger C38 + C39, the docs, this handoff.

## Gate readings (2026-10-02, s23, on the tree of the close commit)

| gate | reading |
|---|---|
| `packages/nodegx-node-spec`: `npx jest` (whole package) | **18 suites, 705 passed, 17 skipped, exit 0** (s22: 687) — the stranger hash gate inside it green |
| runtime: the WHOLE `conformance.test.ts -t "NSP-004 / NSP-011 — every"` (load ~2–3) | **71 passed, 74 skipped, exit 0, 336 s — all 70 specs CONFORM at seed 20728** (load ~2–3) |
| runtime: `NSP_ONLY=DbModel2` / `DbCollection2` at 200, seed 20728 | Record CONFORMS 24 / 25 (+C37), 200 / 200, 145 / 147 (+2 declared); Query Records CONFORMS 23 / 23, 200 / 200, 255 / 255 |
| runtime deep, `NSP_DEEP=10000`, one spec each | Record CONFORMS, 0 divergences, 86 → C37, 204 / 206 (129 s); Query Records CONFORMS, 0 divergences, 23 → C6, 255 / 255 (89 s) |
| runtime: the five earlier record specs at 200 on the changed target | all CONFORM (Delete +C36, Add / Remove, Create, Update) — mutants all killed |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | **2 suites, 90 passed, exit 0** (s22: 86) |
| `tsc --noEmit` node-spec, runtime (`tsconfig.json`) | exit 0 · exit 0 |
| `node scripts/node-spec/census.js --check` | fresh — 147, 33 excluded, all tiered |
| export, `test:main` | NOT RUN — s23 touched no export code; the runtime only in `test/helpers/node-spec-target.ts` and `test/node-spec/conformance.test.ts` |

## What s23 settled (and where the handoff was wrong)

1. **Record is the Object node's backend twin**, not a member of the write family's mixins: its own file. A bind reads
   NOTHING (Fetched on bind is the port's documented behaviour); Fetch has no Class pre-flight; its `Missing Id.` guard
   misses `null` (D22); the answer is written under ITS `objectId`. **C37**: `<field> Changed` never registered — C11's
   twin; ask them together.
2. **The handoff said "Record and Query Records WATCH the store's events".** Half right. Record watches its bound RECORD
   (`model.on('change')`), which the registry already routes — graded in graph s07 (Update Record's write and another
   Record's Fetch heard). Query Records watches the STORE's contract events (create / save / delete) and patches
   `Items` through a LOCAL Parse matcher — that needs the world to route contract events to watching nodes: slice B,
   and it touches `world.ts` (guarded).
3. **The filter is the contract's**: the spec imports `@noodl/backend-contract/translators` (relative path) — the first
   spec to import a workspace package. A pure module the editor shares; a stranger round over a record node would be
   handed it as part of the contract. The neutral filter is on the call; the Parse lowering beside it is what refuses.
4. **No outcome contract on Query Records** (`Success` = `fetched`, a plain `Failure`): the AC5/AC6 test now reads a
   failure as an outcome OR the `failure` pulse.
5. **The Javascript filter, probed with a control arm**: no script / a syntax error = silent forever (C38); a throw
   before `where` = every row as a Success (C39). A lead about saved `runOnChange-…` parameters on dynamic families
   was DROPPED — `nodedefinition.ts` :512-528 already routes them (read before filing).
6. Mutant lesson, again: an `afterInputs` patch that re-sets every key makes drop-set mutants meaningless — set only the
   keys that CHANGED (`changes()` in record.ts). The two left were provably equivalent (each writes what the state holds).

## What s24 does

- **Query Records slice B — watching the store.** Read `cloudStoreEvents` (dbcollectionnode2.ts :251-358) and
  `QueryUtils.matchesQuery` / `compareObjects` (queryutils.ts :335-438). The world needs to deliver a backend's contract
  EVENTS (the target already emits them: `emitAdapterEvent` after create / save / delete) to the nodes watching that
  backend — a `WorldHandlers` entry (e.g. `storeEvent`) and the interpreter's routing; `world.ts`/`spec.ts` are guarded
  → refresh the hashes, re-grade the three stranger rounds in the same commit. The natural AC: graph Create Record →
  Query Records (a matching record joins `Items` at its sorted place, Limit drops from the right end; a non-matching one
  does not), Update Record moving a record out of the filter, Delete Record removing it. Search active → a re-query
  instead (BAK-008). The Record's own `Changed` on these is already graded (s07).
- Then **Filter Records** (`FilterDBModels`, T1, 834 lines — over the store, "one subscription, no requests"), which
  shares the matcher slice B needs.
- **Cheap, alongside, on a QUIET box only** (`uptime` first): the deep runs s20 listed (clock-driven specs under T9, Pop
  Component Stack, s11–s14 at `NSP_DEEP=10000`); the 200-gate on seeds 20729 / 20730.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19, C11 **with C37** (one question:
make the per-property Changed signals work on Object and Record), C12, C15, C16, C20, C7, D14, D16; **the Record family: C34
(meets an author first), C36, C35, C33, D22; Query Records' Javascript filter: C38 (measure first whether the editor stores
its default script), C39** (`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

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
