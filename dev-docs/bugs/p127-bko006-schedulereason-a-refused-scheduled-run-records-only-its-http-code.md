---
id: P127-BKO006-SCHEDULEREASON
title: A trigger whose function refuses it records "Target returned HTTP 500" and drops the reason the function gave
status: fixed
severity: medium
area: "nodegx-backend `TriggerDispatcher.fire` (`src/triggers/dispatcher.ts`): the response body was kept for the caller and left out of the fire's `lastResult.error`"
found: P127 BKO-006, 2026-10-27, the book club brief
evidence: "MEASURED in the transcript: get_backend_trigger lastResult { ok: false, statusCode: 500, error: 'Target returned HTTP 500' } for a function that takes no call without a signed-in person. The agent guessed the cause and made the function public (see P127-BKO006-SCHEDULEAUTH)."
kit: core
regression: packages/nodegx-backend/tests/p127-trigger-reason.test.ts
owner: P127 BKO-006
commit: 2fde69490
---

Fixed: `lastResult.error` is `Target returned HTTP <code>: <what the function said>` (its `error` or `message`, cut at
300 characters), and the bare code when it said nothing. Not in the deployed backends until the backend bundle and
`@nodegx/mcp` are released.
