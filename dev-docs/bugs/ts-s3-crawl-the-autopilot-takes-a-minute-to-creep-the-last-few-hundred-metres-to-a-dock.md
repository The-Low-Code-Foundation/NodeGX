---
id: TS-S3-CRAWL
title: With Vex flying, the Kestrel creeps the last few hundred metres to anything: 55 s from 700 m to Haven's dock window, arriving at under 1 m/s
status: fixed
severity: medium
area: threadspace / the autopilot (`public/src/controllers/fly.mjs` `toward`, `ai.mjs` crew, `game.mjs` `navStop`)
found: Threadspace s3, 2026-10-22, Richard: "the time it takes to progressively slow to a stop and be able to interact when an NPC is piloting is quite long"
fixed: Threadspace s3, 2026-10-22
commit: pending (threadspace s3)
evidence: a simulation of both laws over the same approach (from rest, 700 m from the dock point, `canDock` = within 170 m and under 25 m/s): s1 54.7 s, arriving at 0.7 m/s; s3 15.3 s. Measured again in the page by dev-docs/parked/threadspace/tests/smoke.json: 15.3 s
regression: dev-docs/parked/threadspace/tests/smoke.json "Vex flies 700 m to Haven's dock, nose on, and can dock in under 20 s of game time (s1: 55 s, TS-S3-CRAWL)"
---

What a person sees: set a course for the station, and the Kestrel flies there at a fair clip, then spends most of a
minute easing in, long after it looks arrived, before J will dock.

Why: the throttle was proportional to the distance left, `(d − stop) / (slow − stop)`, so the speed fell in proportion
to the gap: an exponential that halves the gap every 10 s or so and never arrives. With `stop` 160 m and the dock's window
at 170 m, the last 10 m alone took about half a minute.

Fix: a braking curve. The speed is the most she can still shed over the gap left, `√(2 · 5 m/s² · gap)`, never under a
4 m/s crawl, so she holds full speed until about 140 m out and then brakes. Each kind of course stops where it is useful
(`navStop`): 130 m off a station's dock (inside the window), on a pod (so she scoops it), 260 m off the Carrion.

Measuring trap, found writing the check: after an undock the Kestrel sits 220 m straight above the dock, so placing her
"700 m back along the line" put her vertically below it, and `lookAt` with a vertical line is degenerate. The first run
read 25.7 s, nearly all of it a slow turn. The check now starts her level with the dock, nose on.
