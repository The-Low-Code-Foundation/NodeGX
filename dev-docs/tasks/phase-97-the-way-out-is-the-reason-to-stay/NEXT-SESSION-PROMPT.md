# Phase 97 — next session

**Session 10 built the drive. BRG-006 is green: 22/22, exit 0, 206 s. A whole NodeGX app —
FED-006's feed reader, imported unmodified — is provisioned on SQLite, recorded, moved by the real
`migrate` command, served from PostgreSQL, compared against its own control field for field, and
then served again from the untouched SQLite file. AC1–AC7 are closed. AC8 is published and waiting
on Richard.**

**Both rulings were then taken (R7, README §4): `/api` is brought into line — `true`/`false`
everywhere — and Richard took `SCALING.md` away to read for AC8.**

**The drive found BRG-D10, and BRG-D10 is not about the bridge at all**: two REST surfaces
answer differently for the same Boolean, in the same row, on the same engine. `GET /api/:c` reads
`1` where `GET /classes/:c` reads `true` — on SQLite, with no PostgreSQL involved.

**Where it is:** `cline-dev`, commit `7c93fe888`. s9 was `7ba47bde9` + `f89a6a81a`.

## The board, re-derived from the task files

| task | state | what is left |
|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) the interface | ✅ | — |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) the holes | ✅ | AC7 (`noodl-mcp` — red for peers' reasons, re-measured at s9) |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) the suite + gate | ✅ all eight | ⚠️ still no boolean round-trip case — and BRG-D10 says one case would not be enough; it needs one **per wire prefix** |
| [BRG-004](BRG-004-THE-MIGRATOR.md) the migrator | ✅ AC1–AC9 | — |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) the adapter | ✅ all but AC7 | **AC7** — `noodl-mcp` green is not this phase's to make true (§7.5) |
| [BRG-006](BRG-006-THE-DRIVE.md) the drive | 🟢 **AC1–AC7** | **AC8** — published; Richard is reading it |

**Readings taken this session** (2026-09-20): the drive **22/22 exit 0, 206 s**; carry report clean
(committed at `brg-006-drive-record/`); `migrate` **58 rows / 15 batches / 0.1 s, 43 records
compared through both adapters, nothing differs**, source sha256 identical; siblings
`feed-drive` + `fed-004` + every `realtime` spec **9 suites / 83 tests exit 0**;
`typecheck:backend-tests` exit 0.

## 1. First job — build R7's repair

🔴 **Both rulings were taken at the end of s10. Nothing is waiting on Richard except his read of
`SCALING.md`, which he took away to read.**

**R7 (README §4): `/api` is brought into line — `true`/`false` everywhere.** `/api` on SQLite is
the only reader that says `1`; `/classes`, a graph's own `Query Records`, and every reader on
PostgreSQL already say `true`. ⚠️ It reaches `_User.emailVerified`, `_Files.private` and
`_ApiKey.revoked`.

**s10 located the mechanism so you do not re-derive it — BRG-006 §9 has the table.** In short:
`byob-admin.ts` reads through `raw*`, `parse-wire.ts` through `wire*`, and that split is
deliberate, so **do not make `rawQuery` convert** — `security/state`, `RoleStore`, sessions and
`McpRoutes.sessionForGraph` all need storage values. The shape BRG-D8's own filing points at is
`SchemaManager.getTableSchema()` returning a `TableSchema` with no `properties`, so `_rowToRecord`
never sees the declared type on either adapter.

🔴 **The gate is one boolean case PER WIRE PREFIX, not one case** — a single case would have been
written on whichever prefix came to hand and passed while the other stayed wrong, which is the hole
BRG-D8 got through. BRG-006's own three-way assertion **will go red when the repair lands** and
names itself as the thing to update; that is deliberate.

## 2. 🔴 What is in the working tree and NOT at HEAD

- **`docs/runtime/SCALING.md`** — 🔴 **a phase 98 peer's UNTRACKED file, which s10 edited and did
  NOT commit.** Its Postgres section said *"Today: there is no supported SQLite → Postgres
  migration"* and warned the schema-export route drops relations, indexes and RLS — all shipped in
  s5/s9 and all false, on a page a user reads before starting. The edit is surgical: one section
  replaced, one bullet in "Honest limits" corrected, everything else byte-identical. **It belongs to
  whoever owns that file.** See BRG-006 §8.1.
- **`packages/nodegx-backend/src/execution/ExecutionStore.ts`** — the `PgOperationalStore` wiring
  still sits on the peer's uncommitted PRD-003 `close()`. Commit once theirs lands. (Unchanged
  since s8.)
- **`packages/nodegx-backend/src/server/HttpServer.ts`** and **`src/cli.ts`** — this phase's hunks
  went in through a temporary index at s8/s9. A strange-looking `git diff` on either is that.

## 3. What s10 settled

- **The CI hole is closed where it is measured.** Five spec files skip themselves with no
  PostgreSQL, so a database-less CI run was green and said nothing. `NODEGX_REQUIRE_PG=1` now
  throws at module load with the URL in the message. Set it in the phase's gate; a laptop keeps
  the skip.
- **A bound API key over `POST /functions/:name` is not "signed in" to a graph.** The cloud
  `Request` node reads `x-parse-session-token` alone (`nodes/cloud/request.ts:220`); only `/mcp`
  mints an ephemeral session for a bound key. Known — FED-005 §3.3, phase 96 R11 — identical on
  both engines, and terrain the drive routes around rather than a finding.
- **`run.output.result`, two unwrappings.** CWF-002 named the run's answer `output`, and that
  output is the function's body, which a `Response` node wraps in `result`. Either key alone gives
  `undefined`; `undefined ?? -1` is a number, so the run stays green while the count goes quietly
  wrong.
- **The stored name of an uploaded file is not the posted name** (`server/files.ts:165`). A fetch
  under the posted name is a 404 — which reads as "the file did not cross", on every engine equally.
- **Execution history does not cross, by design** — `executions.sqlite` is a second file `migrate`
  never surveys. Still there, still readable, still SQLite after the cutover. Now in `SCALING.md`.

## 4. After R7 lands

The phase closes. What is left is small and named:

- **BRG-D7** (`IStorageSchema` is synchronous) is still open and still owed to BRG-002's method on
  six callers, or a task of its own.
- **Backups on PostgreSQL** — `BackupManager` snapshots a SQLite file. `SCALING.md` now tells an
  operator the execution history is a file to copy; whether `pg_dump` is the operator's job or the
  service learns it is still unruled.
