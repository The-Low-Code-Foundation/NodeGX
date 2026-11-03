# DIG-002 — The base becomes a big landed spaceship

**Phase:** [133](README.md). **Depends on:** DIG-001. **Round:** 7. **Scope:** [SCOPE §5](SCOPE.md).

> "Please make the 'home base' you come back to when you die a space ship, so it's like you've landed and gone out the
> hangar to explore the planet, but the ship doesn't do anything. Make it a nice big ship for fun" — Richard, 2026-11-03

## What

Replace the plank house (`stampBase` in `gen-cave.mjs`) at the spawn clearing:

- About 60 blocks nose to tail, 30 across the wings, 14 high, on landing legs; the ground under it levelled, a
  scorched ring round it.
- Inside: the **hangar** at the back with a ramp to the grass; **crew bunks** (a new game starts here); the **med
  bay** (you come round here after dying, pack untouched); a **workshop** (crafting, the ship's log on a screen); a
  **mess**; a corridor of lit panels; the **cockpit** with a big window over the nose. Nothing works, by design.
- New blocks: hull plating (two tones), dark glass, deck plate, lit panel, hazard stripe; two or three voxel props
  (seats, a console bank). Running lights blink on the wingtips; warm cabin light inside (light levels, as torches).
- The base's lectern note becomes **the ship's log** (who you are and why you landed: a few lines, no lore beyond
  "you came to look"). The old miners' logbooks stay, as an earlier expedition's.
- The compass's base mark becomes the ship.

## Acceptance

- **AC1.** In Node, on five seeds including Richard's (538723565): every landing leg stands on rock or soil, nothing
  of the ship floats, and the clearing is level under the ramp.
- **AC2.** A drive: a new cave starts in the bunks; dying in the cave wakes you in the med bay with the pack as it was;
  walking out of the hangar reaches grass without a jump higher than one block.
- **AC3.** Screenshots at the phone's pixel ratio: the ship from three angles outside (one from a hill, one at
  dusk-ish light under the sky), and each room inside. Richard sees them before it ships.
- **AC4.** Chunk generation time round the spawn, measured before and after in Node; the first frame on a fresh cave
  no slower than today by more than 20 %.
- **AC5.** The round-5 drive's "you start in the base" check is rewritten for the ship and green.
