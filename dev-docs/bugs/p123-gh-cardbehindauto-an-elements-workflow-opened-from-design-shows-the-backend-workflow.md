---
id: P123-GH-CARDBEHINDAUTO
title: An element's workflow opened from Design shows the backend workflow picked earlier instead
status: fixed
severity: medium
area: nodegx-studio / Workflow tab (editor/studio.html openCard)
found: STU-091 Greenhouse, Richard's play test in NodeGX Studio, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes (2026-10-30)
commit: nodegx-studio b3c6a94 (editor/studio.html)
---

Richard (Greenhouse, 2026-10-30): *"I click on a backend workflow. I go into Design, click on an element with a workflow
… go to 'interactions' and click the workflow in there. It takes me to the workflow tab, but it's still showing the
backend workflow I selected before."*

`openCard` (used by Interactions and by the ⚡ on the canvas) set `selEvent` but left `selAuto`/`selFn`, which the
Workflow tab draws first. Fix (nodegx-studio b3c6a94): `openCard` clears them, as `startWorkflow` and the list rows already did.
Driven on a Greenhouse copy (`docs/stu-091-drive/fix11b.mjs`): before the fix the tab showed "The morning check",
after it "Log the user in → Go to Home"; the old line restored reproduces it (mutant).
