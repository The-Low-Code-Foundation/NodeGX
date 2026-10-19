---
id: P18-S128-SEEDREMOUNT
title: An exported Variable's authored Value is stored again each time its component mounts; the running app stores it once, when the instance is created
status: open
severity: low
area: export / Variable seed (EXP-011 §67, `plan.variableSeeds`, a mount effect in the host component)
found: P18 session 128, 2026-10-19, the Set Desk's first draft (the Game's own Variable, in a box the Play click mounts)
evidence: dev-docs/tasks/phase-18-code-export-v2/s128-setdone/EXPECTED.md ("the first draft"); `src/analyze/plan.ts` "its authored Value is stored on every mount of this component"
---

EXP-011 §67 seeds a Variable's authored Value from a mount effect in the component that holds the node, reading
"the value setter runs at node creation" as "on every mount". The two are the same for a page and for a repeated row, and
not for a component placed under a Mounted condition: the runtime creates the instance once (it exists while it is not
drawn) and stores the value once; the export stores it again on every mount, over whatever was written meanwhile.

Met in the Set Desk's first draft: the Game, in a box the Play click mounts, held a Variable `gameText` authored "game
idle"; Play's Done pulses the Game's `start`, whose chain writes "game on". Under StrictMode the second mount's seed
lands after the pulse's write (P18-S121-SEEDTWICE's shape), so the export read "game idle" where the runtime reads "game
on"; without StrictMode the order of the two effects decides. A box shown, hidden and shown again would reseed in
production too (not measured). The fixture now seeds that Variable on the page.

Reach: not measured (components with a seeded Variable placed under a Mounted condition in a parent). The fix for both
shapes is one seed per instance, kept by the parent as the pulse counts are (EXP-011 §94), or a once-guard that outlives
the child's unmount.
