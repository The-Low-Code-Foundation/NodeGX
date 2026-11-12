---
id: P123-STU-REPEATMORE
title: A Button's and a Text Input's Repeat While Saving fell into Studio's "More" section
status: fixed
commit: nodegx-studio d0d16b2
severity: low
area: nodegx-studio `editor/studio.html` property panel (INTERACTION_PORTS, the Interaction tab's Options)
found: board lane 2, the 0.2.6 pin bump (opennoodl-d7), 2026-10-24
evidence: nodegx-studio `npm run check:editor` on the bumped vendor/: "FAIL a Button: nothing is left in More — [Repeat While Saving]" (and a Text Input), 201/203
---

NodeGX's FIX-03 (cb7e0d6e4) added the press guard and its opt-out port `repeatWhileSaving` to Button and Text Input.
Studio's panel had no place for it, so it showed under "More" as a bare field. Now in the Interaction tab's Options
beside Enabled; `check:editor` has a row for it (204/204).
