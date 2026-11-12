---
id: TS-S5-WRENBAY
title: The Wren (11.7 m across) launches through a bay door 8 m wide
status: needs-ruling
severity: low
area: threadspace / `public/src/ships.mjs` `fighter`, `public/src/models/kestrel.mjs` (the bay door)
found: Threadspace s5, 2026-10-29, by the shipyard's "the Wren fits through the bay door" check
evidence: the shipyard measures the Wren's span from a built `fighter()` (Box3): 11.7 m wingtip light to wingtip light; the door is `box(8, 4, 0.2)`
---

The Wren's wings reach 5.6 m either side of her centreline, with her cannons and wingtip lights beyond that. The
Kestrel's bay door, between her two main drives, is 8 m wide. In the game she launches and lands without anyone noticing,
because nothing collides. Seen from astern, she cannot fit.

The door can't simply widen: the drives sit at x ±6 with a 1.9 m radius, so a wider door cuts into them, and they would
have to move off the stern. Options for Richard:
- **Folding wings:** the Wren's wings fold up on the pad and unfold once clear (an animation, and it reads as a ship
  detail).
- **A smaller Wren:** span ≤ 7.6 m. She reads smaller next to the Rook raiders, which share her body.
- **A belly bay:** she drops out of a hatch in the hold's floor instead (the bay room and launch move).
