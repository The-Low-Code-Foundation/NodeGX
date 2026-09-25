# BMG-004 — Users are a collection: custom fields, a user drawer, roles as chips

**Opened 2026-09-24** (README §2 row 1 — Richard's first complaint). **Depends on BMG-001, R3.**
**Status: ✅ built and driven (s4, 2026-09-25) — §6.**

## 1. The person sentence

> **Someone opens Users and sees people, not ids. They add a field to what a user is — a phone
> number, a plan, a company — the same way they add one to any collection. They open a person,
> see and change their details, give or take a role by name, send them a reset, invite someone
> new by email, and can stop one signing in without deleting them.**


> ⚠️ **Measured 2026-09-24 (BMG-001 AC3 drive, `drives/bmg001/readings/ac34.json`):** on a throwaway
> backend with two users, `GET /admin/schema` answers `tables: [Pet, Toy]` — **`_User` is not listed**,
> so the Schema page cannot offer *Add field* on it whatever its code allows, and `#/schema/_User`
> has no card to land on. README §2 row 1's "the capability exists two tabs away" is true of the
> code path and false of the listing. This task owns the fix: either the route lists `_User` (with
> the accounts card the Schema page already knows how to draw) or the Users page adds fields
> through `addColumn` directly. Find out first WHY it is omitted (`byob-admin.ts` schema listing).

## 2. What is wrong, measured

- **Fixed columns.** `view('users')` (`index.html:1500-1583`): `objectId username email verified
  roles created`; the roles column is derived by scanning every role's member list (`:1519`). No
  custom column is shown even if `_User` has one (the schema page can add one: `:1140`).
- **New user** = Username / Email / Password (`:1545-1568`) → `POST /users` (the public signup
  route, `server/users.ts`). No roles at creation, no custom fields, no invite.
- **No detail.** There is no per-user page: no identities (`/users/me/identities` exists for the
  user, no admin read), no sessions, no verified toggle, no edit at all. Actions: *Send reset*
  (through the public anti-enumeration endpoint, honest about not knowing if it went; `:1571`)
  and *Delete* (types the objectId; `:1529`).
- **No disable.** Nothing in `users/`, `server/users.ts`, `auth/model.ts` reads a flag on
  `_User` at login. Deletion is the only way to stop someone. **R3.**
- **Roles from here:** none. Membership is edited on the Roles page only (BMG-005).
- **Search:** none; the page lists 200 (`:1511`).
- The editor's `serverOwnedColumns.ts` names the seven `_User` columns a person must not edit
  (`authData createdAt updatedAt email username emailVerified password`); the page has the same
  list as `ACCOUNT_OWNED` (`:531`). Two copies already.

## 3. What to build

### 3.1 The list
- Columns: **Person** (avatar initial + username, email under it), **Verified** (chip), **Roles**
  (chips), **Joined**, **Last sign-in** (from `_Session` if the store has it; measure), then
  **every custom `_User` column**, typed like any collection cell (BMG-002's editors), with the
  same Columns chooser and `FilterRow`. The list *is* the Collections grid for `_User` with the
  server-owned columns locked and `password`/`authData` never shown.
- Search box over username/email (server `where`, debounced).
- **＋ Add user ▾**: *Create* (drawer: username, email, password with *generate*, roles chips,
  custom fields, *send verification* switch) · *Invite by email* (needs magic links on:
  creates the account without a password and sends the magic link through the existing
  `magicLink` flow; if magic links are off, the item explains and links to Sign-in).
- **＋ Add a field** in the toolbar opens BMG-003's picker on `_User` (`#/schema/_User/new-field`)
  and comes back.

### 3.2 The user drawer (`#/users/:id`)
Sections, top to bottom:
1. **Details** — username, email (with *verified* switch → `PUT /api/_User/:id {emailVerified}`),
   every custom field as its typed editor. Server-owned fields read-only with the reason on hover.
2. **Roles** — chips with ✕ (`DELETE /admin/roles/:name/users/:id`) and a `Picker` of roles
   to add (`POST /admin/roles/:name/users`).
3. **Sign-in** — how they sign in: password (*set a new password* → `PUT /api/_User/:id
   {password}`), linked identities (provider + subject; admin read route needed:
   `GET /admin/users/:id/identities` — small, reads `_UserIdentity`), magic-link eligibility.
   *Send password reset* stays honest as today.
4. **Sessions** — count and *Sign out everywhere* (deletes their `_Session` rows; the same op
   the delete confirm says it does not do today — make it do it).
5. **Status** — **Disable sign-in** switch (R3): writes `disabled: true` on `_User`; login,
   magic link, OAuth callback and session validation refuse with one message (*"This account is
   disabled"*); sessions revoked on the press; the list shows a *disabled* chip; the filter row
   can find them.
6. **Danger zone** — *Delete user* (type the username), which also revokes sessions.

### 3.3 Backend
- R3: `disabled` column on `_User` (migration on start, like `_UserIdentity`'s), checked in
  `auth/model.ts` at login/session resolution and in the OAuth and magic-link callbacks.
- `GET /admin/users/:id/identities`, `DELETE /admin/users/:id/sessions`.
- Admin create: `POST /admin/users` that bypasses the signup rule (the page today uses the
  public `POST /users`, which the signup rule can refuse), accepts roles and custom fields.

## 4. Acceptance criteria

1. A field added from the Users toolbar appears as a column and in the drawer, and a value set
   there reads back from `GET /api/_User/:id` (drive).
2. Create with two roles: both memberships are in `GET /admin/roles`; the list shows both chips.
3. ✕ on a role chip removes exactly that membership.
4. Invite by email creates the account and one magic-link email is recorded by the email
   subsystem's test transport (the `email-*` tests show the seam).
5. R3: after *Disable sign-in*, `POST /login` with the right password returns 403 with the
   message; an existing session token gets 401; the OAuth callback for that user refuses; the
   switch off restores login (drive).
6. *Sign out everywhere* leaves zero `_Session` rows for that user.
7. Server-owned columns are not editable in the list or the drawer, from **one** list shared
   by page and backend (the page reads it from `whoami`; the editor's copy dies in BMG-012).
8. 🔴 No id is shown as a label anywhere on the page; ids appear only in a *Copy id* action.
9. Search finds a user by a middle fragment of their email.

## 5. Watch for

- `POST /users` runs the signup rule (`security` `signup`); a locked backend refuses the page's
  *New user* today. §3.3's admin route is the fix, not relaxing the rule.
- `emailVerified` is skipped by the record form on purpose (`:988`); the switch in §3.2 is the
  deliberate admin path and must be audited (BAK-009 audit trail: add the action).
- The Parse-wire `_User` has `password` hashed at write by the store; `PUT /api/_User/:id
  {password}` — measure that it hashes (the runtime's Set User Properties path does).
- The MCP has user tools (`toolSurface.ts`); a disabled flag is a new field the MCP's `_User`
  vocabulary should name (memory: NEW TYPE/FIELD owes the MCP a mention).

## 6. Built (s4, 2026-09-25)

**Why `_User` was missing from Schema (the §1 finding), measured.** Both schema managers'
`listTables()` and `exportSchemas()` drop every `_`-prefixed table on purpose
(`SchemaManager.ts:509`, `PgSchemaManager.ts:618`), and the MCP tool surface and the Supabase
export rely on that. So the listing was not changed: `GET /admin/schema` (only; `byob.getSchema(res,
true)`) appends `_User` with its `_`-columns hidden. The BYOB `GET /api/_schema` is unchanged — its
readers never asked for it. The Schema card calls it **Users** (chip *accounts*, *Open people*),
and Collections leaves it out: people are edited where a password is hashed.

**Four defects measured on the doors this page stands on, all fixed here** (probe on a locked
backend, then pinned by `tests/bmg-004-users.test.ts`):

| # | measured before | now |
|---|---|---|
| 1 | `GET /api/_User` (admin) sent `_hashed_password` (the scrypt string) to the browser; the `/classes` door always stripped it | BYOB strips `_`-columns and `password` on every `_User` read (`byob-admin.ts` `forWire`) |
| 2 | `POST`/`PUT /api/_User {password}` stored it **as text** in an auto-created `password` column, and the person could not sign in with it (`/login` 404) | refused, 400, naming `PUT /admin/users/:id` (`assertAccountWrite`, also in `/api/_batch`) |
| 3 | a signed-up person could `PUT /users/:id {emailVerified: true}` on themselves → `emailVerified: true`, past any `requireForLogin` | `emailVerified` and `disabled` stripped on that route (`ADMIN_ONLY_USER_FIELDS`) |
| 4 | found by this task's own spec: with the disabled check after the linking rule, a magic link pressed for a **disabled** account ran rule 5 and **wiped its password** — re-enabled, the person could not sign in | the check moved into `resolveSignIn`, before rule 1's and rules 4/5's writes |

**Backend.**
- `users/accountColumns.ts` — THE list of server-owned `_User` columns with the hover reason
  (served on `whoami.accountColumns`; the page keeps no copy, AC7), `isAccountDisabled`, the
  sentence *"This account is disabled."*
- R3: `_User.disabled` (Boolean, idempotent `addColumn` at start like `_Session.expiresAt`). Refused
  at every door: `/login` (403, code 119, only AFTER the password matched — no oracle), session
  resolution in both `UserRoutes.requireUser` and `SecurityState` (400/209), a key acting as them
  (401), `resolveSignIn` (OAuth and magic links, before any write), `SystemUsers.verifyToken`.
  Disabling revokes their sessions on the press.
- `server/admin-users.ts` — `GET/POST /admin/users`, `GET/PUT/DELETE /admin/users/:id`,
  `GET /admin/users/:id/identities`, `DELETE /admin/users/:id/sessions`. Every write through
  `SystemUsers` (hashes, refuses `_`-keys). Create takes roles (all must exist, nothing written if
  one does not), custom fields, *send verification*, or `invite` (checked BEFORE the account is
  made; the magic link is sent by `OAuthRoutes.sendInvite`, which answers honestly rather than
  with the public route's anti-enumeration silence). Delete also removes memberships and
  identities. Audited as `user.create / user.update / user.delete / user.sessions.revoke` with the
  keys changed, never values. Route tally 81 → 88, reviewed.
- MCP: `list_user_identities` now reports `account: { disabled, hasPassword }` (absent on an older
  backend). Budget unchanged, 8,255 of 8,280 (the backend group is deferred).

**Page** (`views/users.tsx`, rewritten). List: Person (initial + name, email under), Verified,
Roles as chips, *Signed in* (see below), Joined, then every custom column; search (server
`contains` over username/email, debounced); *Everyone / Disabled / Email not verified*; paging by
50. Toolbar: *Add user*, *Invite by email* (when email exists), *Add a field* (Schema's
`AddFieldDialog`, now exported, opened in place). Drawer `#/users/<id>`: Details (username, email,
custom fields typed, *Email verified*), Roles (chips + picker, each press writes), Sign-in (password
or not, identities, *Set a new password* with Generate, *Email them a reset link*), Sessions (*Sign
out everywhere*), Status (*Disable sign-in*, confirmed), Danger zone (delete, typing the username).
`#/users/new`, `#/users/invite` (says so, and disables Send, when magic links are off).

**Deviations from §3/§4, each a measurement.**
- *Last sign-in* is *Signed in* — "newest sign-in still active · N devices". `_Session` rows are
  deleted on logout, so the newest row is not the last sign-in, and a column called that would say
  *never* about someone who signed out yesterday.
- AC5's "an existing session token gets 401" is **400 code 209** — the invalid-session code, the
  one that makes the client drop its stored session; 401 would leave it holding a dead token. The
  token is also simply gone: disabling deletes the row.
- Custom columns are shown in the list and edited in the drawer, not in the cell (in-cell editing
  is BMG-002's grid, not built yet).
- *Add user ▾* is two buttons (the kit has no menu). `#/schema/_User/new-field` is not needed: the
  dialog opens on the Users page.

**Gate readings (2026-09-25).** `npm run typecheck` (both tsconfigs) exit 0. Full `npx jest` in
`packages/nodegx-backend`: exit 0, **182 suites passed, 1 skipped; 2,129 passed, 16 skipped**. (The
first full run was red by exactly the two contracts this task changes — `ops-rate-limit`'s tally,
+7 admin routes, and `service-http`'s "`/admin/schema` lists no `_` table", now "lists `_User` and
no other"; both rewritten with the reason.) `noodl-mcp`: `toolDisclosure` + `backendTools` 47/47
+ the new identity test. Bundle **38,836 gzip** (122,106 raw) of 160,000 (was 35,080).

**Drive** (`drives/bmg004/run.sh ac seed` — locked backend, `signup: nobody`, on 8697; seeded
through `/admin/users`; headless Chrome on 9333; readings `drives/bmg004/readings/ac.json`; shots
`shots/bmg004-*.png`):

| AC | reading |
|---|---|
| — | the old page's door on this posture: `POST /users` **403** (signups disabled); `POST /admin/users` 201 |
| 1 | *Add a field* → `phone` → header gains `phone`; ann's drawer shows it; typed `+44 7700 900123`, Save → `GET /api/_User/:id` `phone` **equals it**; the list cell shows it |
| 2 | *Add user* dan, Generate (`xxxx-xxxx-xxxx-xxxx` shape ✓), roles *support* + *billing* by picker, phone → `/admin/roles`: support ✓ billing ✓, phone read back; the drawer opens on the new person |
| 3 | bob `[editors, billing]` → ✕ billing → chips `[editors]`; server editors ✓ billing ✗ |
| 4 | magic links off: the invite drawer says so and *Send invitation* is disabled. The send itself (one magic-link mail, password-less account, roles) is the spec's, through the mailer's test transport — the CLI backend has no SMTP |
| 5 | ann 2 sessions → Disable (confirm names what it does) → **0**; `POST /login` right password **403 "This account is disabled."**; drawer notice; *Disabled* filter finds `ann`; switched off → login **200**. The spec adds: old token 209, wrong password still 404, bound key 401, magic link refused with no session and the password intact, audit `user.update {disabled: true, sessionsRevoked}` |
| 6 | bob 1 → *Sign out everywhere* → **0**; drawer *Not signed in anywhere.* |
| 7 | hover reasons on Username/Email from `whoami.accountColumns` (`authData disabled email emailVerified password username`); the Schema card locks username, email, disabled, emailVerified, leaves `phone` editable; `PUT … {properties:{email}}` 400 (spec) |
| 8 | every objectId, full and 8-char, searched in `#main` + drawer + modal text at the list, ann's drawer, bob's drawer, after create: **`leaks: []`** |
| 9 | search `ob@exam` → `[bob]` |

`no page errors` from the CDP console.

**Out.** In-cell editing of custom fields (BMG-002). Postgres not measured (no `DATABASE_URL`
here): the `disabled` column, the `$in` over `_Session` in the list, and `contains` search are
sqlite readings only. A light-theme shot. The editor's `serverOwnedColumns.ts` copy dies with its panel
in BMG-012.
