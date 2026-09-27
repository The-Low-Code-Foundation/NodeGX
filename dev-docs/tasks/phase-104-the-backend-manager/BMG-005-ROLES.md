# BMG-005 — Roles: named members, add by search or email, and what a role unlocks

**Opened 2026-09-24** (README §2 row 6). **Depends on BMG-001, BMG-004.**
**Status: ✅ built and driven s6 (2026-09-25) — §6.**

## 1. The person sentence

> **Someone makes a role called "editors", adds Ann by typing "an", takes Bob out with one ✕,
> and sees on the same page which collections editors may change — so a role is a thing they
> understand, not a string other pages refer to.**

## 2. What is wrong, measured

- **Add member** (`index.html:1639-1657`): a `<select>` of the 200 newest users labelled
  `username — objectId`. No search, no email, no keyboard.
- **Members column** (`:1604`): `(r.users || []).join(', ')` — raw objectIds.
- **No remove.** `DELETE /admin/roles/:name/users/:userId` exists (`admin-security.ts:461-514`);
  nothing calls it.
- **New role** (`:1622-1636`): one unlabelled input, placeholder `role-name`; `ROLE_NAME_RULE`
  (`roles/RoleStore.ts`) is enforced by the server and its message shown after the fact.
- **No rename**, no description, no route for either.
- **What the role does** is invisible: permissions name `role:<name>` in five text boxes on another
  page; the subtitle says so in code words (`:1588`).

## 3. What to build

- **List:** Role · Members (count + the first three names, avatars) · Used in (N collections, M
  function rules) · created.
