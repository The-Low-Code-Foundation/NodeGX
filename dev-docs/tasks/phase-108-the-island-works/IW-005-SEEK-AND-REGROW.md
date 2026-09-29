# IW-005 — Seek and regrow

**Opened 2026-09-29** from README §0 ("seek out trees … if square contains rock, mine") and D5, D6. **Status: ⬜.**
Depends on IW-002. Lane J.

## 1. The person sentence

> **Pocket is told "go to the nearest egg" and finds one wherever the hen laid it; two robots on the same pen never go
> for the same egg. The rock that Cobble mined grows back. The envelope says "Mamie" and Olive's reading sends Pocket
> to Mamie's door.**

## 2. What it is

- **`go to nearest [thing]`:** a breadth-first path on the plot's tiles (blocking tiles avoided), to the tile facing the
  nearest thing of that kind (or that chip); the robot walks it one step per tick, so a run still animates tile by
  tile. None left → the block ends with a `none` event and Olive says "No more eggs here — the hen is still laying."
- **Reservation:** a found thing is reserved by that robot until picked or the run ends; the next robot's `nearest`
  skips it (Autonauts).
- **`go to [thing chip]`** (a tapped thing) and **`go to [what Olive read]`** (a place named by a read: a door, a bed,
  the well). This supersedes P106 R10 (D6).
- **`if [here / ahead] has [thing]`** — the "if square contains rock, mine" of Richard's note, as a condition.
- **The search area is the robot's plot.** (Autonauts' movable area signs: not in this phase.)
- **Regrow:** rock `left` +1 every `regrowEvery` ticks to its max; the hen lays when fewer than N eggs lie in the pen;
  letters arrive in the post box. All on island ticks only (R2, D7). Seeded (IW-002).

## 3. Acceptance criteria

1. Engine gate: `nearest` picks the true nearest by path length (not straight line) on seeded layouts; ties broken the
   same way every time; `none` when empty; a blocked target is skipped.
2. Two robots, one pen of 3 eggs: each egg picked once; no robot walks to a reserved egg.
3. `go to [what Olive read]` sends the robot to the named door with the real model's read and with the fallback answer.
4. Regrowth on ticks only; a closed page regrows nothing.
5. Drives in 2D and 3D: a robot seen seeking a moved egg; a regrown rock seen.

## 4. Traps

- A path search per tick per robot × many robots (IW-008): cache the path until the target or the map changes.
- The engine's `blocked()` treats out-of-bounds as blocked (E:176-183); the island's plots sit side by side, so a search
  must stay inside the plot's window, not wander into the next plot.

## 5. Notes

(empty)
