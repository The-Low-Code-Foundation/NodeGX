---
id: P132-RUNERRORNOREASON
title: A workflow run that a step halts says "A step failed with no error route" and nothing else; an agent cannot learn which step or why
status: fixed
phase: P132
task: BWF-004
severity: medium
area: nodegx-backend / workflow engine (the run result), noodl-mcp run_backend_workflow
found: BWF-004 AC4's agent round 2 on a Greenhouse copy, 2026-11-03 (s5)
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/BWF-004-FORMULAS-WITHOUT-CODE.md (s5, AC4)
launch: beta
---

An agent testing a workflow it had just written ran it through `run_backend_workflow` and got back
`"status":"error"`, `"error":"A step failed with no error route; the workflow halted."` Its probe computed the same
formula three ways, one of them over a path that held nothing (`previous.result.wateredAt`); the run did not say which
step failed or why. The MCP has no tool that reads a run's per-step record (the description points at the History
Panel, a screen), so the agent changed the workflow and ran it again to find out by elimination.

The step's own message was good and already recorded per step: *"Time between" needs a date … for from, got nothing
(the value is missing). A value that may be missing needs "First that is not empty" (default) around it.* Only the
run's summary dropped it (`WorkflowEngine.ts`, the `unroutedError` branch).

**Fix:** the run result carries `failedStep: { id, name, message }` and its `error` says *Step "How many days ago"
failed: <the step's message> It has no error route, so the workflow halted.* Every reader of the result gets it: the
MCP tool, Studio's test, the run route.

**Gate:** `tests/workflow-formulas.test.ts` "a run halted by a failed step says which step and why" pins the sentence.
