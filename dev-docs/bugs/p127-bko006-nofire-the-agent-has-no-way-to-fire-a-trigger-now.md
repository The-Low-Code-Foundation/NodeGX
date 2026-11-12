---
id: P127-BKO006-NOFIRE
title: The agent cannot fire a trigger to test it, so it re-times the person's real schedule to every minute and back
status: fixed
severity: low
area: "noodl-mcp backend tools: the backend's `POST /admin/triggers/:id/fire` (Studio and the admin panel's Test fire) had no tool"
found: P127 BKO-006, 2026-10-27, the book club brief
evidence: "MEASURED in the transcript: update_backend_trigger to cron '* * * * *' (written into nodegx.automations.json), three one-minute waits, then update_backend_trigger back to '0 8 * * 1'."
kit: mcp
regression: packages/noodl-mcp/tests/p127ProjectFiles.test.ts
owner: P127 BKO-006
commit: 2fde69490
---

Fixed: `fire_backend_trigger` (backend group, write-gated) runs a trigger once, now, and answers how it ended and what
its target answered. It changes no schedule and writes nothing to the project.
