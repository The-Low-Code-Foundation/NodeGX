---
id: P115-HST006-LOOPBACK
title: On a Cloudflare Worker a cloud function cannot reach its own backend, so every signed-in call reads as anonymous
status: open
severity: high
area: backend / cloud runtime loopback (`_noodl_cloudservices`, `nodegx-backend/src/workflow/WorkflowRunner.ts`), Workers deploy target only
found: P115 HST-006 s6, 2026-11-04, the backend's own suites against the whole service in a Durable Object
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §7.3
---

**What a person sees, on a Worker:** a cloud function that needs a signed-in caller (*Allow Unauthenticated* off)
refuses every signed-in caller with *Unauthenticated requests not accepted* (500). Record nodes inside a function
are expected to fail the same way (same path, not yet driven).

**Why.** By design the backend points its own cloud runtime at itself over HTTP: `_noodl_cloudservices` = its listen
URL (`http://127.0.0.1:<port>`; WorkflowRunner.ts header, *"Database access from inside functions goes over the
wire"*). The Request node checks the caller with `UserService.fetchCurrentUser` → `GET /users/me`
(`noodl-viewer-cloud/src/nodes/cloud/request.ts:208`). Record, user and config nodes use `/classes` and friends the
same way. On Node that is a TCP loopback. Inside a Worker or a Durable Object nothing listens on 127.0.0.1, so the
fetch fails and the node reads the caller as nobody.

**Measured.** `tests/p127-no-roles.test.ts` against the service in a Durable Object: **0 / 11** (every function
failed with `function.failed … Unauthenticated requests not accepted.`, `principal: user`). With the spike's seam
(a `fetch` to the service's own address is handed to its in-process HTTP handler): **5 / 11**, with 11 `GET /users/me`
routed in-process. The other 6 are P115-HST004-NOCODEGEN. Control: the same suite in Node is 11 / 11.

**The way through, for the Workers target.** Give the runtime an in-process transport where the service runs in a
Worker: the cloud client's `fetch` routed to the service's own handler instead of TCP. The spike does exactly that in
`spike-backend/src/worker.ts` (seam 4, ~20 lines), with no change to the product. Nothing changes on Node.
