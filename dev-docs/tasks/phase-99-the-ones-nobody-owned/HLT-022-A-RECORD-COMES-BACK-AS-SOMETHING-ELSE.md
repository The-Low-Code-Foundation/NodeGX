# HLT-022 — A record comes back as something else

🔴 **Opened 2026-09-23 from the Digital Bricks Training stream (its sprint 49, L170), at Richard's
ruling: *"Core fix + workaround now."*** Found by L170's first live run and invisible to its offline
check. Specced, not built. Measured on `cline-dev` by the four read functions that hit it.

✅ **BUILT 2026-09-23. AC1–AC5 met on SQLite and PostgreSQL; AC6 is the DBT stream's.** Built to
§3 as recommended: `{ plain: true }` on `query`/`fetch`, and a `String` column is never sniffed.
[verdict](./verdicts/HLT-022/2026-09-23/VERDICT.md)

## 1. The person sentence

> **Someone who saves a document into a record — a lesson's sections, a map of facts — reads back the
> document they saved, not one with its ids replaced and its text turned into objects.**

## 2. What it is, measured 2026-09-23 (`cline-dev`)

Two defects, one under the other. The second was found only after working around the first.

**(a) `Noodl.Records` turns every nested object into a Model.** `_fromJSON` →
`_deserializeJSON` in `packages/noodl-runtime/src/api/cloudstore.js` (~345–420): a plain object
becomes `(modelScope || Model).get()` — a Model with a **generated id** — and an array of objects
becomes a `Collection` of them. So, in a deployed function:

- A lesson's `sections` came back with **every section's `id` replaced by a random one**. The same
  lesson's `steps` index its sections BY that id, so the lesson could no longer be assembled. Nothing
  errored.
- A learner's `facts` map gained a random **`id` key on every call**.
- A record's own id is reachable only through `getId()`; `toJSON()` does not carry it.

This is the viewer's data model and it is right there — an app binds to Models. It is wrong for a
cloud function, which wants the row.

**(b) The SQL adapters JSON-parse any string that looks like JSON, in any column.**
`deserializeValue` in `…/adapters/local-sql/QueryBuilder.ts` (~1556), called by both
`LocalSQLAdapter` (~769) and `PostgresAdapter` (~439): after the typed branches, **any** string that
starts and ends with `{…}` or `[…]` is `JSON.parse`d — including a column the schema declares
`String`. So the obvious workaround for (a), storing the document as JSON text, came back as an
object and (a) Model-ized it anyway. A user's free-text field that happens to start with `[` and end
with `]` is changed on read today.

**The workaround shipped in the DBT template** (`templates/digital-bricks-training/tools/lib/seed-resolve.mjs`):
the three documents are stored as text with a `json:` prefix (never a bracket, which (b) sniffs),
three schema columns are `String`, and each function decodes them. Named and owned in one module so it
can come out whole.

## 3. The shape (recommended, to be ruled)

- **(a) An opt-in plain read.** `Records.query(c, where, { plain: true })` (and the single-record
  read) returns rows as the adapter holds them: fields verbatim, nested objects and arrays untouched,
  **`objectId` on the row**, `Date` columns as ISO strings. The default stays the Model, so no app
  binding changes. *Not* a change to the default: every graph that reads a record today depends on it.
- **(b) Parse by the schema, never by the look of the text.** A `String` column is returned as the
  string. Object/Array columns are still parsed. An **untyped** column (schemaless) keeps today's
  sniff, stated rather than removed, because a schemaless backend has nothing else to go on.

## 4. Acceptance criteria

1. **Both failures reproduced first**, in a deployed function on SQLite: a nested `{id:'a'}` comes
   back with a different id; a `String` column holding `[1,2]` comes back as an array. The control.
2. With `{ plain: true }`, on SQLite **and** PostgreSQL: a record with nested objects, an array of
   objects and a `Date` reads back equal to what was saved (deep-equal), with its `objectId`.
3. Without the option, the Model shape is unchanged — pinned by an existing or new test so the
   default cannot drift.
4. A `String` column holding bracketed text reads back as that text on both adapters; an Object
   column still reads back as an object. The tempting wrong fix — deleting the sniff outright — is
   demonstrated failing the schemaless case.
5. A phase-97 conformance case per adapter.
6. **The DBT stream's:** the template removes `STORED_AS_TEXT`, the prefix, the three `String`
   schema types and every function's `fromText`/`getId()` handling, and its `check-read-functions`
   and `check-seed` pass live.

## 5. Owner and neighbours

About half a day. Not blocking: the template's workaround holds. It is due before the DBT template's
first WRITES, which would otherwise have to encode on the way in as well. Own commit, only its own
paths staged.
