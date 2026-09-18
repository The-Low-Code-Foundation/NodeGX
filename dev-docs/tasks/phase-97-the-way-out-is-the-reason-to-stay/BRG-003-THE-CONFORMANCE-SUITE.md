# BRG-003 — The conformance suite

**Status: ⬜ Not started. Follows BRG-002. The centrepiece.**

## 1. The person sentence

**The promise "your app moves" is a test suite that runs, not a sentence someone wrote — and the day
a feature lands that would have broken it, CI says so instead of a user finding out in a year.**

## 2. What is there (read 2026-09-18, HEAD `df60eb6f5`)

| reading | where |
|---|---|
| 8 test files exercise the adapter stack, all written against `LocalSQLAdapter` **by name** — implementation tests, not a contract | `noodl-runtime/test/adapters/*.test.js` |
| 159 test files in the backend, most provisioning a real service over HTTP. Good raw material; none of it is adapter-parameterised | `nodegx-backend/tests/` |
| `QueryBuilder.test.js` asserts emitted **SQLite SQL text** — the single most adapter-specific suite there is, and the one that must NOT become conformance | `noodl-runtime/test/adapters/QueryBuilder.test.js` |
| 🔴 `generatePostgresSQL` / `generateSupabaseSQL` have **zero** tests and are reachable from a live admin route | grep: 0 hits; `server/byob-admin.ts:466-468` |
| `capabilities.ts` already carries `supported \| unsupported \| conditional \| degraded` with a `reason`, plus a `CapabilityProbe` shape for verifying a claim against a live backend | `nodegx-backend-contract/src/capabilities.ts:33-60, 164-211` |

## 3. Design

### 3.1 The shape

One suite, exported as a function, run once per adapter:

```
packages/nodegx-backend-contract/conformance/
  index.ts          runConformance(makeAdapter: () => Promise<IStorageAdapter>, decl: Declaration)
  cases/            records, queries, filters, acl, relations, transactions, changes, schema, operational
```

`nodegx-backend` runs it against SQLite. BRG-005 adds one file to run it against Postgres. Nothing
else changes.

### 3.2 What it covers, and why each

| area | why it is in the promise |
|---|---|
| CRUD + the `wire*` `{__type}` envelopes and `include=` expansion | this is what every data node on the canvas receives; a difference here is a visibly broken app |
| Every filter operator in `QueryBuilder` — `$in/$nin/$regex/$exists/$gt…` | the filter surface is what an author actually builds with |
| Row ACLs, `creatorOwns`, and the CLP gate | 🔴 **the highest-stakes area.** A row-level predicate that translates loosely is a data breach, not a bug. See rule 4 |
| Relations, and junction behaviour | BRG-D3: relations currently vanish from the Postgres export entirely |
| Declared indexes, unique constraints, and upsert-on-unique (FED-002) | BRG-D2: these silently do not cross today |
| Transactions, including rollback and the buffered change emission | `ChangeBus` depends on post-commit ordering; realtime and DB-change triggers both ride it |
| The change tap: ordering, commit-boundary, no events on rollback | realtime SSE and `triggers/dbchange` are both consumers |
| `IOperationalStore`: claim, CAS, release, sweep | idempotency correctness is what makes a retried cloud function safe |
| Aggregate and distinct | served under an ordinary `find` permission here, unlike upstream Parse — `backends.ts:16-23` |

### 3.3 What it deliberately does not cover

Emitted SQL text. Engine-specific plans. `QueryBuilder.test.js` stays exactly where it is, testing
SQLite, and is never parameterised — asserting SQL text across two dialects is how a conformance
suite becomes a second implementation.

### 3.4 Declared divergence, not silent divergence

Some things genuinely cannot be identical. FTS5 and `tsvector` rank differently; SQLite's `$regex`
and Postgres `~` differ at the edges; collation and `ORDER BY` on mixed types diverge.

Each such case declares itself through the **existing** `capabilities.ts` vocabulary with a
`reason`, and the suite asserts *the declaration*: a case marked `degraded` must still return
correct rows and may differ in order; a case marked `unsupported` must **fail loudly**, never return
a wrong answer quietly. An undeclared divergence is a suite failure. **Silence is the failure mode
this whole phase was created by** (README §2).

### 3.5 The gate — the part that earns its keep before any Postgres exists

A CI check that fails when a new capability appears on the facade or the schema surface without a
conformance case or an explicit `unsupported` declaration. This is what converts the invisible
permanent tax into a visible one, and it works from the day it lands with SQLite as the only
adapter. FED-002's index declaration would have tripped it (BRG-D2).

## 4. Acceptance criteria

1. **AC1** — `runConformance()` exists, runs against SQLite via `createAdapter`, and is green.
2. **AC2** — Every area in §3.2 has cases. The case count is recorded in this file.
3. **AC3** — A deliberately broken adapter (a mutant: drops the ACL predicate, ignores `unique`,
   emits changes before commit, loses rollback) **fails** the suite, one distinct failure per
   mutation, and each is recorded here by name. A suite that cannot fail proves nothing.
4. **AC4** — The ACL cases are adversarial, in the house style of `security-enforcement.test.ts`: a
   non-owner reading, updating and deleting another user's rows through query, fetch, aggregate,
   distinct, search, relation traversal and realtime — each denied.
5. **AC5** — The declaration mechanism works: a capability marked `unsupported` and then exercised
   produces a loud failure and never a wrong row; a capability marked `degraded` returns correct
   rows.
6. **AC6** — The §3.5 gate is in CI. Adding a facade method with no case and no declaration fails
   the build; the failure message names the method.
7. **AC7** — The gate is run against HEAD as it stands and **every existing uncovered capability is
   either given a case or declared**. The list of what needed declaring is recorded here — that list
   is the honest measure of how far the product had already drifted.
8. **AC8** — BRG-D4 closed: the two SQL generators either have tests or no longer exist (per R3).
