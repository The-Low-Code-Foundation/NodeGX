---
id: TS-S4-PROPBOX
title: Aboard the Carrion and on every station concourse, props had their colliders hundreds of metres away — you walked through crates, bunks, consoles and pillars
status: fixed
severity: medium
area: threadspace / `public/src/interiors.mjs` `Interior.prop`
found: Threadspace s4, 2026-10-22, reading `prop` while rebuilding the interiors
fixed: Threadspace s4, 2026-10-22 (uncommitted)
evidence: by reading: `Box3.setFromObject` measures in world space; colliders are in the host's frame; the Kestrel is built at the origin (so hers matched by luck), the Carrion sits at (700, −60, 900) turned 0.8 rad and stations at (600, 0, −400). Not measured with a probe before the fix
regression: none yet — a probe that walks into a Carrion crate would be the check
---

What a person sees: you walk through the Carrion's crates and bunks and the concourse's pillars; defenders strafe through them too.

Why: `prop` measured each prop with `Box3.setFromObject`, which is world space, and stored it as a host-frame collider.

Fix: `boxIn(obj, frame)` measures each mesh's bounding box through the host frame's inverse matrix.
