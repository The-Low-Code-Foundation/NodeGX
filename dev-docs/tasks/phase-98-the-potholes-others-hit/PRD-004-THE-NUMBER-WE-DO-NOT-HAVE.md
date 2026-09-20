# PRD-004 — The number we do not have

**Status: ⬜ Not started. Best built after PRD-001 → 003, so it measures the fixed backend.**

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
