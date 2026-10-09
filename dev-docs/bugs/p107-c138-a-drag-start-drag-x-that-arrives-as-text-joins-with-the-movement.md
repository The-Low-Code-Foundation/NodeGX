---
id: P107-C138
title: A Drag's Start Drag X (or Y) that arrives over a wire as text joins with the movement as text — a 10 px drag from "50" puts the element at "5010"
status: fixed
commit: 40c9fc310
phase: P109
task: ISL-048
severity: low
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx — the start position is added to the movement without a conversion)
found: P107 NSP-016 s55, 2026-10-07 (ruled 2026-10-08, filed then)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Drag.json "a Start Drag X that is text is read as a number: a 10 px drag from the text 50 puts the element at 60, with Constrain to parent off and on (row C138)"
---

**What a person sees.** Start Drag X wired from a Text Input, a Function or JSON arrives as text ("50"). Dragging the element 10 px
puts it at "5010", far off the screen, and Drag X reports "5010" ("50100" with Constrain to parent on). A typed value is a number
already, so only a text wire meets this.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Read it as a number".** The same as Animate To Value's Delay
(P107-C20). When fixed, the scenario's behaviour moves with it (a Drag spec version).

**Fixed (P109 ISL-048, s32, 2026-10-09), as ruled.** Start Drag X and Y read text as a number (`Number(text)`), in an `onChange`
(the generated `inputProps` setter writes the prop, calls it, then renders — a `set` of the node's own is overwritten). A number goes
on as it came, NaN included (C106); unlike C20's Delay there is no `|| 0`, because a NaN start is C106's case. Drag spec v3. The old
scenario was the only one that showed Constrain to parent (the face lays nothing out, so its slack shows only on a position that is not
a number): renamed for the fix, and a twin added with a list as Start Drag X, which still joins — without it `useParentBounds`'s
drop-set survived at seed 20732. Runtime 23 / 23 at seeds 13 and 20732; interpreter mutants 0 survivors at both; control (HEAD's
`drag.ts`) red on exactly the C138 scenario. **The export (P18):** not checked.
