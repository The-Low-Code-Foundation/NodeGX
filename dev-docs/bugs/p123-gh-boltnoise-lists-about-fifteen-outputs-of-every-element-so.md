---
id: P123-GH-BOLTNOISE
title: ⚡ lists about fifteen outputs of every element, so an input's Value is item ~100 of 140
status: open
severity: low
area: nodegx-studio / ⚡ value menu
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

⚡ on the Sign in page lists every element's every output: a heading's File, Files, File Size In Bytes, Is Dragging
Over, Drop Index, Screen Position X… (≈15 per element, ≈140 items). The two a person wants (Email's Value,
Password's Value) sit near the bottom. Fix: show each element's main value first (an input's Value, a dropdown's
Value, a checkbox's Checked) and fold the rest under "more".
