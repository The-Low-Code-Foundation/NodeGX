---
id: P123-GH-TRIGGERSTALE
title: A backend trigger's card says "Not fired yet" after it fired, until Studio reloads
status: fixed
severity: low
area: nodegx-studio / Workflow → On the backend
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
commit: nodegx-studio b39a371 (editor/studio.html, editor/automations-drive.mjs; STU-093)
regression: ../nodegx-studio/editor/automations-drive.mjs "the trigger's card: when it last fired, how it went, how often", "the row-change trigger … how its last fire went"
---

The trigger "When a Watering is created" fired twice from the running app (backend: fireCount 2, lastFiredAt
14:49:51). Its card in Studio said "Not fired yet" until Studio was reloaded, then "Last fired 30/10/2026, 15:49:51 ·
2 times in all". The cloud functions are also labelled "Called from the app" when only workflows call them.
Fix: re-read trigger status when the card opens (and after a run Studio saw).

**Fixed (STU-093, s33).** What the backend says (each trigger's status, each workflow's last run) is asked again on each
visit to the Backend tab and each card opened; the last answer stays drawn until the new one arrives. The card says
"Last fired 5 seconds ago: it failed (…) · 1 time in all" right after the fire (automations drive, a real Task row
firing the trigger). Functions now say who runs them ("Run by “The morning check”", "called on Home"), or "Nothing in
the app calls it yet"; "Called from the app" is gone.
