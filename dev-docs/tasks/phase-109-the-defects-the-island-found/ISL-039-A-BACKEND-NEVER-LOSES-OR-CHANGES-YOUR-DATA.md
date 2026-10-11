# ISL-039 — A backend never loses or changes your data behind your back

**Status: 🟢 s41 (2026-10-11): 7 of 8 fixed — both blockers (BACKUP `dc4e0b51a`, MIGRATE `2deb380d0`), NOACL `f8574d6f7`, ARRAYEQ + PTREQ `5bfb23cf4`, ADDUNIQUE `421cfc5a6`, NUL `3e18ea4cc`; each re-measured first and graded with a control. KEYORDER ruled s41 ("Order not promised"; AC2 met); left: its docs (AC3). Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 8 bugs
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

## 8. Record

### s41 (2026-10-11) — 7 of 8

**AC1** — all eight rows re-measured at HEAD before building. All eight still fired; none had been fixed elsewhere.

**AC3** — seven fixed, one commit each or one per shared mechanism. Each fix was red first and has a control. The
ledger files hold the detail.

| row | commit | what changed | graded by |
|---|---|---|---|
| BACKUP (blocker) | `dc4e0b51a` | archive carries auth/search/files/ops/views + `workflow-defs/`; manifest `folders`; a running backend re-reads each | `nodegx-backend/tests/isl039-backup-keeps-every-setting.test.ts` (red 4/5 before), 2 mutants |
| MIGRATE (blocker) | `2deb380d0` | a first run refuses a target holding rows, by table; a refused run no longer leaks its snapshot | `brg-004-data-plane` (new case red before; 20/20), 1 mutant |
| NOACL | `f8574d6f7` | 0 rows changed is "Object not found" with or without an ACL, both engines | contract case + mutation `missing-row-written-without-acl-succeeds`; full backend suite |
| ARRAYEQ, PTREQ | `5bfb23cf4` | equality on an Array column matches an element (an array value is the whole array); a Pointer/Date condition is a value | contract cases (both engines) + a `/classes` arm |
| ADDUNIQUE | `421cfc5a6` | Parse array operators applied on create, refused by name on update, never stored | `/classes` arm, red on the old wire |
| NUL | `3e18ea4cc` | on PostgreSQL a NUL in a filter value compiles to SQLite's answer | contract case, red on PostgreSQL before |

**Found on the way:**
- `views.json` (saved table views) was missing from the backup too. A census of the 29 real backends in
  `~/.noodl/backends` found it.
- A refused migrate leaked a whole snapshot whenever an earlier checkpoint sat at the path.
- The admin's "list is empty" relied on comparing JSON text. It now asks `$eq: []`.
- **Filed:** `P109-S41-SUNDAYWEEK` (a "past 7 days" filter read back on a Sunday is "this week"; `bmg-002`'s past7 case
  is red every Sunday).

**Choices made without a ruling** (say if wrong):
- A backup leaves out the run history and the backend's identity (`config.json`). The Backups page says the first.
- `migrate` has no `--into-non-empty` override.
- On an update, `Add`/`AddUnique`/`Remove` are refused rather than applied (the ledger's "smaller fix").
- NUL took "match nothing on PostgreSQL" (it breaks no working app).

**Gates (2026-10-11):**
- `nodegx-backend` full run (`-w 3`, without the hanging drive `P116-S13-AC2STALL` and a peer's two untracked P116
  specs): 227 / 229 files. The two red files: `rel002b` (`P116-S13-REL002B`, red with the old adapters too) and
  `bmg-002`'s past7 case (calendar, red at HEAD; filed). The `tags empty` case it also caught was mine, and is fixed.
- Conformance: SQLite 29 / 29 (four BRG-003 files), PostgreSQL 85 / 85.
- `noodl-runtime` `test/adapters`: 328 / 328. `tsc -p packages/nodegx-backend --noEmit`: exit 0.

**AC2 — open: KEYORDER needs Richard.** Measured s41: SQLite gives an Object field's keys back in the order they were
saved. PostgreSQL gives `{zebra, apple, mid:{y,b}, a}` back as `{a, mid:{b,y}, apple, zebra}`: `jsonb` sorts keys
shortest first, then alphabetically, at every level.

**AC2 met, 2026-10-11:** KEYORDER ruled **"Order not promised"**. The question and answer are verbatim in the ledger
file. Left for AC3: say so on the Records docs page and in the node reference, with the warning about comparing a
read-back object with `JSON.stringify`.
