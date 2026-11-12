---
id: P123-GH-FLOWNOSCROLLX
title: A zoomed-in workflow cannot be moved sideways with a mouse, and its last step sits under the step panel's edge
status: fixed
severity: medium
area: nodegx-studio / Workflow tab, the flow (editor/studio.html fitFlow, #steps)
found: STU-091 Greenhouse, Richard's play test in NodeGX Studio, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes (2026-10-30)
commit: nodegx-studio b3c6a94 (editor/studio.html)
---

Richard (Greenhouse play test, 2026-10-30): *"I can't scroll left or right in the workflow viewer … when zoomed in.
Especially … the props panel on the right … covers one of the nodes so you want to scroll right with a bit of empty
space padding too."*

Measured on a copy of Greenhouse (backend unbound), 1440×900, the page's longest workflow at 130 %, a step's panel open:
`#steps` is 752 px wide and holds 1764 px of flow. It does overflow, but the only way across is a trackpad swipe or
shift+wheel: a mouse wheel goes up and down, and dragging the canvas (as in the NodeGX editor and Studio's own wiring
view) did nothing. The last step ended at the scroll edge with no room after it.

Fix (nodegx-studio b3c6a94, editor/studio.html): a press on the empty canvas drags it (4 px threshold; steps,
buttons, fields and chips keep their press; the click after a drag is swallowed, so the step's panel stays open);
`.flowarea` has 120 px of room after the last step. Driven: `docs/stu-091-drive/fixes.mjs` — a 400 px drag scrolls 400,
panel stays open. `check:editor` 235/235.
