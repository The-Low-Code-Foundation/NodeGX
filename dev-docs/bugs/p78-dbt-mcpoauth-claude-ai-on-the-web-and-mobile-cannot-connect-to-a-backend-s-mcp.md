---
id: P78-DBT-MCPOAUTH
title: Claude on the web and on a phone cannot connect to a backend's MCP door, because it takes only an API key
status: open
severity: high
area: backend / MCP (FED-005)
found: P78 Digital Bricks Training template, sprint 55 (TASK-L191), 2026-10-01; re-confirmed on production 2026-10-01
evidence: digital-bricks-training repo dev-docs/sprints/sprint-55-the-trainer-writes/README.md ("The two NodeGX core rows this sprint records"); templates/digital-bricks-training/tools/setup-trainer-key.mjs
---

A trainer who wants their Claude to write lessons for a NodeGX app can only do it from Claude Code (the
terminal, or the desktop app's Code tab). Claude on claude.ai, in the desktop chat, or on a phone cannot
connect at all, so the trainer has to be at the one computer where the key is configured.

**Why.** `POST /mcp` (`packages/nodegx-backend/src/server/mcp/McpRoutes.ts`) authenticates only an API key,
in `X-NodeGX-Api-Key` or as a Bearer token. Measured on `training.digitalbricks.io` 2026-10-01: no key →
401 *"This endpoint needs a NodeGX API key"*; a bad key → 401. A claude.ai custom connector is an OAuth 2.1
client: it needs protected-resource and authorization-server metadata, dynamic client registration, PKCE
and a `resource` check, and it never accepts a pasted header. So no claude.ai surface can reach any NodeGX
backend's MCP door.

**Reproduce.** On claude.ai: Settings → Connectors → Add custom connector → `https://<backend>/mcp`. It
fails to authorise because there is no OAuth metadata to discover.

**Proposed fix.** An OAuth 2.1 authorization server in the backend, whose consent screen signs the person
in with the backend's own sign-in (magic link, password, providers) and mints a token bound to that account
and scoped like an API key. The Digital Bricks Training Next.js product built exactly this for its own
`/api/mcp` (that repo's sprint 50, TASK-L172: `connector_*` tables, hashed codes and tokens, refresh
rotation with reuse detection, every check in the WHERE clause of the one UPDATE that redeems a code), and
it was proven against the real claude.ai connector on 2026-09-22. It is the design to port. Size: a phase,
not a task.
