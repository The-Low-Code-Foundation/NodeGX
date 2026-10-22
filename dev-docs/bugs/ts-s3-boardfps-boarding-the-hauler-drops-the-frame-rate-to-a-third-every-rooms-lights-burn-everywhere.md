---
id: TS-S3-BOARDFPS
title: Boarding the hauler dropped the frame rate to a third of walking the Kestrel — every room's point lights burned in every pixel, and the boarded hull's outside was drawn behind its own walls
status: fixed
severity: high
area: threadspace / lighting and drawing (`public/src/lights.mjs`, `interiors.mjs` `light`, `game.mjs` frame, `controllers/board.mjs` tracers)
found: Threadspace s3, 2026-10-22, Richard on his Mac: "everything is smooth until I hacked into the hauler ship thing and got into an FPS fight, it was unplayable, very low FPS"
fixed: Threadspace s3, 2026-10-22
commit: 5c65b6530
evidence: measured on software GL (headless Chrome), the same 4-s window: walking the Kestrel 7.5 fps, 12 point lights; aboard the hauler 2.5 fps, 19 point lights, 155 draw calls; hauler's lights off 4.0; all point lights off 5.3. After the fix: walking 8.3, aboard 8.5 (8 point lights, 138 calls, geometry count flat while firing)
regression: dev-docs/parked/threadspace/tests/boarding.json "aboard, the scene holds the light pool's 8 point lights, not every room's"; tests/smoke.json "the scene's point lights are the pool of 8"
---

What a person sees: smooth flying and walking; then you board the Guild hauler and the fight runs at a few frames a second.

Why, three things, measured one at a time:
1. **Every interior's point lights were in the scene all the time.** Aboard the hauler, the Kestrel's 12 room lights still
   burned inside her hull, out of sight, beside the hauler's 7. In three.js every point light is evaluated for every pixel
   of every lit surface, seen or not, and changing their number recompiles every material.
2. **The boarded hull's outside was drawn behind its own walls**: 36 meshes of plated metal (the hauler's containers),
   shaded and then painted over by the rooms.
3. A smaller leak: every rifle tracer made a new box geometry that was never freed (+10 geometries per 4 s of fire).

Fix: a fixed pool of 8 point lights (`lights.mjs`) moved each frame onto the room lights nearest the camera, in only the
rooms you are in; an interior now records where its lights are instead of owning PointLights. The Kestrel's decks are drawn
only while you walk them; a boarded ship's outside is hidden while you are inside. Tracers share one geometry and free
their material. And a slow frame steps the pixel ratio down by a quarter (Retina: 2 → 1, never below 1) and back up when
there is room (`game.adaptResolution`).
