# BMG-009 — Workflows and Runs: run with a form, find runs with the filter row

**Opened 2026-09-24** (README §2 row 7). **Depends on BMG-001, BMG-002 (`FilterRow`).**
**Status: ✅ built and driven s10, 2026-09-25 — §6.**

## 1. The person sentence

> **Someone runs a workflow by filling in what it needs, watches it in Runs, and finds last
> night's failed runs of one function in two clicks.**

## 2. What is wrong, measured

- **Workflows** (`index.html:2146-2195`): Id · Name · Entry · Steps · *Run*. The Run modal is
  *"Run payload (JSON) — becomes each step's base input"* with a textarea defaulting to `{}`
  (`:2177-2184`). A workflow def can declare inputs (measure: `workflow/` types; if it declares
  none, the form is a `KeyValueEditor`). No cancel from here (`POST /admin/workflow-runs/:id/cancel`
  exists). Authoring stays in the editor's canvas (that is a canvas; it stays — R2 is about
  the *panels*).
- **Executions** (`:2199-2413`) was rebuilt by FED-007 and reads well: summary band, failed
  steps, step table, raw JSON one click away. Its filter is a *Status* select only
  (`EXECUTION_STATUSES`); the route takes `status&limit` and returns a bare array. No filter by
  target, trigger, date; no *Runs of this trigger* link from Triggers.
- The name **Executions** (README §2 row 8) → **Runs** (BMG-001 §3.2).

## 3. What to build

- **Workflows list:** Name · Steps · Last run (chip + when) · **Run** · ⋯ (*Open in the
  editor* — a deep link the editor registers; measure whether `nodegx://` or the launcher
  handles a URL; if neither, omit).
- **Run drawer:** if the def declares inputs, one typed field per input; otherwise a
  `KeyValueEditor` titled *What each step starts with*. **Run** → lands on `#/runs/:id`.
- **Runs page** (`#/runs`): the FED-007 record view unchanged; above it, `FilterRow` over the
  execution record's fields — *status is · kind is (function / trigger / workflow / backup) ·
  name contains · started is within · duration over N s* — backed by a route extension:
  `GET /executions?status&kind&name&since&until&limit&offset` (the store already indexes by
  status; add the rest, paged). *Cancel* on a running workflow. *Runs of this trigger* from the
  trigger drawer is `#/runs?trigger=<id>`.
- Auto-refresh while any run is *running* (SSE if the realtime feature is on; else a 5 s poll
  with a visible *live* chip).

## 4. Acceptance criteria

1. A workflow with declared inputs shows a typed field per input; one without shows the
   key/value editor; both start a run whose base input equals what was entered (drive reads
   `GET /executions/:id`).
2. Filter *status is error and name contains digest and started within past 7 days* returns
   what the route returns for the same query (drive).
3. *Cancel* stops a running workflow and the record says *cancelled*.
4. The status list stays exactly the store's (`admin-dashboard.test.ts:546` keeps grading it).
5. 🔴 No JSON textarea on either page at rest.

## 5. Watch for

- `GET /executions` returns a **bare array** today (`admin-dashboard.test.ts:507`); adding
  paging means an envelope or a header — keep the array shape and add `X-Total-Count`, or
  version the route; the test names the seam.
- FED-007 §2 has Richard's order for what a run record shows; do not reorder it.

## 6. Built (s10, 2026-09-25)

**Where — backend:** `noodl-viewer-cloud/src/execution-history/{types,store}.ts` — `ExecutionQuery` gains
`kind`, `nameContains`, `triggerId`, `minDurationMs`; the WHERE is one helper (`conditionsFor`) shared by
`queryExecutions` and the new **`countExecutions`**; `KIND_SQL` derives a run's kind from its metadata.
`execution/kind.ts` — **`executionKind(metadata)`** is the same rule in TS (`RUN_KINDS`: workflow · function ·
backup · maintenance), and every writer now stamps `metadata.kind` (`WorkflowRunner` function runs,
`BackupManager` backup + restore, `BackupSubsystem`, `FileSubsystem` sweeps; the engine already stamped
`workflow`). `ExecutionStore.ts` `count()`. `byob-admin.ts` **`GET /executions?status&kind&name&trigger&since&until
&minDurationMs&workflowId&limit&offset`** — still a **bare array** (the seam `admin-dashboard.test.ts` names), every
row and record decorated with `kind`, the page count in **`X-Total-Count`**; `since`/`until` read ISO or epoch ms;
an unreadable parameter is a 400 in words. `admin-workflows.ts` — `POST /admin/workflow-defs/:id/run
{payload, wait:false}` answers **202 `{started, executionId, workflowId}`** through FED-004's `onStarted` the moment
the record opens (a bare body is still the payload, `wait` and all; with the history off the route waits as
before); `GET /admin/workflow-defs` answers **`lastRuns`** beside the definitions (never on them — a definition is
what a `PUT` carries back). **No new route** (tally stays `admin: 93`); nothing new to audit.
**Where — app:** `router.ts` — a hash may carry a query (`#/runs?trigger=<id>` → `route.query`; `hrefWith`,
`hashPath`; `App.tsx`'s legacy-id normalisation compares the path, not the query). `api.ts` `apiFull` (the body and
the headers). `filters.ts` — a **`choice`** kind (a select, asked with *is*), per-field **`ops`** allow-list
(`fieldOps`, in the field's order); `FilterRow.tsx` **`flat`** (no *or*, no groups — what a flat route cannot answer
is not offered). `format.ts` **`runStatusWord`** (*cancelled* / *timed out* from the engine's stamp; the store's
three statuses otherwise — `EXECUTION_STATUSES` unchanged, AC4). `views/runs.tsx` — `runsFields`, **`runsQuery`**
(rows → the route's query, pure; an *or*, a group, a field asked twice, a non-number are refused in words and
nothing is sent), `groupFromQuery`, `listQueryString`, `canCancel`; the page: flat filter rows, *Showing a–b of N
where …*, ‹ Newer / Older ›, a **live** chip and a 5 s re-read while any run is `running` (the realtime stream is
per collection — executions are not one — so it is a poll, as §3 allowed), *Cancel* on a running workflow's row
and in its record (confirmed in words), the Trigger cell a link to `#/triggers/<id>` from `metadata.triggerId`.
`views/workflows.tsx` — Name · Steps · Last run (chip + when, linked to the record) · *Runs* · *Run*; the run
drawer at `#/workflows/<id>` with **`inferInputs`** (every `$path` into `body.<name>` in the steps → a row each) or
an empty editor titled *What each step starts with*; *Run* sends `wait:false` and lands on `#/runs/<id>`.
`views/triggers.tsx` — *Runs of this trigger* in the drawer's footer → `#/runs?trigger=<id>`.

