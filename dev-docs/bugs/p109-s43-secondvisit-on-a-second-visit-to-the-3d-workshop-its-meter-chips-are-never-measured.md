---
id: P109-S43-SECONDVISIT
title: In the flat Garden's Workshop the spa's two parts' meter chips cover each other (found as "the second visit to the 3D Workshop")
status: fixed
phase: P109
task: ISL-046
severity: low
area: library garden-kit / the Garden node's meter chips (`meterEl`, placed by CSS inside each tile); garden-3d-kit's `chipLifts` moved into garden-kit
regression: packages/noodl-mcp/tests/isl046Meters3d.test.ts (one copy + chipLifts); scripts/devtools/drive-iw007-touch.js (METERS, both modes)
found: P109 s43, 2026-10-11, building P108-S7-METERS3D — `drive-iw007-touch.js --mode 3d`, METERS cobble-planks
---

Teach Pip on her land, go back to the island, then teach Cobble there: the Workshop opens a second time. Its chip
for the spa's planks (`0/4`, watched, with the violet ring) covers the stones' full chip (`6/6`). On the first visit
the same two chips are kept apart (METERS3D's `chipLifts`).

**Measured:** the drive's METERS reading on the second visit. Every chip's cached size (`__gdW × __gdH`) was `0 × 0`
while the page showed it at a real size (`6/6` 93 × 17, `0/4` 108 × 24). So `positionOverlay` measured the chips
before they had layout and never ran again after they did, and `chipLifts` was handed chips with no size. The same
reading on HEAD's kit shows the same overlap (HEAD never measured chips at all).

**Tried and taken out:** a `ResizeObserver` on each chip that measured 0, asking for a frame. The next drive read the
same `0 × 0`, so no frame reached `positionOverlay` after the chips got their size, or the visible chips are not the
engine's current overlay. Neither was told apart. Not diagnosed further (low).

**Next:** read the engine on the second visit directly (is it the one that drew the first? is `rafId` stuck, is
`destroyed` set?) before choosing a fix. The name pills' size cache (`pillSides`) reads the same way and may share it.

## s45 (2026-10-11): read, and the diagnosis was wrong

The engine was read on the second visit, as asked: a copy of the drive with a probe at each Workshop that lists every
Garden 3D root (`[data-gd3-world]`), its engine and its chips, waits 1.5 s, forces one frame and reads again.

- Pip's Workshop: one 3D root, 5 chips, every cached size real (`0/6` 133 × 24 cached 133 × 24, lift 5.6). Green.
- **Cobble's Workshop: no Garden 3D root on the page at all.** The 5 chips were `.gd-meter`, garden-kit's. `6/6` and
  `0/4` still met after 1.5 s and after the forced frame.

Under software GL the island falls back to the flat Garden (Too Slow, P108 s7's note), the page stores that choice,
and the second Workshop is drawn flat. The "cached 0 × 0" was the drive reading a 3D-only field (`__gdW`) on 2D
chips. So the defect is garden-kit's: a meter chip is placed by CSS inside its own tile, it is wider than a tile, and
nothing keeps two neighbours' chips apart. A child whose tablet is too slow for 3D (or who never had it) sees the
spa's stones chip over the planks' in every Workshop on her land.

**Fix:** `chipLifts` moves into garden-kit (`exports`, one copy, as `pillSides`); garden-3d-kit reads it from there.
The Garden node's layout effect, after the name-pill pass, reads each plot chip where its tile puts it (its rect less
the lift it already has, in the world's own px) and lifts any that would cover another, writing `margin-top` and
`data-lift` only when a lift changes. Not on the island (`data-wide`): its compact bars are 12 px and never meet.

**Graded (s45):** the probe on HEAD's kits was the red arm (Cobble's flat Workshop: `6/6` and `0/4` met). After:
`drive-iw007-touch.js --mode 3d` 29/31 (s43: 28/31), METERS green in both Workshops, Cobble's flat one with `0/4`
lifted 17.4 px; the flat mode 28/31, METERS green in both, Pip's `0/6` lifted 17.4 px (so his flat Workshop was red
too). The other reds are P109-S18-TOUCHBUILD's (BUILD, PAY; and PILLS in flat mode, 0 settled moments), as on HEAD.
`isl046Meters3d` gains the one-copy identity (3D's chipLifts is garden-kit's) and its mutant arm now cuts garden-kit's
source; `ig007Garden3d`'s one-copy gate lists `chipLifts`. The flat Garden's pass is graded by the drive only (this
package's jest has no DOM).
