---
id: P109-S43-SECONDVISIT
title: On a second visit to the 3D Workshop its meter chips are never measured, so two still cover each other
status: scheduled
phase: P109
task: ISL-046
severity: low
area: library garden-3d-kit / the overlay (`positionOverlay`), on a page the Page Stack keeps
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
