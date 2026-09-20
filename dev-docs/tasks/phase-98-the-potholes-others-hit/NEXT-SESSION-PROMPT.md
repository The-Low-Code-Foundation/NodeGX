# Phase 98 — next session

**Written by s3, 2026-09-20.** Re-derive the board from the task files before believing it
(PHASE-EXECUTION §3.1). s1's version of this file said its work was committed and it was not;
this one names commits you can check with `git log -- <path>`.

## 1. THE BOARD

| task | built | gated | driven | left |
|---|---|---|---|---|
| PRD-001 no query returns everything | ✅ s3 | ✅ s3 — 19 specs, 3 mutants | 🟡 over real HTTP in the spec | nothing. §7 of the task file is the record |
| PRD-002 a run cannot eat the disk | ✅ s1 | ✅ s1 — 8 specs, 2 mutants | 🟡 over HTTP in the spec | the 1,000-run drive — PRD-004's harness |
| PRD-003 pruning gives the disk back | ✅ s1 | ✅ s1 — 7 specs | 🟡 over HTTP in the spec | ❓ `local.db` reclamation — **Richard's ruling** (PRD-003 §6) |
| PRD-004 the number we do not have | ⬜ never built | ⬜ | ⬜ | **everything, and it is the only task left** |
| PRD-005 secrets are provisioned | ✅ s1 | ✅ s1 — 11 specs | 🟡 over HTTP in the spec | a drive from the Compose deploy |

**The outage chain (PRD-001 → 002 → 003) is closed.** What remains is one measurement.

## 2. THE NEXT TASK: PRD-004, and it is not code

Read PRD-004 §5 before anything else: **it must not run beside other heavy work**, and this box
routinely has two or three sessions on it. The first concrete step is therefore not a test, it is
`ps -eo pid,etime,command | grep -E "[j]est|[v]itest|[e]lectron"` and a peer message if anything
is running. A ceiling measured while somebody else's suite is compiling is a number about the
suite.

Four of §7's five close-condition bullets are mechanically true after s3. The fifth —
*"the vertical ceiling is a number in `docs/runtime/SCALING.md`, measured, with the method written
down so it can be re-run"* — is the whole of PRD-004. **PRD-D5 is answered on the way**: one
`SIGKILL` mid-run tells you whether the record of an interrupted run is absent or stuck-then-
recovered (README §8 predicts the latter; it is still unmeasured).

Two things s3 leaves that PRD-004 can use:

- The `queries.defaultLimit`/`maxLimit` numbers are now what bound a single response, so the
  ceiling you measure is a ceiling on a backend that can no longer be taken down by one query.
  **Measure with the shipped defaults**, and say so in `SCALING.md` — a number measured with the
  cap off would describe a product we do not ship.
- `X-NodeGX-Result-Capped` is a free instrument: a soak that never sees it never exercised the
  cap, which is worth knowing about the workload rather than about the backend.

## 3. What s3 did, and where the task file was wrong

Full record in **PRD-001 §7**. The three that outlive the task:

1. 🔴 **§3.3's "explicit, greppable bypass" could not be an option flag.** `toQueryOptions()` and
   `byob-admin.query()` both build query options out of client-supplied fields, so a
   `{unbounded: true}` is one `{...req.query}` away from being settable over the wire. It is a
   METHOD — `IStorageFacade.rawQueryAll` — and thirteen internal readers use it, two of which
   (`HttpCacheStore` eviction, `AuditLog.prune`) look like ordinary paging and are maintenance
   loops that would fall behind their own writes if the cap could shorten their batch.
2. 🔴 **Two bounds §2 did not name.** `LIMIT -1` is *no limit* in SQLite, so a negative limit is
   the outage spelled as a parameter; and `limit: 0` must survive as 0, because `limit=0&count=1`
   is how every Parse client asks "how many?". Both are specs.
3. 🔴 **`ops-rate-limit`'s admin route tally was already red before s3 started** — 79 against a
   live table of 80. PRD-003's `POST /admin/executions/compact` landed in `1289af079` without it.
   That is the "1 failed" in s2's full-suite reading, and it is fixed, counted rather than
   guessed, with its review sentence.

## 4. 🔴 A new `IStorageFacade` member costs three gates

Two of them fail only at run time, because the interface does not exist at run time and the
duplication IS the gate:

| gate | what it wants |
|---|---|
| `nodegx-backend-contract/conformance/coverage.ts` → `FACADE_COVERAGE` | a `CoverageEntry`. A missing key is a **TS2741 compile error**, so this one names itself |
| `tests/brg-001-storage-interface.test.ts` → `FACADE_MEMBERS` + the mock | the name, twice |
| `tests/brg-003-conformance-gate.test.ts` → `expect(checked.length).toBe(N)` | the count, with a sentence saying what moved it |

## 5. Gate readings (s3, 2026-09-20)

| gate | reading |
|---|---|
| `tsc -p packages/nodegx-backend --noEmit` | **0** |
| `tsc -p packages/nodegx-backend-contract --noEmit` | **0** |
| `tsc -p packages/noodl-viewer-cloud --noEmit` | **0** |
| `npm run typecheck:backend-tests` | **0** |
| `prd-001-no-query-returns-everything` | **19/19** |
| `brg-003-conformance-gate` | **22/22** after the 12→13 count |
| `ops-rate-limit` | **13/13** after the 79→80 tally |
| full `packages/nodegx-backend` jest | see §7 — recorded there, not predicted here |

## 6. Rulings still owed by Richard

1. **`local.db` reclamation** (PRD-003 §6): here, in backup, or in phase 97's migrator?
2. **PRD-001's two numbers** — `defaultLimit: 1000`, `maxLimit: 10000` **shipped** as the
   suggestion in §3.1. They are ops.json config and live-patchable, so changing them is an edit
   and not a migration; but they are now the product's default and worth ten seconds of review.
3. **PRD-D7**: `$addToSet` in a grouped aggregate returns an unbounded array inside an otherwise
   bounded response. Backlogged, not fixed — the honest repair is a limit on the aggregate path.

## 7. Register (appendix)

| id | state | owner |
|---|---|---|
| PRD-D1 ✅ s3 | closed — page cap, cap signal, eleven exempt readers | PRD-001 |
| PRD-D2 ✅ | closed s1, with the correction | — |
| PRD-D3 ✅ | closed s1 | — |
| PRD-D4 ✅ | closed s1; per-workflow opt-out still PRD-003 §6 | — |
| PRD-D5 · | unmeasured; likely answer in README §8 | PRD-004 |
| PRD-D6 BACKLOG | workflow-engine path records step input/output unscrubbed | none |
| PRD-D7 BACKLOG | `$addToSet` is an unbounded array inside a bounded aggregate response | none |
