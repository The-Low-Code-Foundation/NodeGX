# BRG-004 — The migrator

**Status: 🏗 In progress (s5, 2026-09-19) — the EXPORT half and the CARRY REPORT are built; the four
phases that move data are not.**
BRG-D1, BRG-D2 and BRG-D3 are closed and measured against a real PostgreSQL 16.11; AC2 and AC4 are
green, AC1 green (§6), AC3/AC7/AC8 half, and AC5/AC6/AC9 untouched. **See §5 and §6.** BRG-005 is no
longer purely parallel: every remaining criterion needs its driver.

## 1. The person sentence

**Someone with a live app and real users runs one command, watches it check its own work, and their
data is in Postgres — and if anything at all could not be carried across, the command says so by
name and refuses rather than half-doing it.**

## 2. What is there (read 2026-09-18, HEAD `df60eb6f5`)

| reading | where |
|---|---|
| 🔴 `generatePostgresSQL()` exists, is routed at `format=postgres`, has **zero tests**, and emits only `createdAt`/`updatedAt` indexes — every FED-002 declared index, including `unique: true`, is dropped | `SchemaManager.ts:582, 614-617`; `byob-admin.ts:466` — **BRG-D2** |
| 🔴 `POSTGRES_TYPE_MAP.Relation = null`, and `if (pgType)` skips it — relation columns vanish silently | `SchemaManager.ts:191, 601-607` — **BRG-D3** |
| 🔴 `generateSupabaseSQL()` emits 4 policies per table, all `TO authenticated`, all `USING (true)` / `WITH CHECK (true)`, on a backend whose default is `creatorOwns` with the ACL compiled into SQL | `SchemaManager.ts:658-679` vs `security/model.ts:164, 294`; `QueryBuilder.ts:241` — **BRG-D1** |
| Consistent snapshots already work and are already careful: online backup API preferred, `VACUUM INTO` fallback, taken from a fresh read connection so WAL cannot tear a record, mechanism recorded in the manifest | `backup/snapshot.ts:1-35` |
| A schema **diff and apply** already exists for dev→prod promotion: additive applies, destructive refuses unless opted in and then only after a forced fresh backup | `backup/schema-migrate.ts:1-20` |
| Backup archives already carry config, secrets, triggers and templates alongside data | `backup/BackupManager.ts:357-371`; `backup/archive.ts` |

**Read that list twice: most of a migrator already exists, and the part that was written is the part
that is wrong.**

## 3. Design

### 3.1 The command

```
nodegx-backend migrate --to postgres://…  [--dry-run] [--verify-only] [--cutover]
```

Five phases, each resumable, each reporting:

1. **Survey** — read the source schema, collections, indexes, relations, ACL usage and declared
   capabilities. Produce a **carry report**: for every construct, does it cross, does it cross
   degraded, or does it not cross. Nothing is attempted until this is clean or explicitly overridden.
2. **Schema** — create tables, columns, **declared indexes including unique** (BRG-D2), relation
   junctions (BRG-D3), and the ACL representation (§3.2).
3. **Data** — copy in batches from a consistent snapshot taken by the existing `snapshot.ts`
   machinery, not from the live file. Resumable by collection and by row range.
4. **Verify** — row counts per collection, plus a sampled deep-equal of records read back through
   the **facade on each side**, so the comparison is of what the app sees rather than of two SQL
   dialects. A verify failure is a hard stop; the source is untouched throughout.
5. **Cutover** — flip `NODEGX_STORAGE_URL`, restart, `/health` reports the new engine. The source
   database is left intact and the command prints how to go back.

### 3.2 ACLs — the part that must not be approximated

🔴 **Rule 4 of the phase applies hardest here.** `USING (true)` (BRG-D1) is the anti-pattern this
task exists to delete.

