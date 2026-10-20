---
id: P18-S124-LATEMARKER
title: A refusal filed after its element's TODO marker printed is left out of the emitted file (the report has it)
status: open
severity: low
area: export / emitted markers (HLS-005)
found: P18 session 124, 2026-10-19, reading the emitted diff of the undrawn-trigger refusal (rocket-school's Round, "Fire the turbo")
evidence: dev-docs/tasks/phase-18-code-export-v2/s124-deadrow/README.md; EXP-011 §91.6
---

`emitComponent` prints an element's TODO marker (`markerText`) when the tree walk reaches it, and marks the node flushed.
The bindings sweep that names a binding no builder took ("the wire into "label" … has no rendered sink …") runs after
the walk, and `preReturnMarkers` prints only nodes not yet flushed. So when an element already had a marker, a refusal
filed later for it reaches the export report and never the file: a reader of the exported repo grepping for the node
finds a marker without it.

Measured on the shipped templates (session 124's tree): printing the late refusals above the return changes 9 emitted
files; the lines it adds name, among others, nodes ocCost, bkMonthData, bkDayData, tnData and msCard. rocket-school's
Round "Fire the turbo" (rdTurbo) is one session 124 made: once its dropped click is marked in the tree, its later
"label" and "backgroundColor" lines no longer print (before, it had no earlier marker, so they printed above the return).

Fix, its size: count the deferrals a marker printed per node and print the rest above the return (tried in session 124
and taken out again so as not to move the corpus golden in the same commit). Small; hls001 regenerates.
