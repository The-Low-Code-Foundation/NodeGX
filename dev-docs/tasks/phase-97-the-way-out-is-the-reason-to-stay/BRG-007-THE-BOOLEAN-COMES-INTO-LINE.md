# BRG-007 — The Boolean comes into line

**Status: 🟢 Built and green, s11 (2026-09-20). AC1–AC5 closed.** R7's repair. `GET /api/:table`
now answers `true`/`false` for a declared `Boolean`, the same as `GET /classes/:c`, a graph's own
`Query Records` and every reader on PostgreSQL. **BRG-D8 and BRG-D10 are closed.**

The gate is `tests/brg-007-a-boolean-reads-the-same-through-every-prefix.test.ts` — **7/7**, SQLite
only, **one case per wire prefix**.

## 1. The person sentence

**A person who writes `if (note.pinned)` in their app does not have to know which REST prefix their
node happens to use, or which database is underneath.**

## 2. Where this task came from

It is not a task the phase scoped. It is **R7**, ruled by Richard at the end of s10 (README §4)
after BRG-006's drive read one column three ways on two engines and produced a table nobody had
seen before:

| read through | SQLite, as found | PostgreSQL, as found |
|---|---|---|
| `GET /api/Mark` | **`1`** | `true` |
| `GET /classes/Mark` | `true` | `true` |
| a cloud function's `Query Records` | `true` | `true` |

🔴 **Two REST surfaces over the same store disagreed about the same column in the same row, on one
engine, with no PostgreSQL anywhere near it** (BRG-D10). BRG-D8 — filed at s9 as a difference
between two *engines* — turned out to be one cell of that table.

That reframed the ruling. The case for keeping SQLite's `0`/`1` was *"every existing app reads
that"*, and it is **false as stated**: only `/api` on SQLite ever did. Keeping it would have meant
changing the three readers that were already right to match the one that was not. Richard ruled
`/api` comes into line.

## 3. What was actually wrong — and it was neither driver

Both adapters already *tried* to apply the declared type on the way out:

```ts
const colType = schema?.properties?.[key]?.type;
record[key] = QueryBuilder.deserializeValue(value, colType);
```

A collection schema arrives in **two shapes**, and that lookup only ever read one of them:

| shape | who produces it | boolean type visible? |
|---|---|---|
| `{ properties: { pinned: { type: 'Boolean' } } }` | the editor's `dbCollections` config | ✅ |
| `{ name, columns: [{ name: 'pinned', type: 'Boolean' }] }` | `SchemaManager` / `PgSchemaManager` `getTableSchema()` | ❌ — no `properties` member |

🔴 **`BackendService` passes no `collections` config at all**, so a service-opened backend only ever
has the second shape. `colType` was therefore `undefined` for **every column of every collection**,
`deserializeValue` was called with no type, and whatever the driver returned won: SQLite's INTEGER
`1`, PostgreSQL's real `true`.

That is also why `/classes` was right and `/api` was wrong with no code difference between them:
`AdapterFacade.toWire()` reads `schema.columns` **itself** (`columnTypes()`) and applies
`Boolean(value)` on the way to the Parse wire. `/api` is served from `raw*`, which has no such step.

## 4. The repair

**One helper, read by both adapters** — `schemaCommon.declaredProperties(schema)`, which understands
both shapes and memoises the derived map in a `WeakMap` keyed by the schema object.

- **A `WeakMap`, not a member on the schema object.** `getTableSchema()`'s object is served straight
  out over `GET /admin/schema` and `GET /api/_schema`, so attaching a derived `properties` member to
  it would change what those routes answer. Invalidation is free: `SchemaManager` replaces the
  cached object when a column is added, and a new object derives afresh.
- **Memoised because `_rowToRecord` runs once per ROW**, and a map built per row is a per-row
  allocation on the path a 2,000,000-row migration walks (BRG-004 AC9).
- **Both adapters, not just SQLite.** It changes nothing a caller can see on PostgreSQL — `pg`
  already returns a real boolean for a BOOLEAN column. It belongs there anyway: the day the two
  adapters apply the declared type from two different places is the day they disagree again, and
  the only defence is that there is one place to read
  ([[a-second-copy-of-a-palette-drifts-silently]]).

🔴 **What was deliberately NOT done: `rawQuery` was not made to convert.** BRG-006 §9 located that
trap. `raw*` is storage-shaped on purpose and has internal callers — `security/state`, `RoleStore`,
sessions, `McpRoutes.sessionForGraph` — so a conversion bolted onto the facade's read handlers is a
much larger blast radius than the defect. Fixing it at `_rowToRecord` means the **declared type** is
applied where it was being dropped, which is a different claim: a Pointer is still a bare id and a
Date is still an ISO string through `raw*`.

## 5. Acceptance criteria

1. **AC1** ✅ — `GET /api/:table` answers `true`/`false` for a declared `Boolean`, on list **and**
   on fetch-by-id.
2. **AC2** ✅ — Every other wire prefix still answers the same, and the two agree with each other on
   one engine — the sentence BRG-D10 was filed on.