The built-in backend enforces row ACLs in the SQL it builds (`QueryBuilder.buildAclPredicate`,
`json_extract(_acl_entry.value, '$.read') = 1`). The NodeGX Postgres adapter (BRG-005) enforces them
the same way, in the query it builds, *because the app server is the same app server*. So for the
BRG-005 path, ACLs need **no** Postgres-side policy at all — they carry because the enforcement code
carries. This is a genuine advantage of keeping the NodeGX backend in front of Postgres, and it
should be said out loud in the docs.

The `--to supabase`-style path, where a third party's PostgREST becomes the enforcement point, is
the one that needs real RLS. **R3 as ruled: fixed in place, not removed** — this paragraph was
written before the ruling and said "removed", which is what §5.3 did NOT do. It is generated from
the actual CLP and ACL configuration and tested adversarially, and refuses by name where it cannot
be. A permissive policy emitted with a `-- customize based on ACL` comment is not a feature.

### 3.3 Reversibility

The source SQLite file is never written to. Cutover is a config flip. "Go back" is flipping it back,
and the command says so on success. A migration a user is afraid of is a migration they do not run —
and one they cannot reverse is one they are right to be afraid of.

### 3.4 Where a person sees it

The `/_admin` dashboard shows the carry report and progress; the execution record names what was
created and what was refused. The MCP admin tools get the carry report too — an agent asked "can
this app move?" should be able to answer without a shell.

## 4. Acceptance criteria

1. **AC1** — `migrate --dry-run` on a project with collections, relations, unique indexes, ACL'd
   rows, FTS5 search and files produces a carry report naming every construct and its verdict.
   Nothing is written.
2. **AC2** — BRG-D2 closed: every FED-002 declared index, `unique` included, exists in Postgres
   after migration, verified by querying `pg_indexes`.
3. **AC3** — BRG-D3 closed: relations survive, and a relation traversal returns the same ids through
   the facade on both sides.
4. **AC4** — BRG-D1 closed per R3: either the Supabase RLS path no longer exists, or it generates
   policies from the real CLP/ACL config and an adversarial test proves a non-owner is denied read,
   update and delete on another user's row.
5. **AC5** — Verify catches real damage: a mutated target (a dropped row, a truncated string, a
   dropped ACL entry, a mangled date) is **detected and named**, one case each.
6. **AC6** — A migration interrupted mid-data-copy resumes and finishes correctly; the result is
   byte-identical to an uninterrupted run under verify.
7. **AC7** — The source SQLite file is unchanged after a full migration: sha256 before and after.
8. **AC8** — A construct that cannot cross (per BRG-003 §3.4) causes a **refusal with its name**,
   never a silent approximation. At least one such case is exercised.
9. **AC9** — 5 GB / 2-million-row migration completes; the wall-clock time is recorded here. Not
   asserted — recorded, so the docs can tell the truth about how long this takes.

---

## 5. As built, s5 — 2026-09-19: **the export half**

**Status after this session: 🏗 in progress.** The three defects the phase was scoped on are closed
and measured against a real PostgreSQL. **The `migrate` command itself does not exist yet** — AC1,
AC5, AC6, AC7 and AC9 are untouched, and AC3 and AC8 are half.

| AC | state | where it was measured |
|---|---|---|
| **AC1 — carry report / `--dry-run`** | 🟢 | §6 — `migrate --dry-run`, 14 cases, source file hashed before and after |
| **AC2 — BRG-D2, declared indexes incl. `unique`** | 🟢 | `pg_indexes` on PostgreSQL 16.11, §5.4 |
| AC3 — BRG-D3, relations survive | 🟡 | junction table + traversal measured in PostgreSQL; **"through the facade on both sides" needs BRG-005** |
| **AC4 — BRG-D1, the RLS path** | 🟢 | a non-owner denied SELECT/UPDATE/DELETE on a real server, with the owner as the control |
| AC5 — verify catches damage | ⬜ | needs the data plane, which needs BRG-005's driver |
| AC6 — resumable | ⬜ | " |
| AC7 — source file unchanged | 🟡 | the survey is measured byte-identical; a full migration cannot be |
| **AC8 — a refusal names the construct** | 🟡 | five refusals on the export path, one of them over HTTP; the migrator's own are owed |
| AC9 — 5 GB / 2 M rows | ⬜ | " |

