---
id: P127-BKO006-SCHEDULEAUTH
title: A schedule runs its function as a visitor with no sign-in, so a function only members may call has to be made public before a schedule can run it
status: fixed
severity: high
area: "nodegx-backend `TriggerDispatcher.fire` → `runner.run(targetName, { body, headers: {} })`: no caller identity; the Request node's `allowNoAuth: false` (its default) refuses it"
found: P127 BKO-006, 2026-10-27, the book club brief
evidence: "MEASURED in the transcript and the grade: the Monday digest's function (allowNoAuth false) was refused at every fire (HTTP 500); the agent set allowNoAuth true and added a rate limit, and the grade's by-hand fire then ended ok. The function that writes the club's digest is now callable by anyone who can reach the backend."
owner: P127 s7
kit: core
regression: packages/nodegx-backend/tests/p127-schedule-auth.test.ts
ruling: "Richard, 2026-10-27, asked 'what should a run the app starts by itself count as?' with today's harm (2 of 3 agents opened a function to the internet): 'Counts as the app' — schedules, row changes and Studio's run-now pass signed-in-only with nobody signed in; webhooks and direct calls stay visitors"
---

What a person sees: nothing until it matters. To make a weekly job work, the agent opened the function to the
internet. Every app with a scheduled job and members-only functions meets this.

The ruling asked: should a run started by the app's own trigger (a schedule, a row change) count as the backend itself,
passing a function's "signed-in only" check with no user, while a webhook (a stranger's request) stays a visitor?
Recommendation: yes for schedules and row changes, no for webhooks; the function sees no user either way, and the
trigger tools say so. Until then, `SCHEDULEREASON`'s fix at least says why a fire was refused.

**2 of 3 briefs.** The shared-expenses agent met it too (REPORT.md item 8): its monthly job takes unauthenticated calls, mitigated by taking no input, a once-a-month guard and rate limits.

## Fixed (P127 s7, 2026-10-27), Richard's ruling

**Asked:** a weekly job could only run a members-only function after the agent opened it to everyone. What should a
run the app starts by itself count as? Choices given: counts as the app (recommended); schedules only (a row change
stays a visitor, because a visitor who may add rows could set one off); keep today's rule and say so plainly.
**Ruled:** counts as the app.

What changed:

- `nodegx-backend/src/workflow/startedByApp.ts`: `schedule`, `db_change` and `manual` (Studio's "run now", a workflow run
  from Studio) are the app; `webhook` (a hook, `POST /functions/:name`, the MCP door) is not.
- The trigger dispatcher marks such a run `startedByApp: true` on the request it hands the function, and the workflow
  engine marks its function steps (`call-function`, `for-each`, a retried step) the same way. The mark is a field on the
  in-process request, never a header or a body field: every HTTP door copies the caller's headers and body into the run.
- The Request node (`noodl-viewer-cloud` `request.ts`) lets a marked run with no session token past "Allow
  Unauthenticated" off. Authenticated stays false and User Id blank. A run with a token that fails its lookup is
  refused as before.
- The node spec is v4 (`cloud-request.ts`, two scenarios, golden). The world's invocation carries `startedByApp`, and
  the runtime is graded against it. The setting's description says so in the runtime, the spec, both catalogs and the
  editor's library. `create_backend_trigger` says so to the agent.

Graded: `p127-schedule-auth.test.ts` 7/7 (a schedule's own catch-up fire, run now, a row change, a workflow run from
Studio all run the function; a webhook, a webhook-started workflow, a direct call, and a direct call that claims the
mark in a header and the body are all refused). Nine mutants, every one red. Conformance on `noodl.cloud.request`
green, and red with the runtime line reverted. SCHEDULEREASON's test now grades its refusal on a webhook, since
"run now" no longer refuses.

Not live until the backend bundle and `@nodegx/mcp` are released (0.2.8).
