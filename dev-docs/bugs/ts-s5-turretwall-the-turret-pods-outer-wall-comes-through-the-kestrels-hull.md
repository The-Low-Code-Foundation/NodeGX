---
id: TS-S5-TURRETWALL
title: The Kestrel's turret pod pokes its outer wall 0.23 m through her starboard flank
status: needs-ruling
severity: low
area: threadspace / `public/src/interiors.mjs` `frigateInterior` (turret pod), `public/src/models/kestrel.mjs` `hullSections`
found: Threadspace s5, 2026-10-29, by the shipyard's "rooms fit inside the hull" check, on the ship as drawn
evidence: the shipyard's Checks card at the defaults says "Turret pod's wall comes through her skin by 0.23 m (at x 8.1, y −2.1, z −12.6)"; tests/shipyard.json asserts the check reports it
regression: dev-docs/parked/threadspace/tests/shipyard.json "the checks run on the ship as drawn…"
---

The turret pod is the room at x 3..8, z −12.5..−7.5 (`I.room(5.5, -10, 5, 5, …)`), so its outer wall's face sits at x 8.1.
At the pod's forward end (z −12.5) her hull is only 7.875 m from the centreline (between the z −20 section, 15 m wide,
and the z 0 one, 17 m). So the lower forward corner of the pod's wall stands 0.23 m out of her starboard side, from the
deck up. The note above `frigate()` ("rooms x ±8.1 sit inside her main loft") was true at the pod's after end and not at
its forward one. No check existed to say so until the shipyard.

Two fixes, one line each. Richard picks:
- **Widen her a little:** beam 17 → 17.8 m (the model's `beam` default). Every part rides the hull, so nothing else moves.
- **Move the pod 0.3 m inboard:** `I.room(5.2, …)`, with the ladder, hatch and racks moved by the same.
