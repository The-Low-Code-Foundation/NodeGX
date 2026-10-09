---
id: P109-S37-SCROLLROOM
title: The layout model reads a scrolling Group as endless — a % inside it is its content and nothing centres — where the ruling (and now the runtime) says the room is the window unless the content is longer
status: fixed
fixed: P107 s73, 2026-10-09 (NSP-016 §8.4)
phase: P107
task: NSP-016
severity: low
area: node-spec / the layout model (`packages/nodegx-node-spec/src/layout.ts`, a scroller's axis)
found: P109 ISL-052 s37, 2026-10-09 (first filed as P109-S37-SCROLLCENTRE, the centring half)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-052-A-SCROLLING-GROUP-LAYS-OUT-AS-IT-DOES-WITHOUT-THE-SCROLL.md §6; the layout check's KNOWN rows marked ROOM (scroll-percent-content, scroll-align, scroll-fill, scroll-slides)
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts (the 30 boxes, no longer KNOWN) and tests/layout.test.ts (three scroll rows)
---

**Ruled 2026-10-09 (Richard, from three worked screens: a checkout, onboarding slides, an inbox):** "go with your way" — inside
a scrolling Group the room is the visible window, unless the content is longer, and then the content wins. So a share fills
what the window leaves and is never shorter than its content, a Fixed % is of the window, and a list centres only when it fits.

**What is left.** The runtime does this on both paths since ISL-052 (P107-C154, P109-S37-FILLCAP, ISCROLLPERCENT, CENTRECUT).
The model still gives a scroller's children unbounded room on its axis (RESEARCH-LAYOUT-SEMANTICS.md §2, the native toolkits'
reading): 32 boxes in the layout check mismatch and are listed KNOWN as ROOM. The model is P107's (R16): it learns the rule,
then the ROOM rows leave KNOWN. The code export (P18) is told the same.

**Fixed (P107 s73, NSP-016 §8.4).** `layout.ts` gives a scroll axis the window as its room and reference, a `fill` its
content as its floor along it, and a `safe` main-axis alignment. The 30 ROOM boxes left KNOWN; planting the old model
turns exactly those red.
