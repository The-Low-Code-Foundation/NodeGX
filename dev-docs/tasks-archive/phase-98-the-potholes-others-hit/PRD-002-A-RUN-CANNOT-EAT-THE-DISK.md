# PRD-002 — A run cannot eat the disk

**Status: ✅ Built and gated, s1 (2026-09-19). AC1–AC7 green. §7 is the correction to §2, and it changes the shape of the task.**

## 1. The person sentence

**One workflow behaving badly costs you a truncated record with a note explaining what was cut —
not the disk, the backend, and an afternoon finding out which workflow it was.**

## 2. What is there (read 2026-09-19, HEAD `aa5d00e2a`)

| reading | where |
|---|---|
| `MAX_LOG_LINES_PER_RUN = 200` — and on overflow it writes **one** marker line rather than dropping silently | `workflow/WorkflowRunner.ts:142, 292-298` |
| `MAX_STEPS_PER_RUN = 1000` — same marker pattern | `workflow/WorkflowRunner.ts:153, 339-344` |
| `MAX_VALUE_DEPTH = 32` bounds **nesting**, not bytes | `workflow/steps/values.ts:42` |
| 🔴 **No byte or character cap anywhere** in the run-recording path | grep over `WorkflowRunner.ts`, `ExecutionStore.ts`, `ops/log-scrub.ts` — no hits |
| `log-scrub.ts` replaces secret values; it truncates nothing (`MIN_SCRUBBABLE_LENGTH` is a floor for *what to scrub*, not a size cap) | `ops/log-scrub.ts:96, 107` |

**Count caps do not bound size.** `MAX_VALUE_DEPTH` does not help: a flat array of 50,000 records is
depth 2. Richard's records were ~10MB **each**; 200 of those is 2GB from a single run, and `executions`
retention defaults to **30 days**.

**The pattern to copy is already here.** `MAX_LOG_LINES_PER_RUN` writes one "limit reached" marker
carrying the limit. This task adds a second dimension to a mechanism that already exists and already
reports — it does not invent one.

## 3. Design

### 3.1 Two bounds, because they fail differently

- **Per value** — one enormous step output or log argument. Truncate the value, keep the record.
- **Per run** — many merely-large values that add up. Stop recording detail, keep the run.

A per-run byte budget alone lets one 500MB value through; a per-value cap alone lets a thousand
1MB values through. Both, or neither closes the chain.

### 3.2 🔴 Truncate AFTER scrubbing, never before

`log-scrub.ts` matches secret values against the text. **Truncating first can cut a secret in half
and defeat the match**, publishing a fragment of a credential into the execution record — turning a
disk-safety change into a credential leak. Ordering is a correctness requirement here, not a
preference, and it deserves its own test.

### 3.3 The record says what was cut

Per rule 1: a truncated value carries a marker naming the original size — `…[truncated, 10.4MB]` —
so the operator reading the record **sees the cause**. Richard's *"it took us a while to track down"*
is the cost of a record that hides its own truncation. A run that hit its budget is queryable, so
`/executions` can answer *"which workflow is producing these"* without reading source.

### 3.4 Cover functions as well as workflows

