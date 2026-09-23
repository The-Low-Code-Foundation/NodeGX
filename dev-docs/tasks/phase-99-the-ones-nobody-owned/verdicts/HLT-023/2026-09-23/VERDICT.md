# HLT-023 — verdict, 2026-09-23

**✅ BUILT. AC1–AC5 met on the default `ops.json`. AC6 belongs to the DBT stream.**

## What changed

- **A function run is charged to the run.** `WorkflowRunner.run` and `invokeFunction` run the
  graph inside `FunctionRuns.within` (`src/workflow/FunctionRuns.ts`). That gives each run a
  128-bit id, held in `AsyncLocalStorage` for exactly the life of the run. The two loopback
  clients read it through `_noodl_cloudservices.currentRunId()` and send it as `X-NodeGX-Run`:
  `ParseWireAdapter` for records, and `userservice.js` for the `users/me` caller lookup.
- **The server honours it only beside the admin credential, and only for a run still in
  flight.** Such a request spends **no client bucket**. It counts against
  `rateLimit.functionRunQueries` (new, default 1000, 0 = unlimited, validated like
  `realtimeMaxConnections`). An unknown or settled id is charged as before. Past the ceiling:
  `429` *Function "x" made more than N backend requests in one run
  (rateLimit.functionRunQueries), so this one was refused. Nobody else's requests are affected.*,
  plus a `function.runQueryCeiling` warning. The access log carries `functionRun: <name>` on
  these requests.
- **`ParseWireAdapter.query` passes the server's error text on**, as `fetch` and the other methods
  already did. It used to drop it, so the ceiling's refusal reached the function as *"Failed to
  query."*. The same callback serves the browser, so a Query Records node that fails in an app now
  carries the server's words too. (`aggregate` has the same drop and is left as it is.)
- Rejected, as §3 said: raising the `data` burst.
- Docs: `BACKEND-OPERATIONS.md` (the config block and a paragraph), `SCALING.md` (tuning table).

## Readings: `hlt023.functions.drive.test.ts`, default limits, real cloud runtime

The instrument wraps `RateLimiter.prototype.check` and tallies every token by `class:key`.

| arm | HEAD (`drive-head.json`) | fixed (`drive-fixed.json`) |
|---|---|---|
| **AC1 control**: 30 alternating calls, 26 requests each | `200 ×17`, then 500s (*"Unauthenticated requests not accepted."*: the caller lookup refused 429); operator's read after: **429** | **`200 ×30`**; operator **200** |
| tally | `data:admin` spent **411**, refused 16 | `data:admin` spent **1**, the operator's own read |
| **AC2 load**: 100 alternating calls, operator read after every 10th | 15 answered; operator `200, 429 ×7, 200, 429` | **`200 ×100`, 100/100 answered; operator `200 ×10`** |
| **AC5**: no 500; nothing internal charged to admin | 500s throughout; `data:admin` 427 | **no 500**; `data:admin` **10** = exactly the operator's 10 reads |
| **AC3**: `functions` burst 5 | ada `200 ×5, 429` naming *functions requests (5/min, burst 5)*; bo in the same instant **200** | identical, correct on HEAD and still correct |
| **AC4 runaway**: 5,000 queries in one run | bucket empty in 157 ms; the next call from **both** learners 500, operator 429 | refused at request 1,001 (lookup + 999 queries = 2,997 rows), **in the function's own words, naming the function and the ceiling**; next calls ada 200, bo 200, operator 200 |

## The spec: `tests/hlt023-function-run-budget.test.ts`

`data` squeezed to burst 5, so a 21-request page would be refused on its first call if its
queries still spent that bucket. The known-firing arm: **the operator's own 6th read is still
refused**, so a pass does not come from a limiter that stopped counting. A made-up run id is
charged as usual. The ceiling refusal is compared word for word. The `FunctionRuns` specs cover
the id following a run through awaits, `setTimeout` and `setImmediate`, two concurrent runs, and
a throwing run being forgotten.

**Mutants**, each caught by name:

| mutant | red |
|---|---|
| M1 records client sends no run id | 3 |
| M2 ceiling ignored | 1 |
| M3 any run id honoured (a forged id) | 2 |
| M4 caller lookup (`users/me`) sends no run id | 3 |

**Suites:**
- `nodegx-backend`: every suite passes except the two `tpl008` drives, and those are the same 10
  tests that fail on HEAD (HLT-022's verdict). `ac2-page-editor-drag-drive`, which deploys two
  functions and drives Chrome, passes **28/28** run alone (293 s). In the parallel run it was still
  going beside another session's browser drive when I stopped it.
- `noodl-runtime` 2,990 passed; `noodl-viewer-cloud` 242/242.
- `tsc --noEmit`: backend, backend tests, runtime and cloud all exit 0.

## Left

- **AC6 is the DBT stream's**: L171's live drive on the default `ops.json`, with no raised limits.
  The deployed bundle (`deploy/artifact/`) is gitignored and built at deploy.
- Not changed: CWF-017's per-function budget, for a function called over loopback from INSIDE
  another run, is still keyed `admin`. It is declared per function and only tightens. It was not
  in this row's reach.
- The access log still says `principal: admin` for a run's requests, now with `functionRun`
  beside it. The audit actor is unchanged.
