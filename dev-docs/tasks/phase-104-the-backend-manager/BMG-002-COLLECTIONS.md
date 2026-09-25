# BMG-002 — Collections: the filter row, and a typed editor for every field

**Opened 2026-09-24** (README §2 row 2). **Depends on BMG-001.**
**Status: ✅ built and driven s5 (2026-09-25) — §6.**

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

## 6. Built (s5, 2026-09-25)

**Two meanings fixed before they shipped, both measured.**

| # | measured | now |
|---|---|---|
| 1 | SQL's `!=` never matches a missing value: *title is not closed* as a bare `$ne` answered 5 on a seed where 6 records are not *closed* (one has no title). A person asking "status is not open" means those too | *is not*, *≠*, *is no* and *is empty* are `$or` [the condition, missing] (`filters.ts orMissing`), and `fromWhere` reads exactly that shape back |
| 2 | A list is stored as JSON text, so `contains red` matched a `["redwood"]` record (3 where 2 hold `red`) | a list item is looked for as its own JSON spelling (`"red"`, quotes included) |

Both were found by the AC1 spec's independent reading of each row, and it goes red if either is
put back (mutation run: *want 6, got 5* and *want 2, got 3*).

**One backend defect on a door this page stands on, fixed here.** With `files.read` above
`public`, `GET /files/:name/sign` answered 200 and the URL it minted answered **403** with no
credential (probed on the drive's locked backend). The coarse route gate refused it before the
handler could read the signature, so a File field's thumbnail and *Download* could not work for an
admin, whose credential an `<img>` or a link cannot send. The gate now verifies the signature
itself for that stored name (`HttpServer.signatureAdmits`). It verifies rather than steps aside
because `assertReadable` passes any file with no ACL, so a gate that deferred to any `?sig=` would
hand a forged one every public file. Pinned by `tests/bmg-002-signed-files.test.ts` on a locked
backend (signed → 200 byte-equal; forged, expired, other file → 403; plain URL still 403). The spec
goes red without the line (mutation run). `files-http.test.ts` only covered `read: public`.

**Page.**
- `app/filters.ts`: the rows model. `toWhere`/`fromWhere` (null when a part is not something a
  row can say, so nothing is silently narrowed); `describe` says it back. Dates are half-open
  `[$gte,$lt)` ranges of local midnights, so *is*, *is between* and the five *is within* windows
  are one shape told apart by their ends. The windows resolve at query time, and a saved view
  stores the ROWS, so "this week" stays this week.
- `composers/FilterRow.tsx` (`FilterRows`): `Where / and·or / field / operator / value`, a group
  one level deep, a link value picked by name. Incomplete rows wait ("One condition has no value
  yet; it is not applied."). Re-queries 250 ms after the last change. *Advanced (JSON)* stays
  folded; what rows can say moves into the rows, and the rest shows as a notice with *Clear it*.
- The grid: a header click sorts, a second flips, a third clears; ⇧ adds to the sort (▲▼ with its
  position). *Columns* is a checklist with drag and ↑↓, remembered per backend and collection in
  `localStorage`; by default the system columns are off except `createdAt`. Page size 25/50/100/250;
  ←/→ page when no field has focus. **A row click opens the record; a double-click edits the
  cell** (the open waits out the double-click window). Link cells say what the record says (one
  `$in` query per link column per page), never an id. The sentence above the grid: *"4 records
  where title contains o and (n > 5 or done is no)"*, and a linked record by its name.
- Views: *View ▾* beside the collection, *Save view…* (name, and it says it will replace one of
  the same name), *Delete view* asks. Stored by the backend (below).
- `fields.tsx`: a control per type. Text (multi-line when the value has a newline); Number
  (⌥↑/↓ ±10); a **switch** for yes/no; Date as date + time + *Now* + ✕ + the viewer's timezone;
  Pointer as a `Picker` with *open ↗*; Array as `ListEditor` rows typed from the first element;
  Object as `KeyValueEditor`; GeoPoint as latitude/longitude + *Use my location*; File as a
  dropzone → `POST /files/:name`, then name, size, thumbnail, *Download* and ✕ through a signed URL
  (only its path is kept: the backend writes file URLs on its own loopback address). Array and
  Object have *Edit as JSON*, which the person opens. Each structured type keeps its own raw
  state, so a half-typed number in a list is a state, not a parse error.
- `RelationEditor`: chips of the linked records' labels, a `Picker` to link, ✕ to unlink. It reads
  through `$relatedTo` and writes `AddRelation`/`RemoveRelation` on the Parse wire, saved as it
  goes (a new record's links are made once it exists; *Create* opens it).
- "Who can see this record": `app/acl.ts` (the editor's `databrowser/acl.ts` rules, ported) +
  `composers/AclCard.tsx`. *Everyone* (`null`) and *No one* (`{}`) are states said in words.
  Everyone / role rows / person rows with *Can see* ☐ *Can change* ☐ and ✕; roles and people are
  picked by name. The hint says why there is no "signed-in users" row, and the card links to
  *This collection's permissions also apply →*. Only true flags are stored. The drawer sends the
  ACL whenever it changed, including back to public.
- *Import CSV*: a file, a preview of the first 20 rows, a column → field mapping (auto by header
  name), and the **server's own dry run** as the type warning, then *Import N record(s)* (it
  re-serialises only the mapped columns). *Export this page* / *Export all records* (paged by 500
  with the current filter and sort).
- A cell of a structured type opens a dialog holding the same control; an ACL cell reads
  *Everyone* / *No one* / who.

**Backend.** `server/admin-views.ts`: `GET /admin/views/:collection`, `PUT` and `DELETE
/admin/views/:collection/:name`, stored in `views.json` in the data dir (whole-file write with an
atomic rename; it rides a data-dir backup). The filter is the page's rows, opaque to the server;
sort and columns are checked as field names; 32 KB cap (413). Audited as `view.save` /
`view.delete`. Route tally 88 → 91, reviewed. **Deviation from §3.2:** the task said "the
backend's operational store". That is a SQL store for idempotency keys and similar; a view is
operator state like `ops.json`, so it sits beside that instead. Same sharing, a second browser
sees it, no new table.

**Acceptance, measured** (drive `drives/bmg002/`: `run.sh ac seed` then `run.sh second keep
…/second.mjs`, locked backend, readings in `readings/ac.json` and `second.json`, 26/26 + 2/2,
no page errors; shots `shots/bmg002-*`):

| AC | how it was measured | result |
|---|---|---|
| 1 | `tests/bmg-002-filters.test.ts`: all 34 operator cases (every one the page offers, checked by name) against a real service over sockets, the server count vs an independent per-row reading, ≥ 75 % of cases split the seed. Drive: seven filters built in the page (contains, between, within past 7 days, owner picked by name, is no, an *or*, a group), the `where` the page sent, the server's count for it, the count shown, and the independent count, all equal | ✅ |
| 2 | spec: `fromWhere(toWhere(row))` is identity for all 34 cases, nested groups keep their and/or, and a hand-written `$or`/`$and` with a bare pointer and a `$gte/$lte` pair becomes rows; five inexpressible filters answer `null` | ✅ |
| 3 | drive: click n → the page sent `sort=["n"]` and its n column equals the server's order for that sort; again → `["-n"]`; ⇧title → `["-n","title"]`; again → the default `["-createdAt"]` | ✅ |
| 4 | route spec (survives a restart, audited, refuses bad input and no credential) + drive: saved with filter/sort/columns → stored on the server → reload with `localStorage` cleared → the view restores the sentence, `sort=["-n"]` and the same columns; a **fresh Chrome profile** (storage 0) opens it; *Delete view* shows its dialog, the view is still stored, then gone on *Delete* | ✅ |
| 5 | drive: one record through *New record* with all nine types, read back via `GET /api/Task/:id`: each equal; the file downloaded byte-equal, both with the admin credential and **through the page's own link with none**; the thumbnail loaded (naturalWidth 1400); the saved record reads back into its controls | ✅ |
| 6 | drive: link *urgent* and *home*, unlink *urgent*; `$relatedTo` answers `[home, urgent]`, then `[home]`; the chips agree | ✅ |
| 7 | drive: *Restrict* → Everyone can see only, *editors* can change only, *ann* both → stored ACL equals the AC's object with ann's id; no id on the card; a stored `{}` opens as **No one**, `null` as **Everyone** | ✅ |
| 8 | drive: a 100-row, 3-column CSV (header row); auto-mapping `[title, n, done]`; dry run *"100 will be added."*; after import, 100 rows, all with numeric `n` and boolean `done`, 50 of them `true` | ✅ |
| 9 | drive: every visible `textarea`/`input` at rest on the page with a filter open, a new record, a saved record, and a cell's dialog: none has a JSON placeholder or JSON content | ✅ |

Also driven: a double-click edits the cell in place with no drawer, and the server has the new
title; a row click opens `#/collections/Task/<id>`; *25 a page* sends `limit=25`, and → sends
`skip=25`.

**Gates (2026-09-25):** `npm run typecheck` exit 0 (both tsconfigs). Full `npx jest` in
`packages/nodegx-backend` **exit 0**: 185 suites passed and 1 skipped; 2,176 tests passed and 16
skipped. After the last UI edit: the admin-app, dashboard, BMG-002, tally and audit specs, 11
suites, 130/130. Bundle 53,039 gzip (level 9) of 160,000; it was 38,836.

**Watch-fors (§5), answered.** `_User` never reaches the filter field list: Collections hides `_`
tables (BMG-004). The page stays on `/api` and its `sort` JSON array. The filter row is debounced
250 ms. *Live*: each change event is one re-query, coalesced by `openLive`'s own 180 ms debounce,
and a newer load discards an older answer (`loadSeq`).

