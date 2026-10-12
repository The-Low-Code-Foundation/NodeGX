---
id: P78-DBT-USERCOLS
title: A cloud function can write any account column, adminAccess included
status: fixed
commit: 6719e4a89
phase: P109
task: ISL-040
severity: high
area: backend / cloud runtime + data path (_User)
found: P78 Digital Bricks Training template, TASK-L185, 2026-10-01; code path re-read at HEAD 2026-10-01
evidence: digital-bricks-training repo dev-docs/sprints/sprint-53-the-first-real-client/TASK-L185-the-privacy-floor.md ("Found in NodeGX, not fixed here"); packages/nodegx-backend/src/users/accountColumns.ts
regression: packages/nodegx-backend/tests/isl040-account-columns.test.ts
---

A cloud function that saves a `_User` row can set `adminAccess: "full"` (or `disabled`, `emailVerified`,
`username`) on any account, including the caller's own. A mistake in one function, or a function that
copies caller input into a user save, makes somebody an admin of the whole backend.

**Where.** `ACCOUNT_COLUMNS` (`users/accountColumns.ts`) is the list of server-owned columns, and its
docblock says *"the admin user routes refuse a generic write to any of them"*. That refusal is enforced only
in `admin/AdminDashboardRoutes.ts` and `server/admin-users.ts`, the two importers of the list. The records
path a cloud function writes through (`Records.save` → the facade) does not consult it.

**Measured how:** by reading the code path, not by driving a function that does it. The finding in TASK-L185
was the same reading. Driving it is the first step of the fix: a scratch backend, a function that saves
`{ adminAccess: 'full' }` on its caller's `_User` row, then `GET /_admin/whoami` with that session.

**Proposed fix.** Refuse writes to `ACCOUNT_COLUMNS` on the generic data path for every principal except the
admin routes that own them, with a named error saying which dedicated door sets that column. Small, one
check in the facade's `_User` save, plus the drive above as its test.

**Fixed (P109 s41, 2026-10-11, ISL-040).** Re-measured at HEAD by driving it, not by reading:
- With the master key (the loopback credential every cloud function holds), `PUT /classes/_User/<id>
  {adminAccess:"full"}` answered 200.
- The person's own session then opened `/_admin/whoami`: 200. The control beside it was an account granted through
  the Users page, whose session opens it too.
- `/classes/_User` also stored a `password` as text and wrote `disabled`, `emailVerified` and `_hashed_password`.

The fix:
- `accountWriteRefusal` (`users/accountColumns.ts`) is the one refusal. `/classes/_User` (create, update, upsert) and
  BYOB `/api/_User` (and its batch) both call it, for every principal.
- It refuses `adminAccess`, `disabled` and `emailVerified` (`ADMIN_ONLY_USER_FIELDS`, each refusal naming the door that
  sets it), a `password` (it would be stored as text), and any `_` column. Nothing is written.
- **Narrower than the ledger's "every `ACCOUNT_COLUMNS`", on purpose:** `username` and `email` stay writable. A
  function that changes someone's address is ordinary and grants nothing. The doors that own the columns (the Users
  page routes, `PUT /users/:id` for a person's own row, the Create/Update User nodes) never pass through the check.
- Graded: the spec was red on the old code (6 of 8, the attack landing). `auth-linking` had used `/api/_User` as a
  fixture to set `emailVerified`. It now uses the Users page route, 19 / 19. The 53 backend specs that touch `_User` or
  BYOB: 52 green, with `bmg-002`'s known Sunday case red (`P109-S41-SUNDAYWEEK`).
