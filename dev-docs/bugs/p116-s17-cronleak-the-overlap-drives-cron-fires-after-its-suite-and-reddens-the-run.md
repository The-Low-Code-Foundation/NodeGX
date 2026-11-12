---
id: P116-S17-CRONLEAK
title: In a run of several specs, `fed-004-overlap-drive`'s cron fires after its suite has ended — "Cannot log after tests are done" — and jest exits 1 with every test green
status: fixed
commit: 23149f2a0
severity: low
area: tests / FED-004 overlap drive (`packages/nodegx-backend/tests/fed-004-overlap-drive.test.ts`: the `poll` cron trigger outlives `service.stop()`; `src/triggers/scheduler.ts` `CronScheduler.fire` → `WorkflowRunner.run`)
found: P116 s17, 2026-10-11 (a 53-spec neighbour run in band)
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-014-OLD-AND-NEW.md §6
---

A 53-spec run in band (the backend's security, ONT, facade, realtime and FED specs) reported `797 passed, 0 failed`
and exited **1**. The only errors in the log were three `Cannot log after tests are done` reports, all
`[WorkflowRunner] Function poll failed after 1502ms`, from `CronScheduler.fire`. They were printed after
`PASS tests/fed-004-overlap-drive.test.ts`. Run alone, that spec exits 0: the process ends before the cron fires.

So a gate that reads the exit status (the right way) reads red, and a person reading the counts reads green. Either
`service.stop()` does not stop a cron fire already scheduled or in flight, or the spec stops the service while a
`poll` run is still waiting on its 1,500 ms response. Not measured which.

**Measured and fixed 2026-10-25 (the Beta sweep s7): the second reading.** `service.stop()` stops nothing already in
flight on purpose (scheduler.ts `stop`: "those runs are still going"; the globals answer `service-stopped` loudly), and
every case's boot fires the catch-up `poll`, a 1.5 s run. The cases that end inside it stop the service with it still
going, and its timeout is logged after the file. Reproduced: HEAD's spec with a 4 s idle spec forced after it (a test
sequencer; jest otherwise runs a new file first and the window never opens): 8/8 green, three `Cannot log after tests
are done`, exit 1. The spec's teardown now waits until the boot's run is recorded and no `poll` row is `running`
(bounded at 9 s, and it throws in words if one still is): same instrument, 8/8, exit 0. Whether stopping should drain
runs in flight is a product question nobody has raised; not changed.
