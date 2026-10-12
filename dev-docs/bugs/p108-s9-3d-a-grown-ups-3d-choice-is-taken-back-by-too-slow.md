---
id: P108-S9-3D
title: A grown-up's "3D island" choice was taken back by Too Slow — on a slow tablet the island went flat again at once
status: fixed
commit: c25fb8ee5
severity: medium
area: template / Olive's Island — `Logic/Renderer choice` (RENDERER_CHOICE_SCRIPT, cg003Scripts.ts)
found: P108 (the island works) s9, 2026-10-03 — Richard, after the children played on the Windows tablets
evidence: scripts/devtools/drive-p108s9.js --mode 3d (REND 8/8, CPU ×8: the control flattens with nothing chosen; with Grown-ups 3D, gd3.tooSlow fires and the renderer stays {3d, grown-up}); cg003Template.test.ts "the glue" row
---

Garden 3D fires Too Slow after 3 s above 50 ms a frame, and the fallback rule wrote `{ mode: '2d', why: 'slow' }`
whatever was stored — including a grown-up's `{ mode: '3d', why: 'grown-up' }`. The spec even pinned it
(`choose('slow', {3d, grown-up}) → {2d, slow}`). A grown-up's 3D is now a manual override: Too Slow never takes it
back; only `unsupported` (no WebGL2) still falls back over it. The Grown-ups panel says so (`guRend3dKept`).

**Plain words:** *"Choosing 3D in Grown-ups now sticks, even on a slow tablet."*
