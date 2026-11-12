---
id: PARKED-LUMIERE-R2-SPRINTGATE
title: In Château Lumière, the speed drive's "a far tap sprints" passed only because software GL draws slowly
status: fixed
commit: none yet — round 2 of dev-docs/parked/lumiere, commit waits on Richard's go
regression: dev-docs/parked/lumiere/tests/speed.json (run with DRIVE_GPU=1)
severity: low
area: parked lumiere — `tests/speed.json`; the pace choice in `moveHero` (`public/src/main.mjs`)
found: parked LUMIÈRE round 2, 2026-11-12, running the suite on the GPU (DRIVE_GPU=1)
evidence: on the GPU, from the Hall's spawn (0, 3.6) a tap at (0, -1.8) is 5.4 m; sampled every 100 ms her speed peaked at 3.95 m/s on Jog_Fwd_Loop, never Sprint_Loop, so the 8 s waitFor for speed > 4.6 timed out. In software GL the same tap passed.
---

A tap asks for the sprint pace only while she is more than 4.5 m from where she is going, and her speed eases toward
the pace (×5 a second). At a real frame rate she covers about a metre before she passes 4.6 m/s, so from 5.4 m she is
inside 4.5 m and back to a jog first. In software GL each frame's step is capped at 0.1 s and frames come seldom, so the
ease jumped her speed in big steps and the check passed. The game is unchanged: on a tablet at 60 fps, a tap under about
six metres jogs, which reads right. The drive now starts her at (-6.4, 2), 7.4 m from the tap, and passes 2/2 on the GPU.