**Not built, and why:** *Open in the editor* — the editor registers the `nodegx` URL scheme, but its only handler
opens `noodl:import/http…` (`noodl-editor/src/editor/index.ts`), so the link would open nothing; §3 said omit.
**Declared inputs** — no definition declares any (`workflow/types.ts`), so AC1's first arm is read as *what the
steps read by name*; a schema field nothing writes would be an inert control. **SSE** — see above.

**Specs:** `tests/bmg-009-runs.test.ts` (over sockets: the bare array + `X-Total-Count` + paging; the SQL rule and
`executionKind` agree over eight OLD-shaped records and every kind matches something; AC2 as one query, ISO
`since`, `%`/`_` literal, 400s; trigger + minDurationMs; AC1 `wait:false` → 202, the record's `triggerData.body`
equals what was sent, the envelope without `wait` and a bare body still wait; AC3 cancel → `engineStatus:
cancelled`; `lastRuns` beside, never on, the definitions). `tests/admin-app/runs-view.test.tsx` (AC2 rows → query
incl. every date shape, blanks skipped, refusals; `?trigger=` in and out; AC4 the fields and their operators; flat
rows under jsdom — no and/or, no *Add group*, a choice as a select, operators narrowed; AC1 `inferInputs`; AC3 the
words and who may be cancelled; AC5 both pages over a stubbed backend — no textarea, kind and word per row,
*Cancel* only on the running workflow, the trigger linked, the drawer prefilled). `bmg-002-filters.test.ts` grew a
`state` choice so its "every operator" gate covers the new kind. `noodl-viewer-cloud/tests/execution-history.test.ts`
19/19 (the store it lives in).
**Drive:** `drives/bmg009/run.sh ac seed` — **34/34 checks, no page errors**; shots `shots/bmg009-*.png`; readings
`drives/bmg009/readings.json`. **Gate:** `npm run typecheck` exit 0 (both configs); bundle 79,508 gzip (budget
160,000); full `npx jest --maxWorkers=4` **196 suites PASS, 1 skipped (`fed-003-live-cache`), 0 FAIL, 2350 tests, exit 0, 346 s** (2026-09-25, s10, after every change in this commit).

**What each AC measured:**
1. *Run* on Greet (a `return` of `$path body.name`) opened `#/workflows/greet` with one row, `name`; typed `Ann`,
   added `count · Number · 3`; *Run* → `POST …/greet/run`, the page landed on `#/runs/exec_…`, and
   `GET /executions/:id` said `triggerData.body = {name:"Ann", count:3}`, `status success`, `kind workflow`. Ping
   (reads nothing) opened with an empty editor titled *What each step starts with*; a row `note · hi` → the
   record's body `{note:"hi"}`. Over sockets: the same, plus the two waiting forms.
2. Rows *status is error · name contains digest · started is within the past 7 days* → the page asked
   `?name=digest&since=…&status=error&until=…&limit=50` once; the two rows equal the route's answer to that same
   query (two *Nightly digest* errors), `X-Total-Count: 2`, the sentence *Showing 1–2 of 2 where status is error and
   name contains digest and started is within the past 7 days*; flipping status to *success* → *No runs match*.
3. Slow (a 20 s `wait`) started from its drawer; the page landed on its record saying *running* with *Cancel the
   run*; the list wore *live*; confirmed → `GET /executions/:id`: `status error`, `metadata.engineStatus
   cancelled`, *Workflow run was cancelled.*; the row then read **cancelled** with no Cancel button, no live chip.
4. The status row's select offers `['', running, success, error]` — `EXECUTION_STATUSES`; the suite's union check
   (`admin-dashboard.test.ts`) is untouched and green.
5. No `textarea` on `#/workflows`, in the run drawer, or on `#/runs` at rest; the record's *Raw JSON* stays behind
   its disclosure.
Also driven: the function run fired by the seeded schedule trigger shows *Nightly hello* linked in its Trigger
cell; *Runs of this trigger* from the trigger drawer opens `#/runs?trigger=<id>` with the row filled and exactly
the route's `?trigger=` answer; after the runs, Workflows says *success* for Greet (linked to `#/runs/<id>`) and
*cancelled* for Slow.
