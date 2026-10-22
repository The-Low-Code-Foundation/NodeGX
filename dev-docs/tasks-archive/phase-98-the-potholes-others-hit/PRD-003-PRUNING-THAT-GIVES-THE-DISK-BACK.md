# PRD-003 — Pruning that gives the disk back

**Status: ✅ Built and gated, s1 (2026-09-19). AC1–AC7 green. §6's `local.db` question is still Richard's.**

## 1. The person sentence

**The operator whose disk filled up lowers the retention, watches the database shrink, and goes back
to bed.**

## 2. What is there (read 2026-09-19, HEAD `aa5d00e2a`)

| reading | where |
|---|---|
| Retention is **age-only** — the entire `executions` ops section is `{ retentionDays, idempotencyTtlHours }` | `ops/model.ts:193`, validated at `:302` |
| `retentionDays: 0` means keep forever; the prune runs on the store's own clock and other sweeps ride it | `execution/ExecutionStore.ts:181, 192, 210` |
| 🔴 **`VACUUM` appears only in the backup path** — `VACUUM INTO '<path>'` to write a snapshot file. There is **no** `VACUUM` after pruning | `backup/snapshot.ts:100, 108` |
| 🔴 **No `auto_vacuum` pragma anywhere.** SQLite's default is `NONE`, so freed pages are reused but the file never shrinks | grep `auto_vacuum` over `src/` + `local-sql/` — no hits |

**So pruning today deletes rows and returns no disk.** An operator who fills a disk, discovers
`retentionDays`, and lowers it will watch the row count fall and the **file stay exactly as large as
it ever got** — the single most confusing possible outcome, at the worst possible moment.

## 3. Design

### 3.1 A count limit beside the age limit

Age cannot bound a **fast** blowup: a runaway workflow can produce a month's volume in an hour, and
every row is younger than the retention window. n8n needed three controls — max age, max count, and
a per-workflow opt-out — and their default is *"the last two weeks or the most recent 10,000
executions, whichever comes first."*

Add **`maxCount`** to the `executions` section. Per-workflow "do not save" is noted in §6 as the
likely third, deliberately not scoped here.

### 3.2 🔴 Say which limit fired

Rule 3 of the phase, and it is not hypothetical: n8n's community carries a thread titled
*"execution history limited to ~13 hours despite 720-hour retention"* — the count limit silently
overrode the age limit and the operator could not tell. **Shipping a second limit without
attribution ships that thread.**

The prune must report, in the log line and in `/admin/status`, which limit bound this pass and how
many rows each removed.

### 3.3 Reclaiming the space — the real constraint

Three options, and the trade is genuine:

| option | cost |
|---|---|
| **`VACUUM`** after a prune that removed a lot | Rewrites the whole file and takes a **write lock** for the duration. On a multi-GB file that is a stall, which is exactly what you do not want on a struggling backend |
| **`PRAGMA auto_vacuum = INCREMENTAL`** + `incremental_vacuum` | Cheap and incremental, but **must be set before the database has tables** — switching an existing database still requires one full `VACUUM` |
| **Leave it, document it** | Honest, and leaves the confusing outcome in place |

**Recommendation to rule on:** `INCREMENTAL` on **new** execution databases, a **bounded**
`incremental_vacuum` on the prune sweep, and an explicit **operator-triggered** full `VACUUM` for
existing databases — never an automatic multi-GB rewrite the operator did not ask for. Whatever is
chosen, `nodegx_db_file_bytes` must visibly move, or the fix is invisible to the person it is for.

### 3.4 Scope: `executions.sqlite`, and a question about `local.db`

This task owns the execution history. **The same non-reclamation applies to `local.db`** when a user
deletes many records. That is a bigger question touching backup and phase 97 — filed as a question in
§6, not scoped here.

## 4. Acceptance criteria

