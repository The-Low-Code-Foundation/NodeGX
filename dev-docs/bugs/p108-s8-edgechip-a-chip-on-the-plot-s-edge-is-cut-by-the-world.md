---
id: P108-S8-EDGECHIP
title: A meter chip over a thing in the plot's first or last column is cut off by the world's edge
status: fixed
commit: (the s8 commit after 3bb2e084e)
severity: low
area: library garden-kit (meterEl) and garden-3d-kit (positionOverlay) / meter chips
found: P108 s8, 2026-10-03 (drive-p108s8-feedback.js shots s8-2d-land-wrong-part, s8-3d-land-chips)
evidence: dev-docs/tasks/phase-108-the-island-works/NEXT-SESSION-PROMPT.md session 8
---

A chip is centred over its thing and the world clips at its edge (overflow hidden). Her land's tree (7, 0) and rock
(7, 5) stand in the last column: in 2D their chips read "6," and "0", in 3D the tree's sprout was cut — the very numbers
R8 ("keep the wait, but show it") asked to show. Fixed: in 2D a chip in the first or last column grows inward from its
tile's side (gd-meter-start / gd-meter-end; the island's compact bars untouched); in 3D the chip's point is clamped so
the whole chip stays inside the canvas (its width read once per text).
