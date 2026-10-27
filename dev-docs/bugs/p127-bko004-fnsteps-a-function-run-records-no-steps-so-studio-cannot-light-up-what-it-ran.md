---
id: P127-BKO004-FNSTEPS
title: Studio says a cloud function's last run in a line but does not light the nodes it ran, though the backend records them by node id
status: open
severity: low
area: "nodegx-studio editor/studio.html `readFnRun` (reads the run LIST, `GET /executions?kind=function`, never the run itself) and `fnCard` (no lit class). NOT the backend: a function run records one step per action by node id, and `GET /executions/<id>` serves them (measured P127 s10)"
found: P127 BKO-004, 2026-10-26, building "the last run lit up" for a function's graph (STU-026 s22 lights a page workflow's last run from the runtime's own trace in the preview frame; a function runs on the backend, where no such trace is kept)
evidence: "READ (no drive): `WorkflowRunner.ts` ~780–830 starts one execution per function call and logs no step per node; the admin Runs page shows `steps` only for a backend workflow's runs. MEASURED in Studio's hosted-check (BKO-004): after one call of an agent-made function, `GET /executions?kind=function&name=…` gives one row (startedAt, status, durationMs, errorMessage) and nothing that names a node."
regression: none yet — the day a function run records its nodes, nodegx-studio `editor/hosted-check.mjs` "after one call on the backend, its last run is said" grows a "the steps it ran are lit" line
owner: none (Beta sweep s18 read it and left it: feature-sized, the cloud runner noting each node plus Studio lighting them; P127 BKO-005 reads the same records for workflows and triggers; take it there if a lit run is wanted for both)
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

**Re-measured, P127 s10 (2026-10-27): the backend half was never missing.** The row's area was a READ, and its one
measurement was the run LIST, which carries no steps for any run. DEF-004 (`def004-execution-steps.test.ts`) has had a
function run write one step row per action invocation (UUID, Response, Log, Records, HTTP, User and role nodes: anything
through `beginOutcome`) since 2026-09. A new case there drives the route Studio would read: `GET /executions/<id>` of a
function run, as admin, answers `kind: "function"` and `steps` by node id (`u1`, `u2`, `res`), 10/10. Not recorded: nodes
that neither succeed nor fail (Request, Script, Condition, String Format…), which is DEF-004's stated line.

What is left is Studio's half only, small: in `readFnRun`, after the newest run is found, fetch
`/api/backend/executions/<run.id>` (the backend workflow view's `readAutoRun` already does exactly this) and keep the step
node ids and the failed one; in `fnCard`, give those cards the page workflow's `.ran` (and the failed one `.refused`), the
Request card too when the run exists; `hosted-check.mjs` "after one call on the backend, its last run is said" grows "the
steps it ran are lit". Not built in s10: a peer was editing `studio.html` at the time.
