---
id: P127-BKO006-WFRESULTPATH
title: The call-function step says its output is the function's response body; a NodeGX function answers `{ result: … }`, so `previous.items` is empty and the agent's first monthly run failed
status: fixed
severity: medium
area: "nodegx-backend `workflow/steps/kinds.ts` (call-function `output`, served by list_backend_step_kinds); the cloud Response node answers `{ result: <its values> }` (noodl-viewer-cloud `nodes/cloud/response.ts:182`)"
found: P127 BKO-006, 2026-10-27, the shared-expenses brief (REPORT.md item 6)
evidence: "MEASURED: the step kind the agent was served said 'The function's parsed 2xx response body'; READ: response.ts:182 answers JSON.stringify({ result: responseParameters }); the stranger's workflow read previous.items, its first monthly run failed, and previous.result.items worked."
kit: core
regression: packages/nodegx-backend/tests/workflow-param-mapping.test.ts
owner: P127 BKO-006
commit: 412a19833
---

Fixed (words): the step's output now says a NodeGX function answers `{ result: … }`, read as
`previous.result.<name>`. A mapping that unwrapped `result` would be a behaviour change for every existing workflow,
so it is not made here.
