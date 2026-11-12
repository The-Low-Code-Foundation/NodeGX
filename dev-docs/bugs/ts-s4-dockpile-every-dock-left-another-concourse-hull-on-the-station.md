---
id: TS-S4-DOCKPILE
title: Every dock left another concourse hull and strut bolted to the station — they piled up, one pair per dock
status: fixed
severity: low
area: threadspace / `public/src/interiors.mjs` `concourseInterior`, `Interior.dispose`
found: Threadspace s4, 2026-10-22, by the scenery pass (the sub-agent rebuilding the stations)
fixed: Threadspace s4, 2026-10-22 (uncommitted)
evidence: tests/command.json counts the station's children before docking and after undocking: equal. The check was not run against s3's code
regression: dev-docs/parked/threadspace/tests/command.json "undocked, the concourse's outer hull and strut leave with it…"
---

Why: the concourse adds a hull box and a strut straight onto the station's group; `dispose` removed only the rooms' group.

Fix: they are the interior's `extras`, removed by `dispose`.
