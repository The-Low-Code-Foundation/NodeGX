# ONT-012 — Who reads which detail, and until when

**Opened 2026-10-10 (s16)**, from Richard's rulings R-a and R-b (README §9), both *against* the recommendation: the
backend itself learns **per-field read rules** and **a rule on a value of the record** ("editable only while a
draft"). **Depends on** ONT-004 (the rule atoms and the `only` seam), R10 (the facade as the one door). **Feeds**
ONT-011 step 4 (secret details and *settled* project to these two rules). **Status: 🟡 s16 — both rules built and graded on SQLite and PostgreSQL: the draft-only rule (R-b, §6.1) and per-field reads (R-a, §6.2). AC1–AC5 met as worded. Owed: the Fable reach review, and the two limits in §7 (search over an index that does not hold the field; who may change a field).**

> **Model check (Richard, 2026-10-08 rule):** the build wants **Opus 5.5**. It is fixed-shape enforcement on seams that
> exist (ONT-004's `only`, R10's `AdapterFacade`), graded on both engines. **A reach review on Fable 5.1** follows the
> build, as ONT-007's did (s9): "which door would let a hidden detail out, and when?" is the question no suite can ask
> of itself.

## 1. The person sentences

> **"Their company's representative reads my account, but not my two health details. I read those myself."**
>
> **"Once a bill is sent, nobody changes its amount. We can still mark it paid."**

## 2. Why

ONT-011 §3.5: the membership business's CMS already keeps per-field read rules (7 reads over 5 collections), in
production. The census found 16 secret-detail rows and 8 settled rows over the 8 sources. Richard ruled both into the
backend, not into a split record or a function, so every app on every engine gets them the same way.

## 3. What to build

### 3.1 The draft-only rule (R-b)

In `security.json`, per collection:

```json
"Bill": {
  "onlyWhile": {
    "update": { "where": { "status": "draft" }, "except": ["status", "paidOn"], "says": "A bill can be changed only while it is a draft." },
    "delete": { "where": { "status": "draft" } }
  }
}
```

- `where` is a Parse-wire filter on **the record's own values** as it is now, before the change. No `$path`, no
  `$relatedTo`.
- `except` (update only): an update that changes only these fields is not held to the condition (marking a sent bill
  paid, withdrawing an issued assignment). That is the *settled* kind's question "after that, may anything still
  change?".
- `says`: the refusal in the person's words. It is optional, and a default sentence names the condition.
- **Enforced inside the write itself**: ANDed into the ACL's `only` for that collection, so the check and the write are
  one SQL statement, with no read-then-write race, on both engines. This happens in `AdapterFacade.rawSave` /
  `rawDelete`, the doors every write passes (R10's reason). When the condition stopped the write, the result is a
  **409 with `says`**, not a 404. A probe without the condition tells the two apart, under the caller's own ACL, so
  a row they may not write is still "not found".
- **Who it binds:** every caller the row ACL binds (users, anonymous, keys acting as a user). The admin credential, an
  unbound scoped key, dev-open and cloud functions (which run as admin) are not bound, as with every rule today. A
  function is how an amend is made.

### 3.2 Per-field read rules (R-a)

```json
"Account": {
  "fields": {
    "healthNeeds": { "read": [{ "path": { "hops": [{ "from": "Account", "by": "login" }], "maxDepth": 1 } }, "role:care"] }
  }
}
```

- A field's `read` is an ordinary rule value (the same atoms, path rules included). It is ANDed with the
  collection's `find`/`get`: you must be able to read the record first.
- For one caller, a field is **shown everywhere** (an atom grants outright), **shown on some rows** (only path atoms
  grant: the rows they reach) or **hidden everywhere**.
- **Two kinds of enforcement, both needed** (§4 is why):
  1. **Bodies:** a field the caller may not see on a row is not on the row they receive. This happens in the facade,
     once, for every record-returning method, plus the realtime delivery.
  2. **Naming:** a request that names a field hidden from the caller (on any row) in `where`, `sort`, `keys`,
     `distinct`, an aggregate, a precondition, a `$path` hop's `where`, a realtime filter, or a search over an index
     that holds the field is **refused with a 403 that names the field**. Otherwise the filter is an oracle on the
     value: `where: { healthNeeds: "x" }` answers whether the hidden value is "x".
- Not allowed on `_` system collections (same posture as `collections`).
- **Read only.** Who may *change* a field is not ruled. A caller with `update` may still overwrite a field they cannot
  read. This is named in §7, not built.

## 4. The doors (census s16, 2026-10-10, spot-checked)

Every place a non-admin caller gets a field value or can test one. File paths are in `nodegx-backend/src/` unless
marked otherwise.

| door | where | body? | names a field by | what this task does |
|---|---|---|---|---|
| find (GET/POST `/classes/:c`) | `server/parse-wire.ts:236-259`, `:473` | yes, `toWire` | where, sort, keys, include, count | strip + refuse naming |
| get `/classes/:c/:id` | `parse-wire.ts:482` | yes | include | strip |
| `include` | `persistence/AdapterFacade.ts:471-484` | **another collection's record** | the include name | strip with **the target's** fields |
| search | `parse-wire.ts:245` → `AdapterFacade.ts:551` | yes, plus `_snippet`/`_score` | the term hits every indexed column | refuse when a hidden field is indexed |
| distinct | `parse-wire.ts:613` | the values | `distinct`, where | refuse naming |
| aggregate | `parse-wire.ts:624-641` | sums, mins, sets | accessor, where | refuse naming |
| PUT echo | `parse-wire.ts:573-578` | the incremented value | `X-NodeGX-If` precondition | strip the echo; refuse a precondition on a hidden field |
| BYOB `/api/:t` reads | `server/byob-admin.ts:264-290` | **raw rows**, only `_User` stripped | where, sort | strip |
| BYOB create / save / batch | `byob-admin.ts:310-319`, `:357-407` | **the full row** | — | strip |
| realtime delivery | `realtime/RealtimeHub.ts:322-342` | **`event.record` raw** | the subscription filter | strip a field hidden everywhere; refuse a subscription when a field is shown only on some rows (as a narrowed rule is refused today, `:303`); refuse a filter naming a hidden field |
| MCP `_find` / `_get` | `server/mcp/McpRoutes.ts:378-409` | yes | where, sort | covered by the facade |
| `$path` hops | noodl-runtime `QueryBuilder.ts:871-895` | — | a hop's `where` on any collection walked | refuse naming, per hop collection |
| unique 409 on create / upsert | `server/http-util.ts:288` | the conflicting value | — | **named, not built** (§7) |
| cloud functions, workflows, triggers | `service.ts:583-590` | whatever the graph returns | — | run as admin, not bound (the graph author's responsibility) |

Admin-only doors (`/admin/views`, `/admin/export`, `/api/_schema`) are out: the admin credential bypasses every rule.
**Unbound scoped API keys bypass** (`security/state.ts:529-532`), as they bypass the row ACL. **No HTTP door gives
`_User` to a non-admin** (`model.ts:727`) at its own door. **Wrong as a census, s17:** an `include` of a link to `_User` gave another person's whole account (email, admin access) to anyone signed in. Fixed with R-h (§6.3).

Found while counting, and filed as their own bugs, not built here: `include` reads the target collection without its
`find` rule or narrowing, and `$path` hops walk collections without their CLP (bug `P116-S16-INCLUDECLP`).

## 5. Acceptance criteria

1. **Draft-only, on SQLite and PostgreSQL, over HTTP on a locked backend:** a draft is changed and deleted. A sent bill
   is refused with a 409 carrying `says`, on PUT, on BYOB PUT, in a batch, and on DELETE, with the record unchanged.
   An `except`-only change to a sent bill goes through. A row the caller may not write is still 404. The admin
   credential is not bound. **Mutant:** a facade that drops the condition lets the sent bill change, and the spec
   catches it.
2. **Per-field reads, on both engines, over HTTP:** the representative's find, get, include, BYOB read and PUT echo
   carry no `healthNeeds`. The person's own carry it. A `role:care` caller sees it on every row. A `where`, `sort`,
   `keys`, `distinct`, aggregate or precondition naming it is a 403 naming the field, and the same request on a
   visible field is a 200. **Mutants:** a facade that skips the strip, and one that skips the naming check. Each is
   caught by name.
3. **Realtime:** a subscriber to whom the field is hidden everywhere receives the change without it. A subscriber to
   whom it is shown on some rows is refused at subscribe, in words.
4. `validateSecurityConfig` refuses an unknown key under `onlyWhile` / `fields`, `except` on `delete`, a `$path` in an
   `onlyWhile.where`, an empty `fields.<f>`, and either key on a `_` collection.
5. The backend manager's permissions page and the MCP's security writer do not drop the two keys on a round trip.
   This is measured, not assumed.

## 6. Built

### 6.1 The draft-only rule (s16, 2026-10-10, Opus 5.5)

- `security.json` `collections.<c>.onlyWhile` (`security/model.ts`: type, strict validator with 11 refusals,
  `onlyWhileFor`). It rides in the write ACL as `StorageAclOption.onlyWhile` (`@noodl/backend-contract` `storage.ts`,
  types only, no adapter reads it). `SecurityState.aclFor` puts it there for `write`, and the `ctx.acl` closure now
  passes the collection it names.
- `persistence/onlyWhile.ts`: `heldWhile()` ANDs `where` into `only` (with ONT-004's path narrowing as `$and`).
  `whyRefused()` makes two counts under the caller's own write ACL, with and without the condition, after the write,
  so it cannot race. `NotWhileItIs` carries `says`. The facade holds `rawSave`, `rawIncrement` and `rawDelete`. The
  relation-only PUT path holds its writability probe with the same pair. No `IStorageFacade` member was added, so
  the coverage ratchet did not move.
- `notWhileToHttp` → **409**, `reason: 'not-while'`, at PUT, the upsert, BYOB PUT/DELETE, the batch (both arms) and
  DELETE. MCP `_update` says the rule's words.
- **AC5, measured red first:** `PUT /admin/permissions/collections/:name` *replaced* the entry, so the permissions
  page's own save (matrix + switch) dropped `onlyWhile`, and a sent bill became editable again. Now a body without
  `onlyWhile` keeps it, `null` removes it, and a body with only `onlyWhile` keeps the WHO. `DELETE` (revert to
  defaults) keeps it, because WHEN has no default. The MCP's `set_collection_permissions` and its revert use these
  two routes (`noodl-mcp` `backendTools.ts:586-614`).
- **Graded:** `nodegx-backend/tests/ont-012-only-while.test.ts`, **32/32** (12 validator cases, then 10 cases per
  engine on SQLite and PostgreSQL, over HTTP on a locked backend). The mutant (`heldWhile` spied to drop the
  condition) lets the sent bill's amount change, and the PUT case's 409 is what it breaks. Neighbours in band: 11
  specs 166/166 (security model, path rule, target-goes, preconditions, FED-002/005, service-http), and the 9 specs
  on the permissions routes 183/183. `tsc` (src, tests, admin app) clean.

### 6.2 Per-field reads (s16, 2026-10-10, Opus 5.5)

- `security.json` `collections.<c>.fields.<f>.read` (`security/model.ts`: type, validator with 6 refusals,
  `fieldMask(config, principal)` → per collection, `{ field }` hidden everywhere or `{ field, shownWhere }` shown on
  the rows the caller's path atoms reach). It rides in every ACL option the row ACL binds (`StorageAclOption.hidden`,
  read and write, every collection with a field rule), via `SecurityState.aclFor`. `hiddenFor(principal)` serves
  live updates. The admin, dev-open and an unbound scoped key get no mask, as with the row ACL.
- `persistence/fieldRules.ts`: `refuseHiddenNamed()` walks where (`$and`/`$or`/`$nor`, `$relatedTo`'s key, operator
  sub-queries, `$path` hops resolved through the schema's link targets, including the hop's own `follow`/`by`
  field), sort, keys, distinct, aggregate accessors, preconditions, and a search over a collection with any hidden
  field. It throws `HiddenFieldNamed`, an `HttpError` **403** with `reason: 'hidden-field'` that names the field.
  `stripHidden()` takes the fields off, with one id query per distinct reach for "shown on some rows". The query
  runs under the caller's row ACL and **not** the collection's `only`: the narrowing decides which rows come back,
  not which details show.
- Wired into every facade method that takes the caller's ACL: `rawQuery`, `rawQueryAll`, `rawSearch`, `rawFetch` (so
  `include` strips by the **target's** rules), `rawCount`, `rawAggregate`, `rawDistinct`, `rawSave` (preconditions,
  the BYOB PUT body), `rawIncrement` (the Parse echo). Realtime: a frame is stripped per subscriber, and a
  subscription is refused when a field is shown only on some rows or when its filter names a hidden field.
- **Two catch-alls would have swallowed the 403** (the s12 lesson again): search turned every error into a 400, and
  `classPut` turned a precondition's refusal into a 404 (measured red, line 232 of the spec). Both now pass an
  `HttpError` through.
- `PUT`/`DELETE /admin/permissions/collections/:name` keep `fields` as they keep `onlyWhile` (`UNDRAWN_KEYS`).
- **Graded:** `tests/ont-012-field-reads.test.ts` **26/26**: 8 validator cases, then 9 per engine on SQLite and
  PostgreSQL, over HTTP on a locked backend. The representative / the person / `care` / the admin are checked at
  find, get, include, BYOB reads, the increment echo, BYOB PUT and 11 named refusals. "Shown on some rows" refuses
  the person's own filter. AC5 round trip. **Two mutants**, each caught: the strip skipped (rep reads bob's details),
  and the naming check skipped (a where answers who has asthma). `tests/realtime-hub.test.ts` +4 (12/12): stripped
  frame, refused filter, refused partial, and the mutant of a hub with no mask. Neighbours in band (2026-10-11
  00:06): 32 specs on security, the facade, search, realtime, aggregates, exports and the MCP, **490/490**; `tsc` for
  src, tests, the admin app and the contract is clean.
- **Filed:** bug `P116-S16-INCLUDECLP` (high). `include` embeds a record from a collection whose own `get` rule
  refuses the caller. Measured: `GET /classes/Salary/:id` → 403, `GET /classes/Contract/:id?include=salary` → 200
  with `amount: 91000`. Regression `tests/p116-s16-include-clp.test.ts` (`it.failing`). Pre-existing, not this
  task's: the field rules already strip an include by the target's `fields`, and the collection-level half is owed.

### 6.3 Bug INCLUDECLP fixed, and R-h (s17, 2026-10-11, Opus 5.5)

`e06ebbd2a`. The collection-level half that §6.2 owed: the ACL option carries each collection's `get`/`find`
answer (`reach`, from `checkClp`), and the facade reads it (`fieldRules.reachOf`). A closed target is a bare link and
a narrowed one is read with its narrowing. A `$path` hop or `$relatedTo` through a collection the caller may not read
in full is a 403 naming it. Found beside it and ruled by Richard (R-h, README §9): every account column but the
username is in the `hidden` mask, so an included author carries their name, not their account.
`tests/p116-s16-include-clp.test.ts` 22/22 on both engines (two mutants). Neighbours in band 55 specs, 768/771 (the 3
red are P109's uncommitted `isl040-sessions` spec, live in `state.ts` at the same time). The reach review (Fable)
should start from the bug file's "Not covered" list. Filed beside it: `P116-S17-DOTTEDFILTER` (a dotted filter
answers nothing, even to the admin).

## 7. Not this task

- **Who may change a field** (a per-field `update` rule). Not ruled.
- **Search is refused outright** on a collection where the caller has any hidden field, because the facade does not
  know which fields the index covers. Refining it to "refused only when the index holds a hidden field" needs the
  index's field list at the facade.
- **The unique 409 echo** tells a creator that another row holds a value. A hidden field that is also unique is a
  combination no corpus row has. Recorded here, not built.
- **The projection** (ONT-011 step 4) and the vocabulary (step 2) are Fable's. This task only gives them a target.
- **The backend manager's editor** for the two keys is a later P104/ONT-008 surface. The keys must survive it (AC5),
  not be authored in it.
