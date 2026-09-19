# Phase 97 — next session

**Session 7 built the dialect seam inside `QueryBuilder`, which was the one thing every remaining
BRG-005 criterion was waiting on. It is done, and nothing is now in front of the adapter class.**

**On the way it found two defects in a predicate the product had already shipped** — the row ACL,
which existed **twice** and had drifted, so one copy carried a wrong translation into PostgreSQL RLS
policies. Both are fixed in one place and graded where each ships.

**Where it is:** `cline-dev`, commit `afead5e9d` (s6 was `3f2d393db`).

## The board, re-derived from the task files

| task | state | what is left |
|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) the interface | ✅ | — |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) the holes | ✅ | AC7 (`test:main` ✅ now; `noodl-mcp` — see §3) |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) the suite + gate | ✅ all eight | — |
| [BRG-004](BRG-004-THE-MIGRATOR.md) the migrator | 🏗 export half + carry report | **AC5 AC6 AC9** — all need the data plane, so BRG-005 first |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) the adapter | 🏗 driver, pool, geo, **seam**; AC5 AC6 AC8 ✅ | **AC1 AC3 AC9** — the adapter class |
| [BRG-006](BRG-006-THE-DRIVE.md) the drive | ⬜ | — |

**Readings taken this session** (2026-09-19, at `afead5e9d`): adapter suite **287/287 exit 0** (was
251), `typecheck:runtime` **exit 0**, `test:main` **8223/8223, 514 suites, exit 0**, the phase's own
backend specs **67/67 exit 0**. `noodl-mcp` **8 suites / 10 tests red — measured NOT to be this
change's**, see §3.

## 1. First job — `PgSchemaManager`, then the adapter, then ONE test file

[BRG-005 §6.2](BRG-005-THE-POSTGRES-ADAPTER.md) has the order and the reasoning. In short:

1. **`PgSchemaManager`** — `information_schema.columns` for the live-column read (`ColumnScope`),
   keeping the `undefined`-means-no-substitution semantics `LocalSQLAdapter.ts:675-692` warns about.
   DDL **reuses BRG-004's repaired `generatePostgresSQL`** rather than growing a second generator.
2. **`PostgresAdapter`** over `PgConnectionPool`, implementing `IStorageDataPlane`'s twelve + eight.
3. **`createAdapter()`** branches on `NODEGX_STORAGE_URL=postgres://`; `/health` carries
   `saturation()`. 🔴 R5: the CLI refuses any other scheme **by name**.
4. **One test file** — `packages/nodegx-backend/tests/brg-005-conformance-postgres.test.ts`. BRG-003's
   SQLite spec says so in its own header: *"BRG-005 adds one file to run it against Postgres. Nothing
   else changes."* **AC1, AC3 and AC9 all land there.**
5. **`IOperationalStore` on Postgres**, its `close()`, and 🔴 **the shutdown path that calls it**
   (BRG-D6) — §3.5 is emphatic that the shutdown path is the part that does not exist.

**Also owed, and cheap while you are in the file:** AC2's **six** `capabilities.ts` declarations
(§5.2's three, §5.5.1, §5.5.2, and AC6's ranking). An undeclared divergence is an AC1 failure.

## 2. What this session settled — including where the inherited handoff was wrong

✅ **The seam is a `dialect` argument, not a fork.** `'sqlite' | 'postgres'`, defaulting to SQLite,
threaded to eleven functions. It has to be *inside* the builder because three expressions bind a
different number of values than their SQLite originals (`$nearSphere` 3 not 2, `$regex` 1 not 2,
search 3 not 1), and an expression whose marker count differs cannot be swapped in at the driver
boundary after the SQL is built.

🔴 **The inherited handoff said the seam's job was "the ACL coercion, which BRG-004 has already been
bitten by once". That was right about the place and wrong about the number — there were two defects,
and the one BRG-004 had already "fixed" was still wrong:**

1. **`(value ->> 'read') IN ('1','true')` denies a flag stored as the JSON real `1.0`**, which
   SQLite's `json_extract(…) = 1` grants. `->>` renders it `"1.0"`. The s5 fix was an *enumeration of
   spellings*, and it could only contain the ones its author imagined. Comparing as **jsonb** agrees
   on all eight, because `'1.0'::jsonb = '1'::jsonb`. **Silent denial — the user sees fewer of their
   own rows and nothing errors.**
2. **`jsonb_each` RAISES on a non-object ACL**, and an error inside a `WHERE` — or an RLS `USING` —
   fails the **statement**. So one row whose ACL was written as an array turns every read of that
   collection into a 500, where SQLite hides just that row. Guarded with `jsonb_typeof(…) = 'object'`.

**Both existed because the predicate existed twice** (`SchemaManager._aclPredicate`,
`QueryBuilder.buildAclPredicate`) and each copy agreed with itself. They now share
`postgres/predicates.ts`.

✅ **AC6 is closed** and was not a fourth translation site to do later. `'simple'` (FTS5 does not stem
either), `plainto_tsquery` (not `websearch_`, which reinstates the operators `toFts5MatchQuery` exists
to remove), and 🔴 **`_rank` NEGATED** — `bm25` is lower-is-better, `ts_rank_cd` is not, so unnegated
every caller reads the ranking backwards with nothing failing anywhere.

✅ **The method that found all of it:** run **both engines over ONE corpus** and assert the same
`objectId` set — plus a third value saying which rows *should* come back, because two engines wrong in
the same direction agree with each other. Do the same for the adapter class.

## 3. 🔴 `noodl-mcp` is red, and it is not this phase's red — do not inherit it as a blocker

8 suites / 10 tests fail (2181 of 2191 pass). **Measured, not assumed:** both runtime files were
restored to their `HEAD` contents by `cp`, the whole suite re-run, and the failing-suite list and the
counts came back **byte-identical**; then restored and verified by `diff`. The failing suites are
unrelated surfaces (node id allocation, a response budget, theme preset chips, template settling, CMP
exports, one live-backend spec).

A peer holds **twelve modified files plus six new specs in `packages/nodegx-backend/src`**. So:

- **BRG-005 AC7 cannot be *closed* by this task** — it is written as *"`noodl-mcp` is green"*, and
  that is not this phase's to make true. Its SQLite half is demonstrated.
- **The full `nodegx-backend` suite is deliberately unmeasured.** Running it now grades a peer's
  working tree, not this change. Run it once their work lands.

## 4. Richard's calls — none outstanding

All six rulings (R1–R6) are taken and recorded in [README §4](README.md). Nothing in BRG-005 is
waiting on a decision; the remaining work is build work.
