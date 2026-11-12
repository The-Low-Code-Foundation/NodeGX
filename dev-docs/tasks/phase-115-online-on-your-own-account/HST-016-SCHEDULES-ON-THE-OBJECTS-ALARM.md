# HST-016 — Schedules on the object's alarm

**Opened 2026-11-07, session 14.** **Depends on HST-014.** **Status: ✅ built and graded on workerd, session 14 (§3); live
waits on Richard's redeploy of `hst-campus` (§4).** Kind: product.

## 1. The person sentence

> **A schedule set on an app deployed to Cloudflare runs at its time, even when nobody has opened the app all day.**

## 2. Why

Found while carrying automations by a redeploy (HST-014 §5.4 item 2): carrying a schedule is worth nothing if it does
not fire. On Cloudflare the backend lives in one Durable Object. Cloudflare evicts an idle object after 70–140 s; a
pending `setTimeout` holds it in memory for at most 15 minutes, and eviction drops the timer (*Durable Object
lifecycle*, read 2026-11-07). The backend's `CronScheduler` arms one `setTimeout` per schedule, and on the next start
`missedFirePolicy: 'skip'` (the default) arms the NEXT occurrence. So a daily schedule on a quiet app never fired
(P115-HST016-SLEEPINGSCHEDULE), and every armed timer kept the object in memory, spending the Free plan's daily
13,000 GB-s. The same scheduler runs scheduled backups and the orphan sweep.

Free limits for Durable Objects, read 2026-11-07 (*Durable Objects pricing* and *limits*): 30 s CPU per request (as
Paid), 100,000 requests, 13,000 GB-s, 5M rows read and 100,000 rows written per day, reset 00:00 UTC; 5 GB stored.

## 3. Built and graded (session 14, 2026-11-07, Opus 5.5)

| piece | what |
|---|---|
| `BackendServiceOptions.scheduleWake` (`src/config.ts`) | a host that keeps the clock. null (every Node spawner) = timers, as before |
| `CronScheduler` `wake` (`src/triggers/scheduler.ts`) | arms no timer: reports the earliest due instant; `fireDue()` fires what is due by now, re-arms, and resolves when the runs settle |
| due at start (`dueAtStart`) | a start at the woken instant keeps the STORED next fire as due when it is an occurrence of the current cron, at most `WAKE_GRACE_MS` (15 min) late, and not yet fired. Later than that is a missed window: the missed-fire policy applies, as on Node |
| `ScheduleClock` (`src/triggers/scheduleClock.ts`) | one wake for the three schedulers (triggers, backups, the orphan sweep): an object has one alarm |
| `BackendService.fireDueSchedules()` | what the host calls at the wake |
| `cloudflare/worker.ts` | `scheduleWake` → `ctx.storage.setAlarm` / `deleteAlarm` (in order); `alarm()` starts the service, fires what is due, waits, and sets the alarm again from the latest wake (Cloudflare deletes an alarm after its handler unless the handler set one) |

**Graded.**
- `tests/p115-hst016-schedules-on-the-hosts-clock.test.ts`, 10/10, on a fake clock and the real `TriggerRegistry`. Covered: no timer armed; only what is due fires; the run is waited for; due after an eviction; later than the grace; a cron edited since; already fired; the last schedule switched off. Then the whole `BackendService` over an "eviction" (stopped, then started on the same data dir at a due instant), with a control without `scheduleWake` that skips. Mutant: due-at-start off → 2 red (the two "kept" cases), the controls green.
- 20 neighbouring suites (scheduler, backups, triggers, files, overlap, BKO-001, HST-010…014): 249/249.
- **workerd** (`deploy.mjs --local`, a copy of Fixture B with an every-minute schedule; `wrangler dev` stopped before
  the minute stands in for the eviction, the alarm persisted in `--persist-to`):

| run | worker | the object | result |
|---|---|---|---|
| 6→7 | fixed | gone over 09:18:00, back at 09:18:15 | fired 09:18:19, `ok` |
| 8→9 | control (no `scheduleWake`, the code before) | gone over 09:20:00 | **skipped**; `lastFiredAt` still 09:18:19 |
| 10 | fixed, same state (the control set no alarm) | back at 09:21:15 | fired 09:21:19 |
| 11 | fixed | alive across 09:22:00 | fired **09:22:00.038** |

## 4. Left

1. **Live.** Richard's redeploy of `hst-campus` carries this. Campus has no schedule, so the live reading is a
   15-minute `tick` trigger added on its backend for a night (`POST /admin/triggers` with the admin token), its
   `fireCount` read the next morning against the number of quarter hours, then deleted. Every fire means an eviction
   was survived: Cloudflare evicts within minutes of no requests.
2. Not changed: a schedule's run is waited for in `alarm()`, so a run is bounded by the object's 30 s CPU and
   Cloudflare's alarm retries (at least once). A run longer than that was never in reach on a Worker either.
