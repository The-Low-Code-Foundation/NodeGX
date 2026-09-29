# IW-000 — The mockup: three missions as jobs, on real Blockly

**Opened 2026-09-29** from README §0 and rulings R1–R3. **Status: ⬜.** Depends on nothing. Lane M.

## 1. The person sentence

> **Richard and the two children open one page and play three missions the new way: Pip picks up the can, fills it at
> the well and waters until each tulip's meter is full; Cobble carries stones until each path square turns from dirt to
> path and then walks home; Pocket gathers the hen's eggs into the basket by Mamie's door, and the child made that basket
> a block by tapping it. The blocks are dragged out of a drawer, Scratch-style.**

## 2. What it is

A published artifact (like P106 IG-000, `https://claude.ai/artifact/9pxL78hWRmogb4VAreDrDM`), self-contained: Blockly 12
from the CDN (`cdn.jsdelivr.net/npm/blockly@12.3.1`), three.js r158 for the world (reuse IG-000's scene code), EN/FR.

- **The Workshop, re-laid for Blockly:** world on the left, the Blockly workspace on the right at full height, the drawer
  inside it on its left edge, always open; the bar (Drive · Teach · Play · **Stop** · Start over) under the world; the pad
  beside the world with every action the mission's drawer has.
- **Three jobs** (README §4.1): *tulips* (can on a shed tile, the well, 3 tulips × 3 drinks, meters on the tulips, the can
  level on the can), *Cobble's path* (rock with `left`, hod of 4, 4 squares × 4 stones in stages, finish line → walks
  home), *eggs* (hen pen with eggs on seeded tiles, the basket by the door `0/4`, `go to nearest egg`).
- **The blocks, customised** (IW-004 §2 is the spec; the mockup is its first draft): Zelos renderer, icon-first blocks at
  7–9, `?` on the drawer blocks, delete by dragging back to the drawer, the running block glows.
- **Thing + state conditions, picked on the island:** a `👆` on a thing slot arms the world; the tapped thing becomes a
  chip; the state list follows the chip's kind. At 10–12 the eggs mission also offers `count of [🥚] in [basket] = [4]`.
- **Wear, sped up:** a "time passes" button ages the plot so a tester can see a tulip get thirsty and the robot go back.
- **Shells:** a counter that ticks up on progress and a bonus at the finish line (D2) — a sketch, no shop.
- A stats line (`s`) as IG-000 had: fps and, on the tablet, how a drag feels (drag start → drop latency).

## 3. Acceptance criteria

1. Published; opens on the Mac and on the tablet; EN/FR switch; both bands switch.
2. Each of the three jobs can be won by a program built **only by dragging** from the drawer, and by Teach + fold.
3. A tapped thing becomes a chip; the chip's state list differs between the can, the basket and the tile ahead.
4. Stop ends a run at once; a `repeat 9 { until … }` that never ends can be stopped.
5. On the tablet, by touch: drag from the drawer, drop into a `repeat`, drag back to delete — each works first time in
   10 tries (the reading is Richard's).
6. Richard's grade, and the children's words the day they play it (IW-009 §2) — written into §7.

## 4. How to build it

Start from IG-000's page (the 3D scene, the islanders, the palette) so the look is continuous. Write the jobs as a
tiny engine inside the page (not the real one — IW-002 builds that); keep its vocabulary the same as IW-002 §2 so the
mockup and the engine name things the same. Blockly's workspace JSON is the program; a small interpreter steps it.

## 5. Gates

A drive with the headless browser: each job won by a scripted drag sequence; Stop mid-run; the chip picker; EN and FR;
1024 × 768 and 1368 × 900 screenshots looked at. A working wireframe is not the mockup: grade the look, not only the clauses.

## 6. Traps

- Blockly's flyout scales with the workspace zoom: at the kids' zoom the drawer can take half the workspace. Fix the
  flyout scale separately.
- Blockly handles pointer events itself; the 3D canvas's orbit controls must not steal a drag that starts on the
  workspace (and vice versa).

## 7. Notes

(empty)
