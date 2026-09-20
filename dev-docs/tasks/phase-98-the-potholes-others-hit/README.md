# Phase 98 — The potholes others hit

**Scoped:** 2026-09-19, from Richard's field report of a 60,000-participant conference his team
served on n8n + Directus + Azure AKS, a measurement of the backend at HEAD `aa5d00e2a`, and a survey
of how n8n and Directus actually behave in production.
**Status: 🏗 In progress, s3 (2026-09-20). PRD-001, 002, 003 and 005 built and gated — the outage chain is closed. Only PRD-004, the measurement, is open. Prefix: `PRD`.**

> *"let's try not to repeat the mistakes of those who came before us"* — Richard, 2026-09-19

## 1. The person sentences

> **A NodeGX backend that has been running for eight months, under real load, with a bug in one
> workflow, is still up — because the things that killed everyone else are refusals here, not
> discoveries.**

> **And the operator who has to find out why it got slow at 4am can do it from the record the
> backend already kept.**

This phase is **not** about scale. Every defect in it bites a **single-process backend with one
modest database**, which is what every NodeGX production install is today and will still be after
phase 97. Three of the four were found by taking somebody else's outage and asking whether the same
chain exists here. It did.

## 2. Where this came from, and why it is credible

Richard ran this stack in production for an event that could not be moved. **The single incident
that took them down** is worth quoting in full, because three of this phase's tasks come from it:

> A workflow ran without a required ID about **1 run in 2**. The backend read the missing ID as
> *"no id filter"* and **returned ALL user flows**. The trace then failed to create — but the run
> was still written to the logs, at roughly **10MB per record**. It exhausted a large Azure
> instance and blew their capacity limits, and *"it took us a while to track down the problem."*

Each link in that chain was checked against NodeGX on 2026-09-19. **The good news first:** the
culture already knows this shape — `steps/data.ts:109` makes a `filter` step with no condition a
**refusal**, and the reason given in the code is *"it would keep everything"*. There is no
database-query step kind at all (`types.ts:39-62`), so workflows reach data through `call-function`.
**The guard exists in one place and the exposure is in another.**

The wider survey (n8n docs, n8n community, GitHub issues, Directus docs — all cited in
[the study](../../future-projects/HORIZONTAL-SCALING-STUDY.md) §1.3) says these are not exotic.
Execution-data bloat is **n8n's single most common operational complaint**.

## 3. What was measured (2026-09-19, HEAD `aa5d00e2a`)

**✔** = read at HEAD by the scoping session. **·** = one grep, **re-read before building on it**.

| | reading | where |
|---|---|---|
| ✔ | 🔴 **No default and no maximum page size on any query route.** `LIMIT` is emitted only `if (options.limit !== undefined)`; `limit` is set only when the caller supplies it. No `MAX_LIMIT` / `DEFAULT_LIMIT` / page cap exists anywhere in `src/` | `QueryBuilder.ts:699`; `parse-wire.ts:65` |
| ✔ | 🔴 The unbounded behaviour is **tested and expected**, not accidental — a plain query's result count is asserted with the comment *"all rows, plain query"* | `tests/search-http.test.ts:153` |
| ✔ | 🔴 **Run records are capped by COUNT, not SIZE.** `MAX_LOG_LINES_PER_RUN = 200`, `MAX_STEPS_PER_RUN = 1000`. `MAX_VALUE_DEPTH = 32` bounds nesting, not bytes — a flat 50,000-row array is depth 2 | `WorkflowRunner.ts:142, 153`; `steps/values.ts:42` |
| ✔ | 🔴 **Retention is age-only.** The whole `executions` ops section is `{ retentionDays, idempotencyTtlHours }` — there is no max-count prune and no per-workflow opt-out | `ops/model.ts:193, 302` |
| ✔ | 🔴 **Nothing ever reclaims disk.** `VACUUM` appears **only** in the backup path (`VACUUM INTO` to write a snapshot file). No `VACUUM` after pruning and no `auto_vacuum` pragma anywhere — so pruning deletes rows and the file stays the size it grew to | `backup/snapshot.ts:100, 108`; grep `VACUUM\|auto_vacuum` over `src/` + `local-sql/` |
| ✔ | **Secrets are generated on first run when not supplied** — `--token` provisions the admin credential, *"one is generated if you don't pass `--token`"* | `nodegx-backend/README.md`; `config/SecretsStore.ts:78` |
| · | **Unknown:** what the execution record of a run killed mid-flight looks like. Status vocabulary reads as `success \| error` and records may only be written at completion — so a killed run may be **absent** rather than stuck. **Not verified. Measure before building PRD-004** | `ExecutionStore.ts:270, 280` |

