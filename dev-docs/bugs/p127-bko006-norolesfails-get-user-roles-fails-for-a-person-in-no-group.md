---
id: P127-BKO006-NOROLESFAILS
title: Get User Roles answers "That user is in no roles" as a failure, so every ordinary customer's call fails
status: open
severity: medium
area: "the cloud runtime's Get User Roles node (noodl.cloud.getuserroles): a person in no group is the failure branch; the agent says a setting meant to treat it as normal had no effect"
found: P127 BKO-006, 2026-10-27, the repair shop brief (REPORT.md item 2)
evidence: "MEASURED in the transcript: consoleErrors 'CloudFunction2 (/Pages/Workshop): That user is in no roles. [cloud-function/call-failed]' for a customer, until the agent wired the failure into its own staff check. The setting's name and its effect are not yet read."
owner: none — does not reproduce at HEAD (P127 s7); needs the transcript's graph
regression: packages/nodegx-backend/tests/p127-no-roles.test.ts
---

"In no groups" is an answer (an empty list), not an error, for every app with staff and customers.

## Measured (P127 s7, 2026-10-27): does not reproduce at HEAD

`p127-no-roles.test.ts`, a signed-in-only function, Get User Roles on the caller, one Response per wired branch, called
by a customer in no groups and by a member of `staff`:

| the function's shape | customer (no groups) | staff |
|---|---|---|
| Done, Unchanged, Failure wired | 200, Unchanged | 200, Done |
| Done and Failure, Treat Unchanged as `done` | 200, Done (the setting works) | 200, Done |
| Done and Failure only | 504 after 30 s: "an outcome node whose `Failure` or `Unchanged` port is unwired answers nothing" | 200, Done |
| Done and Failure, Treat Unchanged as `Done` (the label) | 504, the setting ignored | — |

None of these is "every customer's call fails with 'That user is in no roles.'". Two things that could produce the
stranger's words, unmeasured: the `error` output carries "That user is in no roles." on the Unchanged branch too
(`system-roles.ts` sets it for `unchanged`), so a graph that answers with Error on any branch says it; and the label
spelling, which the runtime ignores but the agent's write check refuses (`parameterValues.ts`: "not the label").
The transcripts were not kept (the round's lab is gone), so the agent's graph cannot be read. To close: re-run the
repair shop brief and keep the lab, or close it as not reproduced.
