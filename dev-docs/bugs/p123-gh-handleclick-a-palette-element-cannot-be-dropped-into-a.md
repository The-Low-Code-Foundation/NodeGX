---
id: P123-GH-HANDLECLICK
title: A palette element cannot be dropped into a small selected group: its resize handles take the click
status: open
severity: low
area: nodegx-studio / Design overlay (placing)
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Placing works by "pick in the palette, click where it goes". When the target is a small group that is selected
(an empty status pill, 20 × 8, or a fresh fact panel), its resize handles cover its middle: the click lands on
`.handle.s`, nothing is placed and the palette stays armed with no word why. Measured with elementFromPoint →
`handle s`. Selecting something else first works. Fix: hide the handles while placing (overlay `.adding`).
