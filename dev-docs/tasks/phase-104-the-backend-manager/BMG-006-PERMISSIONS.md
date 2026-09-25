# BMG-006 — Permissions: who × what, templates first, and "try it as Ann"

**Opened 2026-09-24** (README §2 row 4). **Depends on BMG-001, BMG-002 (`FilterRow`), BMG-005.**
**Status: ✅ built and driven s7 (2026-09-25); §6.**

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

## 6. Built (s7, 2026-09-25)

**Where:** `src/admin/app/ruleVocabulary.ts` (the editor's `panels/permissions/ruleVocabulary.ts`, ported
verbatim in its semantics; arrays end to end, a role named `a,b` is one role), `src/admin/app/permissionsModel.ts`
(the matrix over it: cell state and click transitions, templates, the words, the function-row draft, the
verdict sentences — pure, specced without a DOM), `src/admin/app/views/permissions.tsx` (three pages),
`ui.tsx` `Switch`, `api()` takes headers, `roleUses.useHref` sends a function use to `#/permissions/functions`.
Server: `admin-security.ts` `configEtag()` — `GET /admin/permissions` answers `etag` (and `ETag`);
`PUT /admin/permissions` with a stale `If-Match` is **412** with a sentence and saves nothing; no header behaves
as before (MCP and the editor send none). No new route: the tally stays `admin: 92`.

**Specs:** `tests/admin-app/permissions-view.test.tsx` (AC1, AC2, AC3 table-driven, the vocabulary against
`validateRuleValue`/`ruleAllows`, the function draft round trip, drift chips, AC6/AC7 rendered);
`tests/bmg-006-permissions.test.ts` (AC4 tag + 412 over sockets, AC5 the dry run against `checkClp`, AC6 the
validator's refusal). **Drive:** `drives/bmg006/run.sh ac seed` — 37/37 checks, no page errors; shots
`shots/bmg006-*.png`.

**What each AC measured:**
1. Untick *Default*, tick *Signed in* on *Change*, Save → `GET /admin/permissions` and `security.json`
   say `update: "authenticated"`, `create` untouched, the other rows still inherited; tick *editors* beside
   it, Save → `["authenticated","role:editors"]`.
2. *Everyone* on *List* greys *Signed in*, *No one* and *editors* as implied (checked, disabled); *No one*
   on *Open one* unticks *Signed in*; no PUT/DELETE left the page while ticking; *Undo* restores.
3. *Only the owner* ticks *Signed in* on every row and creator-owns on; Save stores exactly
   `{permissions: all authenticated, creatorOwns: true}`; *Public read* ticks *Everyone* on List and Open one
   only; *One role only* with `billing` picked ticks the billing column on every row. Every template's config
   is in the spec's table and validates against the backend model.
4. Sign-up → *Anyone*, Files › Delete → *editors* (a column added with *+ role*), the defaults' Delete →
   *Signed in*, one Save → one `PUT /admin/permissions`, read back equal, the tag moved. A direct PUT (no
   header) then changed Files › Upload; the page's next Save was refused with *"The permissions changed since
   this page loaded … Nothing was saved."*, the page's change was not written, the direct one survived;
   *Reload* drew it. Functions: *editors* beside *Signed in*, runs as the system, 30/min burst 10, 5 s,
   *Require a key, then replay* → one whole-config PUT, `config.functions.sendInvoice` equals the block,
   `GET /admin/permissions/functions` reports it effective, the reloaded card shows every field and says *Saved.*
5. *Try it as ann doing Change on Pet* → *"ann may change Pet."* with the route's own reason under it, equal
   to `POST /admin/permissions/check` for her principal; on Rex (bob's record) → *"ann may not change Pet
   (Rex): the collection allows it, but that record's sharing does not."* (`recordAllowed:false`); signed out
   doing List → refused, as the route; ann calling `sendInvoice` → as the route.
6. The collection list is `Order, Pet`; no page's `#main` text, title or aria-label contains `_User`,
   `_Session`, `_Role`, `_ApiKey` or `_Audit`; no request went to `/admin/permissions/collections/_…`;
   the audit trail holds no permission write naming a system table. Over sockets the validator refuses
   `_User` by name, which is why the page never asks.
7. On all three pages every `input[type=text]` (or untyped input) is inside a `.picker` — a search box —
   and there is no textarea. Rules come only from boxes; numbers are `type=number`.

**Where the task was wrong, measured, and what was done instead:**
- **A *Default* column, per row.** §3.1's matrix had no way to say *this operation inherits*; the storage
  keeps that per operation and the fixture (`Pet` sets `create` only) uses it. Without the column the first
  Save would have rewritten four inherited operations as explicit rules — a change nobody asked for. The
  column shows the default's words under each box; the per-collection *Use the defaults* switch is the whole
  entry (Save → `DELETE …/collections/:name`).
- ***Only the owner* is `authenticated` on Change and Delete, not `nobody`.** `checkClp` is decided before
  any row is looked at (`model.ts` `checkClp`), so *No one* on Change locks the owner out too; the row's
  private ACL (creator-owns) is what keeps other signed-in people out. Pinned in the spec with `ruleAllows`.
- **Try-as picks a record with a `Picker`, not a `FilterRow`.** A filter row names a set; the dry run takes
  one record (its ACL). `searchRecords` (BMG-002, *a record by what it says*) is the established control for one.
- **The stored order is the vocabulary's.** `['role:editors','authenticated']` reads back as
  `['authenticated','role:editors']` — the same rule. *Dirty* compares through the matrix so a reordering
  never shows as an unsaved change.
- **Runs as** offers *Not said* and *The system* only: the model rejects `caller` at load
  (`validateSecurityConfig`), and a control that offered it would offer a setting the backend refuses.
- **`#/permissions/functions`** shadows a collection literally named `functions`; the task fixed the hash.

**Watch for, carried:** the read-only tier: every box, switch and select is disabled and every button is a
`WriteBtn`; *Try it* works. Drift chips (`not deployed`, `from the graph`, `fails for signed-out callers`,
`60/min default`, `no limit, on purpose`) each carry their reason as a title and, when they matter, as a line.
