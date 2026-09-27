# BMG-003 — Schema: a field-type picker, per-type options, and a danger zone

**Opened 2026-09-24** (README §2 row 7). **Depends on BMG-001.**
**Status: ✅ built and driven s9, 2026-09-25 (§6). R6 ruled 2026-09-26 — a one-time fill, not a default; built in [BMG-016](BMG-016-THE-LEFTOVERS.md).**

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

## 6. Built (s9, 2026-09-25)

**Where — storage (both engines, `noodl-runtime`):** `local-sql/schemaCommon.ts` `CheckDecl` gains the four
single-field shapes the drawer declares — `{field, oneOf}` (a *Choice*), `{field, maxLength}`, `{field, looksLike:
'email'|'url'}` (portable `LIKE` shapes, not a regular expression: SQLite has no REGEXP function unless every
connection registers one, and a trigger naming a missing function breaks every other reader of the file — backups,
the survey; so *custom pattern* from §3.2 is NOT offered), `{field, whole: true}` (`CAST(x AS BIGINT) = x`, the same
answer on both engines); each named `chk_<T>_{oneof,maxlen,looks,whole}_<f>`, described in words, type-checked
against the column (`checkChecksAgainstColumns`). **`dropColumn(table, column)`** on `SchemaManager` (SQLite `ALTER
TABLE DROP COLUMN`, 3.50.4 bundled) and `PgSchemaManager` (queued `DROP COLUMN IF EXISTS`); a Relation drops its
junction table; a column a declared index, a declared check or the search opt-in reads is refused with
`code: 'COLUMN_IN_USE'` naming it (`refuseColumnInUse`, shared, so both engines say the same sentence — PostgreSQL
would otherwise drop the index silently). `IStorageSchema.dropColumn?` in the contract; conformance case
`schema/drop-column-removes-it-and-refuses-one-in-use` + its coverage row; both conformance suites green.
**Two adapter defects found and fixed on the way:** (1) `addColumn` with a Relation returned before recording it on
BOTH engines — *Links* added to an existing collection did nothing, silently, since the old page; now the junction
table is created and the column declared. (2) `declaredProperties` memoises against the schema OBJECT and `addColumn`
mutated that object in place, so a column added after any read of the collection had no declared type until
restart (the drive found it: *"needs email to be a String, and it is a property with no declared type"*; a Boolean
written to such a column was not read back as one either). Every schema mutation now stores a fresh object
(`freshSchema`) on both engines; pinned in `SchemaManager.checks.test.js` and in the backend spec (a read before
the adds).
**Where — server:** `byob-admin.ts` `POST /admin/schema {action:'dropColumn', table, column}` (400 for the four
system fields, `_User`'s sign-in columns and its server-owned account columns; 409 in words for a column in use;
`{dropped}`; audited under `schema.mutate` with `droppedColumn`; no new route — tally stays 93); `refuseIfInUse`
also guards **`changeColumnType`** (§5: SQLite rebuilds by add-copy-DROP-rename, which a trigger or index on the
column refuses in its own words). `addColumn` now awaits the PostgreSQL queue and turns both engines' *"required
column over rows without a default"* refusals into one sentence (400, `reason: 'required-needs-default'`);
`http-util.ts` `requiredViolationToHttp` turns `NOT NULL constraint failed` / PostgreSQL's not-null violation into
*"name" is required on "Pet": every record must say it* (400, code 142, `reason: 'required'`).
**Where — app:** `fieldKinds.ts` (pure: the eleven `KINDS`, `kindOf`, `withRules` → the record controls,
`FieldDraft`/`draftProblem`/`toColumn`/`toRules`/`mergeRules`, `defaultRule`), `format.ts` (`RESERVED_WORDS` ported
from the editor's `CreateTableModal`, `validCollectionName`, `Column` carries `description` and the page-derived
rule fields), `fields.tsx` (a Choice is a `<select>` of its values, with a stray stored value shown as *not one of
the choices*; a bounded number gets `min`/`max`/`step`; looks-like sets the input type), `views/schema.tsx`
(`KindPicker` tiles with search, `FieldOptions`, `AddFieldDrawer` bound to `#/schema/<t>/new-field`, `KindBadge`,
`DropTrigger` ✕, the *Rules* list in words with ✕, `DangerZone` with *Empty collection* + *Delete collection*, the
change-kind dialog with the count of records affected; `AddFieldDialog` kept for the Users page), `collections.tsx`
folds the rules into the columns on load, `styles.css` `.tiles.kinds`, `.kind`, `.rules`.

