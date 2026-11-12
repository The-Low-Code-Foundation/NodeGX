---
id: PARKED-LUMIERE-R1C-BACKWARDS
title: In Château Lumière, pressing forward in a room ran her towards the camera when a fight, the wardrobe or the cakes handed the camera back
status: fixed
commit: none yet — round 1c of dev-docs/parked/lumiere, commit waits on Richard's go
regression: dev-docs/parked/lumiere/tests/forward.json
severity: medium
area: parked lumiere — `public/src/main.mjs` (`follow`, `moveHero`)
found: parked LUMIÈRE round 1c, 2026-11-01, Richard's play of round 1b ("When inside a room, the player often runs backwards when pressing forwards")
evidence: tests/forward.json (DRIVE_GPU=1, ?won=dressing&at=dressing): from a settled camera 0 of 72 three-second holds ran her at the camera; with the camera fixed in front of her and handed back, 16 of 16 did (62 frames)
---

Forward came from `cam.yaw`, where the follow camera was going, while the drawn camera eased there in a straight line
from in front of her, over her head. `follow({ fromView: true })` now keeps the camera on the side of her where it
already is (only its distance and height settle), and forward is read from the drawn camera. After: 0 of 16.
Not reproduced from a settled camera, so if she still sees it, the cause is somewhere else.
