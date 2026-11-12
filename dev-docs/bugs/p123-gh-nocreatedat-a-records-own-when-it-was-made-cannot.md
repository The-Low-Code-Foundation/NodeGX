---
id: P123-GH-NOCREATEDAT
title: A record's own "when it was made" cannot be shown: createdAt is in no ⚡ menu and no row
status: fixed
commit: NodeGX f3eee23d9 (runtime and node spec); nodegx-studio fcb1b81 (⚡, rows, sort)
severity: medium
area: nodegx-studio / repeating group row inputs, ⚡
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
kit: core
regression: packages/noodl-runtime/test/nodes/p123-gh-nocreatedat-a-records-built-in-dates.test.ts "prop-createdAt and prop-updatedAt are outputs, typed date, beside the declared field"
---

Data → Map says every type has "Built in: its id, when it was made and last changed", but a repeating group's row
gets Component Inputs only for the declared fields (Watering row: id, plant, note) and ⚡ offers nothing else, so a
history list cannot say when each row was made. Greenhouse added its own Date field `at`, stamped by a backend
workflow, to show "💧 Fri 30 Oct, 15:49".

Fix: offer createdAt / updatedAt wherever a record's fields are offered (row inputs, This page's thing, ⚡).

**s28 read (2026-10-30, not measured):** not Studio alone. Studio's `fieldsOf` keeps createdAt/updatedAt when the
backend's table lists them, but a Record's read ports are `fieldPorts` over its schema
(`noodl-runtime/src/nodes/std-library/data/schema-ports.ts`), and the project file's `dbCollections` columns hold no
built-in dates, so whether `prop-createdAt` exists depends on which schema the editor, the preview and the validator
were given. Measure first: a Record of a type with only declared columns, read in the in-page preview and by
`validate_component`: does `prop-createdAt` exist, and does it carry the date? Then either the runtime offers the two
built-in dates on every Record's read side (one change, every surface), or Studio declares nothing and the row's ⚡
names them only where the port exists.

**Runtime half measured and fixed (2026-11-01, uncommitted at writing).** Measured on a NodeGX class declaring only
`note` (`{ name, columns }`, as the backend's cache and Studio write it), before the change:
- **Editor (the runtime's announcement, `dbmodelnode2.ts` `updatePorts`):** `prop-note`, `changed-note`; no
  `prop-createdAt` / `prop-updatedAt`. A Parse-era class (`schema.properties` listing both as `Date`, as Parse's
  `/schemas` did) already drew both, typed `date`: the gap is NodeGX-only.
- **Validator / get_component (`drawnPortLookup` over the spec):** outputs `id fetched changed error done completed failure
  prop-note changed-note`. A wire FROM `prop-createdAt` was accepted (a wire declares a `prop-`, typed `*`), but nothing
  offered it.
- **The value:** the backend answers both as bare ISO strings (Parse-style); `_fromJSON` typed only declared columns, so
  `createdAt` stayed a string while the declared Date `at` became a `Date`. A row's Component Input `createdAt` is filled
  from `model.data.createdAt` by name (`foreach.tsx` :645), so it got the string.

Changed (one place per half, editor/validator/cloud agree through `nsp-020-ports-parity`):
- `noodl-runtime/src/nodes/std-library/data/record-ports.ts` `recordBuiltInDatePorts` (+ `RECORD_BUILT_IN_DATES`), called
  by `dbmodelnode2.ts` `updatePorts`: on a Parse-wire backend with a class selected, `prop-createdAt` / `prop-updatedAt`
  (`date`, group Properties) and `changed-createdAt` / `changed-updatedAt` (signal, Events), unless the schema drew them.
  Read side only: Create / Update Record still take neither (the server owns both). Not off the Parse wire.
- `nodegx-node-spec/src/nodes/record.ts` (+ `record-base.ts` `RECORD_BUILT_IN_DATES`): the same draw, so the validator,
  `get_component` and cloud components (`cloudSpecPorts.ts`) offer them. After: the validator's set ends `prop-note
  changed-note prop-createdAt changed-createdAt prop-updatedAt changed-updatedAt`.
- `noodl-runtime/src/api/cloudstore.js` `_fromJSON`: an undeclared `createdAt` / `updatedAt` is typed `Date`, so both
  arrive as a JS `Date`, the shape a declared Date field has at HEAD (P123-RT-COLUMNSSCHEMA). `_plainFromJSON` (cloud
  `plain: true` reads) is unchanged: ISO strings. Corpus reach of the type change: 0 `get('createdAt'|'updatedAt')` in
  `templates/`, noodl-mcp examples/tests and `NodeGX test projects`.
- `noodl-runtime/src/api/queryutils.ts` `matchesOperator`: a Date value compares as an instant against a Date, the wire's
  `{ __type: 'Date', iso }` or a date as text. Without it the type change would have made Query Records' local match of a
  text `createdAt` filter false (Date vs text is NaN); a declared Date field never matched the wire operand locally either.

Proof: the regression spec was 4 red of 8 before the change (the two port tests, the two Date tests); the local-match
cases 2 red of 3 with the `matchesOperator` guard neutralised (text and wire Date). Green after: spec 11/11; 30 runtime
files touching the changed modules 303/303; `nsp-020-ports-parity` 352/352; node-spec `ports` 67/67 (its pinned Record
draw list gained the four ports), `golden` + `batch-records` + `spec-ledger` 105/105. No generated catalog change needed
(`node-catalog-enriched.json` describes `prop-<property>` as a pattern).

Left (Studio, and a release): offer `prop-createdAt` / `prop-updatedAt` in ⚡ and as row inputs named `createdAt` /
`updatedAt`; Studio's preview reaches the new ports and the Date value only with an `@nodegx/preview` release carrying
this (until then a row's `createdAt` input gets the ISO string). Not changed: the User node (`user-ports.ts`).

## Studio half, fixed 2026-11-02 (nodegx-studio fcb1b81)

`createdAt` and `updatedAt` are offered wherever ⚡ reads a record's fields (the page's own thing, a first page data item) and in page data's sort list (`withBuiltInDates`; not in `fieldsOf`, so a new page still shows its type's first real field). A new repeating group's row gets `createdAt` / `updatedAt` Component Inputs, which For Each fills by name. Gate rows in `check:editor`: ⚡ offers *This page's Note's createdAt* and *updatedAt*; the Note row carries createdAt. Reaches Studio's preview as a Date (rather than the ISO text) with the next `@nodegx/preview` release; the wire works today either way. Studio gates, one at a time on 2026-11-02: editor 259/259, data 91/91, hosted 46/46, functions 695/695 + 50/50, the rest green (check:app could not run: the screen was locked, see P123-STU008-APPCHECKPUBLISH).