**Specs:** runtime `SchemaManager.checks.test.js` (+6: the four shapes refuse and admit on a real SQLite, the
shapes that say nothing, a Choice the rows already break, the fresh-object pin), `SchemaManager.dropColumn.test.js`
(6); backend `bmg-003-schema.test.ts` (10 × 2 engines: AC1 eleven types read back, AC2 400 with the rule, AC3
unique + 409/137, AC4 drop / Relation / refusals by name / `_User` / system fields, §5 type change, required in
words, the audit entry, the action list); `admin-app/schema-view.test.tsx` (18: the table, drafts, refusals,
reserved words, AC2 control, AC5, AC6, AC7, AC8). **Drive:** `drives/bmg003/run.sh ac seed` — **41/41 checks, no
page errors** (readings `drives/bmg003/readings.json`, shots `shots/bmg003-*.png`). **Gate:** three packages typecheck exit 0;
full backend `npx jest --maxWorkers=4` 194 suites PASS, 1 skipped, 2327 tests, exit 0, 365 s; runtime adapters 328/328;
contract 199/199; bundle 76,836 gzip.

**What each AC measured:**
1. Through the drawer, eleven fields on `Pet`; `GET /admin/schema/Pet` read back `String Number Boolean Date
   String(+oneOf) Pointer→Owner Relation→Tag File GeoPoint Array Object`. Over sockets on both engines the same.
2. `POST /api/Pet {status:'other'}` → 400/142 *This write breaks a rule of "Pet": status is one of open, closed*;
   the record drawer on `#/collections/Pet/<id>` shows `status` as a select of `— none — / open / closed`, and
   `age` as a number input bounded 0–30 in steps of 1.
3. *Must be unique* on `email` → `idx_Pet_email` (unique, built) in the Indexes rows; a second `a@b.co` → 409/137.
4. ✕ on `born` asked *No record holds a value in it*, then type `born` → gone. ✕ on `status` (a rule reads it) →
   the toast *Cannot drop "status": the rule "status is one of open, closed" reads it. Remove that rule first.*;
   the rule's ✕ in *Rules*, then the drop asked with the server's count (3: the Choice's default backfilled the
   rows) and went through. `_User.email` → 400 *how a person signs in*; `email` in an index → 409 naming
   `idx_Pet_email (email, unique)`. Both engines in the spec.
5. On `Empty` (0 records): Required on → Default disabled, *A required field has no default: every record must say
   it.* visible; the field enforced (*"code" is required on "Empty"*). On `Pet` (2 records): Required on → Default
   ENABLED with *The 2 records already here get this value; new records must say it*, and Add without one refused
   in words. See R6.
6. The Pet header: `Open records / Add field / Indexes`, no red control; the danger zone: *Empty collection*
   (asked with the count, refused until `Pet` typed, 0 left, fields kept) and *Delete collection* (refused with
   `Empt`, deleted with `Empty`).
7. `#/schema/Pet/new-field` on load → the drawer on eleven tiles; the search `pic` → one tile.
8. The Yes / No default is two switches (`checkbox=on, checkbox=on`), the row says *Yes*, and `true`/`false`
   appear nowhere in `#main`.

**Not built, and why:** *custom pattern* (above); *File max size / allowed types* per column — nothing in the
backend enforces a per-column limit (the Files settings are backend-wide), so a control here would be inert; *when
the target is deleted: keep / clear* — the backend does nothing, so the Link sentence says so instead of offering a
switch; a *Date* default of *now* — a stored `DEFAULT` takes a literal only, and the backend stamps
`createdAt`/`updatedAt`, so Date offers no default. The relation "dialog" is the drawer's Link/Links step with the
sentence *Each record links to one Owner / many Tags*. No storage type is added, so nothing is owed to `noodl-mcp`
or its picker (§5). The editor's `CreateTableModal` reserved-word list is now also the page's (BMG-012 deletes
the modal).
