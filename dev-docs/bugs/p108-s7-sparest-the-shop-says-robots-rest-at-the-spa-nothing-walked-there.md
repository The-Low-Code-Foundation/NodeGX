---
id: P108-S7-SPAREST
title: The shop says "Robots rest there when a job is done" — no robot ever walked to the spa
status: fixed
commit: c051ca68d
severity: medium
area: template bot-garden / her land (landJob) + the engine's walk home (homeOf)
found: P108 s7, 2026-10-01 (IW-007 §4 "Session 6" → Not done: the spa's `rest`)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 7"
---

The spa's shop line promises « Les robots s’y reposent quand un travail est fini » / "Robots rest there when a job is
done", and a child pays 30 shells for it. Built and finished, it did nothing: a robot whose job was done walked back to
her land's home tile (the meadow's corner) like before. The blueprint carried `does: 'rest'` with "a later session".

**Fix:** `landJob` gives a placed spa's `rest` (its id and a free, reachable tile per robot in front of it, facing it);
the engine's `homeOf` asks `restOf` first — the spa FINISHED (every part full), read live, so the walk after the last
plank already goes there. A save kept with the job done puts the robot at its rest on the next build (`iw6Resume`).
Spec `p108s7.test.ts` (rows + the arm: without `restOf` they end at home); drive `drive-iw007-touch.js` REST clause.
