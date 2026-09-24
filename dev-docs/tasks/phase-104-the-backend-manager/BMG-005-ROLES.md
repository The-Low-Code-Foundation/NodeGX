# BMG-005 — Roles: named members, add by search or email, and what a role unlocks

**Opened 2026-09-24** (README §2 row 6). **Depends on BMG-001, BMG-004.**
**Status: 📋 not started.**

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
