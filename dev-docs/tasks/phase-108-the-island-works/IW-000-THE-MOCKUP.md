# IW-000 — The mockup: three missions as jobs, on real Blockly

**Opened 2026-09-29** from README §0 and rulings R1–R3. **Status: 🟡 built and published** (https://claude.ai/artifact/FQwh2xGNTKXxau4wtiMuX3, 2026-09-29, private); Richard's look grade given (§7); AC5 (the tablet by touch) and the children's words owed. Depends on nothing. Lane M.

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

### Session 1 (2026-09-29, lane M, branch `iw000-mockup` cut from `ac5fb8227`)

**Built.** `../phase-78-the-templates/tpl-012-mockups/island-jobs.html` (one file, ~141 KB, no build step, title
"Olive's Island Jobs"). Scripts only from the two allowed CDNs, pinned: three.js r158 (cdnjs, as IG-000) and Blockly
**12.3.1** from `cdn.jsdelivr.net/npm/blockly@12.3.1/` — `blockly_compressed.js`, `blocks_compressed.js`, `msg/fr.js`,
`msg/en.js` (the names measured in the repo's `node_modules/blockly`; both message files write into `Blockly.Msg`, so the
page snapshots FR then EN and swaps with `Blockly.setLocale`). Fonts from Google Fonts; every icon a `data:` SVG; Blockly's
`media` option is `data:,` so its cursors and the menu tick never fetch its media folder (repainted in CSS). No `alert`/
`confirm`/`prompt`; `localStorage` (language, band, shells, won jobs, the three programs) only inside `try`, and the page
runs without it. IG-000's palette, fonts, chrome, stage, camera and islanders are carried over; single light theme with
every colour painted, as IG-000 chose.

- **The Workshop, re-laid for Blockly.** World left with the pad beside it (every action of the mission's drawer, plus
  one "go to nearest" key per kind the drawer offers); the bar Drive · Teach · Play (Play swaps to **Stop** while a run
  plays, as §4.3 has it) · Start over · 🐢/🐇; Olive's line; a job card (source · carrier · target · finish line · wear,
  README §4.1). Right: the Blockly workspace taking half the page (`clamp(440px, 50vw, 780px)`), full height, the drawer
  always open on its left edge, our own zoom + − ⤢ buttons (Blockly's zoom controls and trashcan load sprites, so they
  are off). ▶ is a hat block that cannot be deleted; everything under it is the program.
- **Scratch-style changes, first draft of IW-004 §2:** Zelos renderer with a theme from the P105 block colours (motion
  blue, action green, control orange, ask violet, chip deep violet, empty chip coral); icon-first blocks at 7–9 (30 px
  icon + one word) and icon + words at 10–12; a `?` image field on **drawer blocks only** (added in `init` when
  `isInFlyout`), opening a one-sentence card; a tap on a drawer block adds it at the end of the selected C-block or of
  the program (the flyout workspace's `CLICK` event); delete by dragging back onto the drawer (Blockly's flyout delete
  area; no trashcan, no tap-delete); the context menu trimmed to **Help** and **Duplicate** (every other registry item
  unregistered; Help is ours and opens the card); the running block wears `highlightBlock` plus a 4 px ink ring with a
  white halo on its `.blocklyPath`; snap radius 48, connecting radius 64, drag radius 6 for fingers; **the drawer keeps
  its own scale** — a `VerticalFlyout` subclass registered as `flyoutsVerticalToolbox` overrides `getFlyoutScale()`
  (0.84 at 7–9, 0.74 at 10–12, 0.62 under 560 px) so the workspace zoom never grows the drawer (the §6 trap, measured
  below); ▶ is scrolled into sight right of the drawer after every load.
- **Conditions = a thing chip + a state.** `garden_is` holds a `garden_thing` chip; a tap on the chip arms the world
  (violet border, a banner at the stage's foot with "what's ahead of {robot}" and, for Cobble or a Pip holding the can,
  the carrier); a tap on the 3D view raycasts to a tile and the thing there becomes the chip (tapping the robot gives its
  carrier or what is ahead). The state dropdown is a `FieldDropdown` subclass whose menu is generated from the kind stored
  on the block (`extraState {kind}`, which Blockly loads before fields) and whose validation accepts any known state id.
  At 10–12 the eggs drawer adds `count of [🥚] in [thing]` and `[ ] = < > [ ]` (with `math_number` shadows 0 and 4).
  Every chip used in the program rings its thing's meter in the world (IW-004's monitor).
