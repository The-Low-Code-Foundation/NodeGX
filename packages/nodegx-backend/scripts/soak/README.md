# The single-process ceiling — how the number is measured

`docs/runtime/SCALING.md` used to say, in its Honest limits, that there was **no
published load-test number** because none had been measured. This harness is how
that number gets taken, and how it gets taken *again* — after a change, on
different hardware, or by someone who does not believe it.

A benchmark nobody can re-run is a number nobody can check. So this document is
the method, and the method is the deliverable as much as the figure is.

```
node packages/nodegx-backend/scripts/soak/run.js --out ./soak-results/run-1
```

---

## 1. What is being measured, and what is not

**Measured:** one backend process, over one SQLite database, on one box —
"a NodeGX full-stack app is one app process with a real database behind it", the
sentence SCALING.md exists to make precisely.

**Not measured:** replicas, orchestration, or a CDN. Two processes cannot serve
one data directory correctly today (SCALING.md has the table of what breaks), so
a multi-replica number would describe a configuration the product refuses. And a
Kubernetes run measures the orchestrator.

## 2. The shape of the workload, and why it is this shape

The obvious mistake is a read-mostly workload, because it flatters us. The
scoping session's first guess was that a conference app is "a caching problem
wearing a database problem's clothes". The field report this phase came from
refutes that: the app read shared session/exhibitor/attendee data **and wrote
continuously** — "my day" saves, and a profile row rewritten **after every AI
assistant question**.

That last one is why the write rate does not flatten out. An AI-driven write
rate scales with *engagement*, not with content volume.

So the workload is five collections and six operations:

| collection | rows at `--scale 1` | read as | written as |
|---|---|---|---|
| `Talk` | 1,200 | the programme, by track, in time order | seeded only |
| `Exhibitor` | 800 | by tier | seeded only |
| `Attendee` | 40,000 | — | seeded only |
| `MyDay` | 200,000 | everything one attendee saved | a new row per save |
| `Profile` | 40,000 | one row, by attendee | **rewritten in place** |

| operation | share of the mix | what it is |
|---|---|---|
| `programme` | 34% | `Talk` where track, ordered, limit 50 |
| `my-day` | 25% | `MyDay` where attendee, limit 100 |
| `exhibitors` | 17% | `Exhibitor` where tier, limit 50 |
| `profile-read` | 9% | `Profile` where attendee, limit 1 |
| `profile-rewrite` | 10% | **`PUT` of an existing row** — the assistant write |
| `save-to-my-day` | 5% | insert |

**85:15 read:write.** It is taken from the application shape above, it is stated
in every report beside the number, and it is the first thing you should change
to match your own app (`drive.js`, the `weight` fields).

Four things about this that are deliberate:

- **The indexes are declared before the rows are seeded**, so every insert pays
  the index-maintenance cost a real app's insert pays. Creating indexes after
  the seed is faster and is not what an app does.
- **The rewrite is an `UPDATE`, not an insert.** They do not cost the same thing
  on a single writer, and the field report's write was an update.
- **The profile summary is roughly the size an assistant-written summary is.** A
  40-byte string would have made the write number a statement about 40 bytes.
- **Each virtual user is a real `Profile` row**, so a rewrite updates a row that
  exists.

## 3. The two things that are held fixed, and the one that is a flag

**The page cap is on, at its shipped defaults, always.** PRD-001 made
`queries.defaultLimit: 1000` / `maxLimit: 10000` what bounds a single response.
A ceiling measured with that off would describe a product we do not ship, so
there is no flag here to turn it off.

**The requests are closed-loop.** Each virtual user sends one request, waits,
and sends the next — what a phone does. An open-loop generator firing at a fixed
rate regardless of whether the server keeps up measures an unbounded queue and
reports it as latency.

**Rate limiting is a flag, and both settings are worth running:**

- `--rate-limit on` — the shipped budgets (`data`: 1200/min, burst 400). This
  measures **the product's refusal point**, which is a true and useful fact. It
  is usually the first signal to move, and then the number is about the rate
  limiter.
- `--rate-limit off` (the default) — measures **the backend behind it**, which
  is what the knee, the write-serialisation reading and the heavy-job delta are
  questions about.

Report both, and say which one any given figure came from.

## 4. The arms

