# BMG-002 — Collections: the filter row, and a typed editor for every field

**Opened 2026-09-24** (README §2 row 2). **Depends on BMG-001.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone finds the records they mean by saying it in rows — "status is open, and created after
> Monday" — sorts by clicking a column, hides the columns they don't need, saves that as a view,
> and edits any field in a control made for its type. On a record they can say who may see it
> without knowing what an ACL is.**

## 2. What is wrong, measured

- **Filter.** `whereClause` (`index.html:785-803`): the search box ORs `contains` over String
  fields; everything else is the JSON disclosure (`:721`) parsed at `:800`. No operator, field or
  date is pickable. The backend answers `$eq $ne $gt $gte $lt $lte $in $nin $exists $regex $text
  contains $and $or $relatedTo` (`noodl-runtime/…/local-sql/QueryBuilder.ts:410-702`).
- **Sort** is `["-createdAt"]` always (`:808`). Headers do not sort. The API takes `sort` as a
  JSON array of `±field` (`byob-admin.ts:176-197`).
- **Columns:** all schema columns plus every key seen in the page (`columnsFor`, `:764-774`);
  none can be hidden; nothing is remembered.
- **Typed editors:** `fieldInput` (`:511-681`) covers String, Number, Boolean, Date, Pointer.
  **Object, Array, ACL, File, GeoPoint are a JSON textarea** (`:619-640`). Relation is never
  editable (`:906`, `:987`). Pointer is a bare select of 200 (`:647-672`).
- **ACL:** editing a record adds a textarea with the hint *"Keys: \* (everyone), a user objectId,
  or role:name…"* (`:627`). The model is `{key:{read?,write?}}`, key ∈ `*` | userId | `role:x`;
  `null` = public, `{}` = nobody (`security/model.ts:1043-1115`). The editor already has a pure
  parse/format for it (`databrowser/acl.ts`).
- **Import:** Export CSV exists (client-side, current page). `POST /admin/import/:collection`
  exists; no Import button.
- **Paging:** 50 (`:689`), Prev/Next, no page-size choice, no jump.

## 3. What to build

