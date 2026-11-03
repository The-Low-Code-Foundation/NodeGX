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
