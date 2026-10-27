---
id: P127-BKO006-SCHEDULEAUTH
title: A schedule runs its function as a visitor with no sign-in, so a function only members may call has to be made public before a schedule can run it
status: needs-ruling
severity: high
area: "nodegx-backend `TriggerDispatcher.fire` → `runner.run(targetName, { body, headers: {} })`: no caller identity; the Request node's `allowNoAuth: false` (its default) refuses it"
found: P127 BKO-006, 2026-10-27, the book club brief
evidence: "MEASURED in the transcript and the grade: the Monday digest's function (allowNoAuth false) was refused at every fire (HTTP 500); the agent set allowNoAuth true and added a rate limit, and the grade's by-hand fire then ended ok. The function that writes the club's digest is now callable by anyone who can reach the backend."
owner: none — Richard's ruling first
---

What a person sees: nothing until it matters. To make a weekly job work, the agent opened the function to the
internet. Every app with a scheduled job and members-only functions meets this.

The ruling asked: should a run started by the app's own trigger (a schedule, a row change) count as the backend itself,
passing a function's "signed-in only" check with no user, while a webhook (a stranger's request) stays a visitor?
Recommendation: yes for schedules and row changes, no for webhooks; the function sees no user either way, and the
trigger tools say so. Until then, `SCHEDULEREASON`'s fix at least says why a fire was refused.

**2 of 3 briefs.** The shared-expenses agent met it too (REPORT.md item 8): its monthly job takes unauthenticated calls, mitigated by taking no input, a once-a-month guard and rate limits.