### 5.1 What landed

| file | what |
|---|---|
| `noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` | both generators rewritten; `MigrationRefusal` (`code: 'CANNOT_CROSS'`); `_relationJunctions`, `_columnToPostgres`, `_aclPredicate`, `_ruleFor`, `_emitPolicy`, `_assertNoRoleKeyedAcls`; `GeoPoint` remapped |
| `nodegx-backend-contract/src/storage.ts` | `StoragePostgresExportOptions`, `StorageSupabaseExportOptions`; both members re-declared; the "marker BRG-004 deletes" deleted |
| `nodegx-backend-contract/conformance/coverage.ts` | both entries `uncovered` → `not-in-the-promise`, naming where they are now held. The AC7 ratchet drops 22 → 20 |
| `nodegx-backend/src/server/{HttpServer,byob-admin}.ts` | the route hands over the **live** CLP config and the caller's `userIdClaim`; a refusal answers **409** with `construct` and `table` |
| `noodl-runtime/test/adapters/SchemaManager.export.test.js` | **20 cases** — what the SQL says |
| `noodl-runtime/test/adapters/SchemaManager.export.postgres.test.js` | **10 cases** — what PostgreSQL does with it |
| `nodegx-backend/tests/brg-004-export-route.test.ts` | **6 cases** — the wiring neither of those can see |

### 5.2 BRG-D2 and BRG-D3 — closed

Declared indexes are emitted under **the same derived name** `indexName()` gives them, `UNIQUE` when
declared, `DESC` when declared. Relation columns emit **the junction table the adapter actually
reads** — `_Join_<field>_<Class>`, reproduced down to the same sanitisation, because that name is
this adapter's private convention and a junction it cannot find by name is a relation that does not
traverse. No foreign keys, for the same reason SQLite has none there: the adapter deletes a record
without touching its junction rows, and an FK would turn a copy of that state into a failed insert.

Three things found while repairing them, none of them in the scope list:

1. 🔴 **`GeoPoint` mapped to `POINT`** with the comment *"or use PostGIS"*. The built-in stores a
   GeoPoint as a **JSON string** and `SQL_DISTANCE_KM` reads it back as one — so `POINT` was a column
   the app could not have read. Now `JSONB`, and measured: the adapter's own value round-trips.
2. ⚠️ **Declared `defaultValue` was dropped entirely.** A column declared with a default arrived
   without one. Now emitted, with the literal quoted.
3. ⚠️ **The `updatedAt` trigger is no longer emitted on the NodeGX path.** The app stamps that
   column itself; a `BEFORE UPDATE` trigger doing it again overwrites the value the caller just
   wrote — a divergence between what is written and what is read back, which is this phase's whole
   subject. It **is** emitted on the Supabase path, where a third party writes rows directly.

### 5.3 BRG-D1 — closed, and the reason it could not just be "fixed"

`USING (true)` is gone. In its place the policies are generated from the live CLP and the row ACL,
and the predicate is `buildAclPredicate`'s, in PostgreSQL: a row with no ACL is public, a row with
one qualifies when an entry keyed `'*'` or by this caller grants the access asked for.

🔴 **But the honest fix needed a fact the generator cannot invent, and this is the finding of the
session.** A row's ACL is keyed by **NodeGX `_User` objectIds**. PostgREST authenticates a **Supabase
auth user**, whose `auth.uid()` is a different identifier in a different namespace. A policy
comparing them denies everyone — or, if the two happen to collide, lets the wrong person through.
There is no correct default, so `userIdClaim` is **required and refused when absent**: the export
names the JWT claim that must carry the NodeGX user id, and generates
`current_setting('request.jwt.claims', true)::jsonb ->> '<claim>'` rather than `auth.uid()`. That
also means the adversarial test runs against **vanilla PostgreSQL**, measuring the emitted SQL and
not a shim of Supabase.

**Five refusals, each a thing the old export would have emitted something plausible for:**

