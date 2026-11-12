---
id: PARKED-LUMIERE-R2-GLARE
title: In Château Lumière, a won room's light was so bright and bloomy it was hard to see
status: fixed
commit: none yet — round 2 of dev-docs/parked/lumiere, commit waits on Richard's go
regression: dev-docs/parked/lumiere/tests/bright.json
severity: medium
area: parked lumiere — `public/src/castle.mjs` (`lighting`, `Mood`, `windowOn`, room specs), `public/src/look.mjs` (bloom)
found: parked LUMIÈRE round 2, 2026-11-12, Richard ("the lights are too bloomy and bright when the rooms are cleared so it can be hard to see")
evidence: tests/bright.json (?auto=1&won=dressing,kitchen,library, a frame read back from the canvas, 400 px wide): share of pixels with luminance > 0.93 — before Hall 10 %, Dressing 8.8 %, Kitchen 7.6 %, Library 0; after 0.5 / 0.1 / 0.1 / 0. Mean luminance before 0.71 / 0.72 / 0.68 / 0.37, after 0.55 / 0.59 / 0.53 / 0.26.
---

The won state stacked a 1.15 hemisphere, a 2.0 sun, an environment map at 0.45–0.5 and a bright fog on pure-white
walls, floors and ceilings, so most surfaces sat at the top of the tone curve, and the windows' glass (emissive 1.15)
and light shafts bloomed into a white haze. Won lights now 0.7 / 1.35 / fill 0.8 / chandelier 5.5, env 0.28–0.3, fog
half as thick and darker, glass emissive 0.7, shafts about 40 % weaker, walls / floors / ceilings off-white, bloom
0.55 → 0.45. The dark state is untouched.
