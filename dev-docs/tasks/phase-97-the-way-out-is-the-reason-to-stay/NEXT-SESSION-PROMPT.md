# Phase 97 — next session

**Session 10 built the drive. BRG-006 is green: 22/22, exit 0, 206 s. A whole NodeGX app —
FED-006's feed reader, imported unmodified — is provisioned on SQLite, recorded, moved by the real
`migrate` command, served from PostgreSQL, compared against its own control field for field, and
then served again from the untouched SQLite file. AC1–AC7 are closed. AC8 is published and waiting
on Richard.**

**It also found BRG-D10, and BRG-D10 is not about the bridge at all**: two Parse-wire prefixes
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
| [BRG-006](BRG-006-THE-DRIVE.md) the drive | 🟢 **AC1–AC7** | **AC8** — published, needs Richard to read and rule it honest |

**Readings taken this session** (2026-09-20): the drive **22/22 exit 0, 206 s**; carry report clean
(committed at `brg-006-drive-record/`); `migrate` **58 rows / 15 batches / 0.1 s, 43 records
compared through both adapters, nothing differs**, source sha256 identical; siblings
`feed-drive` + `fed-004` + every `realtime` spec **9 suites / 83 tests exit 0**;
`typecheck:backend-tests` exit 0.

## 1. First job — the two rulings, then close the phase

Both are Richard's and both are now ONE decision, which is new information from this session.

1. 🔴 **BRG-D8 + BRG-D10 together.** The drive read one Boolean column three ways on two engines:

   | read through | SQLite | PostgreSQL |
   |---|---|---|
   | `GET /api/:c` | **`1`** | `true` |
   | `GET /classes/:c` | **`true`** | `true` |
   | a graph's `Query Records` | `true` | `true` |

   BRG-D8 was filed as "two engines disagree" and is one cell of this. **The argument its ruling
   was waiting on is false as stated**: "every existing app reads `0`/`1`" is true only of apps on
   `/api` against SQLite. Everything else already reads `true`. ⚠️ It reaches internal tables too —
   `migrate`'s verify report names `_User.emailVerified`, `_Files.private`, `_ApiKey.revoked`.
   The question to put in plain words: **should `/api` on SQLite be brought into line with
   everything else (`true`), knowing that is the one reader that changes?**

2. **AC8** — `docs/runtime/SCALING.md` §"SQLite and Postgres" is rewritten and needs Richard to
   read it and rule it honest. It states what the bridge buys (the storage ceiling — one app
   process, a real database behind it) and what it does not (the app tier is still single-process),
   in R2's words, on the page a person reads before deciding whether to start.

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

## 4. After the rulings

The phase closes. What is left beyond the rulings is small and named:

- **BRG-003 needs boolean round-trip cases — one per wire prefix**, which is the shape BRG-D10
  makes necessary and a single case would have missed ([[a-gate-can-have-a-hole-shaped-like-the-defect]]).
- **BRG-D7** (`IStorageSchema` is synchronous) is still open and still owed to BRG-002's method on
  six callers, or a task of its own.
- **Backups on PostgreSQL** — `BackupManager` snapshots a SQLite file. `SCALING.md` now tells an
  operator the execution history is a file to copy; whether `pg_dump` is the operator's job or the
  service learns it is still unruled.
