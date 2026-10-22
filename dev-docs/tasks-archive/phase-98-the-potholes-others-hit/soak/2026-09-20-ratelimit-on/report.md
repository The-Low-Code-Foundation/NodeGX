# PRD-004 — single-process ceiling, measured

**Run 2026-09-20T20:34:22.438Z** · harness `packages/nodegx-backend/scripts/soak/run.js`

## Conditions

| | |
|---|---|
| hardware | Apple M1 — 8 cores, 16384.0 MB RAM |
| platform | darwin 25.6.0, Node v22.22.0 |
| backend | `bin/nodegx-backend.js serve` (dist), own process, SQLite/WAL |
| page cap | `defaultLimit: 1000`, `maxLimit: 10000` — **shipped defaults, always on** |
| rate limiting | **on** (shipped budgets) |
| workload | 85% reads / 15% writes, from the application shape in the field report (§3.1) |
| virtual users | 2000 distinct `Profile` rows |
| rows seeded | Talk 1,200, Exhibitor 800, Attendee 40,000, MyDay 200,000, Profile 40,000 |
| security | `devOpen` — the localhost dev posture, ACLs not enforced per request. A backend with `enforced: true` does per-row policy work this number does not include. |
| box quiet? | yes — nothing matching jest/vitest/webpack/tsc/Electron above 5% CPU, 41 idle match(es) ignored |
| load average | 2.94, 3.05, 3.3 (1, 5, 15 min, at start) |

## The ramp — mixed workload (AC2)

| concurrency | req/s | p50 | p95 | p99 | max | backend cores | errors | 429s |
|---|---|---|---|---|---|---|---|---|
| 8 | 9074.5 | 0.81 | 9.71 | 28.19 | 39.76 | 0.75 | 181091 | 181091 |
| 16 | 11411.6 | 1.3 | 3.3 | 11.8 | 23.96 | 0.81 | 227842 | 227842 |
| 32 | 11374.4 | 2.44 | 4.74 | 6.97 | 37.32 | 0.8 | 227098 | 227098 |

- **Peak throughput:** 11411.6 req/s
- **Knee:** not reached inside this ladder. The ceiling is above the highest level driven.
- **First signal to move:** 4 — rate-limit refusals, at concurrency 8

## Latency during a heavy scheduled run (AC4)

| | scheduler idle | heavy run in the same process |
|---|---|---|
| p95 | 6.74 ms | **9.39 ms** |
| throughput | 9038.8 req/s | 6608.5 req/s |

**Delta: p95 × 1.39** at concurrency 16.

This is the whole argument for a separate worker role. A scheduled workflow runs in the process serving your users; there is no worker tier today.

(2 heavy run(s) were running or complete during this arm, so the delta is a delta against real work.)

## Re-running this

```
node packages/nodegx-backend/scripts/soak/run.js \
  --scale 1 --users 2000 \
  --levels 8,16,32 --seconds 20 \
  --rate-limit on
```

See `scripts/soak/README.md` for the method and for what each number does and does not say.
