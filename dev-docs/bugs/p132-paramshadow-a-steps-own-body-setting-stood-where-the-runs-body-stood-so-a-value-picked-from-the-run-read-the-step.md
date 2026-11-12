---
id: P132-PARAMSHADOW
title: A step's own "body" setting stood where the run's body stood, so a value picked from the run's body read the step instead
status: fixed
phase: P132
task: BWF-007
severity: high
area: nodegx-backend / workflow executors that resolve their own params (http-request, the four record steps, send-email)
found: BWF-007's first test, a Send an email step whose To was `{"$path": "body.email"}` beside its own `body` (the message), 2026-11-03 (s8)
evidence: tests/p132-bwf-006-http-request.test.ts "P132-PARAMSHADOW" (fails on the old code with `got: {}`)
launch: beta
commit: (s8, BWF-007's commit)
---

The engine resolves a step's params against `paramScope` (the run's payload, `previous`, `upstream`), which leaves the
params themselves out on purpose (`WorkflowEngine.ts`, WFA-003's note). `http.ts`, `records.ts` (BWF-005/006) then
resolved `ctx.step.params` AGAIN, against `ctx.scope`, which is `{ ...payload, ...resolvedParams, upstream }`. There a
param named `body`, `query` or `headers` stands where the run's own `body` stood. So a value picked from the run's body
in a step that also has a `body` setting reads the step's setting: WORKFLOW-NODES.md's own *Call an API* example,
`"body": { "text": { "$path": "body.message" } }`, sent `{}` (measured: the API received `{}` where `water the fern`
was the run's message). For Send an email, `to: {"$path": "body.email"}` beside the message came out empty.

The executors re-resolve for a reason (`http.ts`: `ctx.input` merges a webhook's own `headers` / `query` / `body`
with the step's, so reading params from `input` would send the caller's headers on), so the fix keeps that and gives
them the right scope.

**Fix:** `StepExecContext.paramScope`, set by the engine to its `paramScope`; `http.ts`, `records.ts` and `email.ts`
resolve against `ctx.paramScope ?? ctx.scope`. Gate: the PARAMSHADOW test in the BWF-006 suite, and BWF-007's first
test (`to` from `body.email` beside a `body` formula).
