---
id: P115-HST004-HTTPLOOKUP
title: "backend: a workflow's Call an API step cannot run on a Cloudflare Worker — workerd's node:http refuses the address guard's `lookup` option"
status: fixed
commit: ef3f7388a
severity: medium
area: backend / workflow step http-request (`packages/nodegx-backend/src/workflow/steps/http.ts` `send`)
found: P115 HST-004 session 1, 2026-11-04, running the backend's own WorkflowEngine under `wrangler dev` (workerd)
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-004-A-WORKFLOW-ON-A-WORKER.md §6, §8
regression: packages/nodegx-backend/tests/p115-hst004-http-transport.test.ts "Call an API through the fetch transport"
---

On a Worker, every workflow that calls an API fails at that step with *Step "send" could not reach http://…: The
options.lookup option is not implemented*. Nothing else in the engine needed changing: validate, return, the value
language and the payload builder ran as they are.

Where: `send()` in `steps/http.ts` makes the request with Node's `http.request(url, { lookup: guardedLookup(…) })`, so
the address it connects to is the one it checked (the guard that keeps a workflow on a VM from calling
`127.0.0.1/admin`). workerd implements `node:http`'s client but not `lookup`, and offers no DNS answer to check.

Reproduce: `dev-docs/tasks/phase-115-online-on-your-own-account/spike-worker`, remove the `[alias]` block from
`wrangler.toml`, `npx wrangler dev`, then `curl -X POST localhost:8787/workflows/subscribe -d '{"email":"a@b.c"}'`.

Proposed fix (small, about 20 lines): `HttpRequestStepExecutor` takes a transport, default the Node one as now; a
Worker host passes one over `fetch` with `redirect: 'manual'` (the step already follows redirects itself, stripping
auth across origins). On a Worker the guard is the platform's: a deployed Worker cannot connect to a private address,
and `checkLiteralHost` still runs on literal IPs. The spike proves the shape with a bundle-time shim
(`spike-worker/src/http-over-fetch.ts`) instead of editing `http.ts`, because P132 BWF-012 had it open and uncommitted
on 2026-11-04. Make the edit after BWF-012 lands.

**Fixed 2026-11-04 (`ef3f7388a`)** as proposed: `steps/httpTransport.ts` holds `nodeHttpTransport` (the default, with
the guard's `lookup`) and `fetchHttpTransport` (`redirect: 'manual'`); the step keeps the redirect loop, the key dropped
across origins, the 10 MB cap's sentence and `checkLiteralHost` before every hop. `CompositeStepExecutorDeps.httpTransport`
is how a host chooses. The spike's shim is deleted. Control on `wrangler dev`: no transport → the lookup sentence again;
`fetchHttpTransport` → success, the stand-in got the email and the key. Deployed to Richard's account the same day.
