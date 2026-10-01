---
id: P78-DBT-SESSIONS
title: A sign-in session never expires, by any door
status: needs-ruling
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