- **Role page** (`#/roles/:name`), a drawer or full page:
  1. **Members** — a table of people (username, email, joined) with ✕ per row
     (`DELETE …/users/:id`, confirm in words: *"Remove Ann from editors?"*), and **Add people**:
     a `Picker` over users (username/email contains; keyboard; shows *Ann · ann@…*) and, beside
     it, *invite by email* (BMG-004's invite, then adds the membership). Bulk: paste several
     emails.
  2. **What editors can do** — read-only rows derived from `GET /admin/permissions`: per
     collection, the operations whose rule names this role (*Pets: list, open, create, change* ·
     *Orders: list*), plus function rules; each row links to `#/permissions/:collection`. A role
     nothing names says *"Nothing yet — give editors something in Permissions →"*.
  3. **Danger zone** — *Delete role* (type the name) with the count of rules that will stop
     matching, read from the same derivation, in words.
- **New role:** name with live validation in words (*letters, digits, `-` and `_`; starts with
  a letter*), an optional description (stored in the role record if the store has a column;
  else in the operational store keyed by role — measure; if neither, drop the field, do not
  fake it).
- **Backend:** none required if description is dropped. If kept: `PUT /admin/roles/:name
  {description}`.

## 4. Acceptance criteria

1. Typing `an` in the picker lists *Ann* by name and adds her with Enter; `GET /admin/roles`
   shows the membership.
2. ✕ on Bob removes exactly Bob; a second ✕ on the last member leaves an empty role.
3. Five emails pasted add five memberships (existing users) and invite the two unknown ones
   (BMG-004's path), reporting *3 added, 2 invited*.
4. *What editors can do* lists exactly the operations whose stored rule contains `role:editors`
   (spec on the derivation with a fixture config; drive on the page).
5. Delete says the right count of affected rules before deleting.
6. 🔴 No objectId is visible anywhere on the page.

## 5. Watch for

- Role names go into permission strings as `role:<name>`; the editor once split a name on a
  comma (`CollectionPermissions.tsx:7`). The picker never composes strings; it posts a userId.
- The derivation of "what a role can do" is the inverse of BMG-006's matrix; build it once as a
  pure function over `SecurityConfig` and share it.

## 6. Built (s6, 2026-09-25)

**One defect in a shared composer, found by AC1's own gesture and fixed.** `Picker` searches
150 ms after the last keystroke, and Enter picked from whatever rows were on screen. Typing
`bo` and pressing Enter inside that pause picked the first row of the PREVIOUS answer (the empty
query's list, where `ann` is first), so the wrong person was added without a word. A spec pinned it
red first (`picker.test.tsx`: *received ann*). Now Enter on a query the rows do not answer yet
waits for that answer and picks its first row. Every page that uses a `Picker` gets the fix
(Users' roles, record links, the ACL card, API keys' *acts as*).

**Page (`views/roles.tsx`, rewritten).**
- **List:** Role (name + what it is for) · Members (count, the first three names as initials and
  *ann, bob, cat and 2 more*) · Used in (*every collection by default · 2 collections · 1 function
  · 1 other rule*, or *Nothing yet*) · Created. A row opens `#/roles/<name>`. A name nothing matches
  says so.
- **Drawer:** *Members (n)*: a table of people (name, email, joined) with ✕ each, which asks
  *"Remove bob from editors?"*. *Add people* is a `Picker` over `/admin/users?q=` without the
  current members. It shows *ann · ann@…* and offers *Invite x@y to editors by email* only when the
  query is a whole address and sign-in links are on. *Add several by email* is a textarea: people
  who exist are added, unknown addresses are invited through BMG-004's `POST /admin/users
  {invite, roles}`, and the drawer reports *3 added, 2 invited.* plus a line for each address
  already in the role, not an address, or not sent (with the server's sentence). When invitations
  are off, the hint says why and where to turn them on.
- ***What editors can do***: one linked line per place the stored config names the role (*Pet:
  create, change*; *The sendInvoice function: call*; *Files: upload*; *Every collection without a
  rule of its own: …*). A role nothing names says *"Nothing yet — give nightshift something in
  Permissions →"*. A hint says record-level sharing is not counted here.
- **About:** the description, editable. **Danger zone:** *Delete role*, and the warning says,
  before anything is deleted, how many rules will stop matching and which, plus how many people
  leave it.
- **New role:** the name is checked as it is typed, in words (*"A role name cannot contain a
  space. Use letters, digits, - and _."*; *"There is already a role called editors."*), and
  *Create role* waits. There is an optional *What it is for*.
- `Picker` gained `createWhen` (the create row only for a query it accepts) and `openOnFocus`
  (the Roles drawer focuses the picker on open, and a list of everyone was covering the drawer;
  it now opens on typing).

**The derivation (`app/roleUses.ts`), for BMG-006 to reuse.** A pure function over the stored
`SecurityConfig`: defaults, collections, functions' `call`, files, signup. Each place names the
operations whose stored rule is `role:<name>` or a list containing it. The defaults are their own
row and never folded into a collection's, so a row lists only what is written there. Nothing else
can name a role: a graph's `Allow Unauthenticated` resolves to `public`/`authenticated` only
(`effectiveFunctionRule`).

**Backend.**
- `_Role.description` (String), by the same idempotent `addColumn` as `_Session.expiresAt`.
  `POST /admin/roles` takes an optional description. **`PUT /admin/roles/:name {description}`**
  (audited `role.update`, with a flag rather than the text) refuses any other key, the name
  included, because rules spell it. Up to 280 characters. Route tally 91 → 92.
- `GET /admin/roles` also answers each role's `description`, `createdAt` and `names`: the first
  three members as a username (else an email), read in one `$in` query.
- `GET /admin/users?role=<name>`: the members, through the same rows as the Users page. An empty
  role answers `[]` without querying. An unknown role is a 404 in words.

**Deviations from §3, each deliberate.**
- The task's name rule said *"starts with a letter"*. The server's `ROLE_NAME_PATTERN` does not
  require it, and roles made under that rule exist. The page says what the server enforces and
  does not invent a stricter rule the backend would not keep.
- Rename is not built. §2 lists it as missing, but §3 does not ask for it, and a rename rewrites
  every rule that spells the name. That is BMG-006's matrix to own.
- An invited person's username is their email. `POST /admin/users` requires one, and a pasted list
  has nothing else to use.

### Acceptance, measured

Drive: `drives/bmg005/run.sh ac seed`. A LOCKED throwaway backend on 8697 whose `security.json`
names `role:editors` in two collections, a function and files, beside the lookalikes
`role:editors2` and `role:billing`. A local SMTP sink (`smtp.mjs`) means invitations really send.
Headless Chrome on 9333. **27/27 checks pass**, no page errors (`drives/bmg005/readings/ac.json`,
shots `shots/bmg005-*.png`).

| AC | how it was measured | reading |
|---|---|---|
| 1 | typed `an` in the drawer's picker → rows; Enter → `GET /admin/users?role=editors` and `GET /admin/roles` | rows `["ann ann@example.com"]` only; members `["ann"]`. Then `bo`+Enter with no pause → `["ann","bob"]` (the race above) |
| 2 | ✕ bob → the confirmation text → Remove → server; ✕ ann → Remove | *"Remove bob from editors?"*; members `["ann"]`, bob's account still there; then `[]` with the role still listed, drawer *"No one is in editors yet."* |
| 3 | pasted `cat…\ndave…, eve…; fay… gus…` → *Add them* → the report, the server, the sink's mailbox | *"3 added, 2 invited."*; five memberships; fay and gus are password-less accounts in `editors`; exactly two messages reached the sink, to them, each with a `magic-link` URL |
| 4 | the drawer's lines, read back into config paths with a word table written in the drive, compared with `security.json` read from disk and walked for the literal atom | equal: `collections.Order.permissions.find`, `collections.Pet.permissions.create/.update`, `files.upload`, `functions.sendInvoice.call`. `role:editors2` and `role:billing` are not listed. Spec: `tests/bmg-005-roles.test.ts` (fixture with lookalikes, array rules, defaults and signup) |
| 5 | *Delete role* → the warning's number, compared with the atom count on disk; then typed the name and deleted | *"5 rules name editors (Order: list; Pet: create, change; The sendInvoice function: call; Files: upload) and will stop matching anyone. 5 people will no longer be in it; their accounts stay."* 5 = 5. Role gone, `security.json` byte-equal, all 7 people still there |
| 6 | at five checkpoints (list, picker open, two members, after bulk, after delete), rendered `innerText` plus every `title`/`aria-label`/`placeholder`, searched for every user and role objectId (whole and first 8 chars) | no hits |

**Gates.** `npm run typecheck` exit 0. Specs: `bmg-005-roles.test.ts` (9),
`admin-app/roles-view.test.tsx` (3), `admin-app/picker.test.tsx` (7: race, `createWhen`,
`openOnFocus` added), and `ops-rate-limit` (tally 92), `ops-audit` (it walks the live route table,
so `PUT admin/roles/:name` owes the `role.update` entry it has), `bmg-004-users`, `cloud-system-roles` and
`hlt-024-exchange-roles` (RoleStore's callers) all pass. Full `npx jest`: 186 suites PASS, 0 FAIL, and
`fed-003` skipped (it needs a live key). The run stalled in `ac2-page-editor-drag-drive`'s write-storm arm under
parallel load, so it was stopped. That file alone is 28/28, exit 0, and its `claimSite` goes through the changed
`RoleStore`.

