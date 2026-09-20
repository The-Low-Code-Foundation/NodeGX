# The synchronous schema interface (BRG-D7)

**Filed out of phase 97 on 2026-09-20, by Richard's ruling: leave it as a declared divergence and
carry it as its own task rather than reopening the bridge phase for it.**

Status: **open, not blocking anything today.** Nothing in the product is broken by it. It is a
bound on what the PostgreSQL adapter can honestly claim, and the bound is currently true.

---

## What it is

`IStorageSchema` is **synchronous**. A socket is not.

BRG-002 de-synchronised the storage *facade* and deliberately left the schema surface alone,
because at the time every caller of it was synchronous and changing them was not that task's job.
That was the right call then and it is the thing now outstanding.

On PostgreSQL, `PgSchemaManager` therefore:

- serves every **read** (`getTableSchema`, `listTables`, `ColumnScope`, relations) from a
  **per-process model**, primed at `connect()` and kept current by this process's own mutations;
- **queues DDL**, and makes every data-plane call `barrier()` on that queue before it runs;
- surfaces a failed DDL statement at the **next data call** rather than from the call that issued
  it, undoing the model first.

## Why that is honest today, and exactly when it stops being

It is truthful **under phase 97 R2** — *"one app process, a real database behind it"*. One process
is the only writer, so a model of the schema that only this process mutates is an accurate model.

🔴 **It stops being true the moment there is a second writer**, and there are three real ones:

1. a `migrate` run against the same database while the service is up;
2. an operator in `psql`;
3. a second app replica — which does not exist today *by design* (the process ceiling this phase
   explicitly did **not** raise), and which is the reason this is filed rather than fixed.

In all three the running process does not see the change until restart.

**So this is gated behind horizontal scaling**: whoever makes the app tier replicable inherits this,
and cannot ship without it. See [HORIZONTAL-SCALING-STUDY.md](./HORIZONTAL-SCALING-STUDY.md).

## Where it is declared

Three entries in `POSTGRES_DIVERGENCES`
(`packages/noodl-runtime/src/api/adapters/postgres/divergences.ts`), each with the spec that
measured it:

| id | state |
|---|---|
| `schema/served-from-a-per-process-model` | `degraded` |
| `relations/served-from-a-per-process-model` | `degraded` |
| `schema/reconcile-cannot-precount-duplicates` | `degraded` |

A fourth, `adapter/synchronous-transaction`, is the same root cause reaching the data plane and is
declared `unsupported` — it throws rather than quietly running outside a transaction.

Removing the first entry is the definition of done for this filing.

## The work

**BRG-002's method, applied to six callers.** Not a redesign — the pattern already exists in this
repo and was already applied once.

| caller | file |
|---|---|
| BYOB admin reads | `packages/nodegx-backend/src/server/byob-admin.ts` |
| Role store | `RoleStore` |
| Identities | `identities` |
| `rolesForUser` | `packages/nodegx-backend/src/security/state.ts` |
| Search indexer | `SearchIndexer` |
| Backup | `packages/nodegx-backend/src/backup/` |

🔴 **`rolesForUser` is on the authorization path**, which is why the relations half is served from
memory too. De-synchronising it is the part to think hard about: an `await` on the authorization
path is a different performance and failure shape, not just a syntax change.

## How you will know it is done

- The three `degraded` entries above are removed from `divergences.ts`, not reworded.
- A case that a **second writer** (a `psql` session, or a second connected adapter) changes the
  schema and the running process **sees it** — which is the claim that cannot be made today, and
  the only one that actually proves the model is gone.
