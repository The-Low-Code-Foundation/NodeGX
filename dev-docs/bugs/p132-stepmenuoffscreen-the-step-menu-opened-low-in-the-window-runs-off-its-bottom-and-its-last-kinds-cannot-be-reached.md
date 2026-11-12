---
id: P132-STEPMENUOFFSCREEN
title: Studio's step menu, opened low in the window, runs off its bottom, and its last kinds (Stop, Return, Wait, Wait until) cannot be reached
status: fixed
phase: P132
task: BWF-004
severity: medium
area: nodegx-studio / Backend tab (the step menu, every popover menu)
found: driving BWF-004's AC3 in the Electron app on a Greenhouse copy, 2026-11-03 (s4)
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/greenhouse-drive-bwf004.mjs ("step menu box")
launch: beta
commit: nodegx-studio 550d82a
---

After a test, a step's panel is long, so *Add a step after* sits low in the window. Its menu opened there with its top
at 700 px in a 1000 px window and its height 560 px: its bottom at 1260. The menu scrolls inside, but its last 260 px
were below the window, so *Return* sat at 1064 even scrolled to the end: no press could reach it, nor *Stop*, *Wait* or
*Wait until*. A real mouse press in the drive found nothing there; a script's `.click()` (which every gate used) opens
the menu at `clientY` 0, at the top of the window, which is why no gate saw it.

**Cause:** `popover()` in `editor/studio.html` clamps a menu's top to `innerHeight - 300`, which assumes a menu 300 px
tall. The step menu's `max-height` is 560.

**Fix:** once the caller has drawn and appended the menu (a microtask: a hidden window runs no frames), a menu whose
bottom is past the window is moved up to fit. In the app the same menu then sat at 432–992 and *Return* was pressed.

**Gate:** `automations-drive.mjs` opens the step menu with a click near the bottom of the window and asserts it fits;
with the fix taken out it fails with the app's own numbers (700 → 1260 in 1000).
