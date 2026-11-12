---
id: P127-BKO006-TRIGGERNAME
title: A trigger takes a function name the backend does not serve, says nothing, and fails at every fire
status: fixed
severity: medium
area: "noodl-mcp `create_backend_trigger` / `update_backend_trigger` (`src/tools/backendTools.ts`); a function is served under its folder (`Cloud Functions/Weekly Digest`) and `deploy_cloud_functions` reports it as `/#__cloud__/Cloud Functions/Weekly Digest`"
found: P127 BKO-006, 2026-10-27, the book club brief (transcript `out/bookclub/agent.jsonl`)
evidence: "MEASURED in the stranger's transcript: deploy answered `/#__cloud__/Cloud Functions/Weekly Digest`; `create_backend_trigger` with target 'Weekly Digest' answered the stored trigger and no warning; the first fire's lastResult: 'Trigger target function \"Weekly Digest\" not found on this backend'. The agent only found it by re-timing the trigger to every minute."
kit: mcp
regression: packages/noodl-mcp/tests/p127FunctionTarget.test.ts
owner: P127 BKO-006
commit: 2fde69490
---

Fixed: the trigger tools read a function target against what the backend serves (`backend/functionTarget.ts`). The
short name and the deploy answer's own spelling become the served name, said in `targetResolved`; a name two functions
end with is refused, naming both; a name nothing serves is kept (a trigger may come before its function's deploy) with
a `warning` that it fails at every fire, listing what is served. A workflow's call-function step is not checked here.
