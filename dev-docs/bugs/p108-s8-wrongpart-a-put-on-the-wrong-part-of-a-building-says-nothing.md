---
id: P108-S8-WRONGPART
title: Putting stones on a building's plank part (or planks on its stone part) does nothing and says nothing
status: fixed
commit: 3bb2e084e
severity: high
area: template bot-garden / the engine's put (cg002Scripts.ts exec, op put)
found: P108 s8, 2026-10-02 (Richard: "I can't seem to put it down on the refuge build site")
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8)
---

`if (top !== itemOf(into)) { delta.nothing = true; return; }` — no line, no bump, the item stays carried. The refuge's
parts are the spa's the other way round (refuge: planks left, stones right; spa: stones left, planks right), so a child
who learnt the spa puts stones on the refuge's plank tile and nothing happens. Fix: the robot says which part wants what
("This part wants planks").
