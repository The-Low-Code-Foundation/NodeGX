---
id: P125-STU-FOREACHBOX
title: In Studio, Esc up from a For Each's row selects the For Each and boxes nothing, because a For Each draws no element of its own
status: fixed
commit: nodegx-studio 2f9b321
severity: low
area: nodegx-studio / `editor/studio.html` (`drawnBy`, `drawnElements`, `draw`)
found: P125 s11, the puppy page in Studio, 2026-10-23; measured s12, 2026-10-24
evidence: "scratchpad foreachbox.mjs on a copy of 'Puppy Adoption Landing': edit PuppyCard row 0 on Home (host path FeaturedPuppies › PuppyCard), press Esc → the For Each 'One card per puppy' is selected; '#overlay .box.sel' count: HEAD 2185e9c 0, 2f9b321 6 (336 × 357 each, the six cards in a 2 × 3 grid)."
---

Editing a copy on its page, Esc (nothing selected) goes up one level with the copy, or the For Each that draws it,
selected. For a row, that is the For Each, and the canvas showed no box at all: the selection box reads the node's
elements, and a For Each has none. Its rows are copies of the template, held by the runtime node as
`_internal.itemNodes`.

Fix: `drawnBy` (and `drawnElements`, the page-level lookup) walk a For Each's rows as well as a copy's roots, and the
selection boxes every element the selected node draws: the first carries the name and the handles, the rest are
plain selection boxes (`.box.sel.more`, no tag). Studio's `check:editor` 203/203 after.
