# BRG-004 — The migrator

**Status: ⬜ Not started. Buildable in parallel with BRG-005; both needed for BRG-006.**

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
the one that needs real RLS. **Per R3, that path is removed until it can be generated correctly from
the actual CLP and ACL configuration and tested adversarially.** A permissive policy emitted with a
`-- customize based on ACL` comment is not a feature.

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
