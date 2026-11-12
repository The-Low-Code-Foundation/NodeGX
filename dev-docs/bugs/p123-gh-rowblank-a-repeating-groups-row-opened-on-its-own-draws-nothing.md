---
id: P123-GH-ROWBLANK
title: A repeating group's row opened on its own ("Edit Plant row") draws an empty bar: it is given no row
status: fixed
commit: nodegx-studio bd4fff1
severity: medium
area: "nodegx-studio / Design, a reusable on its own (editor/studio.html previewFiles)"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31, screenshot of Rows/Plant row 2): *"I clicked 'edit plant row' and I'm on a page 'Rows/Plant row 2' but it's blank because there's no plant data to fill the group"*.

Measured: the canvas page places one copy with `firstCopyValues`, the parameters of the first copy placed by hand; a row is placed by its repeating group, so it has none and every Text reads its empty input.

Fix: a row (Component Inputs named "One <Type>") is shown with the type's latest row from App data (or each text field's name when there is none), said above the element list; nothing is written. Gate: `check:editor` "a repeating group's row opened on its own is shown with a Note from App data".

## Fixed (s35, 2026-10-31; landed 2026-11-01)

A row opened on its own shows the type's latest row from App data (or each field's name), said above the element list; nothing is written into the row. Gate: `check:editor` "a repeating group's row opened on its own is shown with a Note from App data, and says so". Every Studio gate green on 2026-11-01, run one at a time.
