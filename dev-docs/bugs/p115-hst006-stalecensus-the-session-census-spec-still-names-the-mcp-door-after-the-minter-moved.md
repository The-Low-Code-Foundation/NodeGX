---
id: P115-HST006-STALECENSUS
title: The session census spec still named the MCP door after its session minter moved, so isl040-sessions was red
status: fixed
commit: 816929bcf
severity: low
area: backend / tests (isl040-sessions)
found: P115 HST-006 s6, 2026-11-04
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §7
kit: core
regression: packages/nodegx-backend/tests/isl040-sessions.test.ts "no source file but the session module (and the acting-key door, which sets its own minute) creates a _Session row"
---

`packages/nodegx-backend/tests/isl040-sessions.test.ts` has a source census: only `auth/sessions.ts` and one door
that sets its own one-minute end may call `rawCreate('_Session', …)`. It listed that door as
`server/mcp/McpRoutes.ts`. P124's `98785a116` (2026-10-25, *a key bound to a person runs a function as them over
/functions too*) moved the minting into `server/actingSession.ts` (`sessionForActingKey`), which `/mcp` and
`POST /functions/<name>` both call. The case has been red since: 10 of 11 in Node.

Nothing is unsafe. `actingSession.ts:43` still writes `expiresAt` a minute out, which is the property the census
guards (no door mints a session that never ends).

Found because HST-006 s6 ran the suite as the Node control arm beside the Durable Object arm; the red was in both arms.

**Fixed** in the same session: the census names `server/actingSession.ts`; the suite is 11/11 in Node.
