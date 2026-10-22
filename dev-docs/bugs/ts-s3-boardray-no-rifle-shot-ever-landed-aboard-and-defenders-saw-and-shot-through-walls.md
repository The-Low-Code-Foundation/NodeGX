---
id: TS-S3-BOARDRAY
title: Aboard another ship no rifle shot ever landed, and the defenders saw and shot you through the walls — every boarding ray was cast in the wrong space
status: fixed
severity: high
area: threadspace / boarding (`public/src/controllers/board.mjs` `cast`)
found: Threadspace s3, 2026-10-22, reading the boarding code while measuring TS-S3-BOARDFPS
fixed: Threadspace s3, 2026-10-22
commit: pending (threadspace s3b)
evidence: aboard the Carrion (at 700, −60, 900), a ray aimed at each of the four defenders met nothing, and a ray into the corridor wall met nothing; on the fixed cast the aimed ray meets the defender and the shot takes 25 hp off. Both new checks fail on s3's board.mjs ("ray: nothing, before 60, after 60"; "wall: null, floor: null")
regression: dev-docs/parked/threadspace/tests/boarding.json "an aimed rifle shot lands on a defender in sight…" and "a defender in the crew room cannot see you at the airlock through the corridor wall…"
---

What a person sees: you shoot a Rook in the corridor and nothing happens; Rooks you cannot see shoot you from the side rooms.
(At TS-S3-BOARDFPS's frame rate it read as the game being unplayable.)

Why: everything aboard lives in the ship's frame (the walker's eye, the defenders), and `cast` handed those ship-frame
points straight to a `Raycaster`, which tests the world. A ship-frame ray sits near the world's origin, far from the ship,
and meets nothing unless the ship is parked at the origin with no turn. So `cast` always returned null: your shots never
found a defender, and a defender's "is anything between us" always said no.

Why the drive was green: "an aimed rifle shot lands on a defender in sight" expected `after < before || before === 60`, and a
fresh defender has 60 hp, so a miss passed. It also returned an object instead of a JSON string.

Fix: `cast` sends the ray out through the ship's matrix and brings the hit point back into the ship's frame. The aimed-shot
check now asks that the ray meets the defender and the shot takes hp; a second check asks that a wall stands between a
defender in the crew room and you at the airlock.
