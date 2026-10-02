---
id: P108-S8-PADJUMP
title: A "go to the nearest" press on the pad jumps the robot to the thing instead of walking there
status: open
severity: medium
area: template bot-garden / Record step (RECORD_STEP_SCRIPT, cg003Scripts.ts)
found: P108 s8, 2026-10-02 (Richard drove path-stones)
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8)
---

Richard: "it's a bit sad that the robot jumps to the rock and doesn't do like a pathfinder type thing". The engine's seek
DOES path-find (BFS, one tile or one quarter turn per tick: `seekStep`), and Play walks it. But the pad's press runs every
tick of the block inside one Function call (`for (;;) { … apply … step }`, "a go key walks the whole way in one press")
and sends only the last world, so the kit glides the robot in ONE step from where it stood to the rock — through
whatever is between. Fix: the press hands the walk out a tick at a time (the same worlds, one per step time).
