---
id: P132-PRESSLOSTINREDRAW
title: A press that straddles a Backend tab redraw opens nothing (mousedown and mouseup arrive, the click never does)
status: open
phase: P132
task: BWF-012
severity: low
area: nodegx-studio / Backend tab (renderAutoList, renderAuto: the list and the canvas are rebuilt with innerHTML = '')
found: s16 (2026-11-04), the Electron drive greenhouse-drive-bwf012.mjs, runs 1, 2 and 5 of 8
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/greenhouse-drive-bwf012.mjs (the openRow readout)
launch: none
---

In the Electron app, a real CDP press on *When a plant is watered* in the Workflows list opened nothing in 3 of 8
runs. A capture listener showed `pointerdown`, `mousedown` and `mouseup` on the row's name, and **no `click`**.
In that press the list was rebuilt (`renderAutoList` empties `#autolist` and draws new rows: 5 rows removed). The
element the press went down on was gone by the release, so the browser had no element to send the click to.
`.click()` on the same row a moment later opened it.

**When the list and canvas are rebuilt** (MutationObserver plus innerHTML compared before and after, same session):
- the Backend tab opened: the list 3 times within 77 ms, each with different content;
- a workflow opened: the list and canvas 3 to 5 times within 42 ms, about half drawing the same thing again;
- a step pressed: the panel and canvas once each, within 20 ms;
- after a test: once each;
- idle, with a workflow open or a step picked: **0 in 10 s** (no poll redraws).

**The reach is small for a person.** The window is the first ~80 ms after an action, sooner than anyone can see a row
and press it. The drive hit it because it pressed the instant the row first existed. It does not explain
P132-STEPPANEL, which was fixed for another cause. What remains is an outside change landing mid-press: an agent
writing `nodegx.automations.json` redraws the list (`takeOutside`) at any moment, and a press of 60 to 150 ms that
overlaps it is lost. Not measured.

**Fix, if it matters:** don't rebuild when the new drawing equals the old one (half of a workflow opening's redraws
draw the same thing), or keep a row's element across redraws, keyed by `data-workflow` / `data-apicall`. The drive
now waits 1 s after the tab opens, as a person would.
