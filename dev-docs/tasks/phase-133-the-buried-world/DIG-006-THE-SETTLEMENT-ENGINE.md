# DIG-006 — The settlement engine

**Phase:** [133](README.md). **Depends on:** DIG-004, DIG-005 (styles as data). **Round:** 8. **Scope:**
[SCOPE §6.2](SCOPE.md).

> "Some areas collapsed and broken, needing to be dug out to discover secrets like an archiologist finding a ruined
> city, some small parts reasonably intact and beautiful, showcasing their art and culture, beautiful decorations."
> — Richard, 2026-11-03

## What

- **District slots** on a coarse grid (try 192 blocks) at several depths; a settlement's pieces are worked out from its
  slot and its data, and every chunk asks "which pieces overlap me" (Minecraft's structure starts), so chunks still
  agree without talking.
- **A settlement is a graph of spaces** (halls, homes, stores, cisterns, gardens, a library, a shrine, vent shafts,
  stairwells) joined by passages, sized from a few rooms to a town, in one of the canon's styles (at least four, each a
  palette and a set of proportions).
- **Roads** between slots, mostly fallen in.
- **Collapse** after building: roofs down into rubble (a new block, quick to dig), broken pillars, split floors,
  gravel-filled halls; **a few whole pockets** per settlement carry the decoration.
- **New blocks and props:** carved stone and cracked carved stone, rubble, mosaic tiles, mural panels (multi-block, a
  fixed set of motifs drawn in code), friezes, statues (voxel models), crystal lanterns, tablet shelves, banners, water
  channels and pools, and the **rolling stone door** (roll it aside to pass; Derinkuyu's).
- **Safe rooms:** some whole rooms creatures will not enter (the canon says why).
- Inspiration, not copies: Derinkuyu and Kaymaklı, Naours, Ellora, Wieliczka, Matmata (SCOPE §6.2).

## Acceptance

- **AC1.** Node slice pictures (top-down and side-on) of one settlement per style, before and after collapse.
- **AC2.** Determinism: a settlement stamped chunk by chunk equals the same settlement stamped whole, across every
  chunk border it crosses, on three seeds.
- **AC3.** Nothing floats; no settlement cuts the ship, a planted room or a lair.
- **AC4.** Chunk time: a chunk with settlement pieces costs at most twice a plain chunk in Node; the iPhone's frame
  rate walking into a town checked by Richard.
- **AC5.** A drive digs from a road's rubble into a whole pocket and reads its blocks.
- **AC6.** Shots of each style's whole room go to Richard for the look round; his list verbatim, one pass.

## Log

**2026-11-03, s2 (private repo `94540f0`):** built. `public/src/gen-settle.mjs`: layout as a graph of spaces on one to
three levels (passages, spiral stairs, vents, footings), each piece built once into a grid and copied per chunk in
three phases; the collapse; whole spaces with the decoration; a cavern town on terraces with houses; refuges behind a
rolling stone door (the block is placed, the roll-aside interaction is not built yet); readable anchors (DIG-007 fills
them); a placer that keeps clear of the ship, lairs, vaults and planted rooms. 15 new blocks. Nothing placed in the
game yet.
- AC1: `tools/slice-settle.mjs` pictures each style before and after the collapse (on five placeholder test styles;
  the real styles from DIG-005 not yet pictured).
- AC2: whole = 16-block chunks = 8-block chunks on 3 seeds × 5 styles (0 cells differ), and the game's own chunks hold
  what the engine wrote (`tools/check-settle.mjs`).
- AC3: nothing floats (flood from every placed solid block to rock) and placement clashes with nothing, same runs.
- AC4: chunk time × 1.43 in Node (limit 2); the iPhone walk waits on a placed district (DIG-007).
- AC5, AC6: not yet (no district in the game).
- Two defects found and fixed: P133-DIG006-LAVASLAB, P133-DIG006-RAVINEFOOTING.
- Still to build: the stone door's roll, safe rooms honoured by `mobs.mjs` (`settle.safeAt` exists), mural motif tiles
  (placeholder tile now; the motifs are lore, so a lore-side session draws them).

**2026-11-03, s3 (with DIG-007, private `bee07f6`):** a district is placed in the game now. Safe rooms honoured:
creatures never spawn in, and turn back from, a refuge that came through whole (`mobs.safeAt`). AC5 in part: the
district drive checks the road out ends in a fall of rubble (10+ rubble/gravel blocks round its end), whole pockets
stand, and every readable spot is carved in the world; it does not yet dig from the rubble into a pocket by hand.
New in the engine: `sealChamber` (DIG-007's secret) and `rawAt` (tells "made air" from "left alone"; `finalAt` gives
0 for both). `check-settle` still 61 PASS, chunk time × 1.14. Still to build: the stone door's roll, the mural motifs
(lore side), AC6 (shots of each style's whole room for Richard's look).
