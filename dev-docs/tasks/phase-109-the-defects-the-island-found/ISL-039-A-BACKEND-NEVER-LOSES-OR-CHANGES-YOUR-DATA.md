# ISL-039 — A backend never loses or changes your data behind your back

**Status: ⬜ not started. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 8 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 2 blocker · 5 medium · 1 low; 1 to ask. **Side:** nodegx-backend (backups, migrate, the Parse wire, the SQLite and PostgreSQL adapters, local-sql queries)

## 1. The person sentence

**A backup restores everything it saved, a migration never writes over rows that are already there, and every save, update and query does exactly what it says, or says why it did not.**

## 2. Why these belong together

Eight ways a NodeGX backend gets a person's data wrong without saying so, found by sessions that drove real backends: P78's Digital Bricks Training build (DBT), P99 HLT-016 and P100 UPG-001. Two lose data outright (a restore that drops the workflows, sign-in and files; a migrate that overwrites a PostgreSQL database that already holds rows). Four answer a question wrongly and call it success (a save that matched no row, an array operator stored as an object, an equality filter on an array, a Parse pointer in a filter). One differs between SQLite and PostgreSQL (a NUL in a query value), and one is a ruling (an Object field's key order).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P100-UPG001-BACKUP](../../bugs/p100-upg001-backup-a-restored-backup-loses-workflow-definitions-sign-in-and-ops-settings.md) | blocker | scheduled | A restored backup loses the workflow definitions, sign-in, search, files and ops settings, and the run history |
| [P78-DBT-MIGRATE](../../bugs/p78-dbt-migrate-migrate-overwrites-the-rows-of-a-non-empty-postgresql-target.md) | blocker | scheduled | nodegx-backend migrate overwrites the rows of a PostgreSQL database that already holds data |
| [P99-HLT016-NOACL](../../bugs/p99-hlt016-noacl-a-write-that-matches-no-row-answers-200-without-an-acl.md) | medium | scheduled | Without an ACL, a save, delete or increment that matches no row answers success |
| [P100-UPG001-ADDUNIQUE](../../bugs/p100-upg001-addunique-array-update-operators-are-stored-as-literal-objects.md) | medium | scheduled | Array update operators (AddUnique, Add, Remove) are stored as the operator object instead of applied |
| [P100-UPG001-ARRAYEQ](../../bugs/p100-upg001-arrayeq-an-equality-filter-on-an-array-field-returns-nothing.md) | medium | scheduled | An equality filter on an Array field returns no rows, with no error |
| [P100-UPG001-PTREQ](../../bugs/p100-upg001-ptreq-a-pointer-object-in-an-equality-filter-is-a-500.md) | medium | scheduled | Filtering on a Pointer written as a Parse pointer object is a 500 (cannot translate: __type) |
| [P78-DBT-NUL](../../bugs/p78-dbt-nul-a-nul-character-in-a-query-value-works-on-sqlite-and-is-a-400-on-postgresql.md) | medium | scheduled | A NUL character in a query value works on SQLite and is a 400 on PostgreSQL |
| [P78-DBT-KEYORDER](../../bugs/p78-dbt-keyorder-an-object-field-reads-back-with-its-keys-in-a-different-order.md) | low | needs-ruling | An Object field reads back with its keys in a different order from the one saved |

## 4. Order of work

The two blockers first: BACKUP and MIGRATE. Then the answers that lie: NOACL, ADDUNIQUE, ARRAYEQ, PTREQ. Then NUL. KEYORDER needs a ruling, so ask it in the AC2 batch.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- **P104 (the backend manager) is live** and edits the same package. Check `git status packages/nodegx-backend` and mtimes first.
- The PostgreSQL arms need the test database, which `P99-HLT016-DIALECTTEST` (ISL-041) says two runs cannot share. Run one at a time.
- P99 and P100 own the drives that found these rows. Their task files hold the reproductions in fuller form than the ledger.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (P78-DBT-KEYORDER).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.
