---
id: P107-C138
title: A Drag's Start Drag X (or Y) that arrives over a wire as text joins with the movement as text — a 10 px drag from "50" puts the element at "5010"
status: open
severity: low
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx — the start position is added to the movement without a conversion)
found: P107 NSP-016 s55, 2026-10-07 (ruled 2026-10-08, filed then)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Drag.json "a Start Drag X that is text joins with the movement as text; with Constrain to parent on, the library's slack joins on too — off and on"
---

**What a person sees.** Start Drag X wired from a Text Input, a Function or JSON arrives as text ("50"). Dragging the element 10 px
puts it at "5010", far off the screen, and Drag X reports "5010" ("50100" with Constrain to parent on). A typed value is a number
already, so only a text wire meets this.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Read it as a number".** The same as Animate To Value's Delay
(P107-C20). When fixed, the scenario's behaviour moves with it (a Drag spec version).
