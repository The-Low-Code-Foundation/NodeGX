---
id: P132-STEPPANEL
title: A backend workflow's step can't be opened in Studio, so it can't be edited or have a step added after it
status: scheduled
phase: P132
task: BWF-001
severity: high
area: nodegx-studio / Backend tab (step panel)
found: Richard testing Greenhouse in Studio (checkout 16c4456, Electron app), 2026-11-02
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/README.md (his points 1 and 4, the screenshot)
launch: beta
---

Richard: "I still can't click a workflow step to edit or see settings. I still can't add a workflow step or create a
step in an existing workflow by myself." His screenshot of *TriggerTest* shows no right-hand panel; the canvas runs to
the window's edge. Only *Add a step at the start* is reachable, because *Add a step after* / *Add on Yes* live in the
panel that does not open.

The code has the path: a card's click → `pickAutoStep` (studio.html 5467) → `renderStepPanel` (6258) →
`renderAutoStepPanel` into `#wfinspect` (5618-5691), and STU-092's gates say it works (`check:automations` 52/52 +
42/42, in Chrome). So the gate and the app disagree. **Not reproduced yet**: BWF-001 step 1 measures it in the
Electron app (is the handler reached, is `#wfinspect` un-hidden, is it on screen, is the card what
`elementFromPoint` hits). Suspects, unproven: s35's P123-GH-LISTHIDDEN layout change after STU-092's gates; an overlay
taking the click; the window width.

**Measured 2026-11-02 (P132 s1): does not reproduce in the Electron app.** Studio from the checkout (`16c4456`, then
`1cc7aa5`), a Greenhouse copy with its own backend (`NODEGX_BACKENDS_DIR`), driven over CDP with real mouse events.
The panel opened, `#wfinspect` on screen and the card the element under the click, on every path tried: the list →
TriggerTest → each of its six cards; a step's *Open its steps* → a function step → back → the cards; the trigger →
*Open the workflow* → the cards; *New* → *Add a step at the start* → the cards (Richard's own path); a press held 120 ms
before the release; with and without a run on the backend; window widths 1000-1600 px. No redraw replaced the cards
while idle (a MutationObserver counted 0 in 8 s), and no page error was thrown.

**Richard's own file says the panel opened for him at least once:** TriggerTest's `routes.ontrue → call-function-3`
can only be made by the panel's *Add on Yes* (no other Studio action writes a route), and he wrote "I added an IF,
added a yes branch". So it is not "the panel never opens". Unknown: which click failed and in what state. Left
`scheduled` for BWF-001 AC7, his re-walk on a copy; if it fails for him there, record the steps he took.
