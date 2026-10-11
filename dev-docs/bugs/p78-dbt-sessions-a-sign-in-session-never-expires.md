---
id: P78-DBT-SESSIONS
title: A sign-in session never expires, by any door
status: fixed
commit: PENDING
phase: P109
task: ISL-040
severity: medium
area: backend / auth sessions
found: P78 Digital Bricks Training template, TASK-L185, 2026-10-01; re-read at HEAD 2026-10-01
evidence: digital-bricks-training repo dev-docs/sprints/sprint-53-the-first-real-client/TASK-L185-the-privacy-floor.md ("Found in NodeGX, not fixed here")
regression: packages/nodegx-backend/tests/isl040-sessions.test.ts
---

Somebody signs in to a NodeGX app on a shared or lost device and never signs out. That session works for
ever: there is no idle timeout and no maximum age. The template's privacy notice had to say *"a sign-in lasts
until you sign out"* because that is the truth.

**Where.** `_Session.expiresAt` exists and `findSession` honours it (`server/users.ts:114`,
`sessionExpiryMs`), but nothing that signs a person in writes it: `server/users.ts:250` and `:319`
(`POST /login`, `POST /users`), `server/oauth-routes.ts:475` (the magic-link and provider exchange) and
`admin/AdminDashboardRoutes.ts:348`/`:393` all call `rawCreate('_Session', { sessionToken, userId })`. The
`service.ts:963` comment states it as the contract: *"a session that lives until it is revoked"*. Only the
cloud runtime's `Users.impersonate()` sets an expiry.

**Reproduce.** Sign in, wait any length of time, call `/users/me` with the token: 200.

**Needs a ruling** because it is a contract change: which lifetime (an absolute maximum, a sliding idle
window, or both), and whether it is per backend in `auth.json`. **Proposed fix:** one
`sessionLifetime` setting read by a single `mintSession()` that every door above calls. The column and the
reader are already there, so the fix is the writer.

**Ruled by Richard, 2026-10-11 (P109 s41, asked in plain words):**
- **Q:** *"When someone signs in to a NodeGX app, that sign-in never runs out. On a lost or shared phone it keeps
  working until somebody signs out. DBT's privacy notice had to say 'a sign-in lasts until you sign out'. What should
  happen?"*
- **A:** **"Ends after 30 days unused"**: a sign-in nobody has used for 30 days stops working, and each backend can
  change the number on its Sign-in page.

**To build (ISL-040 AC3):**
- A sliding idle window, default 30 days, kept in `auth.json`, editable on the Sign-in page.
- One `mintSession()` for every door that creates a `_Session` (`server/users.ts` login and signup,
  `oauth-routes.ts`, `AdminDashboardRoutes.ts`), writing `expiresAt`.
- Each use moves it on. `findSession` already honours `expiresAt`.
- Rewrite `service.ts`'s "a session that lives until it is revoked" comment.

**Built, P109 s42 (2026-10-11).** Re-measured first at `84396782b`: `tests/isl040-sessions.test.ts` red 9 of 11 on the
old code (the two green arms are the known-firing control and the fixed-end row, which old code also left alone).
- `auth/sessions.ts` `Sessions`: `mint()` writes `expiresAt` = now + the window and `renews: true`. `resolve()`
  refuses an ended row and moves a renewing row's end on, at most once a day. `settle()` gives an end to every row
  minted before this change, and pulls in ends past a window made shorter.
- All five doors mint through it: `POST /login`, `POST /users`, the provider and magic-link exchange, and the
  manager's `/_admin/login` and `/_admin/setup`. A source census in the spec allows only `auth/sessions.ts` and the
  MCP door's one-minute session to create a `_Session` row.
- All three readers resolve through it. Two of them never read `expiresAt` before, filed as `P109-S42-ENDEDREADS`.
- `auth.json` `sessions.idleDays` (default 30, 1 to 3650), set through `PUT /admin/auth` and the Sign-in page's
  "Staying signed in" card. A smaller number settles the sessions already out.
- A row with a fixed end (impersonation, the MCP door) is not moved on by use.

For DBT: the privacy notice can now say a sign-in ends after 30 days unused.
