---
id: P112-OWN023-NOENFORCETOOL
title: No NodeGX MCP tool turns a local backend's permission rules on, so an agent that finds them off must use the admin dashboard
status: fixed
commit: f2afd62b0
kit: core
regression: packages/noodl-mcp/tests/backendTools.test.ts "set_backend_enforcement turns the rules off and back on"
severity: medium
area: mcp / backend tools
found: P112 OWN-023 round 2 (the gala), arm B, 2026-10-21
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-023/ROUND-2-THE-GALA.md §8; arm B's transcript (s3 scratchpad own023-r2/rounds/B/sittings/1.jsonl)
---

A stranger building a NodeGX app from the kit (0.2.4) wrote permission rules, then found the backend reporting
`devOpen: true, enforced: false` (DEVOPENREAD's cause). In its words: "No MCP tool switches on enforcement, but the
admin dashboard has an 'Enforce my rules on this machine' switch." It reached the switch through the dashboard, then
replaced the backend it had tested on. An agent that doesn't think to look stays on an open backend, with rules
that describe what the app doesn't enforce.

Proposed: a backend tool (or a `provision_backend` option) that turns enforcement on and says so in its result, and
`get_project_info` naming `devOpen` while it is on. Small. Related: P112-OWN023-DEVOPENREAD (open), P104-DEVOPEN (fixed).

**Fixed, P112 OWN-026 FIX-01 (2026-10-22).** `set_backend_enforcement({ enforced })` in the backend tool group
(deferred: costs the resident surface nothing). It writes `devOpen` through `PUT /admin/permissions`, reads the
backend back, and answers `enforced` with a note on what that means for queries, sharing and shared values. The spec
reads the consequence: an anonymous `GET /classes/…` goes 403 → 200 → 403 as the tool moves. `provision_backend`
now answers `rules: { enforced, note }` (read back off the backend), and a new backend is enforced from the start
(P112-OWN023-DEVOPENREAD), so the tool is for a backend made dev-open before.
