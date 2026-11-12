---
id: TS-S2-SHELLFACE
title: A new captain spawns looking at a flat grey wall: the hull's own bow block, 1.5 m from the eyes, filled the view (and three more rooms faced a shell face)
status: fixed
severity: high
area: threadspace / the walking camera and the Kestrel's hull shell (`public/src/ships.mjs`, `game.mjs` frame)
found: Threadspace s2, 2026-10-22, Richard clicked New captain and "didn't see anything in the main view"
fixed: Threadspace s2, 2026-10-22
commit: 414178d23
evidence: dev-docs/parked/threadspace/tests/smoke.json "at spawn the eye lands on the bridge, not on the hull's own bow block"; the s1 shot shots/01-bridge.png (uniform grey) beside the s2 one
regression: dev-docs/parked/threadspace/tests/smoke.json "at spawn the eye lands on the bridge, not on the hull's own bow block (fixed 2026-10-22)"
---

What a person sees: click **New captain**, and the 3D view is a flat grey plane with a black band above it. Turning the
mouse shows a corner of two grey planes. Nothing says you are in a corridor two steps from the bridge.

Why: the Kestrel's exterior is several overlapping boxes (main hull z −26..30, bow z −36..−20, stern block z 18..30,
bay door z 29.5..31.5), and the rooms are built inside them. "Exteriors are invisible from inside by back-face culling"
holds only for the box you are inside of: the bow box's **aft** face, inside the corridor, is a front face to a camera
standing at the spawn (0, −2, −18.5) looking forward, 1.5 m away, 10 m wide, 6 m tall. Measured with a camera-ray
probe (`__game.debug.see()`, added for this): spawn → bow box at 1.5 m; bridge looking aft → main hull's bow face at
1.0 m; hold looking aft → stern block at 6 m; bridge ceiling → the canopy band's underside, 10 cm below the ceiling slab.

Why the drive was green: `stats()` reads phase, position and credits, not the view. The s1 shot `01-bridge.png` **is**
the grey wall, with the captain's banner over it, and nobody read it against the question "is this a corridor?".

Fix: the five shell meshes sit on `SHELL_LAYER` (1); the camera draws that layer in every phase but `walk`
(`game.mjs` before `renderer.render`). From the bridge parapet you still see the prow, the running light and the wings,
which are not shell. Three smoke checks now read the view through `debug.see()`: spawn forward, bridge aft, bridge ceiling.