### What is already right, and must not be broken

- `ops.json` **refuses to start on unknown keys** — *"a setting that is accepted and quietly ignored
  is worse than one that is rejected"*. Every task here inherits that stance.
- The backend **refuses to bind non-loopback with `devOpen` on**, and **refuses to start** rather
  than silently not persisting. Loud failure is house style, not an innovation this phase brings.
- `MAX_LOG_LINES_PER_RUN` already writes a **single "limit reached" marker** rather than dropping
  quietly. That is the pattern every cap in this phase copies.

## 4. What this phase is NOT

🔴 **It is not horizontal scaling.** Role separation, the replicated serve tier, the claim-per-fire
scheduler, shared rate limits and the SSE fan-out live in
[`HORIZONTAL-SCALING-STUDY.md`](../../future-projects/HORIZONTAL-SCALING-STUDY.md), are staged
behind phase 97's Postgres adapter, and are **not scoped here**.

The dividing line is exact: **if it bites one process with one database, it is in this phase. If it
only bites two, it is in the study.** That line is why this phase can be built today, beside phases
94–97, without waiting for anything.

One item from the survey belongs to **phase 97 instead** and is recorded here only so it is not
lost: **BRG-005 must choose Postgres connection-pool sizing deliberately** — exhausting
`max_connections` because every process opens its own pool is n8n's second most common production
failure. It wants a conservative default, a documented formula
(`replicas × pool ≤ max_connections − headroom`) and PgBouncer guidance. Cheap while BRG-005 is
unwritten; painful afterwards.

## 5. The tasks

| task | one line | built | gated | driven |
|---|---|---|---|---|
| [PRD-001](PRD-001-NO-QUERY-RETURNS-EVERYTHING.md) | A default and maximum page size on every query route — and a capped result says so | ✅ s3 | ✅ s3 — 19 specs, 3 mutants | 🟡 over HTTP in the spec |
| [PRD-002](PRD-002-A-RUN-CANNOT-EAT-THE-DISK.md) | Run records bounded by **bytes**, not just count, with the overflow reported in the record | ✅ s1 | ✅ s1 — 8 specs, 2 mutants | 🟡 over HTTP in the spec; the 1,000-run drive is PRD-004's |
| [PRD-003](PRD-003-PRUNING-THAT-GIVES-THE-DISK-BACK.md) | Prune by count as well as age, say which limit fired, and actually reclaim the space | ✅ s1 | ✅ s1 — 7 specs, file shrinks <25% | 🟡 over HTTP in the spec |
| [PRD-004](PRD-004-THE-NUMBER-WE-DO-NOT-HAVE.md) | The vertical ceiling, measured on a mixed workload with a heavy scheduled job in the mix | ⬜ | ⬜ | ⬜ |
| [PRD-005](PRD-005-SECRETS-ARE-PROVISIONED.md) | Secrets provisioned from the environment, never invented; a deploy that cannot find one refuses | ✅ s1 | ✅ s1 — 11 specs | 🟡 over HTTP in the spec; not driven from the Compose deploy |

**PRD-001 → 003 are the outage chain, in order.** Any one of them alone shortens it; all three
close it. They are small, self-contained, need no interface and no Postgres, and they protect the
single-process user who will never scale anything.

**PRD-004 is the one that changes what we can say.** `docs/runtime/SCALING.md` deliberately
publishes no requests/second figure because none has ever been measured, and phase 97's whole
promise — *"one app process, a real database behind it"* — rests on an estimate inherited from
phase 48 (*"fine to low thousands of active tenants. A cliff, not a wall."*). It also may show the
ceiling is high enough that the horizontal-scaling study is not the right next investment, which
would be a valuable result.

## 6. Rules every task inherits

