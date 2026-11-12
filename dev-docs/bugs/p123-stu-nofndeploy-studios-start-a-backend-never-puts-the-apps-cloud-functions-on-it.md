---
id: P123-STU-NOFNDEPLOY
title: Studio's Start a backend never puts the app's cloud functions on it, so every workflow step that runs one fails
status: fixed
commit: nodegx-studio bd4fff1
severity: medium
area: nodegx-studio / Data → Start a backend (lib/backend.mjs provisionFor), Backend tab
found: STU-093 (Richard's Greenhouse note 4), driving a copy of Greenhouse on its own backend, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § STU-093; picture nodegx-studio docs/look/stu-093-playing.png
---

A copy of Greenhouse (its binding removed, `NODEGX_BACKENDS_DIR` isolated), its backend made by Studio's *Start a
backend*. A Watering was created; the trigger *When a Watering is created* ran the workflow *When a plant is watered*,
whose step 2 calls `Cloud Functions/Mark watered`. The run failed there:

> Step "mark" failed after 2 attempt(s): Step target function "Cloud Functions/Mark watered" not found on this backend

The project has the function (`components/__cloud__/…`, listed in Studio's Backend tab, 6 steps). Studio's
`provisionFor` sets the tables and the declared rules (P123-STU-CHOICENOTENFORCED) and never deploys a function;
nothing else in Studio does either (`grep -i deploy editor/serve.mjs lib/*.mjs`: Deploy to live moves the schema only).
Greenhouse's own backend has its functions because the agent put them there through NodeGX's MCP.

So a person with Studio and no agent (the alpha line: someone downloads, opens, changes, publishes) who opens an app
with functions and starts its backend gets an app whose functions answer "not found", and every backend workflow that
calls one fails. The same holds after they change a function in Studio: the backend keeps the old one, or none.

Not measured: whether Publish (`deploy_to_vm`) carries the functions (it ships the folder, so probably yes); what the
running app's own Cloud Function node gets on such a backend (the same "not found", by the message).

Fix direction: `provisionFor` deploys the project's `__cloud__/` components (through whatever path the agent's tools
use to put them there: not read yet), and a function saved in Studio is redeployed, so *Start a backend* and the
Backend tab tell the same story.

## Fixed (s35, 2026-10-31; landed 2026-11-01)

*Start a backend* puts the app's cloud functions on the backend it started (`serve.mjs`, after the provision's answer), and a function saved in the Backend tab is put there again (`lib/publish.mjs` `deployFunctionsToDev`). Every Studio gate green on 2026-11-01, run one at a time.
