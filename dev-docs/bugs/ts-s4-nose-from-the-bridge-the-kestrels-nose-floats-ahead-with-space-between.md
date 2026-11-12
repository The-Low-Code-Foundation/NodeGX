---
id: TS-S4-NOSE
title: From the bridge the Kestrel's nose floated ahead of the window with open space between — only the prow spike and its running light were drawn
status: fixed
severity: medium
area: threadspace / the Kestrel's hull (`public/src/ships.mjs` `frigate`)
found: Threadspace s4, 2026-10-22, Richard: "I look out the front of the ship and I see the nose of the ship like 10m away with space in between"
fixed: Threadspace s4, 2026-10-22 (uncommitted at the time of writing)
evidence: tests/command.json — from the helm 8° below the horizon, and standing at the bridge window looking down, `debug.see()` now meets the bow within 15 m / 20 m; shots c01-helm-bow.png, c02-bridge-bow.png. Not run against s3's ships.mjs (the old view had nothing between the glass and the spike, which is what Richard saw)
regression: dev-docs/parked/threadspace/tests/command.json "from the helm, 8° below the horizon…" and "standing at the bridge window looking down…"
---

What a person sees: out of the bridge window, a grey spike and a red light hanging in space well ahead, nothing joining them to the ship.

Why: the bow is part of the hull shell. The walking camera never draws the shell (TS-S2-SHELLFACE), and from the helm every face of a
convex shell is a back face, so from inside the ship the bow does not exist. The prow spike and its light are separate meshes, so they
were the only part of the nose anyone inside could see.

Fix: an inner bow deck (a loft of three sections) from the window sill out to the spike, on the ordinary layer and inside the shell's
octagons at every corner, so from outside the shell still hides it and her lines are unchanged; three deck lights on it; the spike lowered
onto its tip.
