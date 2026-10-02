---
id: P108-S8-PICKER
title: On a phone, a slot's picker opened near the screen's foot runs past it (its long options cannot be tapped)
status: fixed
commit: (the s8 commit after 3bb2e084e)
severity: medium
area: library garden-kit / Blocks' slot picker (blocks.js openPicker)
found: P108 s8, 2026-10-03 (drive-cg003-pages.js, IG-006 390-fr: "if Olive read the yellow tulip")
evidence: dev-docs/tasks/phase-108-the-island-works/NEXT-SESSION-PROMPT.md session 8
---

The picker is placed from an ESTIMATE of its height — three options a row, 46 px a row. The French options of the "if
Olive read…" question ("la tulipe jaune", …) wrap one a row at 390 px, so the real picker was taller than the estimate:
placed under a low slot, it ran past the screen's foot (the option the drive needed sat at y 850 of 844; a finger
cannot reach it, and the if stayed empty — Pip bumped). Seen once Mamie's note grew two blocks (the can's pick, P108
s8) and pushed the slot lower. Fixed: the picker is measured once it is open — over the slot when it does not fit under
it, never taller than the window (it scrolls inside itself then).
