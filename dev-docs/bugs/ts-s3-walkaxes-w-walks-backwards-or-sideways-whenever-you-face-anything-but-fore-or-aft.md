---
id: TS-S3-WALKAXES
title: Walking, W walks backwards when you face port or starboard and sideways in between; only fore and aft were right
status: fixed
severity: high
area: threadspace / the walk controller (`public/src/controllers/walk.mjs`), so the Kestrel's decks, the station concourse and boarding
found: Threadspace s3, 2026-10-22, Richard played it: "sometimes W means forwards, sometimes sidewards, you have to keep trying different direction keys"
fixed: Threadspace s3, 2026-10-22
commit: a475b7fc0
evidence: dev-docs/parked/threadspace/tests/smoke.json "W A S D walk where the view faces at every heading": on s2's walk.mjs the worst step against the view's own axes is −1 (exactly backwards), on s3's +1
regression: dev-docs/parked/threadspace/tests/smoke.json "W A S D walk where the view faces at every heading, not only 0 and 180 degrees (TS-S3-WALKAXES)"
---

What a person sees: walk the Kestrel's corridor and W takes you forward. Turn into a side room and W takes you back
out of it; turn 45 degrees and W slides you sideways. Every walk in the game uses the same controller, so the concourse
and a boarding fight did it too.

Why: the step was rotated by the view's yaw with both `sin` terms' signs flipped:
`dx = fx·cos − fz·sin, dz = fx·sin + fz·cos`. The view's forward is (−sin, −cos) and its right is (cos, −sin), so the
step is `dx = fx·cos + fz·sin, dz = −fx·sin + fz·cos`. At yaw 0 and 180 degrees sin is 0 and the two agree, and s1's
drives only ever walked fore and aft (the corridor runs along z), so every check passed.

Fix: the signs (`walk.mjs`). The regression check steps W, A, S and D at eight headings and asks each step's direction
against the camera's own forward and right: 32 dot products, worst must be above 0.99.
