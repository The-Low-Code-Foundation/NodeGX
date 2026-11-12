---
id: P115-HST004-WARMRUNNER
title: "cloud runtime: on a Cloudflare Worker a CloudRunner answers its first request and refuses every later one as unauthenticated"
status: fixed
commit: 89a11f675
severity: high
area: cloud runtime / CloudRunner (`packages/noodl-viewer-cloud/src/index.ts` `run`), on workerd only
found: P115 HST-004 session 1, 2026-11-04, the functions probe under `wrangler dev`
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-004-A-WORKFLOW-ON-A-WORKER.md §6
kit: core
regression: packages/noodl-viewer-cloud/tests/p115-hst004-warmrunner.test.ts "the next request still answers"
---

A cloud function whose Request node has *Allow Unauthenticated* on answers correctly the first time a Worker runs it
(`echo` → `{"out":"https://app.example"}`, 27 ms), then every later request on the same `CloudRunner` fails with
*Unauthenticated requests not accepted*: the parameter is no longer applied when `sendRequest` runs. A new
`CloudRunner` per request answers every time (6–7 ms each, measured four times). On Node the same graph through one
runner answers every time: `tests/def022-request-origin.test.ts` 15/15 at HEAD, including "two requests through one
runner".

Unmeasured guess at the cause: the runtime's update is scheduled with `setImmediate` (`requestUpdate`, index.ts:122)
and de-duplicated by a "scheduled" flag; workerd drops a callback still pending when the first request ends, so the
flag stays set and the second request's parameters are never applied. A FIFO `setImmediate` did not change it, which
fits a dropped callback rather than an ordering one.

Reproduce: `spike-worker`, `npx wrangler dev -c wrangler.functions.toml --port 8788`, `curl :8788/functions/echo`
twice; then `?fresh=1` twice.

Fix: confirm the cause first (log the flag at the second `run`). A Worker host can build a runner per request today
(the cost measured above); the runtime fix would be to clear a stale schedule at the start of `run`.

**Raised to high, 2026-11-04 (HST-004 §8.7): the workaround costs the free plan.** On the deployed Worker, a fresh
runner per request measured **11, 12, 32 and 11 ms of CPU** for four `POST /functions/subscribe` (`wrangler tail`
`cpuTime`; three refused at the contract, one real call). The Workers Free plan allows **10 ms of CPU per request**
([limits](https://developers.cloudflare.com/workers/platform/limits/)). Every call answered `ok` today, but a site
that runs over the allowance risks Cloudflare's "exceeded resource limits" error, and a person staying on the free plan
is the default case. A runner that answers more than once (this bug fixed) is what brings a function under it.

**Fixed 2026-11-04.** Cause confirmed on workerd: `updateScheduled` is `true` before every run, its clearing
`setImmediate` dropped when the request ended; clearing it made a warm runner answer every time (4 ms), the control
still failed. `CloudRunner.run` now clears a stale flag and asks for the update again inside the request. On the deploy,
with one runner per isolate built at startup: a refused call 2–3 ms CPU, a real subscribe 4–15, an isolate's first
call 25–27 (HST-004 §8.8).
