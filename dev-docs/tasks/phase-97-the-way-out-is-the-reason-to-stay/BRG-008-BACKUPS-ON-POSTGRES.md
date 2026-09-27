# BRG-008 — a backup refuses when the records are not in a file

**Status: 🟢 Built and green, s12 (2026-09-20). AC1–AC5 closed.** Richard's ruling on the backup
question (README §4 R8): backing up a PostgreSQL database is the **operator's** job; the service's
duty is to say so rather than to appear to do it.

---

## 1. The defect, and why it was not a crash

`BackupManager` copies a SQLite **file**: `snapshotDatabase(dbPath)` → `db/local.db` inside the
archive, manifest `engine: 'node:sqlite'`, and a restore refuses any archive whose engine is not
that. Every part of that is fine on the built-in backend.

After `migrate --to postgres://…` the records are in PostgreSQL — **and the pre-migration
`local.db` is still sitting in `data/`**, because that is precisely what makes BRG-006 AC7 ("going
back works") true.

Two entry points, two different wrong answers:

| entry point | before | after |
|---|---|---|
| `nodegx-backend backup --data-dir <dir>` | 🔴 **archived the stale file and printed a success line with a byte count** | refuses by name, non-zero |
| `POST /admin/backups` | `500` — `snapshotDatabase: source database does not exist:` (the path is `''` on PG) | `409` with the named refusal |
| `nodegx-backend restore <archive>` | 🔴 **restored a SQLite archive onto a Postgres-backed dir** — wrote a `local.db` nothing reads | refuses by name |
| the scheduled backup | 🔴 same as the CLI: a nightly archive of pre-migration rows | a recorded failed run, every night, until someone looks |

🔴 **The CLI one is the dangerous one and it is the one a measurement found, not a reading.** The
CLI never went through `createAdapter` — `cliBackupManager` built `path.join(dataDir, 'data',
'local.db')` itself, so it did not know and could not have known that the backend had moved. An
operator's nightly backup would have been a healthy-looking archive of stale rows, discovered at
the only moment it ever matters.

This was **written down and not acted on**: `createAdapter.ts`'s own docblock for `dbPath` says
*"the two SQLite consumers that need a real file (`backup/snapshot.ts`, `schema-migrate`) are the
ones BRG-006 has to teach about a database that is not a file."* BRG-006 taught neither.
See [[a-known-hazard-in-a-docblock-is-not-a-guard]].

## 2. The repair

One guard, `BackupManager.assertFileBackedStorage(operation)`, against a **whitelist**:

```ts
export const FILE_BACKED_ENGINES = Object.freeze(['node:sqlite', 'better-sqlite3']);
```

🔴 **A whitelist, deliberately, and the default direction is refusal.** The mechanism here *is* a
file copy; an engine this class has never heard of must be refused rather than approximated. A
blocklist of "postgres" would have let a fourth engine through silently, which is the same defect
with a different name.

`engine: undefined` means *the caller did not say* and proceeds — every pre-BRG-008 caller is
SQLite, and 9 existing backup suites (27 tests) are untouched by this change.

Both real callers now say:

- **the service** — `service.ts` passes `this.persistence.status.engine` and `.target`, i.e. what
  the adapter actually connected to, not what an env var claims;
- **the CLI** — `describeConfiguredStorage()`, a new pure helper in `createAdapter.ts` that answers
  "what engine would this data dir use, and where" **without connecting**. A backup asked of an
  engine this process cannot copy is wrong whether or not that engine is reachable, and a refusal
  that needs a live database is no refusal at all.

`admin-backups.ts` maps the one named error to **409**: a refusal is not a crash, and an operator's
client deserves to tell "you cannot do this here" from "it broke".

### 🔴 2.1 The first draft put the guard in the wrong place, and the doc caught it

The guard was first called **before** the execution logger started, reasoning that a refusal is a
precondition rather than a failed backup and should not put a red run in the history every night.

Writing the SCALING.md sentence *"the scheduled backup does not quietly keep running"* is what
exposed it: with the guard there, that sentence was **false**. `BackupScheduleDispatcher.fire`
swallows the throw — its comment says *"createBackup already recorded the failure LOUDLY"* — which
is only true if the throw happens inside the recorded path. A schedule armed before the migration
would have stopped protecting the operator while `/admin/backups` still showed the last
**pre-migration** success: the silently-stale "last backup" timestamp RUN-004 and this module's own
docblock exist to forbid.

The guard moved inside `doCreate` and inside `restore`'s `try`. **A nightly red run is not noise; it
is the operator finding out.** There is now a case asserting exactly that
(`status.lastResult.ok === false`, and `lastRunAt !== lastSuccessAt`).
See [[a-claim-written-into-a-doc-can-grade-the-code-it-describes]].

## 3. Where each criterion stands

| AC | state | reading |
|---|---|---|
| AC1 the CLI refuses | ✅ | by name; names the engine, the target, and `pg_dump` |
| AC2 nothing is written | ✅ | archive listing byte-identical across the refusal |
| AC3 the refusal is recorded | ✅ | `status.lastResult.ok === false`; the last **success** stamp is not overwritten and not passed off as current |
| AC4 the service answers 409 | ✅ | over HTTP, through a real `BackendService` on PostgreSQL 16.11 |
| AC5 the published words are true | ✅ | `docs/runtime/SCALING.md` "Backups on Postgres" — the three things, and who backs up each |

## 4. The gate

`packages/nodegx-backend/tests/brg-008-backups-on-postgres.test.ts` — **7/7**.

🔴 **The controls are the test.** "It refuses now" is worth nothing alone: a refusal is
indistinguishable from a backup that was never going to work. So the first case backs up **the very
same data dir** successfully, and the arm that follows changes exactly one thing —
`NODEGX_STORAGE_URL`. A third case unsets it again and the same command works.

**Both callers are driven for real, not replicated**: the CLI through `main(['backup', …])` (the
actual `cliBackupManager` path) and the service over HTTP. A hand-built
`new BackupManager({ engine: 'postgres' })` would have passed while both real callers stayed
broken — the shape of hole that let BRG-D8 through BRG-003.

### 4.1 The repair taken away

| run | reading |
|---|---|
| gate, repair in place | **7 passed** |
| gate, guard disabled in place | **4 failed / 3 passed — and the 3 passing are exactly the 3 controls** |

And the failure messages are the defect itself, not a generic red:

- the CLI arm: **`expected a refusal, and the call succeeded`** — the stale-file backup, reproduced;
- the restore arm: the same;
- the service arm: **`Expected: 409, Received: 500`**.

Both adapter files were restored by `cp` afterwards and `diff -u -a`-verified byte-identical.

## 5. What is NOT in scope

- **Teaching the service `pg_dump`.** Ruled out: it means shelling to a binary that may not exist,
  at a version this process does not control, writing an artefact it cannot verify. The managed
  Postgres a migrated user is most likely on is already doing it.
- **`schema-migrate`**, the *other* consumer named in that same `createAdapter` docblock. It reads
  `tablesFromDbFile(dbPath)` and has the same shape of hazard. 🔴 **Not measured by this task** —
  named here so it is not mistaken for covered. See §6.
- **Backing up the data directory or `executions.sqlite`.** Documented as the operator's, which
  they already were; no command claims to do it.

## 6. Owed — and it is located, not suspected

**`schema-migrate` on a Postgres-backed data dir.** The other consumer named in that same
`createAdapter` docblock, and the hazard is **measured to be reachable**, not guessed at:

```
schema-migrate.ts:165   tables: tablesFromDbFile(path.join(dataDir, 'data', 'local.db'))
```

`snapshotFromDataDir()` reads that path **unconditionally**, with no engine check anywhere above
it, and it is what the CLI's `schema` commands snapshot (`snapshotFromPath`). So on a migrated data
dir `nodegx-backend schema diff` / `apply` reads the **pre-migration** schema out of the stale file
and compares against it — the same shape as the backup defect, one command over.

⚠️ The backup manager's own `getSchema` also calls `tablesFromDbFile`, but that one is covered:
BRG-008's guard refuses before `doCreate` ever reaches it.

**Not fixed here, deliberately** — it is a different command family with its own accounting, and
this task was ruled as the backup question. One session, with a gate shaped exactly like §4's:
a control that the same dir snapshots correctly, then one env var changed.
