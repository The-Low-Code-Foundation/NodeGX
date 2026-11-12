---
id: P18-S134-PULSEHOLD
title: An awaited action at the end of a Function's signal chain holds that run's later signal chains, Success and Done in the export
status: open
severity: low
area: export / the pulse loop of a kept Function's run (`src/emit/component.ts` `jsfun-pulses`), EXP-011 §90's `detached` pass (`src/analyze/plan.ts`)
found: P18 session 134, 2026-10-21, reading the Noodl Desk's emitted click (EXP-019 slice 1b)
evidence: the emitted `src/pages/Home.tsx` of tests/helpers/noodl-desk.ts (the `counted` arm's `await greetAgainRun.settled;` inside the loop over `countTheOpenTasksRun.pulses`); dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §104
---

A run's signals are acted on in one loop over the pulses its body sent (`for (const pulse of run.pulses) { if (… === 'go')
{ <chain> } }`). §90 detaches an awaited action (a record call, a Cloud Function, and since session 134 an awaiting
Function's run) **only when a later action of the same list follows it**. At the end of a signal's arm nothing follows
in the arm, so it is awaited in place — and the loop's later pulses, the run's Success and its Done wait for it.

In the running app a signal's targets act in the drain and an asynchronous one answers later: nothing the emitting node
does next waits for it. So a body that sends `go()` before its own `await`, where `go` saves a record, runs its Done after
the save in the export and before it in the running app.

Final readings cannot see it once both have settled; the order of two writes to one value could. Pre-existing for the
record verbs in a signal's chain (§86 + §90); session 134 made an awaiting Function's run reachable there too (gram's
Welcome: `check` → "Where they belong"). None of the 17 templates is known to read the difference.

**Fix shape:** in the §90 pass, an awaited action that is the last of a `jsfun-pulse` arm's `then` is detached too (the
loop continues after it). Fixtures with a record call at the end of a signal's chain move (hls001).
