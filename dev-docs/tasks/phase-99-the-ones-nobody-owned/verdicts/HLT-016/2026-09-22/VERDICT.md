# HLT-016 (a) — verdict, 2026-09-22 (P99 s16)

**Ruled by Richard today: build (a), "only if unchanged" updates.** Built, and driven on a real
socket on SQLite **and** PostgreSQL. AC1–AC5 ✅. AC6 (the DBT template's sprint-50 write uses it)
is the DBT stream's.

## What a caller can now say

```
PUT /classes/Ctx/<id>
X-NodeGX-If: {"version":3}
{"facts": {…}, "version": 4}
```

The update applies only if the row still holds `version = 3`, checked **inside the same UPDATE
statement** as the ACL predicate. Answers:

| case | status | body |
|---|---|---|
| the row still holds the values | 200 | as before |
| the row exists, the caller may write it, it no longer holds them | **409** | `reason: "precondition-failed"`, `expected` |
| missing, or a row the caller cannot write | 404 / 101 | unchanged: **never** an existence oracle |
| the precondition names a field the collection lacks | 400 | `reason: "precondition-unknown-field"` (a 409 would read as a conflict forever) |
| not JSON, an object/list value, >8 fields | 400 | why |
| combined with `__op` (Increment, relations) | 400 | those are separate writes it would not cover |

Clients: `Noodl.Records.save(id, props, { ifMatch: { version: 3 } })` rejects with
`error.code === 'precondition-failed'` and puts the local record back. **Update Record** gains
`Only If Unchanged` (property names). Its precondition is what the record held *before* the node
applied its inputs, i.e. what was read, so there is nothing else to wire. The REST adapters
(Directus, PostgREST, PocketBase) **refuse** `ifMatch` loudly.

## Readings (all 2026-09-22, tree on `1339a3b23` + this change)

**AC1–AC3, `hlt016.drive.test.ts`** (real `BackendService`, real curl, both engines;
[drive-fixed.json](./drive-fixed.json)). Both reads are awaited before both writes, so the losing
interleaving happens every run:

| | SQLite | PostgreSQL |
|---|---|---|
| CONTROL, no header: statuses / facts kept | 200, 200 / **one lost** (`fromA`) | 200, 200 / **one lost** (`fromB`) |
| guarded: statuses | 409 + 200 | 200 + 409 |
| loser re-reads and retries | 200 | 200 |
| both facts present, version 2 | ✅ | ✅ |
| refusals (missing 404, unknown field 400, object 400, not JSON 400, +Increment 400, null-on-unknown 400), row untouched | ✅ all | ✅ all |
| plain PUT, no header | 200, unchanged | 200, unchanged |

AC3, from the statement log (`node:sqlite` `prepare` and `pg` `query` wrapped in-process):
`UPDATE "Ctx" SET … WHERE "objectId" = ? AND "Ctx"."version" = ?` and
`… WHERE "objectId" = $4 AND "Ctx"."version" = $5`. The check is in the write, not a read before it.

**AC4, conformance** (`records/a-save-with-a-precondition-applies-only-if-unchanged`,
`acl/a-failed-precondition-on-a-row-you-cannot-write-reads-as-not-found`): **60/60 on PostgreSQL**
(58 + 2; the run did not skip), SQLite green. The new mutation `drop-precondition-on-save`
(save ignores `expect`) is **caught by both cases, by name, on both adapters**. An in-source
mutant that drops the ACL from the existence probe reddens the ACL case with *"a failed
precondition revealed bob's private row to alice"*.

**AC5, `hlt016.functions.drive.test.ts`** (deployed cloud functions through the real cloud
runtime → `ParseWireAdapter`; writes run as the system, with **no ACL**, which is the path where a
zero-row UPDATE used to answer 200; [functions-fixed.json](./functions-fixed.json); run twice,
identical):

| function | control (nothing competing) | raced (a person writes version 5 during the wait) |
|---|---|---|
| `capture`: `Records.fetch` → wait → `Records.save(…, {ifMatch})` | saved | **refused, `code: precondition-failed`**; row keeps the person's write; local record back to version 0 |
| `bump`: Record → wait → Update Record, `Only If Unchanged: version` | Done | **Failure**, "Someone else changed this record…"; person's write kept |
| `bumpPlain`: the same graph, the input left empty | — | **Done, and the person's version 5 silently became 1** (the defect, reproduced) |

**Gates:** `typecheck:runtime`/`contract`/`backend-tests`/`cloud` exit 0. `noodl-runtime` jest
173 suites, 2,964 passed. Backend jest 166/168 suites: the 2 reds are `tpl008-theme-drive` and
`tpl008-todo-drive`, *"Use light theme" not drawn*, red at HEAD since s12. `noodl-mcp`
`toolDisclosure` 18/18. `catalog:check` fresh after regenerating (the diff is this port only).
eslint: no file gained an error over HEAD.

## What §2 got right and wrong

- ✅ Right that no conditional update existed, and that `PUT` had no `If-Match` or expected value.
- ⚠️ **It missed that a zero-row UPDATE with no ACL answers 200.** With an ACL a miss was
  `404 Object not found`, indistinguishable from forbidden. With none (admin, master key, every
  cloud function) it was `200` plus a change event. So the conflict needed its own detection on
  the no-ACL path, not a new status on an existing error. The general no-ACL 0-row hole
  (`LocalSQLAdapter.save`, `PostgresAdapter.save`, `delete`, `increment`) is **still open without a
  precondition** and stays unowned.
- ⚠️ A body mixing plain fields and `__op` is **two** UPDATE statements (plus relation writes), so
  a precondition cannot cover it. Refused, not half-honoured.
- ⚠️ Expected values are **scalars only**. An object would reach `node:sqlite` as a bound value (the
  HLT-018 named-parameter shift), and SQLite TEXT vs PostgreSQL JSONB disagree on object equality.
- Found beside it: **`X-NodeGX-Upsert` was never in the CORS allow-list** (FED-002), so a
  cross-origin upsert failed its preflight. Added with `X-NodeGX-If`.
- A fixture lesson worth keeping: a graph wired to the Record node's **`Fetched`** ran the update
  on an unread record (it fires on bind, P77 D25). The node **refused** rather than guessing a
  precondition. `Done` is the port that means "read".

## Not built

- **The index half** (`unique.where`, `check`). **RULED IN** with (a) (the option Richard chose said so), so it is the next build. It needs its own ACs written first, per §4. Traps measured by the survey:
  PG `parseIndexDef` cannot parse `… WHERE …` (a partial index vanishes from the model on
  restart); index names derive from fields only (partial and full collide); `sameIndexSignature`
  and `schema-migrate.normalizeForDiff` would drop `where`; SQLite needs a table rebuild for CHECK.
- **(b) transactions**: waits, as §3 says, on whether (a) plus upsert-on-unique expresses the
  invite claim.
- **A dedicated conflict output on Update Record.** Today a conflict fires `Failure` with a plain
  reason. A separate signal would cut across the family's single outcome funnel (ERG-001).
- **AC6** is the DBT stream's.
