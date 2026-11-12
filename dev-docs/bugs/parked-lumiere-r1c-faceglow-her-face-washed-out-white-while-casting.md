---
id: PARKED-LUMIERE-R1C-FACEGLOW
title: In Château Lumière, her face glowed white while she cast a spell
status: fixed
commit: none yet — round 1c of dev-docs/parked/lumiere, commit waits on Richard's go
severity: low
area: parked lumiere — `public/src/hero.mjs` (`Heroine.update`, the staff's light), `public/src/fx.mjs` (`bolt`)
found: parked LUMIÈRE round 1c, 2026-11-01, Richard's play of round 1b ("When the player casts a spell, her face glows bright for some reason")
evidence: by reading the code, not measured in a render: the staff's crystal sits beside her head with a point light (range 1.6 m) that `charge` raised from 0.12 to 2.6 while she gathered a spell, and each bolt was born at her hand with a light of 6 and a 1 m glow sprite
---

The charge now adds 0.35 to the staff's light (the crystal's own emissive still brightens, for the bloom), and a bolt's
light and head grow from nothing over its first third of the flight.