1. `executions.maxCount` prunes oldest-first, independently of age.
2. A prune pass reports **which** limit bound it and how many rows each removed.
3. `retentionDays: 0` and `maxCount: 0` both still mean "keep forever", consistently.
4. 🔴 After a prune that removes a large fraction, the **file on disk is smaller**, and
   `nodegx_db_file_bytes` reflects it.
5. Reclamation never takes an unbounded write lock on the hot path.
6. An operator can trigger a full compaction deliberately, and is told what it will cost.
7. Unknown keys in the section still refuse start.

## 5. Tests

- Insert 10,000 executions, set `maxCount: 100`, prune: 100 remain, **and the file shrinks**.
- Age and count both eligible: the report names both, with counts.
- A prune removing nothing does no vacuum work and logs nothing alarming.
- `retentionDays: 0, maxCount: 0` after a prune cycle: nothing removed.

## 6. Out of scope, and one question

- **Per-workflow "do not save"** — n8n's third control. Likely the right next step; it is a product
  decision about what the execution record is *for*, and wants its own task.
- **`local.db` reclamation** — ❓ **open question**: should a user who deletes a million records get
  the disk back, and does that belong here, in backup, or in phase 97's migrator? Decide before this
  task is built, so the mechanism is chosen once.

## 7. Session 1 (2026-09-19) — what was built

### 7.1 The ruling §3.3 asked for, taken as recommended

`INCREMENTAL` on **new** `executions.sqlite` files (set before `initSchema`, the only moment it can
be), a **bounded, yielding** reclaim after any prune that removed rows — `PRAGMA
incremental_vacuum(1024)` per step, ~4MB at the default page size, next step on an unref'd
zero-delay timer, to the empty freelist — and an **operator-triggered** full `VACUUM` for existing
files: `POST /admin/executions/compact` (admin, audited as `executions.compact`) converts a `NONE`
file to `INCREMENTAL` and answers `beforeBytes / afterBytes / durationMs / converted`. Nothing runs
a full rewrite unasked. `ExecutionHistory.close()` cancels a scheduled step at shutdown.

### 7.2 Attribution (§3.2, AC2)

`maxCount` (default **10,000**, n8n's number; `0` = no count limit) prunes oldest-first through the
substrate's existing `applyRetentionPolicy({ maxTotalCount })`, **after** the age pass, so
`byAge` and `byCount` are each what that limit alone removed. The `executions.pruned` line carries
`byAge`, `byCount`, `boundBy` (`age|count|both|none`), both limits and `reclaim`
(`incremental|manual`); `GET /admin/status` carries the same under `executions.lastPrune`, plus
`fileBytes`, `autoVacuum`, `freePages`, the reclaim report, and `compaction.manual` with the hint.

### 7.3 The metric (AC4) — a second series, not a relabel

`nodegx_db_file_bytes` measures **`local.db`** (`HttpServer.ts:1455`), not the execution history.
Relabelling an existing series breaks dashboards, so the history gets its own:
**`nodegx_executions_db_file_bytes`**. `docs/runtime/BACKEND-OPERATIONS.md` documents both.

### 7.4 The tests (`tests/prd-003-pruning-gives-the-disk-back.test.ts`, 7 specs)

Seeded through a second connection in one transaction (thousands of autocommit inserts spend the
budget on fsync). 1,500 × 30KB pruned to 100: **the file shrinks below 25% of its size** — the
assertion this task exists for; before s1 it was `after === before`. A legacy file (created with a
table under `auto_vacuum = NONE`) reproduces the confusing outcome, reports `manual`, and shrinks
only after `compact()` — after which its next prune reclaims on its own. Age+count attribution,
the no-op prune, both-zero-keeps-forever, the knob, and the HTTP surface (status, gauge, gated POST).

### 7.5 Left open

- ❓ **`local.db` reclamation** (§6) — Richard's ruling, unchanged. The mechanism built here
  (incremental on new files, operator compaction for old) would transfer, but `local.db` is opened
  by the adapter stack phase 97 is replacing, so it is theirs to place.
