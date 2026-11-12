---
id: P115-S9-SITEROUTES
title: On hst-backend-spike a GET to a backend path missing from the Worker's hand list (/mcp, /apps, /executions, /metrics) is answered by the app's page, not the backend
status: fixed
severity: medium
area: P115 spike-backend/src/worker.ts (BACKEND_PREFIXES, the one-origin router); carried into HST-014 as AC4
found: P115 s9, 2026-11-05 — the backend's own security-enforcement suite against the Worker under wrangler dev (route walk: "GET mcp (mcp) -> 200", expected 401)
evidence: curl GET localhost:8795/mcp → 200 text/html (index.html); POST /mcp → the backend
phase: P115
task: HST-014
---

A stranger's GET to the backend's MCP door (and three other route families) on the Worker got the app's page, 200,
instead of the backend's refusal. Nothing leaked (the page is public), but the backend's answer was hidden behind
the page, and any GET route there was unreachable through the site. Cause: the one-origin router decides "backend or
page" from a hand-written list of first path segments (session 7), which missed four of the service's 23.

Fixed in the spike by adding the four (local). The product deploy command (HST-014 AC4) must route by the
service's route table instead, so a new route family cannot fall behind the page again.
