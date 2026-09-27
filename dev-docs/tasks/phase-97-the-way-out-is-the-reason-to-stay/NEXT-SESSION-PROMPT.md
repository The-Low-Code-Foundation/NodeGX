# Phase 97 — next session

**Session 12 took Richard's two rulings and built what they asked for. R8 is ruled and built
([BRG-008](BRG-008-BACKUPS-ON-POSTGRES.md), 7/7), BRG-D7 is carried out of the phase with a home,
BRG-003's owed conformance case is in (56 → 57), and the page AC8 is waiting on has been corrected.**

🔴 **The only thing left in this phase is Richard reading `docs/runtime/SCALING.md` and ruling it
honest.** There is no build work. Do not go looking for some.

**Where it is:** `cline-dev`. s11 was `40140ca71`.

## The board, re-derived from the task files

| task | state | what is left |
|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) the interface | ✅ | — |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) the holes | ✅ | AC7 (`noodl-mcp` — red for peers' reasons, re-measured at s9) |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) the suite + gate | ✅ **all eight, and the owed case is in** | — |
| [BRG-004](BRG-004-THE-MIGRATOR.md) the migrator | ✅ AC1–AC9 | — |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) the adapter | ✅ all but AC7 | **AC7** — `noodl-mcp` green is not this phase's to make true (§7.5) |
| [BRG-006](BRG-006-THE-DRIVE.md) the drive | ✅ AC1–AC7 | **AC8** — published, corrected at s12, with Richard |
| [BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md) the Boolean | ✅ AC1–AC5 | — |
| [BRG-008](BRG-008-BACKUPS-ON-POSTGRES.md) backups | ✅ **AC1–AC5** | — |

## 1. What s12 found, and it is the reason to re-read a page before acting on it

🔴 **The page Richard took away to rule had gone false while he held it.** Its section *"One thing
that changes shape: booleans over `/api`"* described exactly the divergence **BRG-007 removed the
next day**. s10 wrote it truthfully; s11's own repair falsified it; nobody re-read it.

It is replaced with the divergences that are still real, read out of `POSTGRES_DIVERGENCES` rather
than remembered: search **ranking** order, the per-query `tsvector` sequential scan, and the
`$within` polygon north/east boundary.

**The general shape:** a document handed to someone for a decision is a measurement, and it decays
like one. See [[a-page-handed-over-for-a-ruling-decays-like-any-other-measurement]].

## 2. What R8 actually bought — it is not the refusal

Richard ruled backups are the operator's job and the service should refuse rather than appear to
work. Building it found the reason that matters:

🔴 **`nodegx-backend backup` on a migrated data dir was archiving the pre-migration `local.db` —
still sitting in `data/`, because that is what makes "going back works" true — and reporting
success with a byte count.** The CLI never went through `createAdapter`; it built the SQLite path
itself, so it could not know the backend had moved. The scheduled backup did the same, nightly.

A backup that fails is an inconvenience. One that succeeds against stale rows is what you find out
about on the worst day.

**And the first draft of the guard was in the wrong place** — before the execution logger, so a
refused scheduled backup left `/admin/backups` showing the last *pre-migration* success for ever.
Writing the SCALING.md sentence *"the scheduled backup does not quietly keep running"* is what
caught it: the sentence was false, so the code moved, not the sentence.
See [[a-claim-written-into-a-doc-can-grade-the-code-it-describes]].

## 3. Readings taken this session (2026-09-20)

| what | reading |
|---|---|
| `brg-008` gate | **7/7** |
| the same gate, guard disabled in place | **4 failed / 3 passed — the 3 passing are exactly the 3 controls**; the CLI arms fail with *"expected a refusal, and the call succeeded"* and the service arm with *Expected 409, Received 500* |
| all backup specs (9 pre-existing suites + brg-008) | **10 suites / 34 tests, exit 0** |
| conformance, SQLite + PostgreSQL | **7 suites / 57 tests**; case count **57** — records 16, filters 10, acl 16, relations 6, schema 9 |
| the new conformance case, pre-R7 lookup restored | **red on that case and no other** |
| `typecheck:backend-tests` / `nodegx-backend-contract` | **0 / 0** |

## 4. 🔴 What is in the working tree and NOT at HEAD

- **`docs/runtime/SCALING.md`** — still a phase 98 peer's **untracked** file, now edited by s10
  *and* s12. Sections replaced whole, everything else byte-identical. **It belongs to whoever owns
  that file.** BRG-006 §8.1.
- **`packages/nodegx-backend/src/execution/ExecutionStore.ts`** — the `PgOperationalStore` wiring
  still sits on the peer's uncommitted PRD-003 `close()`. Commit once theirs lands. (Unchanged
  since s8.)
- **`HttpServer.ts`** and **`cli.ts`** — this phase's hunks went in through a temporary index at
  s8/s9. A strange-looking `git diff` on either is that.

## 5. What is left

- **AC8 — Richard's read.** Nothing else in the phase is open.
- **Carried out, with homes, not left hanging:**
  - **BRG-D7** → [SYNCHRONOUS-SCHEMA-INTERFACE.md](../../future-projects/SYNCHRONOUS-SCHEMA-INTERFACE.md).
    Gated behind horizontal scaling, which is the phase that cannot ship without it.
  - **`schema-migrate` on a Postgres data dir** → [BRG-008](BRG-008-BACKUPS-ON-POSTGRES.md) §6.
    🔴 **Located, not suspected**: `schema-migrate.ts:165` reads `<dataDir>/data/local.db`
    unconditionally, so `nodegx-backend schema diff` on a migrated dir compares against the
    pre-migration schema. Same defect as BRG-008, one command family over. One session.
