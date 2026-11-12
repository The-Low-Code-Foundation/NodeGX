---
id: P123-GH-ESCCOMPONENT
title: Esc cancels placing a reusable component but leaves it lit blue in the left list
status: fixed
severity: low
area: nodegx-studio / Design palette, Reusable elements (editor/studio.html keydown Escape)
found: STU-091 Greenhouse, Richard's play test in NodeGX Studio, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes (2026-10-30)
commit: nodegx-studio b3c6a94 (editor/studio.html)
---

Richard (Greenhouse, 2026-10-30): *"When you click a reusable component, it says 'esc to cancel' so I did that, but the
component is still selected and blue in the left menu."*

The Esc handler reset `aria-pressed` on `#palette button` only; reusables are in `#components` (also `.palette`), which
placing (`placePending`) did reset. Fix (nodegx-studio b3c6a94): Esc resets every `.palette button`. Gate row "a reusable armed for
placing is lit, and Esc unlights it and stops placing", `check:editor` 235/235.
