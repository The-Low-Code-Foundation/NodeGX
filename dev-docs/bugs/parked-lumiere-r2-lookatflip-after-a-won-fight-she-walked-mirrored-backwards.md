---
id: PARKED-LUMIERE-R2-LOOKATFLIP
title: In Château Lumière, after winning a room's fight she walked backwards inside it
status: fixed
commit: none yet — round 2 of dev-docs/parked/lumiere, commit waits on Richard's go
regression: dev-docs/parked/lumiere/tests/after-fight.json
severity: medium
area: parked lumiere — `public/src/battle.mjs` (`start`), `public/src/main.mjs` (`moveHero`)
found: parked LUMIÈRE round 2, 2026-11-12, Richard ("the girl still walks backwards when inside rooms after clearing them")
evidence: tests/after-fight.json (?at=dressing, fight won, card closed): her turn read (π, −1.373, π); holding → 44 of 44 frames and ↓ 45 of 45 frames she faced away from where she moved. After: turn (0, y, 0), 0 frames facing away in all four directions.
---

The fight turned her to the creatures with `Object3D.lookAt`, which stores a turn towards a point behind her as
Euler (π, y, π). Walking only steers `rotation.y`, and under x = z = π a yaw of y faces π − y: mirrored, so going
along one axis she walked backwards. Round 1c's `PARKED-LUMIERE-R1C-BACKWARDS` fixed the camera's side of "backwards"
and its test placed her with `rotation.y` directly, so it never went through a fight. The fight now sets a plain
yaw, and `moveHero` turns any (x, z ≠ 0) turn back into a yaw before steering.
