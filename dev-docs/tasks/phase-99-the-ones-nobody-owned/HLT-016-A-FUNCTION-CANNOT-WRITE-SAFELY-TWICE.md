# HLT-016 — A function cannot write safely twice

🔴 **Opened 2026-09-21 from the Digital Bricks Training stream (its sprint 49), at Richard's
request.** Offered the choice between designing the template around the gap and building a core
primitive first, he chose the primitive: *"Core primitive first."* **Specced, not built** — the
template's first writes (its sprint 50) wait on it. Measured by reading the source.

## ✅ (a) BUILT 2026-09-22 (P99 s16) — AC1–AC5 ✅ on SQLite AND PostgreSQL. AC6 is the DBT stream's. [Verdict](./verdicts/HLT-016/2026-09-22/VERDICT.md)

`X-NodeGX-If: {"version":3}` on `PUT /classes/:c/:id`, in the same UPDATE as the ACL; **409**
`reason: "precondition-failed"` when the row changed since it was read; `Noodl.Records.save(…,
{ ifMatch })`; Update Record's **Only If Unchanged**. The race was reproduced first (both callers
told 200, one fact lost), then guarded (one 409; the loser re-reads, retries, nothing lost).
⚠️ §2 missed that a zero-row UPDATE **without an ACL** answered 200. 📋 Not built: the index half
(`unique.where`, `check`), which is **ruled in and next**, needs its own ACs first, and its traps are listed in the verdict. Also not built: (b).

## ✅ Index half, `where`, BUILT 2026-09-22 (P99 s17): W1–W8 ✅ on SQLite AND PostgreSQL. [Verdict](./verdicts/HLT-016/2026-09-22-where/VERDICT.md)

A unique index can hold only where a predicate does (`"where": { "pinned": true }`). Driven over
HTTP with a restart on both engines; conformance 61/61 on PostgreSQL, new mutant caught by name.
🔴 Found beside it, pre-existing: **on PostgreSQL a refused index push answered 200**, because the
queued refusal was consumed by the push's own audit write. Fixed.

## ✅ Index half, `checks`, BUILT 2026-09-22 (P99 s17): C1–C6 ✅ on SQLite AND PostgreSQL. [Verdict](./verdicts/HLT-016/2026-09-22-checks/VERDICT.md)

`"checks": [{ "exactlyOne": [...] }, { "allOrNone": [...] }, { "field", "min", "max" }]`: SQLite
enforces them with triggers, PostgreSQL with CHECK constraints, and both answer a broken rule 400
/ code 142 with the rule in words. HEAD silently dropped the `checks` key and wrote every
rule-breaking row. 🔴 Found: `classPut` answered **404** for a refusal it did not recognise; a
broken rule on an edit is now 400. **The index half is done.** ✅ **(b) is RULED OUT for now**
(Richard, 2026-09-22, P99 s21 — see §3). Left on HLT-016: **AC6 only**, and it is the DBT stream's.

## 1. The person sentence

> **Someone building on the NodeGX backend can write "change this row only if nobody else has
> changed it since I read it" — or "do these three writes together or not at all" — from a cloud
> function, and a race that would have lost somebody's data fails loudly instead.**

## 2. What it is, measured 2026-09-21 (`cline-dev` HEAD `25ec21f11`)

- **No transaction is reachable from authoring.** `transaction(fn)` exists on the storage surface
  (`nodegx-backend-contract/src/storage.ts` ~594–605) and is used by import and upsert-batch only.
  Nothing in `Noodl.Records`, `parse-wire` or any cloud node exposes it.
- **No conditional update.** `PUT /classes/:collection/:id` (`nodegx-backend/src/server/parse-wire.ts`
  `classPut`) takes a body of fields and `__op`s and an ACL predicate — **no `where`, no `If-Match`,
  no expected value**. `Noodl.Records.save` (`noodl-runtime/src/api/records.js` ~157) mirrors it.
- **The atomic operations that do exist:** upsert-on-unique (FED-002 — race-safe, 20 concurrent
  upserts make one row) and an **unconditional** `Increment`.
- **Why that is not enough, concretely.** The Digital Bricks Training product lost a learner's data
  to exactly this shape (its L62): a project context holds a `facts` map and a `version`; two
  captures both read version *n*, both wrote *n+1*, and the second write replaced the first's whole
  map. Both callers were told it succeeded. The product's fix was a row lock (`SELECT … FOR UPDATE`)
  plus a unique index on `(context, version)` **with no swallow** — its L98 proved neither is
  sufficient alone. **On NodeGX today neither half is expressible from a function.** A second case in
  the same product: claiming an invite reads it, checks it is unclaimed, and materialises a programme
  — two concurrent sign-ups on one link must produce one claim (its L84).
