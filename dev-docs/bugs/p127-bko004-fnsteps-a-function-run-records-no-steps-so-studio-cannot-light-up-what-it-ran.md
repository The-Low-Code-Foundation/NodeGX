---
id: P127-BKO004-FNSTEPS
title: A cloud function's run on the backend records the run, not which of its nodes ran, so Studio can say its last run but not light up the steps it took
status: open
severity: low
area: "nodegx-backend `WorkflowRunner.runFunction` (`execLogger.startExecution({ workflowId: functionName, … kind: 'function' })`, then `cloudRunner.run`): no step rows for a function's nodes; `GET /executions/<id>` answers a function run with its status, duration and error only"
found: P127 BKO-004, 2026-10-26, building "the last run lit up" for a function's graph (STU-026 s22 lights a page workflow's last run from the runtime's own trace in the preview frame; a function runs on the backend, where no such trace is kept)
evidence: "READ (no drive): `WorkflowRunner.ts` ~780–830 starts one execution per function call and logs no step per node; the admin Runs page shows `steps` only for a backend workflow's runs. MEASURED in Studio's hosted-check (BKO-004): after one call of an agent-made function, `GET /executions?kind=function&name=…` gives one row (startedAt, status, durationMs, errorMessage) and nothing that names a node."
regression: none yet — the day a function run records its nodes, nodegx-studio `editor/hosted-check.mjs` "after one call on the backend, its last run is said" grows a "the steps it ran are lit" line
owner: none (P127 BKO-005 reads the same records for workflows and triggers; take it there if a lit run is wanted for both)
launch: beta
---

What a person sees: on Workflow → On the backend, a function says its last run in a line ("● Last run 22:21 ·
refused: Unauthenticated requests not accepted · 12 ms"). A page's workflow, with "Show the last run", lights the
wires it crossed and the steps it ran. A function cannot, because nothing recorded which of its nodes ran.

Why: a function's graph runs inside the backend's cloud runner. The execution store gets one record per call; the
nodes inside it leave no trace unless the graph has a Log node. A backend workflow's runner writes step rows, and a
function's does not.

What it would take: the cloud runner noting each node that fires (its id and when), bounded like the existing
step rows, written to the run's record. Studio then lights them with the same `.ran` classes the page workflow uses.