3. **AC3** ✅ — **One case per wire prefix**, not one case. See §6.
4. **AC4** ✅ — The repair is type-driven, not a coercion: a `Number` column holding exactly `1` and
   `0` still reads `1` and `0` through every prefix, and a `String` is untouched.
5. **AC5** ✅ — Everything that recorded the old behaviour is updated rather than left to rot: the
   divergence register entry, BRG-006's three-way case **and its `normalise()` fold**, and
   BRG-004's cross-engine case.

## 6. 🔴 Why the gate is one case per prefix

BRG-003's 56-case conformance suite had **no boolean round-trip at all**, which is how BRG-D8
crossed it — [[a-gate-can-have-a-hole-shaped-like-the-defect]]. The obvious repair is to add one.

**One case would have been the same hole again.** It would have been written on whichever prefix its
author reached for; on `/classes` it would have passed *before* the repair and said nothing, and on
`/api` it would have passed after the repair while `/classes` went unwatched. BRG-D10 is precisely
the defect a single case cannot see. So the gate enumerates the surfaces as a table and reads each:

| read through | before | after |
|---|---|---|
| `GET /api/:table` (list + fetch) | **`1`** | `true` |
| `GET /classes/:c` (list + fetch) | `true` | `true` |
| `IStorageFacade.rawQuery` / `rawFetch` | **`1`** | `true` |
| `IStorageFacade.wireQuery` / `wireFetch` | `true` | `true` |

**Both arms, on every surface.** A rule that reads the same value in both arms grades nothing
([[a-rule-reading-zero-in-both-arms-grades-nothing]]), so each surface is read on a row whose flag
is `true` and on a row whose flag is `false` — a repair returning `true` unconditionally fails.

**The `_ApiKey.revoked` case creates the two keys it reads.** A loop over whatever `_ApiKey` happened
to contain is green over an empty table, and an empty table is what a fresh `dataDir` gives you: the
assertion would have been `all([])` ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).

**SQLite only, deliberately.** The defect is visible on one engine, so the gate must run where there
is no database — five spec files in this phase skip themselves without PostgreSQL. The cross-engine
arm stays in `brg-004-data-plane.test.ts`, which is the only file with both engines in one run.

## 7. Readings taken (s11, 2026-09-20)

| what | reading |
|---|---|
| `brg-007` gate | **7/7** |
| the same gate, with the repair reverted in place | **5 failed / 2 passed** — and the 2 that passed are exactly the two controls (the `Number` arm and the `wire*` half), which is the signature that says the gate grades the repair and not the run |
| `noodl-runtime` `test/adapters` | **292/292, 14 suites** — unchanged from s8 |
| all `brg` specs, `NODEGX_REQUIRE_PG=1` | **16 suites / 150 tests, all passed, 212 s** — nothing skipped, the drive and the cross-engine case included |
| `typecheck:runtime` / `typecheck:contract` / `typecheck:backend-tests` | exit **0**, **0**, **0** |

🔴 **The revert-and-re-measure is the reading that matters.** A gate written after a repair passes
because the repair is there, and says nothing about whether it would have caught the defect. Both
adapter files were `cp`'d aside first, the lookup put back, the gate run, then restored and
`diff -u`-verified byte-identical ([[git-checkout-is-not-a-mutant-undo]]).

## 8. What this touched outside the repair

- **`divergences.ts`** — `types/boolean-reads-as-0-1-on-sqlite` moves `degraded` → `supported`,
  **kept under its original id**: a register entry that vanishes takes its history with it.
- **`brg-006-the-drive.test.ts`** — the three-way case now asserts agreement, and 🔴 **`normalise()`
  has lost its `booleanReads` fold**. s10 armed that fold to expire with the repair and said so; this
  is it expiring. `marks.firstPinned` is compared again too. The `.not.toBe()` line that pinned the
  disagreement is **deleted rather than negated** — an assertion that two readers differ, left
  standing with its sense flipped, reads as a rule about the repair instead of a rule about the
  product.
- **`brg-004-data-plane.test.ts`** — the case that FOUND BRG-D8 now asserts both engines agree, with
  `note-001` (flag `false`) as the second arm.
- **`LocalSQLAdapter`'s `AdapterSchema` docblock** — it described the missing `properties` as
  *"the pre-existing behaviour, typed rather than hidden"*. It was the defect, and now says so.

## 9. What is NOT in scope

- **The wire shape of anything but the declared type.** `/api` stays storage-shaped: no Parse
  `__type` envelopes, pointers still bare ids. R7 is about a Boolean reading as a Boolean.
- **A migration.** Nothing on disk changes — SQLite still stores `0`/`1` in an INTEGER column, and
  that is what `migrate` carries. This is a read-path repair only.
- **`x === 1` in someone's existing app.** Named in R7's blast radius and accepted there: an app on
  `/api` over SQLite testing `=== 1` reads `false` after this. It is the same code that already
  broke the moment that app moved to PostgreSQL, which is the ruling's own reasoning.
