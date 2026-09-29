# IW-008 — The crew and more land

**Opened 2026-09-29** from README §0 ("an army of robots … copies of pip or rubble, with their own name, with a job …
multiple plots needed"). **Status: ⬜.** Depends on IW-005, IW-006. Lane D.

## 1. The person sentence

> **She has three Pips — Pip, Bubbles and Sprout — each named by her, each on its own plot doing its own job. She copies
> Pip's watering program onto Sprout and drags Sprout to the carrot patch. From above she sees nine robots at work.**

## 2. What it is

- **Copies:** a robot bought in the shop is a new row of a kind (pip, cobble, pocket, echo) with its own name, colour,
  hat, brain size and program; P106 IG-005's robot rows already carry these fields (save stays compatible).
- **Jobs:** a robot is assigned to a plot (drag its card onto the plot on the Island page, or from My robots). One
  robot per plot job; a plot may have a second robot for a second job (feeding + watering).
- **Copy a program:** My robots → "copy [Pip]'s program to…" → another robot of a kind whose palette covers it (a
  program using `pick` cannot go to Pip — say why).
- **More land:** the island gains free plots, bought as land in the shop (or earned by finishing a family of
  missions). P106 R9 built 46 × 22 on 5 × 3 slots; more land adds slot rows — **gated on the frame time**.
- **A cap:** a crew cap (e.g. 12 robots) set by the tablet's frame reading, not by design.

## 3. Acceptance criteria

1. Buy, name and assign three copies; each works its own plot; the save round-trips.
2. Copy a program between two robots of one kind; a refused copy says which block the target cannot do.
3. Reservation (IW-005) across the crew: no two robots on one egg.
4. The frame gate on the Mac at CPU ×4 with the crew at its cap: p95 under the P106 IG-004 AC6 target; the tablet
   reading with Olive in flight is Richard's.
5. Island drives 2D + 3D with the crew at its cap; My robots at three widths.

## 4. Traps

- Path searches for many robots per tick (IW-005 §4).
- The 3D kit redraws a robot on map/things change (P106 s2 trap: the can level went stale) — with many robots, redraw
  by robot, not the scene.

## 5. Notes

(empty)
