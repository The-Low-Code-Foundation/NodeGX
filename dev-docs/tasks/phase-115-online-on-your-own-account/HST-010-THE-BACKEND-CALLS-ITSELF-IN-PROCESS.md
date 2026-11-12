# HST-010 — The backend calls itself in-process

**Opened 2026-11-05 (R3 ruled: build the Cloudflare route in P115).** **Depends on HST-006 §7.** **Status: ✅ done 2026-11-05 (session 8).**
Kind: product. Fixes P115-HST006-LOOPBACK (high).

## 1. The person sentence

> **A cloud function that needs a signed-in caller works the same on Cloudflare as on the computer: the person who is
> signed in is the person the function sees.**

## 2. Why

The backend points its own cloud runtime at itself over HTTP (`_noodl_cloudservices.endpoint` =
`http://127.0.0.1:<port>`, `service.ts` step 4). Three places make that request with the global `fetch`:

| who | what it asks | file |
|---|---|---|
| a cloud function's Request node, checking the caller | `GET /users/me` | `noodl-viewer-cloud/src/services/userservice.js` `_makeRequest` |
| Record, Query, User and Config nodes inside a function | `/classes`, `/users`, … | `noodl-runtime/src/api/backends/ParseWireAdapter.ts`, the cloud-runtime branch |
| a workflow's record steps | `/classes` | `nodegx-backend/src/workflow/steps/records.ts` |

Inside a Worker nothing listens on 127.0.0.1, so each of them fails, and the Request node reads the caller as nobody:
*Unauthenticated requests not accepted* (`p127-no-roles` 0/11 in a Durable Object, 11/11 in Node). The spike replaced
`globalThis.fetch` for the whole isolate (seam 4), which is not something a product does.

## 3. What to build

1. `_noodl_cloudservices.fetch`: the transport for requests to the backend's own address. Absent = the global `fetch`
   (Node, today's path, byte for byte).
2. `BackendServiceOptions.loopbackFetch`: the host that runs the service hands it in (on a Worker:
   `httpServerHandler({ port }).fetch`). The service puts it on `_noodl_cloudservices`.
3. The three callers send through `cs.fetch ?? fetch`.
4. The spike's worker passes the option and its global `fetch` replacement is deleted.

## 4. Acceptance criteria

1. Unit: each of the three callers uses the handed transport when there is one, and the global `fetch` when there is
   not (a mutant that ignores the field turns a test red).
2. Node: the backend's own suites unchanged (the option is absent there).
3. The spike without its global `fetch` patch: `p127-no-roles` 5/11 in the Durable Object (the 6 left are NOCODEGEN,
   HST-013), counted in-process by the handed transport.
4. Fixture C still 8/8 on `hst-backend-spike` after a redeploy with the change (no re-seed).

## 5. Not this task

The deploy target's own Worker (HST-014 carries the option there). Code nodes (HST-013).

## 6. Session 8 — 2026-11-05 (Opus 5.5): built and graded

**The change** (36 lines in 6 files): `BackendServiceOptions.loopbackFetch` (`config.ts`, default null, not a CLI flag);
`service.ts` step 4 puts it on `_noodl_cloudservices.fetch` only when given; `globals.d.ts` declares the field; the
three callers send through `cs.fetch` and fall back to the global `fetch`. On Node nothing changes: the option is
absent and every caller makes the same `fetch` call as before.

**AC1, unit + mutants.** `packages/nodegx-backend/tests/p115-hst010-loopback-fetch.test.ts` refuses the global `fetch`
to the backend's own address for the whole suite (a Worker's network), and makes its own requests with the real one.

| arm | `/users/me` (Request node) | Query Records in a function | workflow record step |
|---|---|---|---|
| control, no transport | refused, caller lost (non-200) | — | — |
| `loopbackFetch` handed in | 200, the caller's id ✓ | `count: 2` ✓ | `Aloe` created ✓ |

One mutant per caller, each reverted to the global `fetch`: userservice → `/users/me` and Query Records red (the
Request node checks the caller first); ParseWireAdapter → Query Records red (30 s, the node never answers); records
step → the workflow test red; the service not passing the option → all three red. Restored from a copy each time.
🔴 Learned: `_noodl_cloudservices` is ONE per process (a second service started in the process overwrites the first's),
so the two arms run one after the other, never side by side. And a Query Records node's fetch signal is
`storageFetch`, not `fetch` (a wire into `fetch` is ignored and the function waits out its 30 s).

**AC2, Node.** `p115-hst010`, `p127-no-roles`, `p132-bwf-005-record-steps`, `service-http`: 55/55; `noodl-runtime`
`parse-wire-adapter`: 14/14; `tsc --noEmit` clean in `nodegx-backend`, `noodl-runtime`, `noodl-viewer-cloud`.

**AC3, workerd.** `spike-backend/src/worker.ts` deletes its replacement of the isolate's global `fetch` and passes
`loopbackFetch` (the in-process handler, counted). Under `wrangler dev`, the backend's own `p127-no-roles` through
`remote/jest.remote.config.js`: **5/11**, ledger `loopback: { calls: 11, byPath: { 'GET /users/me': 11 } }`. Same as
seam 4 in session 6; the 6 reds are the List Jobs functions' code node (NOCODEGEN, HST-013).

**AC4, live.** Deployed `f1887406` on Richard's account, no re-seed. `check-campus.mjs --upload` over the internet:
every line ✓ (Ada's link, the production engine, Ada by her id, a made-up id 404, signed out refused, the owner reads
*Ada: Count me in*, the upload 201 and its link 200 signed out, the second account 403), and the service started again
from storage (`autoBoots: 1`). Campus has no cloud function, so this is the no-regression reading and its loopback
count is 0. The loopback was not graded live on purpose: the backend's suites boot FRESH on this Worker and would
wipe Richard's answer; workerd (AC3) is the same runtime.
