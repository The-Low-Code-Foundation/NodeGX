---
id: TS-S4-NULLTEXT
title: A panel tab with an optional section (the Crew tab in space, the Yard without a lost Wren) printed the word "null"
status: fixed
severity: low
area: threadspace / `public/src/panel.mjs` `refresh`, `public/src/command.mjs` `render`
found: Threadspace s4, 2026-10-22, the command card's screenshot showed "null" under its buttons
fixed: Threadspace s4, 2026-10-22 (uncommitted)
evidence: shot s4-06-card.png (before) and c07-map-fleet.png (after)
regression: none (read from the shots)
---

Why: `Element.replaceChildren` writes a `null` argument as the text "null"; the tab builders return `cond ? section : null`.

Fix: both callers filter the list first.
