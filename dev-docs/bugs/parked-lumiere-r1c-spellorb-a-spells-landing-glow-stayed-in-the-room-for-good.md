---
id: PARKED-LUMIERE-R1C-SPELLORB
title: In Château Lumière, a spell's landing ring and glow stayed where it hit, for the rest of the fight and after it
status: fixed
commit: none yet — round 1c of dev-docs/parked/lumiere, commit waits on Richard's go
regression: dev-docs/parked/lumiere/tests/smoke.json
severity: medium
area: parked lumiere — `public/src/fx.mjs` (`Fx.update`)
found: parked LUMIÈRE round 1c, 2026-11-01, Richard's play of round 1b ("her spell lands on the enemy as a bright ball but the ball stays there, throughout the fight and even after the fight ends")
evidence: a bolt's last frame calls `shock()`, which pushes its animation onto `this.live` while `update` runs `this.live = this.live.filter(...)`; filter never visits the pushed entry and the assignment drops it, so the ring sprite and its 2 m glow were added to the scene and never animated or removed
---

`update` now swaps in a fresh list before running the callbacks and keeps whatever they start. The smoke drive counts
the room's scene objects before the first spell and after it lands: the same number (`nothing the spell made is left
in the room`).
