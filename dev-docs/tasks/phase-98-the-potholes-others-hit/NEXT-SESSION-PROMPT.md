# Phase 98 — next session

**Written by s1, 2026-09-19.** Re-derive the board from the task files before believing it
(PHASE-EXECUTION §3.1).

## 1. THE BOARD

| task | built | gated | driven | left |
|---|---|---|---|---|
| PRD-001 no query returns everything | ⬜ never built | ⬜ | ⬜ | **everything**. Lands in `AdapterFacade`, phase 97's fastest-moving file — coordinate (§2) |
| PRD-002 a run cannot eat the disk | ✅ s1 | ✅ s1 — 8 specs, 2 mutants | 🟡 over HTTP in the spec | the 1,000-run drive (close condition) — PRD-004's harness |
| PRD-003 pruning gives the disk back | ✅ s1 | ✅ s1 — 7 specs | 🟡 over HTTP in the spec | ❓ `local.db` reclamation — **Richard's ruling** (PRD-003 §6) |
| PRD-004 the number we do not have | ⬜ never built | ⬜ | ⬜ | **everything**. 🔴 Not beside other heavy work; after PRD-001; PRD-D5 answered on the way |
| PRD-005 secrets are provisioned | ✅ s1 | ✅ s1 — 11 specs | 🟡 over HTTP in the spec | a drive from the Compose deploy (`deploy/entrypoint.sh` still translates env → `--token`) |

**Built-but-undriven: 3.** All three are driven over real HTTP inside their specs (rule 5: *tests
are the drive*); none has been driven against a started binary or the packaged deploy.

## 2. THE NEXT TASK TO BUILD: PRD-001

It is the first link of the outage chain and the only unbuilt one that needs no soak. Its design
is settled (§3.4: the clamp goes in `AdapterFacade`, above the adapter, not in `QueryBuilder`).
First concrete step:

1. `git log --oneline -5 -- packages/nodegx-backend/src/persistence/AdapterFacade.ts` and
   `stat` it — **phase 97 (BRG-005, the Postgres adapter) is live in `persistence/`**. If a peer
   has it open, take the temp-index recipe for the commit and keep the clamp in ONE method.
2. Enumerate the internal readers that must bypass the cap (§3.3): `backup/dataio.ts`, export,
   the orphan sweep, the search indexer. Grep every `find(`/`query(` caller of the facade.
3. Add `executions`-style keys to `ops.json` — a new `queries` section: `defaultLimit`,
   `maxLimit` — following `ops/model.ts`'s `checkKeys` pattern (s1 added five keys there; copy it).
4. The cap signal: a response header (`X-NodeGX-Result-Capped`) on the Parse routes, decided once
   for BYOB too. Rule 1: a capped result says so.
5. The backup round-trip test with a table larger than `defaultLimit` — write it FIRST; it is the
   one that catches the worst version of the change.

**Then PRD-004**, only when nothing else heavy is running on the box (its §5 is explicit), and
only after PRD-001 so the number describes the backend we ship.

## 3. The phase's end condition, and how far away

§7 of the README: a thousand runs of the reproduced Visual Hive bug against a started backend.
After s1, three of its five bullets are mechanically true (capped results say so — for the
record, not yet for queries; `executions.sqlite` is bounded by a chosen number; lowering retention
gives the disk back; the record names the workflow via `?capped=true`). The remaining two —
*no response returned an unbounded result set* and *the vertical ceiling is a number* — are
PRD-001 and PRD-004. **Two tasks away, and the second one is a measurement, not code.**

## 4. What s1 settled — and where the task files were wrong

- **PRD-002 §2 was wrong** (§7.1 there): the substrate already capped a value at 50KB; the grep
  stopped at the package boundary. The per-RUN budget, config, announcement and `?capped=` are
  what was missing. Defaults keep the existing effective cap, so an ordinary run's record is
  unchanged.
- **PRD-003's metric name**: `nodegx_db_file_bytes` is `local.db`. A second series,
  `nodegx_executions_db_file_bytes`, rather than a relabel.
- **PRD-005's decision**: an explicit `--require-secrets` / `NODEGX_REQUIRE_SECRETS=1`, not implied
  by the bind; env values are never persisted; `--token` unchanged.
- **PRD-D5 has a likely answer** (README §8): records are written at `startExecution` as
  `running`, and WF-001 marks them `interrupted` on the next start. Stuck-then-recovered, not
  absent. One `SIGKILL` under PRD-004 confirms it.
- A new admin `POST` route owes a row in `ops/audit-actions.ts` or the `ops-audit` gate goes red.

## 5. Gate readings (2026-09-19, working tree on `42fb3d664` + s1's uncommitted delta)

| gate | reading |
|---|---|
| `tsc -p packages/nodegx-backend --noEmit` | 0 |
| `tsc -p packages/noodl-viewer-cloud --noEmit` | 0 |
| `typecheck:backend-tests` | 0 |
| the three `prd-00*` specs | 26/26 |
| 19 related backend specs (retention, ops, secrets, log node, backups, audit…) | 179/179 after the audit-action row |
| `noodl-viewer-cloud` execution-history specs | 46/46 |
| full `packages/nodegx-backend` jest | see the s1 handoff message — was still running when this was written; ⏳ if unrecorded here |

## 6. Rulings owed by Richard (separate from agent work)

1. **`local.db` reclamation** (PRD-003 §6): here, in backup, or in phase 97's migrator?
2. **PRD-001's two numbers** (§3.1): `defaultLimit: 1000`, `maxLimit: 10000` are the suggestion.
3. **Committing this directory**: `dev-docs/tasks/phase-98-…/` is UNTRACKED (the scoping
   session's). s1 edited three task files, the README and wrote this file inside it, and did
   **not** `git add` any of it — committing would have swept the scoping session's whole
   directory. s1's source, tests and docs delta was committed by pathspec; this directory is
   Richard's to commit.

## 7. Register (appendix)

| id | state | owner |
|---|---|---|
| PRD-D1 🔴 | open — no page cap | PRD-001 |
| PRD-D2 ✅ | closed s1, with the correction | — |
| PRD-D3 ✅ | closed s1 (new files automatic; old files `POST /admin/executions/compact`) | — |
| PRD-D4 ✅ | closed s1 (`maxCount`); per-workflow opt-out still PRD-003 §6 | — |
| PRD-D5 · | unmeasured; likely answer in README §8 | PRD-004 |
| PRD-D6 BACKLOG | workflow-engine path records step input/output unscrubbed | none |
