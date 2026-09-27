# PRD-004 — The number we do not have

**Status: ✅ Done — measured 2026-09-20 (s4). The number, the conditions and what surprised us are in [§7](#7-the-record--measured-2026-09-20-s4).**

## 1. The person sentence

**Someone deciding whether to build their company on this reads an actual number, measured on a
workload shaped like theirs, instead of a confident adjective.**

## 2. Why this is a task and not a chore

`docs/runtime/SCALING.md` deliberately publishes **no** requests/second figure, and says so in its
Honest Limits, because none has ever been measured. The claim the product currently rests on is
inherited from phase 48:

> *"Fine to low thousands of active tenants. A cliff, not a wall."*
> — `phase-48-data-ceiling/README.md:41`

That is an **estimate**. Phase 97's entire promise — *"one app process, a real database behind it"* —
rests on it, and so does any answer to *"could NodeGX have served that 60,000-person conference?"*

**This task is also the cheapest way to find out whether the horizontal-scaling study matters.** If
the single-process ceiling is far above what NodeGX users will plausibly reach, that project drops
down the list, and the result is worth having either way.

## 3. Design

### 3.1 🔴 A mixed workload, because a read-mostly one flatters us

The scoping session's first guess was that a conference app is "a caching problem wearing a database
problem's clothes". **Richard's account refutes it.** The app read shared session/exhibitor/attendee
data *and* wrote continuously: "my day" saves, and a profile row rewritten **after every AI
assistant question**. An AI-driven write rate scales with engagement, not with content volume.

So: a read:write ratio taken from a real application shape, stated in the method, and **not** chosen
to make the number look good.

### 3.2 Production-shaped data, not an empty database

A load test against an empty database measures the load generator. Populate to a realistic size,
with the indexes a real app would declare, and record the row counts — a number measured at 1,000
rows says nothing about 10 million.

### 3.3 🔴 Include a heavy scheduled job, and measure latency *during* it

The single most transferable finding in Richard's report: a CPU/RAM-heavy full ingest and diff every
30 minutes ran on the same nodes as user traffic and caused periodic slowdown. **NodeGX has that
shape today** — `triggers/scheduler.ts` fires scheduled workflows in the process serving HTTP.

Measure request p95 **while a heavy scheduled workflow runs**, against the same figure with the
scheduler idle. That delta is the whole argument for role separation (see the study, §3.5) and it
costs one extra run to obtain.

### 3.4 What to record

- The knee: where p95 breaks, and which of `SCALING.md`'s six signals moved **first**.
- **The write-serialisation signature**: concurrent writers vs latency with CPU unsaturated. This is
  the true storage-ceiling reading, and the one that would tell a user to expect Postgres.
- Realtime: actual simultaneous SSE streams sustained, against `realtimeMaxConnections`.
- Request latency during a heavy scheduled run (§3.3).
- Memory: whether `process_resident_memory_bytes` returns to baseline after load.

### 3.5 Also settle PRD-D5

While a backend is under load, **kill it mid-run** and look at the execution record. The scoping
session could not determine whether a killed run leaves a record stuck in a non-terminal state or
**no record at all** — the status vocabulary reads as `success | error` and records may only be
written at completion. One deliberate `SIGKILL` answers it. If runs vanish, that is its own defect
and gets filed.

## 4. Acceptance criteria

1. A documented, **repeatable** method: data shape, row counts, ratio, tool, hardware.
2. A knee identified, with the first signal to move named.
3. The write-serialisation reading taken separately from the overall knee.
4. The heavy-job latency delta measured (§3.3).
5. `docs/runtime/SCALING.md` carries the number **and** its conditions — a figure without its
   workload is the kind of claim this phase exists to avoid.
6. PRD-D5 answered, and filed as a defect if it is one.
7. The harness is re-runnable by someone else, so the number can be re-taken after a change.

## 5. Notes on running it

- **One box, no cluster.** Kubernetes measures the orchestrator; this measures the product.
- 🔴 Do **not** run this beside other heavy work on a shared machine — a soak competing with a test
  suite measures the contention, not the ceiling.
- Run it **after** PRD-001 → 003, so the number describes the backend we intend to ship. A soak
  against the unbounded version measures a backend that is about to change.

## 6. Out of scope

- Multi-replica load. Two processes cannot serve one data directory correctly today; see the study.
- Publishing a marketing figure. This produces an honest engineering number with its conditions
  attached; how it is used is a separate decision.

---

## 7. The record — measured 2026-09-20 (s4)

**Status: ✅ done.** Harness `packages/nodegx-backend/scripts/soak/`, method in its
`README.md`, raw results in `soak/2026-09-20-ratelimit-off/` and `.../-on/` beside this file.
Both runs were taken on a box measured quiet (0 contending processes; a peer's editor stack and a
peer's repo-wide `grep` were each waited out, the second after asking for a window).

### 7.1 The number

| | measured |
|---|---|
| mixed 85:15 throughput | **~3,500 req/s**, flat from concurrency 4 to 128 |
| knee | **concurrency 4**, p95 **1.9 ms** |
| above the knee | throughput flat, latency proportional — p95 51 ms at 128 |
| writes only | **~5,200 writes/s** |
| CPU at saturation | **1.16 of 8 cores** |
| errors | **zero** at every level |
| SSE streams | **500** sustained, gauge agrees; the 501st gets `503` |
| memory | RSS 200 MB → 200 MB peak → 155 MB settled; returns |

Conditions: 282,000 rows (`Talk` 1,200 · `Exhibitor` 800 · `Attendee` 40,000 · `MyDay` 200,000 ·
`Profile` 40,000), indexes declared **before** seeding, page cap at shipped defaults, `devOpen`
security, 8-core Apple Silicon / 16 GB / Node 22.

### 7.2 🔴 The ceiling is the PROCESS, not the writer — and that was not the expected answer

AC3 asked for the write-serialisation signature, on the reasonable assumption that one writer is
what binds. **It is not, on this workload.** Writes alone sustained ~5,200/s, *faster* than the
mixed workload, because the reads return more data than the writes do. The backend saturated at
**1.16 of 8 cores** with seven idle: one Node process is one main thread, and the thread was full.

Little's Law confirms saturation rather than coincidence — at concurrency 128, 128 ÷ 3,548 = 36 ms,
against a measured p50 of 33.6 ms. Everything above concurrency 4 is queueing, not service.

This is why SCALING.md's step 5 ("single-core speed, not core count") is now stated as measured
rather than asserted, and it is the honest answer to "would a bigger box help": more cores, no;
faster cores, yes.

### 7.3 AC4 — a heavy scheduled job costs ~24% of throughput

Throughput ~3,490 → ~2,670 req/s, p95 8.3 → 9.9 ms, with a heavy ingest-and-diff firing through
the real `triggers/scheduler.ts` path in the serving process. The job **yields between passes**,
which is the version a competent author writes; a synchronous one would freeze the loop outright
and the delta would be a tautology rather than a measurement.

### 7.4 AC6 / PRD-D5 — **answered, and it is not a defect**

A `SIGKILL` with a run in flight leaves a record that **survives and is terminal**: `status:
"error"` with a `completedAt`, after restart. Neither of the two feared outcomes (no record at
all; stuck non-terminal) happens. Reproduced twice, at smoke scale and at full scale.

The record is **fully explicit** about what happened, which is better than the task feared:

```
status       : "error"
completedAt  : set
errorMessage : "Interrupted by service restart (in-flight run did not resume — WF-001 v1 durability)."
metadata     : { ..., "interrupted": true }
```

So an operator reading the history *can* tell a crash from an ordinary failure, twice over — the
sentence and the flag. `markInterrupted` (`ExecutionStore.ts:655`) writes all three.

🔴 **A correction, because it is the instructive part.** This section first said the recovered
record "says the run failed without saying why", on the grounds that its `error` field was `null`.
The field is called `errorMessage`; `error` does not exist on the record, so `undefined || null`
produced a tidy-looking `null` and the harness reported an absence it had invented. The claim was
checked against `ExecutionStore.markInterrupted` before publishing, and the claim was wrong, not
the code. The harness now reads `errorMessage` and `metadata.interrupted`, and the board's PRD-D5
row — which predicted a *stuck-then-recovered* row — was right about the recovery and named a
status (`interrupted`) that is carried in metadata rather than in the status field.

### 7.5 🔴 The rate-limit arm measures the BUDGET, not the backend

With shipped `rateLimit` defaults the run served **exactly 20 req/s** and refused the rest with
`429`, identically at every concurrency. That is `policies.data` (1200/min) behaving correctly:
every virtual user in that run was anonymous from one IP, so they shared **one bucket**.

It would be wrong to publish 20 req/s as a product ceiling — it is a property of the *harness's*
anonymity, not of the backend. Recorded as a reproduction of signal 4, and said that way in
SCALING.md.

### 7.6 Four things the harness got wrong before it got them right

Kept because all three produce confident numbers rather than failures:

1. **A `200` is not a stream.** `GET /realtime` without `Accept: text/event-stream` answers 200
   with a JSON *hint* and opens nothing. The first realtime arm reported 20 open streams while
   `nodegx_realtime_connections` read 0 — the gauge was right. It now requires the header, counts
   only a `text/event-stream` response, and reports a gauge disagreement.
2. **The quiet-box guard matched names, not load.** It blocked on four *idle* MCP servers at 0.0%
   CPU and missed a peer's `grep -ril` pinning a whole core. A guard everyone overrides is not a
   guard; it now gates on CPU.
3. **An absence read off a field that does not exist.** The kill arm read `record.error`, got
   `null`, and reported that an interrupted run does not say why it failed. The field is
   `errorMessage`, and the record says so in a full sentence. See §7.4 — this is the one that
   would have been published as a product defect.
4. **"Did the heavy job run?" demanded `success`.** But the job's budget deliberately outlasts the
   measurement window, so the correct state during the window is `running` — the check flagged a
   good measurement as untrustworthy. Fixed, and the first report regenerated; no measured value
   changed.

### 7.7 Found on the way — SCALING.md was stale in three places

Not part of the task, and it blocked AC5: the page the number had to land in still told readers
the caps this phase shipped did not exist — *"queries have no maximum page size"*, *"A cap is
worth adding to the backend and is not there today"*, and *"Run records are capped by count, not
by size"*. `BACKEND-OPERATIONS.md` had been updated by PRD-001/002/003; `SCALING.md` was missed.
All three corrected, plus the "a conference app is a caching problem in disguise" sentence that
§3.1 of this task explicitly refutes.

### 7.8 Acceptance criteria

| AC | state |
|---|---|
| 1 documented repeatable method | ✅ `scripts/soak/README.md` — data shape, row counts, ratio, tool, hardware |
| 2 knee identified, first signal named | ✅ concurrency 4; request duration, and §7.2 says why |
| 3 write-serialisation read separately | ✅ separate arm — and it **refutes** the premise (§7.2) |
| 4 heavy-job latency delta | ✅ −24% throughput, p95 ×1.19 |
| 5 SCALING.md carries number + conditions | ✅ "What one process actually does" |
| 6 PRD-D5 answered, filed if a defect | ✅ answered; not a defect (§7.4) |
| 7 re-runnable by someone else | ✅ one command, guard, preflight, JSON + markdown output |
