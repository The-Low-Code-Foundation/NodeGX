# Phase 98 — closed

**Written by s4, 2026-09-20. There is no next task in this phase.** Re-derive from the task files
before believing this (PHASE-EXECUTION §3.1) — s1's version of this file claimed work was committed
when nothing was, so the habit is worth keeping even on a closing page.

## 1. The board

| task | state | commit |
|---|---|---|
| PRD-001 no query returns everything | ✅ 19 specs, 3 mutants | `1d6e00252` |
| PRD-002 a run cannot eat the disk | ✅ 8 specs, 2 mutants | `55dd19523`-era, s2 |
| PRD-003 pruning gives the disk back | ✅ 7 specs | s2 |
| PRD-004 the number we do not have | ✅ **measured and published** | `6ac81b207` |
| PRD-005 secrets are provisioned | ✅ 11 specs | s2 |

The outage chain (001→003) closed at s3. The ceiling was measured at s4. **§7 of the PRD-004 task
file is the record**, and the raw results are in `soak/` beside it.

## 2. The number, and the part that was not expected

**~3,500 req/s**, mixed 85:15, 282,000 rows, knee at **concurrency 4**, zero errors to concurrency
128. Apple M1 / 8 cores / 16 GB, page cap at shipped defaults, `devOpen` security.

🔴 **The ceiling is the PROCESS, not the writer.** AC3 was written to find the write-serialisation
signature on the assumption that one writer binds. It does not, on this shape: writes alone ran
*faster* (~5,200/s) than the mixed workload, because the reads return more data than the writes do,
and the backend saturated at **1.16 of 8 cores** — one Node main thread, full, with seven cores
idle. Little's Law confirms saturation rather than coincidence (128 ÷ 3,548 = 36 ms against a
measured p50 of 33.6 ms).

Consequence for the docs, now stated as measured rather than asserted: **more cores do not raise
this number; faster ones do.**

Also measured: a heavy scheduled job in the serving process costs **−24% throughput** (the
role-separation argument, §3.3); **500** SSE streams sustained and the 501st refused with `503`;
RSS returns to baseline after load.

## 3. If you re-take the number

```
node packages/nodegx-backend/scripts/soak/run.js --out ./soak-results/<name>
```

Method, options and the two arms (`--rate-limit on|off`) are in
`packages/nodegx-backend/scripts/soak/README.md`. Three things it does that you should not remove:

- **It refuses to start on a busy box** and gates on CPU, not on process names — the first version
  blocked on four idle MCP servers and missed a peer's `grep` pinning a core.
- **It preflights every operation against its CONSEQUENCE** before timing anything. A query that
  matches no rows answers `200` in under a millisecond and reports as enormous throughput.
- **It counts an SSE stream only when the response is `text/event-stream`.** `GET /realtime`
  without that `Accept` header answers `200` with a JSON *hint* and opens nothing.

## 4. What this phase deliberately did NOT close

Backlogged, and neither is a task today:

1. **PRD-003 §6 — `local.db` reclamation.** Still owed a ruling from Richard: here, in backup, or
   in phase 97's migrator?
2. **PRD-D7 — `$addToSet` in a grouped aggregate** returns an unbounded array inside an otherwise
   bounded response. The honest repair is a limit on the aggregate path.
3. **PRD-D6** — the workflow-engine path records step input/output unscrubbed.

Two of PRD-001's numbers (`defaultLimit: 1000`, `maxLimit: 10000`) shipped as the task's own
suggestion. They are `ops.json` config and live-patchable, so changing them is an edit and not a
migration — but they are the product's defaults and still worth ten seconds of Richard's review.

## 5. PRD-D5 is answered, and it is not a defect

A `SIGKILL` with a run in flight leaves a record that **survives and is terminal**: `status:
"error"`, `completedAt` set, `errorMessage: "Interrupted by service restart (in-flight run did not
resume — WF-001 v1 durability)."`, and `metadata.interrupted: true`. The board predicted
stuck-then-recovered and was right about the recovery; the `interrupted` disposition rides in
**metadata**, not in the status vocabulary, which is why a code reading predicted a status the
`/executions` route never shows.

🔴 I first wrote that this record "does not say why it failed", having read a field called `error`.
The field is `errorMessage`; `error` does not exist, and `undefined || null` produced a tidy null
that read like a measurement. Folded into
`absence-derived-from-a-partial-request-is-a-lie` — worth reading before you report any absence.

## 6. Where to go next

Nothing here. The open phases are **P99, P97, P95, P93, P92, P88, P85, P84, P83, P82, P81**, and
P99 was being actively worked by peers on 2026-09-20 (HLT-001 landed as `bdb0f8638`). Check for a
live peer before taking a P99 row — and before any drive or suite, check the box, because this one
routinely carries two or three sessions.