| construct | why it cannot cross |
|---|---|
| `the CLP configuration` | absent: which ops are allowed, and to whom, is in `security.json` and guessing it is how `USING (true)` happened |
| `the identity mapping` | absent: see above |
| `role-based collection permissions` | roles live in `_Role`; PostgREST has no membership to check |
| `find and get differing` | PostgREST answers both with a SELECT, so one policy would be more permissive or more restrictive than the backend is |
| `role-keyed row ACLs` | 🔴 read from the **data**, not the config: an administrator granting a team access writes `role:editors` into the row. Counted, with a sample |

Also emitted now: the **`GRANT`** beside each policy. A policy narrows a privilege; it does not grant
one. An operation ruled `nobody` therefore leaves neither — the same answer the backend gives, twice
— and the anonymous case is refused one layer *below* the policy (`permission denied for table`),
which is the stronger of the two answers.

### 5.4 The measurement — PostgreSQL 16.11 (Homebrew), database `nodegx_brg004`

The `.postgres.` spec talks to the server through `psql`, not a driver: this package has no
PostgreSQL dependency and **BRG-005 is the task that decides which one it gets** — a test forcing
that choice would be making it.

`pg_indexes` after applying the generated DDL — **AC2, read off the other side**:

```
 Item            | idx_Item_guid               | CREATE UNIQUE INDEX "idx_Item_guid" ON public."Item" USING btree (guid)
 Item            | idx_Item_published          | CREATE INDEX "idx_Item_published" ON public."Item" USING btree (published DESC)
 Item            | idx_Item_createdAt          | CREATE INDEX "idx_Item_createdAt" ON public."Item" USING btree ("createdAt")
 _Join_tags_Item | _Join_tags_Item_pkey        | CREATE UNIQUE INDEX … btree ("owningId", "relatedId")
 _Join_tags_Item | idx__Join_tags_Item_owning  | CREATE INDEX … btree ("owningId")
 _Join_tags_Item | idx__Join_tags_Item_related | CREATE INDEX … btree ("relatedId")
```

and the unique index then **refuses a duplicate**, which is what it was for.

**AC4, adversarially:** three rows — owned by `u1`, owned by `u2`, un-ACL'd. As `u2`:
`SELECT` returns `r1,r3` and not `r2`; `UPDATE … WHERE objectId='r2' RETURNING` returns nothing and
the row is unchanged; `DELETE` likewise. The control is in the same run: **the owner CAN** update
their own row, so the denial is the ACL and not a broken policy. With `find: public`, an anonymous
caller sees the un-ACL'd row **and no other**.

🔴 **It is skipped when no PostgreSQL is reachable, and that is a hole in CI**, recorded here rather
than hidden: point it somewhere with `NODEGX_PG_TEST_URL=postgres://…`. BRG-006's drive is where
that becomes a standing gate.

### 5.5 A suite that cannot fail proves nothing — four mutants, each caught by name

| mutant | what reddened |
|---|---|
| `_aclPredicate` returns `(true)` — **the original BRG-D1** | 7: the two SQL-shape cases and **all five** real-PostgreSQL ACL cases |
| `UNIQUE` dropped from declared indexes — **the original BRG-D2** | 3, including `pg_indexes` and the duplicate refusal |
| relation junctions not emitted — **the original BRG-D3** | 3, including the traversal |
| `_assertNoRoleKeyedAcls` made a no-op | 1, the refusal with the count |
| the route stops passing the live config | 4 of the 6 route cases |

### 5.6 What the next session inherits

The migrator command itself: `nodegx-backend migrate --to postgres://…`, its five phases, and the
**carry report** (AC1) — which now has a vocabulary to be written in, because `MigrationRefusal`
already carries `construct`, `table` and `detail` and the survey is the same five questions asked
without emitting anything. AC5/AC6/AC7/AC9 need the data plane, and the data plane needs a driver —
so **BRG-005's dependency choice is now on BRG-004's critical path**, which the task file did not
say when it called them parallel.

