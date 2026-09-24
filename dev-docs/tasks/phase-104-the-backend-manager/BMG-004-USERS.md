# BMG-004 — Users are a collection: custom fields, a user drawer, roles as chips

**Opened 2026-09-24** (README §2 row 1 — Richard's first complaint). **Depends on BMG-001, R3.**
**Status: 📋 not started.**

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
