# PRD-004 — single-process ceiling, measured

**Run 2026-09-20T20:23:52.632Z** · harness `packages/nodegx-backend/scripts/soak/run.js`

## Conditions

| | |
|---|---|
| hardware | Apple M1 — 8 cores, 16384.0 MB RAM |
| platform | darwin 25.6.0, Node v22.22.0 |
| backend | `bin/nodegx-backend.js serve` (dist), own process, SQLite/WAL |
| page cap | `defaultLimit: 1000`, `maxLimit: 10000` — **shipped defaults, always on** |
| rate limiting | **off** — see the README on why both arms exist |
| workload | 85% reads / 15% writes, from the application shape in the field report (§3.1) |
| virtual users | 2000 distinct `Profile` rows |
| rows seeded | Talk 1,200, Exhibitor 800, Attendee 40,000, MyDay 200,000, Profile 40,000 |
| security | `devOpen` — the localhost dev posture, ACLs not enforced per request. A backend with `enforced: true` does per-row policy work this number does not include. |
| box quiet? | yes — nothing matching jest/vitest/webpack/tsc/Electron above 5% CPU, 37 idle match(es) ignored |
| load average | 1.85, 2.94, 3.63 (1, 5, 15 min, at start) |

## The ramp — mixed workload (AC2)

| concurrency | req/s | p50 | p95 | p99 | max | backend cores | errors | 429s |
|---|---|---|---|---|---|---|---|---|
| 1 | 2266.6 | 0.42 | 0.6 | 1.24 | 17.2 | 0.83 | 0 | 0 |
| 2 | 3343.4 | 0.56 | 0.87 | 1.65 | 17.44 | 1.12 | 0 | 0 |
| 4 | 3457.5 | 1.2 | 1.86 | 2.53 | 24.02 | 1.13 | 0 | 0 |
| 8 | 3446.2 | 1.88 | 4.13 | 5.07 | 26.28 | 1.16 | 0 | 0 |
| 16 | 3438.3 | 4.05 | 8.43 | 9.61 | 36.79 | 1.16 | 0 | 0 |
| 32 | 3456.9 | 8.5 | 16.19 | 18.86 | 68.74 | 1.16 | 0 | 0 |
| 64 | 3548 | 16.9 | 27.01 | 35.15 | 86.27 | 1.16 | 0 | 0 |
| 128 | 3548.5 | 33.61 | 50.67 | 69.08 | 346.96 | 1.15 | 0 | 0 |

- **Peak throughput:** 3548.5 req/s
- **Knee:** concurrency 4 — 3457.5 req/s at p95 1.86ms.
  Rule: first level with p95 > 3x the concurrency-1 p95 AND < 10% more throughput than the level below
- **First signal to move:** 1/3 — request duration, at concurrency 4

## Writers only — the write-serialisation reading (AC3)

| concurrency | writes/s | p50 | p95 | p99 | backend cores | errors |
|---|---|---|---|---|---|---|
| 1 | 3981.3 | 0.21 | 0.32 | 1.28 | 0.7 | 0 |
| 2 | 5432.9 | 0.31 | 0.49 | 1.71 | 0.94 | 0 |
| 4 | 5395.9 | 0.73 | 1.66 | 4.19 | 0.94 | 0 |
| 8 | 5115.7 | 1.02 | 3.85 | 6.39 | 0.91 | 0 |
| 16 | 5444.5 | 2.29 | 6.69 | 9.11 | 0.96 | 0 |
| 32 | 5307.2 | 5.04 | 11.12 | 14.8 | 0.96 | 0 |
| 64 | 5121.7 | 10.82 | 19.77 | 26.38 | 0.94 | 0 |
| 128 | 5074.2 | 24.48 | 35.83 | 48.41 | 0.94 | 0 |

- no clean write-serialisation signature in this ladder — read the levels table before concluding anything

## Latency during a heavy scheduled run (AC4)

| | scheduler idle | heavy run in the same process |
|---|---|---|
| p95 | 8.31 ms | **9.87 ms** |
| throughput | 3492.7 req/s | 2671.5 req/s |

**Delta: p95 × 1.19** at concurrency 16.

This is the whole argument for a separate worker role. A scheduled workflow runs in the process serving your users; there is no worker tier today.

(1 heavy run(s) were running or complete during this arm, so the delta is a delta against real work.)

## Realtime streams (§3.4)

| streams asked for | opened | refused (503) | `nodegx_realtime_connections` | gauge agrees? | backend RSS |
|---|---|---|---|---|---|
| 50 | 50 | 0 | 50 | yes | 189.3 MB |
| 200 | 200 | 0 | 200 | yes | 189.4 MB |
| 500 | 500 | 0 | 500 | yes | 190.9 MB |

- cap is `rateLimit.realtimeMaxConnections`, shipped default 500; a stream is counted only when the response content-type is text/event-stream

## Memory (§3.4)

- baseline 190.9 MB → peak 191.0 MB → settled 147.8 MB
- returned to baseline: **yes**
- a settled RSS within 25% of baseline is "returned"; V8 does not hand every page back and should not be expected to

## PRD-D5 — the record of an interrupted run (AC6)

- before the kill: run `exec_mua9ws1xrk6ntll1`, status `running`, not completed
- after restart: status `error`, completedAt `1789936388023`

**the record survived and is terminal: status "error"**

## Re-running this

```
node packages/nodegx-backend/scripts/soak/run.js \
  --scale 1 --users 2000 \
  --levels 1,2,4,8,16,32,64,128 --seconds 20 \
  --rate-limit off
```

See `scripts/soak/README.md` for the method and for what each number does and does not say.