- The contract's own docs record the gap as out of scope for phases 96 and 97; the port evaluation
  in the DBT repo (`NODEGX-FULL-STACK-PORT-EVALUATION.md` §3.1) called it *"the most serious
  unscoped gap"*.

## 3. The shape — two candidates, and a recommendation to be ruled on before building

> ✅ **RULED 2026-09-22 (P99 s16), Richard: build (a) first — "'Only if unchanged' updates".**
> He was offered (a) alone, (b) alone, or both with (a) first, and chose (a) alone. That covers the
> compare-and-swap on `PUT` **and** the `unique.where`/`check` index declarations below. (b) is not
> ruled out. It waits, as this section already says, on whether (a) plus upsert-on-unique can
> express the invite claim.
>
> ✅ **RULED OUT FOR NOW, 2026-09-22 (P99 s21), Richard: *"Ok rule out b for now"*.** Asked with the
> recommendation that (b) is genuinely hard — `node:sqlite` is synchronous inside a transaction
> while cloud JS is async, PostgreSQL needs a held pooled connection, and a function that `await`s
> an HTTP call inside the scope holds a lock across the network — and that **no measured case needs
> it**: the invite claim (L84) has not been written on (a) and found wanting, it has simply not been
> written. 🔴 **So this is a ruling on the priority, not a measurement of the gap.** The sentence
> that reopens it is a real case that (a) plus upsert-on-unique cannot express, measured — not
> argued. Whoever meets one files a row and quotes this line.
>
> ⚠️ **What this closes and what it does not.** HLT-016 closes on (a) + `where` + `checks`, which are
> built and driven on both engines. **AC6 stays open and is the DBT stream's** — it is the product
> proving the primitive on its own writes, and it is the only thing that can turn "no measured case
> needs (b)" from an absence into a measurement
> ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).

