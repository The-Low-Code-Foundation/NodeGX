---
id: P123-GH-MAPSTYLE
title: Studio's "Who can reach what" keeps the map prototype's nebulae, stars and notched cards in its light look: not like Data model beside it
status: fixed
commit: b25b12bec (P124 `editor/public/app.js`)
severity: low
area: "@nodegx/backend-map public/app.js (NodeGX P124 editor/), light look"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31): *"'who can reach what' still shows in dark mode with all the funky colours from the data map prototype, it needs to be styled similarly to the data model page, it's not coherent"*.

Measured: his Studio (:8771) and a fresh one both serve map 0.1.7 with `?look=light` (P123-STU-DARKMAP fixed): the light look draws three coloured nebulae, 420 twinkling stars and notched building-block cards on a tinted ground, beside Data model's flat dotted ground and plain cards.

Fix (P124 source): the light look draws Data model's dotted ground, no nebulae or stars, cards with Data model's radius, border, shadow and a colour strip along the top. Reaches Studio with the next `@nodegx/backend-map` release (Richard's) and Studio's pin.

## Fixed (s35, 2026-10-31; landed 2026-11-01)

The map's light look draws Data model's dotted ground and plain cards: no nebulae, stars or notched cards. Fixed in the map's source; reaches Studio with the next `@nodegx/backend-map` (a publish: Richard's) and Studio's pin on it. Every Studio gate green on 2026-11-01, run one at a time.
