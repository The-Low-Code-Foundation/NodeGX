---
id: P123-GH-HELPSTUCK
title: Help covers every tab and stays on top when another tab is picked, so Studio looks stuck
status: fixed
severity: medium
area: nodegx-studio / Help (editor/studio.html #helppanel, the rail's tabs)
found: STU-091 Greenhouse, Richard's play test in NodeGX Studio, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes (2026-10-30)
commit: nodegx-studio b3c6a94 (editor/studio.html)
---

Richard (Greenhouse, 2026-10-30): *"when you click the help icon bottom left, it opens as a modal that looks like a page,
so when you click on another tab like workflows you're stuck on help until you click the 'close' button top right which
you wouldn't notice."* He also asked for a link to the Studio docs.

`#helppanel` is `position:absolute; inset:0` over `main`; the rail's tab buttons called `switchTab` only, so the tab
changed underneath and Help stayed on top. The wiring view (`#wiringpanel`, Logic on this page) had the same shape.

Fix (nodegx-studio b3c6a94, editor/studio.html): picking a tab closes Help and the wiring view; Help's head has
*NodeGX Studio guide ↗* (learn.nodegx.io/ways/studio, opened outside). Gate row in `editor/check.mjs` ("Help has the
Studio guide's link, and picking the Workflow tab while Help is open closes it"), `check:editor` 235/235.
