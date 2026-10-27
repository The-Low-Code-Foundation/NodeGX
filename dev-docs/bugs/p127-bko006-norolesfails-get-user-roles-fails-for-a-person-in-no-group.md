---
id: P127-BKO006-NOROLESFAILS
title: Get User Roles answers "That user is in no roles" as a failure, so every ordinary customer's call fails (as measured, its Error is filled on Unchanged and the sentence replaces the author's own refusal)
status: fixed
severity: medium
area: "the cloud runtime's Get User Roles node (noodl.cloud.getuserroles): a person in no group is the failure branch; the agent says a setting meant to treat it as normal had no effect"
found: P127 BKO-006, 2026-10-27, the repair shop brief (REPORT.md item 2)
evidence: "MEASURED in the transcript: consoleErrors 'CloudFunction2 (/Pages/Workshop): That user is in no roles. [cloud-function/call-failed]' for a customer, until the agent wired the failure into its own staff check. The setting's name and its effect are not yet read."
owner: P127 s9 (fixed)
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

## Measured and fixed (P127 s9, 2026-10-27)

**The lab and the transcript were kept after all**: `/private/tmp/bko006/lab/repairs` and `out/repairs/agent.jsonl`.
The setting is `treatUnchangedAs: "done"` (the value, not the label). The agent's first List Jobs (transcript line 346):
Done and Unchanged run its staff check, a script that refuses a non-staff caller with its own reason ("Only shop staff
can see the workshop board.") through the failure Response; Get User Roles' Error is wired to that Response's message
and its Failure to its send. The console error came from the Workshop page's `CloudFunction2` = List Jobs, in a render.

So the customer WAS refused, and rightly (List Jobs is staff only). What was wrong is the words: s7's first unmeasured
guess. On Unchanged, the backend's `list` answer carries `error: 'That user is in no roles.'`, the node fills its Error
output from it (`system-roles.ts`), and that text, wired into the same message, arrives instead of the script's
reason. "Treat Unchanged as" moves the branch, not the Error, so it had no effect, as the agent said.

That exact graph, run on the published backends (0.2.7 tarball shasum `f524a0f0…`, 0.2.8 `e85c6f95…`), a customer in
no groups:

| function | 0.2.7 | 0.2.8 |
|---|---|---|
| List Jobs as written | 400 "That user is in no roles." | the same |
| the same, Treat Unchanged as `done` | 400 "That user is in no roles." | the same |
| control: no wire from Get User Roles' Error | 400 "Only shop staff can see the workshop board." | the same |

Staff were listed in all three. Get User Roles' spec puts a reason on Error with Failure only ("Done with Roles, or
Unchanged when the user is in none; or the reason on Error and Failure"), and the Error output says "Why the last
operation could not be performed"; a read that finds no groups was performed. List Users In Role's `members` answer did
the same for a role with no members.

**Fixed** in `nodegx-backend/src/roles/SystemRoles.ts`: `list` and `members` send no `error` with Unchanged (`code`
stays). Remove User From Role keeps its explanation on Unchanged, as its spec says ("Error says which").
`p127-no-roles.test.ts` 11/11: the agent's List Jobs, with and without the setting, refuses a customer in the
script's words, and its control; staff listed; an empty role answers Unchanged with nothing on Error. Mutants: the
`list` line back reds the two List Jobs cases; the `members` line back reds the empty-role case. Every backend test
naming the role nodes: 39/39 (cloud-system-roles, def005-membership, this one). No template wires a role node's Error.
