---
id: P123-GH-TRIGGERSTALE
title: A backend trigger's card says "Not fired yet" after it fired, until Studio reloads
status: open
severity: low
area: nodegx-studio / Workflow → On the backend
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

The trigger "When a Watering is created" fired twice from the running app (backend: fireCount 2, lastFiredAt
14:49:51). Its card in Studio said "Not fired yet" until Studio was reloaded, then "Last fired 30/10/2026, 15:49:51 ·
2 times in all". The cloud functions are also labelled "Called from the app" when only workflows call them.
Fix: re-read trigger status when the card opens (and after a run Studio saw).
