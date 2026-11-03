# DIG-004 — The compass stripped, and much more to find

**Phase:** [133](README.md). **Depends on:** DIG-003 (pins). **Round:** 7. **Ruling:** R2, *"Keep it as you
stated"*: north, east, south, west, your depth, the ship and your own pins.

> "It'd be cool to increase the number of hidden rooms too, like the one I said there with just a weapons box."
> — Richard, 2026-11-03

## What

- **The compass:** N/E/S/W, depth, the ship (white), pins. Every room, portal, vault, lair and daylight-shaft mark
  goes. The day's rooms keep their hum (a sound, close up).
- **Words that mention the marks are rewritten:** the help text on both platforms, and the logbook notes that point
  at the compass (`NOTES` in `gen-cave.mjs`: "Logbook, day 30", "Scratched into a rune stone"). Their voice kept.
- **Remnants everywhere**, unmarked, as many more as it takes: wayside shrines in at least five shapes (today's is one),
  sealed caches, a buried stair going nowhere, a carved niche, a vent shaft, a lone statue in a cave wall. Placed like
  today's sites (decided from their cell, kept inside it, never floating); a finer cell or a second layer of cells so
  they sit between the bigger sites. These are the old kinds' replacements and the seed of DIG-006's ruins.

## Acceptance

- **AC1.** In Node on three seeds, per depth band (16–30, 30–60, 60–120 m): the count of finds per 100,000 cells of rock
  before and after, and the **median dig distance** from a random point to the nearest find. After is under half of
  before.
- **AC2.** No remnant floats (the FLOATSITE check, extended) and none cuts a planted room (the ROOMOVERLAP check).
- **AC3.** A drive reads the compass and finds no marks but the four letters, depth, the ship and a pin.
- **AC4.** Richard on the iPhone: does he still dig for long stretches with nothing? His words into the README.
