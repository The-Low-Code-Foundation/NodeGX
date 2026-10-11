---
id: P109-S42-ENDEDREADS
title: A session past its end still read /classes and still passed Verify Session Token; only /users/me refused it
status: fixed
commit: PENDING
phase: P109
task: ISL-040
severity: high
area: backend / auth sessions (`security/state.ts` resolvePrincipal, `users/SystemUsers.ts` verifyToken)
found: P109 s42, 2026-10-11, while building P78-DBT-SESSIONS, measured at 84396782b by `tests/isl040-sessions.test.ts` "a session whose end has passed"
evidence: this file; the spec's red reading on the old code
regression: packages/nodegx-backend/tests/isl040-sessions.test.ts
---

A `_Session` row whose `expiresAt` had passed still worked everywhere but `/users/me`. CWF-015 taught one reader
(`UserRoutes.findSession`) to read the column. The access check behind every data route
(`SecurityState.resolvePrincipal`) and the cloud Verify Session Token node (`SystemUsers.verifyToken`) each looked the
token up by itself and never read it.

**Who it reached.** Before P78-DBT-SESSIONS nothing that signed a person in wrote an end, so the rows it reached were
the ones minted with a fixed end: the cloud runtime's `Users.impersonate()` (one hour by default) and the MCP door's
one-minute session for a bound key. An impersonation session kept reading and writing data after its hour. Once
SESSIONS writes an end on every sign-in, this would have made the 30-day rule a rule for `/users/me` only.

**Measured (old code, 84396782b).** Sign up, set the row's `expiresAt` a minute in the past, then:
`GET /classes/Notice` → `200` (a locked backend, `authenticated` rules); Verify Session Token → `valid: true`;
`GET /users/me` → `400` / `209`.

**Fixed** with SESSIONS: `auth/sessions.ts` `Sessions.resolve` is the one reader, and all three call it. An ended row
answers `209` (`invalid session`) on every door, and Verify Session Token answers `valid: false`.