1. 🔴 **A cap that truncates silently is a correctness bug wearing a safety hat.** Every limit in
   this phase reports that it fired, in the record or the response, following
   `MAX_LOG_LINES_PER_RUN`'s existing marker pattern. A user who builds on a silently partial list
   is worse off than one who got an error.
2. 🔴 **Refuse rather than guess**, matching `ops.json`, `devOpen` and the persistence check.
3. **Two interacting limits must say which one fired.** n8n's community has a thread titled
   *"execution history limited to ~13 hours despite 720-hour retention"* — two prune limits
   interacting invisibly. Adding a second limit without attribution ships a fresh confusion.
4. **Defaults must be safe for the person who never reads this page.** A cap nobody enables
   protects nobody; these ship **on**, with an escape hatch, not off with a recommendation.
5. **Tests are the drive, not the unit.** Each task ships a test in `packages/nodegx-backend/tests/`
   that provisions a backend and exercises the behaviour over HTTP, in the house style of
   `backup-roundtrip.test.ts` and `security-enforcement.test.ts`.
6. **This phase touches no editor file**, so it runs beside phases 94–97. Commits use explicit
   pathspecs so a sibling's work is never swept.
7. **[PHASE-EXECUTION.md](../../guidelines/PHASE-EXECUTION.md) applies.**

## 7. Close condition

A backend is started with production-shaped data. A deliberately broken workflow — the Visual Hive
bug, reproduced: a query whose filter is empty because its input was missing — is run **a thousand
times**. At the end:

- no response returned an unbounded result set, and every capped one **said so**; ✅ *mechanically
  true after s3 — PRD-001; what the thousand-run drive still owes is that it holds under load*;
- `executions.sqlite` is bounded, and the bound is one an operator chose;
- lowering retention **gives the disk back**;
- the record is good enough to find the offending workflow **without reading the source**; and
- the vertical ceiling is a number in `docs/runtime/SCALING.md`, measured, with the method written
  down so it can be re-run.

## 8. Defects filed at scoping

| id | reading | owner |
|---|---|---|
| **PRD-D1** ✅ s3 | ~~No default or maximum page size on any query route~~ — closed. `queries.defaultLimit`/`maxLimit` clamp in `AdapterFacade`, capped responses carry `X-NodeGX-Result-Capped`, and thirteen whole-table readers moved to the explicit `rawQueryAll` bypass. PRD-001 §7 | PRD-001 |
| **PRD-D7** BACKLOG | `$addToSet` in a grouped aggregate maps to `distinct` INSIDE the single result object — an unbounded array in an otherwise bounded response. `rawDistinct` itself is capped; this one is not, because the fix is a limit on the aggregate path rather than a reach into an accessor map. PRD-001 §7.6 | none yet |
| **PRD-D2** ✅ s1 | ~~Run records are bounded by count but not by size~~ **Corrected:** the substrate already capped one value at 50KB (`store.ts:28`); what was absent was the per-run sum, config, announcement and queryability — PRD-002 §7.1 | PRD-002 |
| **PRD-D3** ✅ s1 | Pruning never reclaims disk — closed for new files (incremental + bounded reclaim) and for old ones by `POST /admin/executions/compact`; PRD-003 §7 | PRD-003 |
| **PRD-D4** ✅ s1 | Retention is age-only — `executions.maxCount` (10,000) beside it, attributed; per-workflow opt-out still PRD-003 §6 | PRD-003 |
| **PRD-D5** · | **Unverified:** the execution record of a run killed mid-flight may be absent rather than stuck. Measure before designing around it. s1 note: the record is written at `startExecution` with status `running` (`ExecutionLogger.ts:189`), and `WorkflowEngine.start()` marks `running` rows `interrupted` on the next start (`WorkflowEngine.ts:325`, WF-001) — so a SIGKILL should leave a **stuck-then-recovered** row, not an absent one. Still unmeasured | PRD-004 |
| **PRD-D6** BACKLOG | The workflow-engine path (`WorkflowEngine.ts:534-546`) records step `input`/`output` with **no** value scrubber; only the cloud-function path scrubs. Bounded since s1, scrubbed still not. Unverified whether a workflow step can carry a secret value | none — a product decision about what a workflow step may hold |
