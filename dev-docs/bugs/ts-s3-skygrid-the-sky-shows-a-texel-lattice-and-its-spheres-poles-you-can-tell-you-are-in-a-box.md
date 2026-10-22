---
id: TS-S3-SKYGRID
title: The sky showed its own texture's lattice and the fan of its sphere's poles, so space looked like the inside of a box
status: fixed
severity: low
area: threadspace / the sky (`public/src/space.mjs`)
found: Threadspace s3, 2026-10-22, Richard: "You can tell you're inside a cube, you can see the corners and edges and distances"
fixed: Threadspace s3, 2026-10-22
commit: pending (threadspace s3)
evidence: s2's dev-docs/parked/threadspace/shots/03-tactical.png, enlarged: a regular diagonal lattice over the whole sky, and curved lines converging below the Kestrel (the sphere's pole); s3's 03-tactical.png has neither
regression: dev-docs/parked/threadspace/tests/smoke.json "the sky is a baked cube map, drawn at infinity" (a structural check; the look itself is read from the shots)
---

What a person sees: the background stars and nebula sit on a surface you can sense, with a faint grid over it and lines
meeting at a point straight up or down.

Why: s1 painted the nebula and 2,500 one-pixel stars into one 2048 × 1024 canvas and wrapped it on a 48 × 24 sphere. At a
70-degree view each texel spans about three screen pixels, so the stars became blurred squares on a lattice, and an
equirectangular picture pinches to a point at both poles.

Fix: the standard for the genre is a skybox drawn at infinity. The nebula is now computed from the direction alone (domain-
warped noise with a galactic band and dark lanes, a palette per sector), baked once per sector into a half-float cube map
(1024 a face on a GPU, 128 on software GL) and set as `scene.background`, with a blurred copy as `scene.environment` so the
ships' metal picks up its colour. The stars are 7,000 real points, round and soft, sized in screen pixels, crowding to the
band. There is a sun where the light comes from.
