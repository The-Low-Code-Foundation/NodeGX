# BMG-009 — Workflows and Runs: run with a form, find runs with the filter row

**Opened 2026-09-24** (README §2 row 7). **Depends on BMG-001, BMG-002 (`FilterRow`).**
**Status: 📋 not started.**

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
