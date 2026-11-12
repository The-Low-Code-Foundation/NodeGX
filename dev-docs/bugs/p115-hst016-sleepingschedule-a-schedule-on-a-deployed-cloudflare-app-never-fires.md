---
id: P115-HST016-SLEEPINGSCHEDULE
title: "A schedule on an app deployed to Cloudflare never fired on a quiet app: the backend's timers die with the Durable Object, and the next start skipped the fire"
status: fixed
phase: P115
task: HST-016
severity: high
area: "nodegx-backend `src/triggers/scheduler.ts` (`CronScheduler`: one `setTimeout` per schedule, `missedFirePolicy: 'skip'` at start); `cloudflare/worker.ts` (no alarm, no `scheduled()` handler); the same scheduler runs scheduled backups and the orphan sweep"
regression: packages/nodegx-backend/tests/p115-hst016-schedules-on-the-hosts-clock.test.ts
found: P115 session 14, 2026-11-07, reading what a redeploy's carried automations would do once on Cloudflare (HST-014 §5.4 item 2)
fixed: "P115 session 14, 2026-11-07 (Opus 5.5)"
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-016-SCHEDULES-ON-THE-OBJECTS-ALARM.md §3
---

On Cloudflare the whole backend lives in one Durable Object (HST-014). Cloudflare evicts an idle object after 70–140 s,
and a pending `setTimeout` holds it in memory for at most 15 minutes (*Durable Object lifecycle*, read 2026-11-07);
eviction drops the timer. The backend's schedules were exactly that: one timer each. The next request started the
object again, and `computeStartPlan` with the default `missedFirePolicy: 'skip'` armed the NEXT occurrence: the one
that was due was gone. So a daily digest on an app nobody opened around 08:00 never ran, and while a schedule was
armed every request also kept the object in memory for up to 15 minutes of the Free plan's 13,000 GB-s a day.

Nothing said so: the trigger's page showed the next fire, and HST-014's `--local` drive graded only that the schedule
was SEEDED.

**Fixed:** `BackendServiceOptions.scheduleWake` (HST-016). With it, the scheduler arms no timer and tells the host
the earliest instant any schedule (trigger, backup, orphan sweep: `ScheduleClock`) is due; the Worker puts that on
the object's alarm, and `alarm()` starts the service and calls `fireDueSchedules()`. A start at the woken instant keeps
the stored fire as due when it is an occurrence of the current cron, at most 15 minutes late and not yet fired.

**Measured on workerd** (Fixture B copy, an every-minute schedule, `wrangler dev` stopped before the minute = the
object gone): the fix fired 09:18:00 at 09:18:19 on restart; the control (the same worker without `scheduleWake`)
skipped 09:20; the fix again fired 09:21 at 09:21:19; kept alive across 09:22, fired at 09:22:00.038.
Mutant: the due-at-start rule off, 2 of 10 red (the kept fire, unit and service), the controls green.