### 3.1 `FilterRow` (lands in the composer kit)
- One row = `[and/or] [field ▾] [operator ▾] [value]`. The field list is the schema's columns
  (plus objectId, createdAt, updatedAt); the operator list depends on the type:
  - text: *is · is not · contains · starts with · is empty · is not empty · is one of*
  - number: *= · ≠ · < · ≤ · > · ≥ · is between · is empty*
  - yes/no: *is yes · is no*
  - date: *is · is before · is after · is between · is within (today / this week / this month /
    past 7 days / past 30 days) · is empty*
  - link (Pointer): *is* (a `Picker` of the target's records) · *is empty*
  - list (Array): *contains · is empty*
  - location: *is within N km of* (lat, lng, N)
- *+ Add condition* and *+ Add group* (a group is its own and/or). Emits the `where` JSON; a
  pure `toWhere(rows)` / `fromWhere(json)` pair is the spec's subject, so a saved JSON filter from
  today round-trips into rows (and *Advanced (JSON)* stays, folded, for the 1%).
- The sentence above the grid says it back: *"3 records where status is open and created after
  22 Sep 2026"*.

### 3.2 The grid
- Click a header to sort; click again to flip; a third click clears. Multi-sort with ⇧. Sent as
  `sort`.
- **Columns** button: a checklist with drag-to-reorder; remembered per collection in
  `localStorage`; system columns off by default except `createdAt`.
- **Views**: *Save view…* stores name + filter + sort + columns per collection (server-side in
  the backend's operational store so the team shares them: `PUT /admin/views/:collection/:name`
  — a small new route, JSON blob, admin-only); a views dropdown beside the collection picker.
- Page size 25/50/100/250; *N records* count from `count=1`; keyboard ←/→ pages.
- Row click opens the **record drawer** (`#/collections/:name/:id`); double-click a cell edits
  in place as today.

### 3.3 Typed editors, one per type, used by the drawer and the cell
| type | control |
|---|---|
| String | text; multi-line if the value has a newline |
| Number | number with step; ⌥↑/↓ nudges |
| Boolean | switch |
| Date | date + time pickers, *now* button, timezone shown |
| Pointer | `Picker` over the target collection (summary label, never an id); *open ↗* to the record |
| Relation | a list of chips (the related records' summaries) with a `Picker` to add and ✕ to remove; reads through `$relatedTo`, writes through the Parse-wire `AddRelation`/`RemoveRelation` op the runtime already sends |
| Array | `ListEditor` of typed values (the type inferred from the first element, else text); JSON fallback behind *Edit as JSON* |
| Object | `KeyValueEditor`; JSON fallback behind *Edit as JSON* |
| File | dropzone → `POST /files/:name`; shows name, size, a thumbnail for images, *download*, ✕ |
| GeoPoint | lat / lng fields and a *use my location* button; no map (no external origin) |
| ACL | §3.4 |

### 3.4 "Who can see this record"
On the drawer: a card, not a field. Rows: **Everyone** (read ☐ write ☐), **Signed-in users**
is not expressible in a row ACL (the model has no atom for it; say so in the card's hint),
then one row per **role** (a `Picker` of roles) and per **user** (a `Picker` of users, label =
username/email), each with read ☐ write ☐ and ✕. *No one* = an empty set, shown as a state, not
as `{}`. Uses `acl.ts`'s rules ported to the app. Below the card: *This collection's permissions
also apply →* linking to `#/permissions/:name`.

### 3.5 Import
*Import CSV* beside *Export*: file → preview of the first 20 rows with a column→field mapping
(auto by header name), type warnings, then `POST /admin/import/:collection`. Export gains *all
records* (paged fetch) beside *this page*.

## 4. Acceptance criteria

1. Every operator in §3.1 produces a `where` the backend accepts and that returns the right rows
   on a seeded collection (a table-driven spec on `toWhere` plus a drive that runs each against
   the throwaway backend and counts).
2. `fromWhere(toWhere(rows))` is identity for every operator; a hand-written JSON filter with
   `$and`/`$or` nesting becomes rows (spec).
3. Header sort changes the order on the server (`sort` param read in the drive's request log),
   not just in the page.
4. A saved view survives reload and a second browser (server-stored), and *Delete view* asks.
5. Each type in §3.3 round-trips through the drawer: write, read back via `GET /api/:table/:id`,
   equal (drive, one record with every type; File uploaded and downloaded byte-equal).
6. Relation: add two, remove one, read back through `$relatedTo` (drive).
7. The ACL card sets *Everyone read*, *role:editors write*, *one user read+write*; the stored
   ACL equals `{"*":{"read":true},"role:editors":{"write":true},"<id>":{"read":true,"write":true}}`;
   opening a stored `{}` shows *No one*; `null` shows *Everyone*.
8. Import: a 3-column CSV with a header row lands 100 rows with the right types (numbers as
   numbers, `true` as boolean) — read back and counted.
9. 🔴 Nothing on the page asks for JSON unless the person opens *Advanced (JSON)* or *Edit as
   JSON* themselves (a drive that walks every control on the page and asserts no `<textarea>` with
   a JSON placeholder is visible at rest).

## 5. Watch for

- `contains` on `_User.password` is skipped today (`:791`); the field list must skip it and every
  server-owned `_User` column (`ACCOUNT_OWNED`, `:531`).
- The Parse wire (`/classes/:collection`) and `/api/:table` accept different sort spellings
  (`order` comma list vs `sort` JSON array; `parse-wire.ts:104-134`). The page uses `/api`; keep
  it on one.
- `count=1` on a large table is a real query; debounce the filter row (250 ms, as search is).
- Memory: a `Function`-style output publishes only on change — irrelevant here, but the SSE
  *Live* toggle re-runs `load()` on every event; with a filter row that is a full re-query per
  event. Coalesce.