| arm | answers | what it does |
|---|---|---|
| `ramp` | AC2 — the knee | mixed workload up the concurrency ladder |
| `writers` | AC3 — write serialisation | writes only, against the backend's own CPU |
| `scheduled` | AC4 — the heavy-job delta | the same window with a heavy scheduled workflow running in the same process, and without |
| `realtime` | §3.4 | holds open SSE streams against `realtimeMaxConnections` |
| `memory` | §3.4 | does RSS come back to baseline after a burst |
| `kill` | AC6 / PRD-D5 | `SIGKILL` with a run in flight, then restart and read the record |

`kill` runs last: it takes the process down and brings a new one up, so anything
after it would be measuring a different process from everything before it.

### The knee is derived, and labelled as derived

The levels table is the measurement. The knee is a *reading* of it:

> the first level whose p95 is more than 3× the concurrency-1 p95 **and** which
> buys less than 10% more throughput than the level below it.

Both halves are needed. Latency alone rises the moment you queue; throughput
alone plateaus before anything is wrong. If you prefer a different threshold,
apply it to the same rows — they are all in `report.json`.

### CPU is read from the backend, not from the box

`process_cpu_seconds_total` on the backend's own `/metrics`, divided by wall
time, gives cores consumed **by the process being measured**. This matters most
for AC3: "latency rising with concurrency while CPU is not saturated" is the
write-serialisation signature, and it is only a signature if the CPU number
belongs to the process doing the serialising — not to a box that is also running
the load generator.

## 5. Two ways this harness has already been wrong

Kept here because both are silent failures that produce confident numbers.

1. **A `200` is not a stream.** `GET /realtime` without
   `Accept: text/event-stream` answers `200` with a JSON *hint* and opens
   nothing. The first version of the realtime arm counted those as open streams
   and reported twenty while `nodegx_realtime_connections` read zero. The gauge
   was right. The arm now requires the header, counts a stream only when the
   response content-type is `text/event-stream`, and reports a disagreement with
   the gauge instead of smoothing it over.
2. **A query that matches nothing is very fast.** An empty `where` result is a
   `200` with `results: []` in well under a millisecond, and a driver counting
   2xx reports it as enormous throughput. So would a rewrite that updated a row
   that does not exist. `preflight()` therefore runs every operation once before
   anything is timed and asserts the **consequence** — rows came back, a row was
   created, the stored row actually changed — and refuses to measure if any of
   them did not.

## 6. Running it

```
node scripts/soak/run.js [options]
```

| option | default | |
|---|---|---|
| `--out <dir>` | `./soak-results/<timestamp>` | `report.md` + `report.json` land here |
| `--scale <f>` | `1` | multiplies every row count in §2 |
| `--users <n>` | `2000` | distinct virtual users |
| `--levels <list>` | `1,2,4,8,16,32,64,128` | the concurrency ladder |
| `--seconds <n>` | `20` | measured seconds per level |
| `--warmup <n>` | `3` | discarded seconds per level |
| `--rate-limit on\|off` | `off` | see §3 |
| `--arms <list>` | all six | `ramp,writers,scheduled,realtime,memory,kill` |
| `--heavy-budget-ms <n>` | `45000` | how long one heavy scheduled fire runs |
| `--sse <list>` | `50,200,500` | SSE targets |
| `--keep` | off | keep the data directory |
| `--i-know` | off | run anyway on a busy box, and say so in the report |

A smoke run that exercises every code path in about a minute:

```
node scripts/soak/run.js --scale 0.01 --users 20 --levels 1,4 --seconds 4 \
  --warmup 1 --heavy-budget-ms 10000 --sse 20,600
```

Its numbers are worthless — twelve `Talk` rows is not a workload — but if it
completes, the harness works.

## 7. 🔴 Do not run this beside other heavy work

A soak competing with a test suite measures the contention, not the ceiling. The
script checks for `jest`, `vitest`, `webpack`, `tsc` and Electron processes and
**refuses to start** if it finds any. `--i-know` overrides that, and the
override is recorded in the report — a contended number is worth having as long
as nobody later reads it as a clean one.

On a shared box, say so to whoever else is on it before you start, and take the
number when they are done.

## 8. What the output is

`report.md` is the human record: conditions first (hardware, row counts, mix,
rate-limit setting, whether the box was quiet), then a table per arm, then the
exact command to re-run it.

`report.json` is the same thing unrounded, including every per-operation
percentile, so a different reading can be taken from the same run without
re-measuring.

The headline figure belongs in `docs/runtime/SCALING.md` **with its conditions
attached**. A requests/second number without its workload is exactly the kind of
claim this phase exists to stop making.
