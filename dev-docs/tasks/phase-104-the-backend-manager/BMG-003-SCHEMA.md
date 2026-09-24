# BMG-003 — Schema: a field-type picker, per-type options, and a danger zone

**Opened 2026-09-24** (README §2 row 7). **Depends on BMG-001.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone adds a field by picking what kind of thing it holds — a name, a number, a yes/no, a
> date, a link to another collection, a picture — and then only sees the choices that kind has.
> They can take a field away, and deleting a collection lives where accidents don't.**

## 2. What is wrong, measured

- **The type list is the storage's**, not a person's: `COLUMN_TYPES` (`index.html:518`) =
  `String Number Boolean Date Object Array Pointer Relation File GeoPoint`, a bare select with no
  description (`fieldLine`, `:1278-1321`).
- **Per-type options:** *Required*, a text *default* shown for String/Number/Boolean only
  (`:1289-1292`), and a target select for Pointer/Relation. A Boolean default is typed as the
  words `true`/`false` (`:1290`, `:1312`). No min/max, no allowed values, no pattern, no unique
  (unique is an index, two dialogs away), no MIME types or max size for File.
- **No way to remove a field.** `POST /admin/schema` actions (`byob-admin.ts:389-481`):
  `createTable addColumn renameColumn changeColumnType deleteTable setIndexes setChecks`. No
  `dropColumn`. The adapter has one only for backup migration (`backup/schema-migrate.ts`).
- **Checks** (`setChecks`, HLT-016) have no UI (agent map §2). A check is what expresses
  "allowed values" and "min/max" at the storage; without a UI the option cannot exist.
- **Delete collection** is a red button in the card header beside *Add field* (`:1141`); it does
  ask for the name (`:1480-1495`).
- **Relations:** Pointer and Relation get a `→ Table` select and nothing else; no cardinality
  words, no on-delete.

## 3. What to build

### 3.1 The field-type picker
A searchable grid of tiles, each with an icon, a plain name and one line, mapped to the storage
type it becomes:

| tile | one line | storage |
|---|---|---|
| **Text** | words, names, descriptions | String |
| **Number** | amounts, counts, prices | Number |
| **Yes / No** | a switch | Boolean |
| **Date & time** | when something happened | Date |
| **Choice** | one of a list you define | String + a check `IN (…)` |
| **Link** | points at one record in another collection | Pointer → target |
| **Links** | points at many records in another collection | Relation → target |
| **Picture or file** | an upload | File |
| **Location** | a point on the map | GeoPoint |
| **List** | several values | Array |
| **Anything** | structured data for developers | Object |

Storage names stay visible as a small badge (*String*) for the people who know them; the MCP and
the schema export are unchanged.

### 3.2 Per-type options (the drawer's second step)
- All: name (validated live against `NAME_RULE` and reserved words, the error in words), *Required*
  switch, *Must be unique* switch (writes a unique index through `setIndexes`), *Description*.
- Text: default; *max length*; *must look like* (email / URL / custom pattern) as a check.
- Number: default (a number input); min / max as a check; *whole numbers only*.
- Yes/No: default as a switch.
- Date: default *now* or a date.
- Choice: a `ListEditor` of values (each a chip with a colour), default one of them.
- Link/Links: target collection (`Picker` of tables), the sentence *"A Pet links to one Owner"*
  / *"…to many Tags"*; **when the target is deleted:** keep / clear (documented as what the
  backend does today: nothing — so the control is *shown disabled with "coming"* only if the
  backend gains it; otherwise omit. Measure first).
- File: max size (MB), allowed types as category chips (Images / Documents / Audio / Video /
  Any) + custom MIME.
- Location, List, Anything: no options.
Required disables Default (Appwrite's rule); the drawer says why.

### 3.3 Drop a field
Backend: `POST /admin/schema {action:'dropColumn', table, column}` — SQLite (`ALTER TABLE DROP
COLUMN`, 3.35+; measure the bundled version) and Postgres; refuses server-owned `_User` columns
and any column named in an index or check (says which). Page: ✕ on a field row →
`confirmDestructive` naming the column and *"N records hold a value in it"* (a
`where={col:{$exists:true}}&count=1` read first).

### 3.4 Relation dialog, indexes, checks
- Indexes stay as BMG-000's rows; *Must be unique* on a field writes one.
- Checks get a UI only through §3.2 (a person never sees "check"); a *Rules* section on the
  card lists them in words (*price is at least 0*, *status is one of open, closed*).
- Rename and change-type stay in place; change-type's warning gains the count of records
  affected.

### 3.5 Danger zone
The collection card gets a footer *Danger zone* with **Delete collection** (type the name) and
**Empty collection** (delete all records; type the name; count shown). The header loses the red
button.

### 3.6 Deep link
`#/schema/:table` scrolls to and highlights the card; `#/schema/:table/new-field` opens the
picker (BMG-012's *Add a field* door).

## 4. Acceptance criteria

1. Every tile in §3.1 creates a column of the mapped storage type, read back from
   `GET /admin/schema/:table` (drive, one collection with all eleven).
2. *Choice* with values `open, closed` refuses a record with `status: "other"` (the check is
   enforced by the backend; drive: `POST /api/:table` → 400 with the check's message) and the
   record drawer (BMG-002) shows a select of the two.
3. *Must be unique* creates a unique index visible in the Indexes rows; a duplicate is refused.
4. Drop a field removes the column on SQLite and on Postgres (both conformance stores, the
   `brg-003`/`brg-005` harness), refuses `_User.email` and a column in an index with a message
   naming the index.
5. Required + Default: Default is disabled with the reason visible.
6. The header has no red control; *Delete collection* lives in the danger zone and refuses
   without the typed name (spec on `DangerZone`; drive on the page).
7. `#/schema/Pet/new-field` opens the picker on load.
8. 🔴 A Boolean default is never typed as a word anywhere on the page.

## 5. Watch for

- `changeColumnType` on a column with a check: the check may no longer parse. Drop the check
  first or refuse with the reason (measure what `setChecks` validates today).
- The editor's `CreateTableModal` rejects SQLite reserved words; the page's `NAME_RULE` does not
  — port the list (BMG-012 deletes the modal).
- Postgres `DROP COLUMN` on a column referenced by a view or FK: the conformance harness will say.
- The MCP's `manage_schema`-family tools and `noodl-mcp`'s picker (memory: a NEW TYPE owes
  `noodl-mcp` + picker) see the storage types, not the tiles; no new storage type is added here,
  so nothing is owed — say so in §6 when built.