Cloud-function runs are logged to the same store ("Every function run is logged — scrubbed — to
`executions.sqlite`"). A cap applied only to the workflow path leaves the other half of the exposure
open. **Find the single write point, or state why there are two.**

## 4. Acceptance criteria

1. A step output larger than the per-value cap is stored truncated, with the original size named.
2. A run whose values total more than the per-run budget stops recording detail and says so.
3. The run itself **still completes** — this is a recording bound, never an execution bound. A
   workflow must not fail because its output was large.
4. 🔴 A secret that would have been scrubbed is **still scrubbed** when the value is truncated —
   proven by a test where the secret straddles the truncation boundary.
5. Cloud-function runs are bounded by the same rule.
6. Both caps are configurable in `ops.json` and ship **on** by default (rule 4).
7. A record that hit either cap is **findable by query**, so the offending workflow can be named.

## 5. Tests

- A workflow producing a 20MB step output: record is bounded, run succeeds, size named in the marker.
- A workflow producing 500 × 1MB outputs: per-run budget fires, marker written.
- 🔴 A secret placed **exactly across** the truncation boundary: assert it does not appear in the
  record in any form.
- A cloud function producing a large return value: same bound.
- `executions.sqlite` growth over 1,000 bad runs is bounded — the phase's close condition in miniature.

## 6. Out of scope

- Pruning and disk reclamation — **PRD-003**.
- Changing what a *successful, normal* run records. This task bounds the tail, not the median.
- Streaming large values to file storage instead of truncating. Plausible, bigger, and not needed to
  close the outage chain.

## 7. Session 1 (2026-09-19) — what was there, what was built

### 7.1 🔴 §2 was wrong: a per-value cap already existed, one layer below the grep

§2's *"no byte or character cap anywhere in the run-recording path"* grepped `WorkflowRunner.ts`,
`ExecutionStore.ts` and `log-scrub.ts` — the backend's own files — and stopped at the dependency.
Every one of those writes through the shared cloud substrate, and **the substrate caps a value at
50KB** (`noodl-viewer-cloud/src/execution-history/store.ts:28`, `MAX_DATA_SIZE`; the logger
independently at 100,000, `ExecutionLogger.ts:103`) with a marker carrying `__originalSize` and a
1,000-character preview. Richard's ~10MB records **could not have happened here per value.**

What was genuinely absent, and is what this task built: the **per-run** budget (a thousand steps
just under 50KB is ~100MB from one run), configurability, the announcement, queryability, and a
bound on `errorMessage` / `errorStack`. Filed as a correction rather than quietly rewritten,
because the grep-stops-at-the-dependency shape is the one in
`measure-the-artefact-before-believing-the-task-file`.

### 7.2 The single write point (§3.4, answered)

`ExecutionHistory.createLogger()` has **eight** callers — runner, engine, dispatcher ×2, backup
manager ×2, backup subsystem, file subsystem — and every record on this backend is born through
it. It now returns a `BoundedExecutionLogger` (`execution/BoundedExecutionLogger.ts`) extending the
substrate's logger: `triggerData`, `metadata`, `inputData`, `outputData` pass `boundValue` at
`maxValueBytes`; their stored sizes accumulate against `maxRunBytes`; the crossing value is kept,
later ones become `__omitted` markers naming the size they would have been; `metadata.recordCapped`
is stamped at the moment the bound fires (a run that never finishes still shows it) and refreshed
at completion; error message/stack pass `boundText`. Each of the two events is announced **once
per run** (`execution.record.truncated`, `execution.record.capped`), the `MAX_LOG_LINES_PER_RUN`
pattern. The substrate's own fence follows the live number (a compatible `maxDataSize` getter
option on `ExecutionStore`, `store.ts`), so raising the bound above the old 50KB constant works.

`GET /executions?capped=true|false` — a compatible `capped` filter on the substrate's query
(`json_extract(metadata, '$.recordCapped')`) — answers *"which workflow is producing these"*
without reading source (AC7). A `Log` node's message/data are bounded in `WorkflowRunner`'s sink
too, **after** the scrub.

### 7.3 The knobs (AC6)

`executions.maxValueBytes` (default 51,200 — the substrate's existing effective cap, so nothing
about an ordinary run changes) and `executions.maxRunBytes` (default 8 MiB). Floor 4,096 on both
rather than a `0` escape hatch — a cut value's marker is ~1.2KB, so a smaller cap could never be
honoured — and `maxRunBytes < maxValueBytes` is refused. Live through `PUT /admin/ops`.

### 7.4 The tests (`tests/prd-002-a-run-cannot-eat-the-disk.test.ts`, 8 specs)

The 🔴 straddling-secret test runs over the real path (Request → Secret → Log → Response) with a
6,000-character secret and the 4,096 floor, **with a same-run control**: a non-secret message of the
same length IS cut (the marker is present, the filler is not, the preview is). The secret arm then
carries `[REDACTED]`, no marker, and no 64-character prefix anywhere under the data dir. Two mutants
graded it: skipping the scrub in `beginStep` and dropping the pragma each turned specs red (s1).

### 7.5 Left open

- **PRD-D6 (filed, BACKLOG):** the workflow-engine path (`WorkflowEngine.ts:534-546`) records step
  `input`/`output` with **no** value scrubber — only the cloud-function path scrubs. Bounded now,
  scrubbed still not. Unverified whether a workflow step can carry a secret value at all.
- The close condition's drive (1,000 bad runs against a started backend) is PRD-004's harness.