**(a) Compare-and-swap on update — recommended as the first half.** `PUT /classes/:c/:id` accepts an
expected-values clause (header `X-NodeGX-If: {"version": 3}` or a body key the wire can reserve —
FED-002's header precedent decides). The update's `WHERE` gains the clause **in SQL**, in the same
statement as the ACL predicate, on both adapters; zero rows affected answers **409** with a stable
code, never a silent no-op. `Noodl.Records.save(…, { ifMatch })` and the Update Record node's new
`Only If` input expose it. **Why first:** one statement, no held connection, identical on SQLite and
Postgres, and it is the primitive L62's shape actually needs (version check + write).

**(b) A transaction scope for a function — the second half, only if (a) cannot express a real
case.** A `Noodl.Records.transaction(async (tx) => …)` in cloud JS, all reads and writes inside on one
connection, committed on return and rolled back on throw. Harder: `node:sqlite` is synchronous inside
a transaction while cloud JS is async, Postgres needs a held pooled connection, and a function that
awaits an HTTP call inside it holds a lock across the network. **The invite claim (L84) is the test
of whether (b) is needed**: with (a) plus upsert-on-unique it can be written as *create the claim
row on a unique `inviteId`, then materialise*; if that is not sound, (b) is.

**Also in scope, because it is the same guarantee from the other side:** `unique.where` (a partial
unique index) and `check` in index declarations — rejected today by
`schemaCommon.ts` ~46–50. The product carries five of each and a function-level validation branch is
a filter, not a constraint.

## 4. Acceptance criteria (for (a); (b) and the index half get their own once ruled)

1. **The race, reproduced first**: two concurrent function calls each read a row at version *n* and
   write *n+1* with a merged field — one field lost, both calls report success. Recorded as the
   control, on SQLite **and** Postgres.
2. With `ifMatch: { version: n }` on both writes: exactly one succeeds, the other gets **409** with
   the stable code, **no field lost**, on both adapters.
3. The clause is in the SQL statement (read off the statement log), not a read-then-write in JS.
4. A phase-97 conformance case per adapter; demonstrated failing by name with the clause dropped.
5. `Noodl.Records.save` and the Update Record node expose it; the node's docs page says what 409
   means and that retrying means **re-reading first**.
6. The DBT template's sprint-50 capture write uses it, and the L62 race is driven there.

## 4b. The index half — shape and acceptance criteria (written P99 s17, 2026-09-22, before any code)

**Ruled in** with (a) on 2026-09-22. Measured first, on `cline-dev` `3c7264365`, against what the
DBT product actually declares (`digital-bricks-training/drizzle/*.sql`):

- **Its partial unique predicates are four shapes:** a boolean (`WHERE "pinned"`, `WHERE is_default`),
  a list (`WHERE "kind" IN ('initial','mid','final','impact')`), not-null (`WHERE "session_id" IS
  NOT NULL`), and null (the soft-removed `PathStep`, `removed_at IS NULL`).
- **Its CHECKs are three shapes:** exactly one of N set (`(a IS NOT NULL) <> (b IS NOT NULL)`,
  `num_nonnulls(a,b,c) = 1`: four of them), all-or-none (`(a IS NULL) = (b IS NULL)`), and a range
  (`"target" BETWEEN 1 AND 10`: two). One compound (a resource's label/url/storage key) fits none.

So the declaration is **a small structured vocabulary, never SQL text**: it has to mean the same on
two engines, and a schema push is not a place to accept SQL from a file.

```jsonc
"indexes": [
  { "fields": ["learnerId", "conceptId"], "unique": true, "where": { "pinned": true } },
  { "fields": ["programmeId", "kind"], "unique": true, "where": { "kind": { "in": ["initial", "mid", "final", "impact"] } } },
  { "fields": ["dimensionId", "sessionId"], "unique": true, "where": { "sessionId": { "exists": true } } }
],
"checks": [
  { "exactlyOne": ["learnerId", "cohortId"] },
  { "allOrNone": ["anchorKind", "anchorId"] },
  { "field": "target", "min": 1, "max": 10 }
]
```

Traps the survey measured, which the ACs below exist to close: PG `parseIndexDef` cannot parse
`… WHERE …` (a partial index vanishes from the model on restart); index names derive from fields
only (a partial and a full index on the same fields collide); `sameIndexSignature` and
`schema-migrate.normalizeForDiff` drop `where`; SQLite's `duplicateValues` pre-check needs the same
WHERE; SQLite cannot add a CHECK without a table rebuild; neither engine's CHECK error is decoded.
🔴 **And one the survey missed:** `parse-wire.assertUpsertable` accepts *any* built single-field
unique index as upsert cover. A partial one would pass, while rows outside its predicate may repeat
the value: the silent data-loser that check was written to refuse.

### `where` (a partial index)

- **W1. The shape, refused loudly.** `where` is an AND of one to four conditions on the
  collection's own properties: `true`/`false` (a Boolean property), a string (String), a number
  (Number), `{ "exists": true|false }` (any property), `{ "in": [...] }` (1–20 values of the
  property's type). Anything else (an unknown operator, a missing property, a type mismatch, an
  empty `in`, `where: {}`) is refused **by name, before any DDL**, on both engines.
- **W2. The guarantee, on a real socket, SQLite AND PostgreSQL.** The DBT `pinned` shape: a second
  pinned row for one (learner, concept) answers **409**; any number of unpinned rows for it are 201.
  **Control:** the same declaration *without* `where` refuses the second unpinned row, so the
  predicate is what differs. **HEAD control:** the declaration is refused (`unknown key "where"`).
- **W3. It survives a restart.** After a fresh manager reads the database (PG from `pg_indexes`,
  SQLite from `PRAGMA`), `indexStatus` reports it `built: true, declared: true`, and pushing the same
  declaration again reports it **kept**, not dropped and recreated.
- **W4. A partial and a full index on the same fields are two indexes**, with two names; removing
  one drops only that one.
- **W5. A push the data already violates is refused** with the count, and nothing changes. On
  SQLite the pre-check honours the predicate (rows outside it are not duplicates); on PostgreSQL the
  database refuses it at the queue, atomically.
- **W6. A partial unique index is not upsert cover.** `X-NodeGX-Upsert` on a field covered only by
  a partial index answers 400 and says why.
- **W7. It crosses.** The PostgreSQL/Supabase export emits the `WHERE`, and a schema diff
  (`schema-migrate`) sees a changed `where` as a change.
- **W8. Conformance:** a case per adapter, and a mutant that drops `where` in the reconcile,
  caught by name.

### `checks`

- **C1. The shape, refused loudly.** `{ "exactlyOne": [2–4 properties] }`, `{ "allOrNone": [2–4] }`,
  `{ "field", "min"?, "max"? }` on a Number property (at least one bound). A check's name is derived,
  like an index's. Anything else is refused by name before any DDL.
- **C2. The guarantee, on a real socket, both engines.** A create or update that breaks a check
  answers **400** with Parse code 142 and a sentence naming the rule and the fields; the row is not
  written / not changed. A write that satisfies it succeeds. A NULL in a range field passes, as SQL's
  CHECK does. **HEAD control:** the violating row is written.
- **C3. A push the data already violates is refused** with the count, and nothing changes.
- **C4. It survives a restart and a re-push is idempotent;** removing a check removes enforcement.
- **C5. It crosses:** the export emits it and `schema-migrate` diffs it.
- **C6. Conformance** per adapter, and a mutant that skips the check, caught by name.

**X1.** `docs/runtime/SCALING.md` §2 (the one place the declaration is documented) says both.

Order: `where` first, committed on its own, then `checks`.

## 5. Owner and neighbours

Built before the DBT template's first write. Ruling on §3 (a)/(b) is Richard's. Its own commits,
only its own paths staged.