⚠️ One consequence to carry: `BackendManager.js:968`'s dead IPC channel passes `format` only, so a
`format=supabase` call through it now answers **409** instead of permissive SQL. Nothing in the
editor consumes it (README §4.1), and 409 is the correct answer to that request.

---

## 6. As built, s5 (second slice) — **AC1, the carry report**

`nodegx-backend migrate --data-dir <dir> --to postgres://… --dry-run [--json]`.
Phase 1 of §3.1 and nothing else: it reads, prints, and touches nothing. 14 cases in
`nodegx-backend/tests/brg-004-carry-report.test.ts`.

🔴 **Without `--dry-run` the command refuses** — exit 2, naming BRG-005 — rather than starting four
phases it cannot finish. A `migrate` that copied and stopped halfway is the failure mode this whole
phase was created by.

### 6.1 The finding: both schema readers are blind to every account

`exportSchemas()` and `listTables()` **both** filter `name NOT LIKE '\_%'`, and they are right to —
nobody browsing their collections wants `_Session` in the list. But those are the two readers a
migrator reaches for first, and a migration built on either **carries an app across with no user
accounts in it and reports success**. The survey therefore reads `sqlite_master` and names all
thirteen internal tables, each with what it holds:

| | |
|---|---|
| `_User` `_Session` `_Role` `_ApiKey` | accounts, live sessions, roles, hashed keys |
| `_UserIdentity` `_EmailToken` | OAuth identities; reset/verification tokens |
| `_Files` | file **records** — 🔴 the bytes live on disk beside the database, not in it |
| `_Audit` `_HttpCache` `_Schema` | the audit log; a cache that rebuilds itself (skippable); the adapter's own schema table |
| `_Join_*` | one per relation, including `_Join_users__Role` — roles are a relation |

Each meaning is read off the constant that names the table (`AUDIT_COLLECTION`,
`FILES_COLLECTION`, `IDENTITY_COLLECTION`, `HTTP_CACHE_COLLECTION`), not from memory.

### 6.2 What else it does that a smaller version would not

- **The password is redacted** in every rendering, including `--json`. A carry report is printed to
  a terminal, written to an execution record and pasted into an issue; a password that reached any
  of those has been disclosed, and "we only printed it once" is not a mitigation.
- **It says where the permissions came from** — `security.json`, or the built-in defaults — because
  `SecurityState`'s constructor **writes** a config when there is none, and a survey must not. Read
  directly, validated, never written.
- **Verdicts use BRG-003 §3.4's three words**: `carries`, `degraded`, `cannot-cross`. FTS5 search is
  `degraded` (matching carries, ranking differs, owed by BRG-005); `GeoPoint` is `degraded` (the
  value carries as JSONB, the distance function is owed); a `Relation` with no `targetClass` is
  `cannot-cross`, and the report is then not clean.
- **AC7's shape, early**: the survey opens the file `readOnly` and the spec hashes the database
  before and after. The cheapest way to hold a promise about not writing is to be unable to.

### 6.3 🔴 The measurement that would have broken the Supabase policies in every real database

The wire refuses an ACL flag that is not a boolean (*"ACL flag \*.read must be a boolean"*), so what
is on disk is `{"*":{"read":true}}`. SQLite's `json_extract` returns **1** for that JSON `true` —
which is why `QueryBuilder`'s predicate compares to `1`, and why a policy translated from that
predicate alone would compare `->> 'read'` to `'1'`, match **nothing**, and lock every user out of
every ACL'd row while looking exactly right.

The generated policy accepts `('1', 'true')`. That was written defensively before this was measured;
the measurement is what makes it load-bearing, and **a fifth mutant** now holds it: dropping
`'true'` reddens exactly the rows whose flags are booleans, which is all of them in a real database.
The `.postgres.` spec carries both forms, one row each.

### 6.4 Still owed by BRG-004

AC5 (verify catches damage), AC6 (resumable), AC7 (the full-migration hash) and AC9 (5 GB) — all
four need the data plane, and the data plane needs a driver. **BRG-005 first.** AC3's second half
(the same traversal through the facade on both sides) is the same dependency.
