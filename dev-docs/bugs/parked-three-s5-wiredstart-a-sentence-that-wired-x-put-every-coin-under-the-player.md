---
id: PARKED-THREE-S5-WIREDSTART
title: '"Move somewhere new" wired a coin''s X and Z, a wired input never reads its typed value, so every coin started at 0, 0 under the player and Coin Run opened on Score 5'
status: fixed
commit: 55eadcf31
regression: dev-docs/parked/three-in-nodes/editor/tests/behaviour.test.mjs
severity: high
area: parked three-in-nodes — NodeGX Scene's Behaviour sentence "move somewhere new" (`editor/public/behaviour.mjs`) and three-kit's Body (`library/modules/three-kit/src/kit.js`)
found: parked THREE-IN-NODES s5, 2026-10-19
evidence: dev-docs/parked/three-in-nodes/editor/tests/coin-run.json — first play read `{"player":[0,0.45,0],"text":"Score 5"}` before any key; after the fix `Score 0` with all five coins where they were placed, then 0 → 3 by the arrow keys
---

The sentence wrote two Expressions (`round((random() * 2 - 1) * 9) / 2`, Run on the coin's Hit, Evaluate At Load off)
wired into the coin Body's **X** and **Z**. A wired input takes its value from the wire only, never from the value typed
in the inspector, and the Expressions had not run yet, so every coin's X and Z were 0. All five coins sat at 0, 0 under
the player's start, all five touched it on the first frame, and the score read 5 before a key was pressed.

🔴 **The drive's own checks hid it twice.** The autopilot's "score ≥ 3" passed (it was already 5), and "every coin
jumped somewhere new" passed (they had all jumped, at once). Only the start-state check (`Score 0`) failed. Both now
assert their start: the autopilot returns its first reading (must be 0) and Play checks every coin where it was put.

**Fixed** with a Body input pair, **Jump To X / Z**: a change moves the Body there and leaves its start (X Y Z) alone,
and nothing happens before a value arrives. The sentence wires into those. Reset still brings the coin home. The editor
keeps X and Z draggable because nothing wires them.
