---
id: TS-S3-HOLES
title: Every side-room doorway on the Kestrel and the Carrion opened onto 1.5–2 m of open space between the two walls; ceilings read black; windows were bare gaps
status: fixed
severity: medium
area: threadspace / interiors (`public/src/interiors.mjs`: `frigateInterior`, `capitalInterior`, `concourseInterior`, `Interior.room`)
found: Threadspace s3, 2026-10-22, Richard: "Inside the ship has a lot of holes and gaps where you just see into space, space stations too"
fixed: Threadspace s3, 2026-10-22
commit: a475b7fc0
evidence: dev-docs/parked/threadspace/shots/b3-firefight.png at s2 showed the forest moon through the Carrion's starboard door; the probe `__game.debug.see()` straight down and straight up in the turret-pod, airlock and quarters doorways hit nothing on s2's interiors.mjs (null, null) and the passage floor and roof at 1.4–1.7 m on s3's
regression: dev-docs/parked/threadspace/tests/smoke.json "between the corridor and each side room there is a floor and a roof, not space (TS-S3-HOLES…)"; tests/boarding.json "between the Carrion's corridor and her side rooms…"
---

What a person sees: walk past the turret pod, the airlock or your quarters and the doorway shows stars under your feet and
over your head; on the Carrion the side doors show the moon. Every ceiling is a flat black, which reads as more holes. The
bridge's and the concourse's windows are a parapet and then nothing.

Why: each side room is its own box, set 1.5 m (2 m for the airlock) from the corridor's wall, with doorways cut in both walls
and nothing joining them. s2 hid the hull shell from the walking camera (TS-S2-SHELLFACE), which was right, but it also
removed the only thing behind those gaps. Ceilings face down, away from the hemisphere light's sky colour, and had no light
of their own.

Fix: `Interior.passage` joins two doorways with a floor, a roof and two side walls (three on the Kestrel, two on the Carrion);
ceilings have a little emissive and ribs every 3 m; walls have a skirting board; every `open` wall gets a framed window
(sill, head, an odd number of mullions so none stands in the middle of the helm's view, a faint pane). The concourse is 6 m
high. The helm's eye moved to just behind the bridge glass so the new frame is out of its view.

Measuring trap, found writing the check: `debug.see()` reports no hit as `dist: Infinity`, which JSON sends as `null`, and
`null < 3` is true in JavaScript. The first version of the check passed on the broken s2 code. It now asks for a number.
