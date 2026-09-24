# BMG-006 — Permissions: who × what, templates first, and "try it as Ann"

**Opened 2026-09-24** (README §2 row 4). **Depends on BMG-001, BMG-002 (`FilterRow`), BMG-005.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone decides who may list, open, create, change and delete each collection by ticking
> boxes under "Everyone", "Signed in" and their roles — or picks "Only the owner can change
> their own" from a short list of things people usually want — and then checks it works by
> asking "what would Ann see?"**

## 2. What is wrong, measured

- Per collection: five text inputs `find get create update delete`, placeholder *(default)*,
  comma = OR (`index.html:1716-1745`). The grammar (`security/model.ts:133-148`):
  `public | authenticated | nobody | role:<name>` or an array of them.
- **Defaults, signup, files, functions** are disabled inputs with a note pointing at
  `PUT /admin/permissions` or MCP (`:1699-1714`). The whole-config route exists; the page never
  calls it. Function rules also carry `runAs`, `rateLimit`, `timeoutMs`, `idempotency`
  (`model.ts:333-352`) — the editor's `PermissionsPanel.tsx` edits those with selects and
  numbers; the page has nothing.
- **System tables** get a card the validator refuses (`:1693` loops every table; `model.ts:429`
  fixes `_` tables at `nobody`).
- **creator-owns** is a checkbox with a code-word label (`:1737`).
- **Dry run** exists: `POST /admin/permissions/check` (the read-only tier may call it,
  `readonly.ts`); no UI.
- **The editor already solved the matrix**: `CollectionPermissions.tsx` (*Use default / Nobody /
  Anyone / Anyone signed in / role:x* per operation) with a pure `ruleVocabulary.ts` and a spec
  (`tests-unit/spr-001/ruleVocabulary.test.ts`). Port, do not reinvent.
- **Words:** `find` and `get` mean *list* and *open one* to a person.

## 3. What to build

### 3.1 The matrix (per collection, `#/permissions/:name`)
Rows = **List · Open one · Create · Change · Delete** (with the storage word as a badge). Columns
= **Everyone** · **Signed in** · **No one** · one column per role (chips in the header; *+ role*
opens a `Picker` of roles; a role column with nothing ticked can be removed). A cell is a
checkbox; *No one* is exclusive per row; *Everyone* ticked greys the others in that row (they
are implied). A **Use the defaults** switch per collection collapses the matrix to the backend
defaults, shown read-only beneath (today's *Reset to defaults*). Writes
`PUT /admin/permissions/collections/:name` through the ported `ruleVocabulary`.

**Records belong to their creator** (today's *creator-owns*), a switch with one sentence: *"When
a signed-in user creates a record, only they (and roles allowed above) can see and change it."*

### 3.2 Templates
Above the matrix, **Start from…**: *Public read, signed-in write* · *Signed-in only* · *Only
the owner* (= signed-in create + creator-owns + no one else on change/delete) · *Admins only*
(a role the picker chooses) · *Locked*. Each fills the matrix; nothing is saved until *Save*.
(Supabase's own lesson: templates beat AI; README §3.)

### 3.3 The rest of the config, as pages, not disabled inputs
- **Defaults** (`#/permissions`): the same matrix for *any collection not listed*, plus the
  **Sign-up** rule (*Anyone can sign up / Nobody — accounts are created here*) and the **Files**
  rules (upload / read / delete as a three-row matrix). Saved through `PUT /admin/permissions`
  as a whole; the page reads, patches, writes, and refuses to write if the config changed under
  it (ETag or `version` — measure what the route offers; if nothing, add `If-Match`).
- **Functions** (`#/permissions/functions`): a table of functions (from
  `GET /admin/permissions/functions`, which also reports drift and budgets) with *Who can call*
  (Everyone / Signed in / No one / roles), *Runs as* (the caller / the system), *Rate limit*
  (N per minute, burst), *Timeout*, *Idempotency* (off / on / on with key), — every one a
  control, ported from `PermissionsPanel.tsx`.
- `_`-prefixed tables are not rendered; a line says they are locked to the backend.

### 3.4 Try it as…
A bar at the top of every permissions page: **Try as** `[Picker: a user | Everyone (signed out)]`
**doing** `[List ▾]` **on** `[collection ▾]` → *Allowed / Refused*, with the rule that decided
it, from `POST /admin/permissions/check`. When *dev-open* is on, the bar says the backend
enforces nothing and shows what *would* happen.

### 3.5 Row-level conditions — the honest line
The model has no per-row rule beyond ACLs and creator-owns (`checkClp` is collection-level,
`model.ts:612`). The page does **not** fake a "where owner = me" builder. The `FilterRow` is
used only in *Try as* to pick a record to test against (`get`/`update` on a specific row). A
row-rule model is a candidate (README §6), not this task.

## 4. Acceptance criteria

1. Ticking *Signed in* on *Change* for `Pets` stores `update: 'authenticated'`; ticking a role
   beside it stores `['authenticated','role:editors']` (spec on the ported vocabulary; drive
   reads `GET /admin/permissions`).
2. *No one* is exclusive; *Everyone* implies the rest (the UI state; spec).
3. Each template produces the documented config (table-driven spec).
4. Defaults, sign-up, files and every function field save through the whole-config route and
   read back equal; a concurrent change is refused with a message, not overwritten.
5. *Try as Ann doing Change on Pets* answers what `checkClp` answers for her principal (drive:
   the same question through the route directly).
6. No `_` table is rendered; the validator is never hit with one.
7. 🔴 No text input on any permissions page accepts a rule string.

## 5. Watch for

- `ruleVocabulary.ts` treats a comma inside a role name (`PermissionsPanel.tsx:246`). The
  vocabulary is arrays now; keep the arrays end-to-end.
- The read-only tier may call `/check`; the page must let a read-only admin use *Try as* with
  every write control disabled (`writeButton` semantics carried into the app).
- The functions route reports *drift* between declared and effective rules; show it as a chip
  with the reason, do not hide it.
