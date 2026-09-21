# HLT-016 — A function cannot write safely twice

🔴 **Opened 2026-09-21 from the Digital Bricks Training stream (its sprint 49), at Richard's
request.** Offered the choice between designing the template around the gap and building a core
primitive first, he chose the primitive: *"Core primitive first."* **Specced, not built** — the
template's first writes (its sprint 50) wait on it. Measured by reading the source.

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

## 5. Owner and neighbours

Built before the DBT template's first write. Ruling on §3 (a)/(b) is Richard's. Its own commits,
only its own paths staged.
