---
id: P78-DBT-USERCOLS
title: A cloud function can write any account column, adminAccess included
status: open
severity: high
area: backend / cloud runtime + data path (_User)
found: P78 Digital Bricks Training template, TASK-L185, 2026-10-01; code path re-read at HEAD 2026-10-01
evidence: digital-bricks-training repo dev-docs/sprints/sprint-53-the-first-real-client/TASK-L185-the-privacy-floor.md ("Found in NodeGX, not fixed here"); packages/nodegx-backend/src/users/accountColumns.ts
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
