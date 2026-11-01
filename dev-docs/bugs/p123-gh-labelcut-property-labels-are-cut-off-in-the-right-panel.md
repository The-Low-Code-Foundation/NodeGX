---
id: P123-GH-LABELCUT
title: Property labels are cut off in Design's right panel ("Content fo…", "Placehold…", "Enable La…")
status: fixed
commit: nodegx-studio bd4fff1
severity: medium
area: "nodegx-studio / Design right panel (editor/studio.html .props .field)"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31, screenshot of a Text Input's panel): *"a lot of the field labels are cut off in the right props menu. Can we make both menus expandable, responsively sizing the preview to cope? And also fix the labels in general, maybe add small labels above the fields"*. Labels sat in a 96 px column with `text-overflow: ellipsis`.

Fix: a label above its field, whole (a checkbox keeps its label beside it); Design's two side panels widen by dragging their inner edge (kept per viewer; double-click resets), the page in Fill follows. Measured on a copy of Greenhouse: 27 labels on a Text Input, none cut.

## Fixed (s35, 2026-10-31; landed 2026-11-01)

A property's label sits above its field; Design's side panels widen by their edge (kept per viewer, double-click resets). Gate: `check:editor` 253/253. Every Studio gate green on 2026-11-01, run one at a time.
