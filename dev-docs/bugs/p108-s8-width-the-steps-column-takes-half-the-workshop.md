---
id: P108-S8-WIDTH
title: The Workshop's steps column takes half the screen and the world stays small beside it
status: fixed
commit: 3bb2e084e
severity: medium
area: template bot-garden / the Workshop's layout (cg007Look.ts .bg-ws, .bg-stage)
found: P108 s8, 2026-10-02 (Richard's screenshot, a 1420 px window)
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8)
---

From 1200 px up the steps column is `clamp(440px, 50vw, 780px)` and the world is capped at 640 px (`.bg-stage`), so on a
laptop the Blockly workspace is wider than the world and mostly empty paper. Richard: "make the middle divider possible to
drag and resize so you can make the blockly bit bigger or smaller and the 3D bit grows and shrinks."