- **Three jobs on a tiny in-page engine using §4.2's names** (`tulip {have, need}`, `site {have, need, item}`, `basket
  {count, capacity, item}`, `can {level, max}` that the robot `holds`, `rock {left, max}`, `hen {pen}`, `egg`,
  `job {targets, home}`, `jobDone` → a BFS walk home appended to the run, `w.seed` + mulberry32 written back, `seeded:
  {eggs: {count, among}}`, the `noCan`/`full`/`meter`/`holds` events, the can-world water rule). **Pip's tulips:** the can
  on the shed tile, the well, 3 tulips × 3 drinks with meters, the can level drawn on the can and on Pip; **Cobble's
  path:** two rocks with `left`, the hod of 4, 4 squares × 4 stones drawn dirt → gravel → cobbles → path, finish → walks
  home; **Pocket's eggs:** a fenced pen, eggs on seeded tiles (Start over = a new day, new tiles), the basket by Mamie's
  door `0/4`, one egg in hand at a time, `go to nearest egg`.
- **Time passes** (⏳) wears the plot once per press (a tulip loses a drink and droops; the busiest square loses a stone
  and the rocks grow back 2; Mamie takes 2 eggs and the hen lays 2); a won job's robot then **goes back by itself** from
  home (D3). **Shells** 🐚: +1 per meter step, +5 at each finish line, shown in the bar, floated over the thing, and on
  the win card (D2; a sketch, no shop).
- **Runs:** Blockly's JSON under ▶ is the program; a generator steps it one tick at a time on `setTimeout` (never a
  frame), one tick per action, per `go to` step and per condition check, so an empty `until` never locks the page;
  `UNTIL_GUARD` 40 passes and `MAX_TICKS` 2000 as the engine has them; **Stop clears the timer in the same handler**.
  **Teach** resets the plot and records each pad press as a block (into the selected C-block if one is selected);
  **fold** finds the longest saving run of identical steps, wraps it in `repeat N`, recurses into bodies and rewrites the
  workspace.
- **Stats line on `s`:** frame p95, fps, draw calls; drag **press→lift** (pointerdown → Blockly's drag start) and
  **lift→drop** (drag start → drop) medians over the last 30 drags; workspace and drawer scales.

**The Blockly block type names (IW-004 inherits them).** Statements: `garden_start` (hat, ▶), `garden_forward`,
`garden_turn_left`, `garden_turn_right`, `garden_pick`, `garden_put`, `garden_fill`, `garden_water`, `garden_go_nearest`
(field `KIND`: `can` `well` `tulip` `rock` `site` `egg` `basket`, the mission's list), `garden_go_to` (value input `THING`),
`garden_repeat` (field `N`, statement `DO`), `garden_until` and `garden_if` (value input `COND`, check `Boolean`,
statement `DO`). Values: `garden_is` (input `THING` check `Thing`, field `STATE`, field `N` shown only for `has`,
`extraState {kind}`, output `Boolean`), `garden_thing` (the chip: field `LABEL`, `extraState {kind, id}`, output
`Thing`, round), `garden_count` (field `WHAT` `egg|water|stone`, input `THING`, output `Number`), `garden_compare`
(inputs `A` `B` check `Number`, field `OP` `EQ|LT|GT`, output `Boolean`), Blockly's own `math_number`. State ids by kind:
can/basket/hod `empty` `full` `has`; ahead `wall` `tulip` `rock` `nothing`; tulip `thirsty` `drunk`; site `done` `dirt`;
rock `stones` `used`; well/egg `front`. Words: 216 `iw0…` keys in EN and FR with a load-time self-check.

**Readings (worktree, the page opened from disk).**

- `node --check` on the page's two script blocks and on the drive: exit 0 each.
- The drive `node dev-docs/tasks/phase-108-the-island-works/drives/drive-iw000-mockup.js` (headless Chrome 1368×900,
  swiftshader, raw CDP over the repo's `ws`, private port 9388, killed by pid; first reading, nothing to compare
  against): **exit 0, 61 passed, 0 failed, 61 total, 204 s.** Every program is built by real pointer drags from the
  drawer (the drive carries the block out to the right and comes in level with the connection, then corrects once for the
  insertion marker's layout shift — a straight diagonal drag into a C-block's mouth snapped to the block above instead,
  which is how a hand fails too), chips by a real tap on the 3D canvas, runs by the real buttons. Clauses: Pip's tulips
  won by 8 drags (band 7–9), the can's list `is empty / is full / has`; +9 🐚 and +5 bonus; ⏳ makes one tulip 2/3 and Pip
  goes back and refills it; Stop mid-run leaves the robot still 0.9 s later; Cobble: `repeat 9 { until [👀 ahead] is a
  wall { } }` (the 9 typed into the field) runs and Stop ends it, the ahead list `is a wall / is a tulip / is a rock / is
  clear`, the loop dragged back to the drawer disappears; the path won by 7 drags with every square 4/4 and Cobble home;
  eggs (7–9) won by `until [🧺 the basket] is full { … }` with the basket list `is full / is empty / has` (different from
  both); Start over lays on other tiles (day 2); eggs (10–12) won by `until [count of 🥚 in [the basket] = 4]`, whose
  question reads false before and true after; Teach + fold on all three: 20 → 8, 40 → 7, 16 → 5 blocks, each folded
  program wins on Play; tap-add; the `?` card adds nothing; the menu is exactly Help + Duplicate (Aide + Dupliquer in FR);
  zoom + twice: workspace ×0.85 → ×1.12, drawer ×0.74 → ×0.74; a drag from the workspace across the 3D view leaves the
  camera and every block where they were, a drag from the 3D view into the workspace pans the camera and moves no block;
  `s` shows `p95 16.8 ms · 60 fps · 61 draw calls / drag: press→lift 51 ms · lift→drop 948 ms (n=30)` (the drive's own
  scripted drags, swiftshader: not a touch reading); FR bar `Conduire · Apprendre · Jouer · Recommencer`; 1024×768: no
  horizontal scroll, world and workspace side by side, the bar above the fold; 400 px phone (touch emulation): no
  horizontal scroll, world stacked above the blocks, one **emulated touch** drag from the drawer lands under ▶.
  Console: **0 errors, 0 exceptions**; 2 warnings, both libraries' own (three.js r158's `build/three.min.js` notice, and
  Blockly 12's `getAllVariables` deprecation from inside its serializer). Requests: only file, `data:`, cdnjs,
  jsdelivr/npm, Google Fonts.
- 22 screenshots in `../phase-78-the-templates/tpl-012-mockups/island-jobs/` (`01-tulips-start` … `22-phone-400-blocks`),
  looked at. The log JSON is in the lane's scratch dir (`iw000-mockup-scratch/drive-iw000-log.json`).

**Graded against IG-000's page (the look, not the clauses).** Same top bar, palette, Fredoka/Nunito, stage border,
camera, islanders, owl line and button shapes; the blocks are Blockly's Zelos shapes in the P105 block colours, so the
drawer reads as the same game. The meters sit on the things (💧 pips over each tulip, 🪨 over each square, 🥚 over the
basket, the can's level on the can and on Pip's chip) and turn green when full. What is weaker than IG-000: at 1368 the
world is smaller than IG-000's (486 px wide) because the workspace now takes half the page; a nested 10–12 condition
(`until [count of 🥚 in [the basket] = 4]`) runs past the workspace's right edge at 1368 until the child scrolls or
presses ⤢; at 400 px the drawer still takes ~60 % of the workspace width — the phone is usable for looking, not for
building.

**Acceptance criteria.**
1. EN/FR and both bands switch (drive). Published and opened on the Mac/tablet: the orchestrator publishes; the tablet
   is Richard's.
2. Done: each job won by drags only, and by Teach + fold (drive).
3. Done: the tapped thing becomes the chip; can, basket and tile-ahead give three different lists (drive).
4. Done: Stop ends a run at once; `repeat 9 { until … }` stopped (drive).
5. **Richard's reading** (the tablet by touch). The drive only ran one emulated touch drag in a 400 px viewport.
6. **Richard's grade and the children's words** (IW-009 §2).

**Not done, and why.** The tablet touch reading and Richard's grade (above). No Olive-reads blocks, no `say`, no
variables `set/change`, no brain size (`maxBlocks`) — IW-004's, not in this mockup's three jobs. The fold is offered
after Teach only (not on a dragged program).

**Deviations, with the reason.**
- The mockup engine adds two thing kinds the §4.2 table does not have: `well` (drawn on the water tile and a `go to`
  target; filling stays "facing a `W` tile") and `shed` (the lean-to over the can's tile, blocking). Eggs in hand are
  `eggs`/`eggMax` on the robot, not a `carry[]`; `put` of a stone on a tile with no site does nothing (today's engine
  drops a stone thing); wear is one step per ⏳ press, not `WEAR` ticks; `rock` is a blocking thing. IW-002's engine
  decides these for real.
- The interpreter reads Blockly JSON directly; IW-004's translator (Blockly JSON ↔ engine program) is not built here.
- Play swaps to Stop (the §4.3 contract) rather than showing both at once.
- Start over resets the plot (a new day/seed) and keeps the program — throwing blocks away is by dragging them to the
  drawer, so no confirmation is needed anywhere.

**Could not verify.** The tablet (touch drag first time in 10, AC5; fps with the plot animating); a real GPU; the page
inside the claude.ai artifact frame (the drive opened the file from disk; for the 400 px run it added the
`width=device-width` viewport the artifact skeleton is assumed to provide); Edge on Windows.

**Richard's lines (AC5 and AC6 — leave for him):**
- AC5, on the tablet, by touch, 10 tries each: drag from the drawer ___/10 · drop into a `repeat` ___/10 · drag back to
  delete ___/10; stats line `drag: press→lift … · lift→drop …` _____
- AC6, the look, verbatim: *"Just FYI the improvements in the artifact are perfect, exactly what I wanted"* (Richard, 2026-09-29,
  on the published artifact) · the children's words: _____ (IW-009 §2)
