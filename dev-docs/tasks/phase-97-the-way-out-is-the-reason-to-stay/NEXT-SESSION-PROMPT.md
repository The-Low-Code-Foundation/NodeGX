# Phase 97 — next session

**Session 11 built R7's repair. `GET /api/:table` now answers `true`/`false` for a declared
`Boolean`, the same as `GET /classes/:c`, a graph's own `Query Records` and every reader on
PostgreSQL. BRG-D8 and BRG-D10 are both closed.** The gate is
[BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md) — **7/7, one case per wire prefix, both arms.**

**All six built tasks are green and every ruling is taken. What is left is not build work:** AC8 is
with Richard, and two named items (§4) are unruled rather than unbuilt.

**Where it is:** `cline-dev`, commit `40140ca71`. s10 was `7c93fe888` + `bb3c3a1b5`.

## The board, re-derived from the task files

| task | state | what is left |
|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) the interface | ✅ | — |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) the holes | ✅ | AC7 (`noodl-mcp` — red for peers' reasons, re-measured at s9) |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) the suite + gate | ✅ all eight | its boolean hole is closed by BRG-007 at the prefix level; a declared-type case **at the conformance level** is still owed, and is a ratchet edit — see the end of that file |
| [BRG-004](BRG-004-THE-MIGRATOR.md) the migrator | ✅ AC1–AC9 | — |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) the adapter | ✅ all but AC7 | **AC7** — `noodl-mcp` green is not this phase's to make true (§7.5) |
| [BRG-006](BRG-006-THE-DRIVE.md) the drive | ✅ **AC1–AC7** | **AC8** — published; Richard is reading it |
| [BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md) the Boolean | ✅ **AC1–AC5** | — |

## Readings taken this session (2026-09-20)

| what | reading |
|---|---|
| `brg-007` gate | **7/7** |
| the same gate, repair reverted in place | **5 failed / 2 passed** — and the 2 passing are exactly the two controls |
| `noodl-runtime` `test/adapters` | **292/292, 14 suites** — unchanged from s8 |
| all `brg` specs, `NODEGX_REQUIRE_PG=1` | **16 suites / 150 tests, all passed, 212 s**, nothing skipped |
| `typecheck:runtime` / `:contract` / `:backend-tests` | **0 / 0 / 0** |
| full `nodegx-backend` sweep | **164 suites / 1980 tests — 1941 passed, 29 failed, 10 skipped**; two red suites, **neither this session's** (below) |

🔴 **Both reds are attributed by measurement, not by assumption:**

- **`ops-rate-limit`** (1 test) — a peer's new `POST admin/executions/compact` moves the route tally
  79 → 80. Absent at HEAD; **the same red s9 measured**. A read-path change cannot add a route.
- **`ac2-page-editor-drag-drive`** (28 tests) — every one of them is the *same* `beforeAll` hook
  hitting its 1,800,000 ms timeout, before any assertion ran. **Run alone it is 28/28, exit 0,
  292 s.** It is the contention hang BRG-004 §"Running it" already records for a bare package-wide
  `npx jest`, and the sweep is now three suites larger than s9's because of the peer's `prd-*` files.

## 1. First job — there is no build work left in this phase

🔴 **Do not go looking for some.** Every scoped task is green, all seven rulings are taken, and the
close condition (README §8) is met but for Richard's read. If you have arrived here with time, the
honest options are §4 below or another phase — **not** farming defects out of this one.

**Ask Richard for the two rulings in §4 in plain words**, and otherwise treat this phase as closed.

## 2. 🔴 What is in the working tree and NOT at HEAD

Unchanged from s10 except that this session's own work is now committed:

- **`docs/runtime/SCALING.md`** — 🔴 **a phase 98 peer's UNTRACKED file, which s10 edited and did
  NOT commit.** Its Postgres section claimed shipped features did not exist. One section replaced,
  one "Honest limits" bullet corrected, byte-identical otherwise. **It belongs to whoever owns that
  file.** See BRG-006 §8.1.
- **`packages/nodegx-backend/src/execution/ExecutionStore.ts`** — the `PgOperationalStore` wiring
  still sits on the peer's uncommitted PRD-003 `close()`. Commit once theirs lands. (Unchanged
  since s8.)
- **`packages/nodegx-backend/src/server/HttpServer.ts`** and **`src/cli.ts`** — this phase's hunks
  went in through a temporary index at s8/s9. A strange-looking `git diff` on either is that.

## 3. What s11 settled

- **The defect was one lookup reading one of two schema shapes.** Both adapters asked for
  `schema.properties[key].type`; `getTableSchema()` returns `{ name, columns }`, and
  `BackendService` passes no `collections` config, so on a service-opened backend the declared type
  was invisible for **every column of every collection** and each driver's own return value won.
  `/classes` was right for an unrelated reason: `AdapterFacade.toWire()` reads `schema.columns`
  itself. One helper — `schemaCommon.declaredProperties` — now serves both adapters.
- 🔴 **`rawQuery` was deliberately NOT made to convert**, as BRG-006 §9 warned. `raw*` stays
  storage-shaped — a Pointer is still a bare id, a Date still an ISO string. What changed is that
  the **declared** type is applied where it was being dropped, which is a different claim.
- 🔴 **A gate written after a repair proves nothing until you take the repair away.** Both adapter
  files were `cp`'d aside, the old lookup put back, the gate re-run (**5 red**), then restored and
  `diff -u`-verified byte-identical. The two cases that stayed green under the revert are the
  `Number` control and the `wire*` half — that signature is the reading, not the red count.
- **`normalise()`'s `booleanReads` fold is gone.** s10 armed that fold to expire with the repair and
  wrote down that it must. It expired, and the drive now compares the column like everything else.
- **BRG-003's hole could not have been closed inside BRG-003.** A conformance case runs at the
  adapter level, below both prefixes, so it could never have seen two REST surfaces disagree.

## 4. What is left, and it is Richard's to rule

- **AC8** — Richard has `SCALING.md`. Nothing is blocked on it but the phase's own close.
- **BRG-D7** (`IStorageSchema` is synchronous; `PgSchemaManager` serves readers from a primed model
  and queues DDL) is still open, and still owed to BRG-002's method on six callers, or a task of its
  own.
- **Backups on PostgreSQL** — `BackupManager` snapshots a SQLite file. `SCALING.md` now tells an
  operator the execution history is a file to copy; whether `pg_dump` is the operator's job or the
  service learns it **is still unruled**.
- **A declared-type case at the conformance level** (BRG-003's own note) — the portable claim a
  third adapter would need, as distinct from the product surface BRG-007 gates.
