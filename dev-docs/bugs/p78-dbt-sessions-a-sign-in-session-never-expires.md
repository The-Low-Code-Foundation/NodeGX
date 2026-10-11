---
id: P78-DBT-SESSIONS
title: A sign-in session never expires, by any door
status: scheduled
phase: P109
task: ISL-040
severity: medium
area: backend / auth sessions
found: P78 Digital Bricks Training template, TASK-L185, 2026-10-01; re-read at HEAD 2026-10-01
evidence: digital-bricks-training repo dev-docs/sprints/sprint-53-the-first-real-client/TASK-L185-the-privacy-floor.md ("Found in NodeGX, not fixed here")
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
