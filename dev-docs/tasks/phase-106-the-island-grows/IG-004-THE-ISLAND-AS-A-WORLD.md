# IG-004 — The island as a world: plots, pinned programs, robots seen working

**Opened 2026-09-28**, from README §1 global point 1 and ruling R1 (the sentence TPL-012 §2.3 promised and
P105 R10 dropped). **Status: 🟡 s3 built (lane E, 2026-09-29): AC1–AC5 driven, AC6's Mac half read (2D, CPU ×4), AC7
but its packaged-app clause; the tablet (AC6's 3D half) and the packaged upgrade drive are not done — §7.** Depends on IG-002 (the vocabulary), IG-007 (the renderer it is
drawn with; the 2D `Garden` is the fallback and the test renderer). Lane B. **The biggest task in the phase.**

## 1. The person sentence

> **A child opens her island and sees it whole: the plot she finished last week, with her robot still
> watering the row; the islander on the next plot waiting; a fenced plot she cannot enter yet. She pans
> to the waiting one, and when she wins it her robot stays there, working, while she zooms out to watch
> both.**

## 2. What it is

- 🔴 **Superseded by README R9 (Richard, 2026-09-29): a bigger island, ONE plot per request.** 12 requests + free
  play = 13 plots of 8×6 do not fit 24×16 (384 tiles, room for ~6). The island grows to about 36–46 × 22
  (≈800–1000 tiles): 13 plots on a grid of slots with 1-tile paths between, the spare slots scenery (the house,
  the pond, the rock field). Every other sentence below that says "24×16" reads as "the island".
- **One island per kid: a 24×16 grid** (384 tiles; the mockup IG-000 fixes the exact layout: sea around,
  the house, the pond, the rock field, six plots of 8×6 with paths between). Its base map is a Static Data
  in `cg003Content.ts`; each request's map becomes **the plot's tiles**, stamped at the request's `plot:
  {x, y}` (schema field, `cg002Content.ts`). The Workshop shows the plot only (the camera framed on 8×6),
  the Island shows everything.
- **Save model v4** (`cg002Scripts.ts`, migration from v3 that keeps every field): per profile,
  `island.plots: { [requestId]: { program, robotId, wonAt } }` and `island.robots` (IG-005; v4 ships with
  the one robot). `placed` goes (never written). The save code packs it; the Grown-ups paste box restores it.
- **A won plot keeps its program.** `Complete request` writes `program` and `robotId` into the plot. The
  robot is **pinned**: it is drawn on that plot on the Island page and is not available for another request
  until the child unpins it from My robots ("bring {name} home"), which clears the plot's program and leaves
  its things as they were won (the tulips stay watered, the path stays laid).
- **The island tick.** One `Logic/Island tick` script on one timer (`Step Ms × 2` on the Island page): it holds
  one engine world for the whole island (all plots' things, all pinned robots) and calls `step` for each
  pinned run in turn. When a pinned run ends, the **plot resets**: its things return to the request's start
  state and the robot to its start tile, then the run restarts — the robot is seen working forever, the plot
  is seen done. No Olive on the island tick: every ask takes the fallback (as `runToEnd` does).
- **The Island page** (`cg003Components.ts` `Pages/Island`) is rebuilt on the renderer: the whole island,
  the islanders as things with a bubble when their request is open, a padlock on a plot whose request the
  band or the tricks do not yet allow, a tap on a plot opens its request card, a "find my robots" button.
  The sea with pins goes; the pins' scenery becomes island tiles.
- **Free play** is a seventh plot, "the garden", never pinned.

## 3. Acceptance criteria

1. Save v3 → v4 migration: a v3 save code from P105 pastes and restores every profile, done request, hat and
   sticker; the engine gate has one v3 fixture per band.
2. Engine gate: two pinned runs on one world step in turn without touching each other's robot; a pinned run
   that ends resets its plot's things and restarts; 200 ticks with three pinned runs stay under 5 ms a tick
   in the bare `vm` (the tick is on the tablet's CPU beside Olive).
3. Page drive (2D `Garden` as the drive renderer, IG-007 §5): win tulips → the Island shows the robot on the
   tulips' plot stepping; open path-stones → the robot is "at work on the tulips" and the card offers "bring
   {name} home" → the robot is free, the tulips stay watered.
4. The Island renders every plot from the requests' maps; a request whose `plot` overlaps another fails the
   content gate at generate time.
5. A plot the band cannot do shows the padlock and a one-line reason ("Cobble can lay stones — Sami lends him
   after the letter", IG-005) in both languages.
6. 24×16 with three robots animating: p95 frame ≤ 33 ms on the tablet in the 3D renderer (IG-007 AC3 reads it),
   and ≤ 50 ms at CPU ×4 on the Mac in the 2D renderer (the CG-001 AC9 method).
7. Both languages, both sizes, 0 console errors; the save code round-trips through the Grown-ups box; the
   packaged Mac app's upgrade drive (P105 CG-004) passes over a v3 save.

## 4. How to build it

The save model and migration first, with the gate; then the island world and the tick in the engine; then
the schema field and the base map; then the Island page on the renderer behind a `renderer` States node
(`3d | 2d`, IG-007 decides at runtime); the Workshop keeps its scene but reads the plot from the island. A
new mockup screen (IG-000) is graded before the page is built.

## 5. Gates

As IG-001 §5, plus: the engine tick timing in the `vm`, the migration fixtures, the packaged upgrade drive.
The page drive runs on the 2D renderer (headless, no GPU); one 3D screenshot on the Mac is looked at.

## 6. Traps

A `Variable` is global by NAME (P105 D57): the pinned runs need an id each, not one `gardenRun`. The island
tick and the Workshop Runner must never both step the same robot: the Workshop takes the plot's robot OUT
of the tick while the request is open. `island.placed` was never written by anything — do not migrate it,
drop it. An on-load migration owes its own save (`an-on-load-migration-owes-its-own-save`).

## 7. Session 3 (2026-09-29, lane E, worktree `ig004-world` cut from `f182a2d9e`)

### 7.1 The save model v4 — the exact shape (written before the page was built)

```
model   = { v: 4, family: { id, created }, profiles: [profile…], island }        // island is DERIVED, never read back
profile = { id, name, band, lang, face, robot: { name, color, eye, hat }, tricks: { n1…n7 }, stickers, hats,
            island: { done: [requestId…],
                      plots: { [requestId]: { program: Block[] | null, robotId: string, wonAt: number } },
                      robots: [{ id: 'r1' }] } }
model.island = { activeId, done, plots, robots }                                 // the active kid's, the SAME objects
```

- **A plot is pinned** when `program` is a non-empty list AND `robotId` names one of `island.robots`. `Complete request`
  writes `{ program, robotId, wonAt }` for the request won (any other plot holding that robot is unpinned first: a robot
  works one plot). **Bring home** writes `{ program: null, robotId: '', wonAt }`: the robot is free, the plot stays won
  (`done` keeps it) and is drawn in its won look (§7.3). Free play (`free`) is never a plot.
- **`robots`**: v4 ships the one robot the profile already has, id `r1`; its look stays `profile.robot` (one source, no
  copy to drift). IG-005 adds robots here (with their own looks). `modelOf` keeps any `{ id }` rows and always puts `r1`
  first.
- **`placed` is dropped**: never written by anything (README §1), never migrated. A v3 profile `island: { done, placed }`
  reads as `{ done, plots: {}, robots: [{ id: 'r1' }] }`.
- **Migration**: `migrationDue` is true for a stored model with profiles and `v < 4`; every page's Read family says
  `migrated` and the page writes the model back at once (an on-load migration owes its own save). v1/v2 (one family
  island) keep their rule: every profile gets the family's `done`.
- **The save code** `BG1.<base64url(JSON)>`: `{ v: 4, f: [id, created], a: activeId, p: [row…] }`, a row
  `[id, name, band, lang, face, robotName, color, eye, hat, tricks, stickers, hats, done, plots, robots]` with
  `plots = [[requestId, program | null, robotId, wonAt]…]` and `robots = [id…]`. Decode reads v1, v2, v3 (row index 13
  = `placed`, ignored) and v4; anything older than v4 says `migrated`.

### 7.2 The island — its size and its slots (R9)

- **Measured first:** `REQUESTS` holds **13** requests (ten from P105 + IG-006's three), not the 12 R9 counted, so the
  island holds **14** plots (13 + free play, "the garden").
- **Chosen: 46 × 22 = 1012 tiles** (`ISLAND_W`, `ISLAND_H` in `cg002Content.ts`). Fifteen 8 × 6 slots in 5 columns ×
  3 rows, a one-tile path between every two, a one-tile shore all round: 1 + 5·8 + 4 + 1 = 46, 1 + 3·6 + 2 + 1 = 22.
  Fourteen slots are plots; the fifteenth is **home** (the house, the pond, the rock field, `ISLAND_HOME_MAP`), where
  a robot that is not at work stands (`ISLAND_HOME` = 39,17).
- **Why this one:** it is the smallest grid of slots that holds 14 plots with R9's one-tile paths. 4 × 4 slots would
  be 37 × 29 = 1073 tiles, and 7 × 2 would be 64 × 15. 46 × 22 is the top of R9's "≈36–46 × 22"; the content gate
  pins W ≤ 46 and H ≤ 22.
- The shore ring is kept so that every plot has a path tile beside it for its islander.
- **Each islander's plots are ONE row** (the gate pins it):
  - Mamie Rose on top: tulip-door, tulips-three, eggs-count, rows-trick, mamie-note.
  - Sami in the middle: path-postbox, path-stones, letter-say, rock-flower, sami-thanks.
  - Biscuit below: bowl-if, wall-until, meow-when, then the garden (`FREE_PLAY_PLOT` 28,15) and home (37,15).
  - The 7–9 plots come first in each row.
- The base map `ISLAND_BASE` (`cg002Content.ts`) is the shore, the paths, home, and `.` where a plot is stamped. It
  ships inside `Logic/Island world`'s script, not as a `Static Data` in `cg003Content.ts` (deviation 2).

### 7.3 What was built (branch `ig004-world`, eight commits after `f182a2d9e`)

- **Save v4** (`cg002Scripts.ts` `SAVE_HELPERS`, Complete request, Encode/Decode, new `Logic/Bring home`), the exact
  shape of §7.1.
  - The v3 fixtures `tests/fixtures/ig004-v3-saves.json` hold one family per band. They were written by the v3 encoder
    itself, before it changed.
  - The P105 shell's backups (`garden-desktop/shell/copies.js`) pack v4 byte-identical to the page. Their test pinned
    v3; it now also checks that a pinned plot rides through the code.
- **The island engine** (`packages/noodl-mcp/tests/ig004Island.ts`, new):
  - The state holds the whole island. Each PINNED plot keeps its live run, its things and its robot in its own
    coordinates.
  - A tick steps each pinned run in turn with the engine's own `step` + `apply` (ENGINE, CG-002), against the plot's
    window: the request's map and exactly the world `Start world` gives the Workshop.
  - Each run has its own run id (`island-<request>-<lap>`) and its own robot id (the one the save pinned).
  - The composed engine world (one map, every thing, every robot, in island coordinates) is published after each tick.
  - An ask takes the fallback (no Olive on the tick).
  - A finished run holds its plot done for 3 ticks, then the plot's things and robot go back to the request's start and
    the run restarts.
  - Scripts: `Logic/Island world`, `Logic/Island tick`, `Logic/Plot at`, `Logic/Island choose`, `Logic/Find robots`
    (flat-island DOM glue, guarded).
- **Schema** (`cg002Content.ts`):
  - `plot: { x, y }` sits on the line after `band: Band;` and after each request's `band: N,`.
  - `FREE_PLAY_PLOT`, `ISLAND_W`, `ISLAND_H`, `ISLAND_BASE`, `ISLAND_HOME(_PLOT/_MAP)` and `PLOT_W/H` are appended at
    the end.
  - **The content gate** is `islandProblems()`, run in the engine gate (`cg002Engine.test.ts`), which the generator
    runs first. It checks:
    - every plot is inside the island;
    - no two plots overlap (free play and home included);
    - every map is 8 × 6;
    - every `.` of the base is under exactly one plot;
    - the stamped island is 1012 tiles, with every request's map at its plot.
- **Complete request** now gets `gardenProgram` (Pages/Workshop: one Variable node and one wire), so a win pins the
  program and the robot. `Island rows` marks a request **blocked** while the robot works another plot, and "✓ done ·
  {b} works here" on the robot's own plot.
- **The Island page** (`Pages/Island` + a new `Island/World` component; `Island/Map`, `Island/Pin` and the sea with
  pins are gone).
  - **The renderer:** Garden 3D (camera `island`, Focus = the robots) and the flat Garden on EXACTLY the same wires,
    behind IG-007's `renderer` rule (its nodes copied onto the island: no WebGL2 or Too Slow writes `{2d, …}`).
  - **The tick:** a Timer of Step Ms × 2 (760 ms) drives the island tick. The state is held in ONE Variable
    `gardenIsland` (one island on screen). The tick also takes the latest build and drops a held state from an older
    build (fix found by the drive, deviation 13). The Workshop has no island tick (a graph test pins it).
  - **What she sees and taps:**
    - A tap on a plot or an islander opens the plot card: who asks, what, and "Go and help". While the robot works
      another plot, the card says "{b} is at work on “{plot}”" and offers "Bring {b} home". A locked plot shows its
      one-line reason.
    - A request card in the list still opens the Workshop straight away, unless it is blocked; then it opens the plot
      card.
    - "Find my robots" frames the robots in 3D. On the flat island it scrolls them into the island's own box and rings
      them.
    - The islanders stand by their next plot. Each has a bubble with that request's title while it is open (from
      Island pins).
- **Kinds in BOTH kits, one commit** (`c51325fd5`), both kits rebuilt:
  - `islander {who, say}`: a sprite per islander, and her bubble (2D in the cell, 3D in the overlay).
  - `fence {w, h}`: one element over the grid in 2D; instanced posts and four rails in 3D.
  - `padlock`: a sprite, or five boxes in 3D.
  - Kit gate clauses were added in `cg001GardenKit.test.ts` and `ig007Garden3d.test.ts`.
  - `Draw world` passes the three kinds through, and turns an islander's `sayKey` into her line in the language.
- **Words:** nine `ig4…` keys (EN + FR), in a block under a lane-E comment, before `REQUEST_SUBS` in `PAGE_WORDS`.
- **The look:** an `IG-004` block in `GARDEN_CSS` (`cg007Look.ts`).
  - The island sits on its sea.
  - The flat island scrolls sideways on a phone, min 736 px = 16 px tiles.
  - The 3D island has a 16:10 frame.
  - "Find my robots" goes over the corner on a desktop and under the island on a phone.
  - The plot card is the mockup's violet note.

### 7.4 Readings (all from the worktree; exit code first)

- **Garden specs, one file each, on `2ee3208a3`:**

  | spec | exit | result | before |
  |---|---|---|---|
  | cg002Engine | 0 | **152 / 152** | 137 (+15: AC1 save v4, AC4 content gate, their arms) |
  | cg003Template | 0 | **104 / 104** | 103 (ruling 6's sea test replaced by two IG-004 graph tests) |
  | cg005Olive | 0 | 41 / 41 | 41 |
  | cg006Requests | 0 | 83 / 83 | 83 |
  | cg001GardenKit | 0 | **29 / 29** | 27 |
  | ig007Garden3d | 0 | **32 / 32** | 30 |
  | ig004Island | 0 | **12 / 12** | new |

  Total **453** (421 before).
- **The generator:** `npm run template:garden` exit 0, engine gate 152 green, 99 components through one plan (94 at the base:
  +6 Logic — Bring home and the island's five — +Island/World, −Island/Map, −Island/Pin). Its last run inside `drive-pages.sh` wrote **0 files of drift**.
  Both kits' builds are deterministic (banner + src).
- **Shell:** `node --test tests/*.test.js` exit 0, **91 / 91**.
- **The page drive** (`drive-pages.sh` repointed, on `2ee3208a3`): generate 0, deploy 0 (index.html fresh), drive exit 0,
  **323 / 323**, 0 console / 0 network errors.
  - The base reads 323 too: lane F's run on `f182a2d9e`, `p106-s3-leftovers-scratch/pages/drive.json`. The 327 in the
    brief was an older tree.
  - The clause names were diffed one for one; each replaced clause is listed in §7.6.
  - `openQuest` had to bring the robot home **6** times (`readings.broughtHome`).
- **Olive page drive** (`drive-olive.sh pages`, same deploy): exit 0, **22 / 22**, 0 skip.
- **IG-007 Workshop drive:** `--mode 3d` exit 0, **23 / 23**; `--mode nogl` exit 0, **8 / 8** (after the BOOT clause
  fix, §7.6). **IG-007 3D fixture drive** (the rebuilt 3D kit, fresh deploy): exit 0, **18 / 18**.
- **`drive-ig004-island.js --perf`** (same deploy): exit 0, **65 / 65**, 0 console / 0 network errors. JSON:
  `shots/ig004-s3/drive-island-2d.json`. Four passes (1368 EN, 1368 FR, 390 EN, 390 FR), each on a fresh family:
  - Before any win: the robot is at home (39,17) and the tulips' 3 tulips are drawn dry.
  - **AC3:** the tulips are won by Teach → 27 pad presses → Play.
    - Back on the island, the robot is ON the tulips' plot and stepping: two reads 2.3 s apart were (11,2,d2) →
      (12,2,d1).
    - The save is v4, and the plot holds the program and `r1`. The card says "✓ done · Pip works here".
    - "Find my robots" brings the robot into the island's view with nothing over it, and rings it.
    - The stones' card stays on the island and says "Pip is at work on “Water my three tulips”…", with "Bring Pip
      home" and no way in.
    - After home: the robot is at (39,17), the card offers "Go and help", all 3 tulips are drawn **wet** on their plot,
      and the save shows `{ program: null, robotId: '' }` with `done` kept. Go and help opens the stones.
  - **AC5:** at 7–9 all 9 band-2 plots are fenced and padlocked. A tap on one gives one line, e.g.
    "🔒 Biscuit asks this at 10–12: it needs “If”." (FR "🔒 Biscuit le demande en 10–12 : il faut « Si ».").
  - **AC7:** the Grown-ups code is v4 and carries the pinned plot. Pasted back, it restores the same family, and the
    robot is still at work.
  - **AC1 on the page:** the band-2 v3 fixture code pasted into the Grown-ups box restores both profiles (done, hats,
    stickers), stored v4, with `placed` gone.
  - **AC6 (the Mac, 2D, three robots at work, CPU ×4):** the throttle was measured, not assumed: a fixed loop took
    149 → 479 ms (×3.2).
    - Over 20 s: **p95 16.8 ms**, p50 16.7, p99 16.8, max 50.0.
    - 1 frame > 25 ms, 0 frames > 50 ms, 1199 frames, 23 moves of the three robots. **Gate ≤ 50 ms: met.**
    - A readout, not the tablet. Headless Chrome with `--disable-gpu` on a loaded M1: a whole-island re-render every
      760 ms fits in a frame here.
- **`drive-ig004-island.js --mode 3d`** (swiftshader): exit 0, **5 / 5**. JSON: `shots/ig004-s3/drive-island-3d.json`.
  - Garden 3D drew the 46 × 22 island (camera `island`, 173 meshes).
  - Three islander bubbles in the overlay; Pip named on the tulips' plot; nothing written to the renderer key.
- **AC2** (`ig004Island.test.ts`, the bare `vm`):
  - Two pinned runs match their solo traces tick for tick (tile, facing, things).
  - The hold → reset → restart row.
  - An ask on the island never parks.
  - **200 ticks with three pinned runs: mean 0.37 ms, p95 0.57 ms, max 0.92 ms a tick** (< 5 ms). Arms: one shared run
    (the gardenRun trap) and a reset that keeps the watered tulips are both killed.

**Screenshots looked at** (`shots/ig004-s3/`):
- `look-island-1368` / `look-island-390`:
  - The whole island at 20 px tiles on a desktop. On a phone the island scrolls in its own box.
  - The three islanders with bubbles, her robot at home with its name.
- `ig004-1368-en-02-robot-at-work`: Pip on the tulips' plot by the pond with its can.
- `03-at-work`: the violet plot card with Bring Pip home.
- `04-home`: Go and help, and Pip at home.
- `390-fr-05-locked`: 9 fenced, padlocked plots and the FR reason.
- `390-fr-02b-found`: Pip in view, with the find button under the island.
- `ig004-ac6-three-robots`: three robots on three plots.
  - Found here: Mamie's bubble covered Pip. Fixed in `2ee3208a3`: a bubble now sits under the robots in 2D.
  - All three are named "Pip". Draw world names every robot with the family's one name; IG-005 gives each its own.
- `ig004-3d-island-1368`: the flat-shaded island, framed whole.
  - Houses, trees, paths, sand rim, and three bubbles.
  - The robot is about 12 px at this framing (IG-007's own note), and the far turned corner is cropped (IG-007 deviation 5).

### 7.5 Against the acceptance criteria

- **AC1 ✅:**
  - The engine gate decodes one P105 v3 code per band and restores every profile, done request, hat, sticker and trick.
    It says `migrated`, and the v4 code it becomes does not.
  - A stored v3 model is due its migration, and every page writes it back (ruling 8's row, unchanged).
  - The page's Grown-ups box restored a v3 code (drive).
- **AC2 ✅:** the bare vm, the numbers above.
- **AC3 ✅:** driven at both sizes, in both languages.
- **AC4 ✅:**
  - The content gate fails at generate time. Its arms: an overlapping plot, a plot off the edge, free play on home, a
    missing plot.
  - Every plot is stamped from its request's map (engine gate + drive).
- **AC5 ✅** for the band: fence, padlock, a one-line reason in EN and FR.
- **AC6 — half:**
  - The Mac 2D half is read and met: p95 16.8 ms at CPU ×4.
  - **Not done:** the tablet's 3D reading (Richard's, IG-007 AC3's method).
- **AC7 — all but one clause:**
  - Done: both languages, both sizes, 0 console errors, and the save code round-trip through the Grown-ups box.
  - **Not done:** the packaged Mac app's upgrade drive (P105 CG-004) over a v3 save. It needs a packaged build, which
    the CPU rule forbids this session.

### 7.6 Deviations, with the reason

1. **14 plots, not 13:** `REQUESTS` has 13 requests (measured). Five columns × three rows of slots holds them, plus free
   play and home.
2. **The base map is not a `Static Data` in `cg003Content.ts`.**
   - It is `ISLAND_BASE` in `cg002Content.ts`, next to the `plot` field the gate checks against it. `Logic/Island world`
     embeds it the way `Start world` embeds free play.
   - An editable Data/Island would be one more wire and a place for a slot to drift from the gate.
3. **"One engine world":**
   - The island is ONE state: every plot, every pinned run, the islanders, the home robots.
   - Each run is stepped against its plot's window, an 8 × 6 world exactly as the Workshop has it. This is so that a
     program runs on the island as it won; a robot on a plot's edge would otherwise walk into the path or the next plot.
   - One engine-shaped world is composed for the renderers after each tick.
4. **A finished run holds for 3 ticks** before its plot resets, so the plot is seen done.
5. **A won plot nobody works is drawn as won** by its request's reference program run to its end, with no Olive.
   - That is how "the tulips stay watered" after Bring home, while the plot's program is cleared (§2).
   - For mamie-note and rock-flower the fallback answers water nothing, so their won look is their start. Deriving it
     keeps world snapshots out of the save code.
6. **Free play is never blocked** by a robot at work: the garden opens whatever.
7. **Her robot not at work stands at home**, so the island always shows it. The shared drive's rename and paste clauses
   read it there.
8. **Islanders: one of each, not one per plot.**
   - Each stands on the path by her NEXT plot (from Island pins), with a bubble of that request's title while it is open.
   - With none left: by her first plot not done (a locked one, no bubble), else her last.
   - The `islander` kind gained a `say` field (lane E's kind: "who" + "say").
9. **Blocked by the band only.** The content has no trick lock, and IG-005 brings the robot lock. The reason names the
   islander and the block the request teaches.
10. **Bring {b} home is on the plot card**; My robot is unchanged. The task allowed "My robots / the plot card".
11. **A request card in the list opens the Workshop directly** when the robot can take it. Only a blocked one opens the
    plot card, so another lane's drive that taps a card on a fresh family still lands on the Workshop.
12. **A language switch rebuilds the island** (Island pins' labels change), so the pinned runs restart from lap 0.
13. **The tick's build guard** (found by `drive-ig004-island.js`, 1368 EN, 62/64):
    - What was seen: after Bring home the robot walked back to the tulips and they went dry. The card and the save were
      right.
    - Why: a tick's Set Variable landed after the rebuild's and put the old state back.
    - The fix: the build carries a hash of what it was built from, and the tick drops a held state from another build.
      A bare-vm row was added (red without the build input).
14. **3D:** the islanders' bubbles and the robot names are a DOM overlay over the canvas, so they can cover a robot. In 2D
    a bubble now sits under the robots.
15. **Shared drive clauses changed** (`scripts/devtools/drive-cg003-pages.js`, every one named):
    - `seaClause` became `islandClause`. Four clauses per size: the S3-R6 sea/pins, "no tile world", the requests
      beside/under the map, and nothing wider than the screen → their IG-004 equivalents.
    - S3-R8:
      - "stored as v3" → v4.
      - "Mamie's pin is open for Bo" → "Mamie asks Bo … in her bubble".
      - "S3-R6: Mamie's pin opens her first request" → "a tap on Mamie opens her card; Go and help opens it".
      - The robot count now reads `.bg-isle .gd-bot`.
    - S3-RENAME: the robot on the island (was its pin).
    - S4-PASTE: `v === 3` → `v === 4` (twice), and "the island shows it" reads the robot on the island.
    - S3-LOOK Island 390: "no two words on the island overlap" (the bubbles and the robot's name) replaces the pin labels.
    - **Every `.bg-quest` tap (13 sites) goes through a new helper `openQuest`.** When the card opens the plot card
      instead ("at work"), it brings the robot home and taps again.
    - `drive-ig007-workshop.js`, one clause: BOOT. The island now applies the renderer rule first: nothing stored in 3D,
      `{2d, unsupported}` written by the island without WebGL2.

### 7.7 Not done, and why

- **AC6's 3D half:** the tablet's p95 with three robots and Olive in flight. It is Richard's, on a Windows build that
  carries `garden-3d-kit`.
- **AC7's packaged Mac upgrade drive** over a v3 save. It needs `dist:mac`, which the CPU rule forbids this session.
  The migration it would read is graded in the engine gate and on the page (the v3 paste).
- **§4's "a new mockup screen (IG-000) is graded before the page is built":** the page followed the published mockup's
  island screens (`01-island`, `02-island-locked-plot`, `03-island-find-robots-stats`, `13-island-two-robots`). No new
  mockup was made. Richard grades the look.
- **IG-005** (robots for the job, per-robot looks and names): v4 only reserves `island.robots`.

### 7.8 Could not verify

- A real GPU's frame time on the 3D island, and the tablet. Every 3D reading here is swiftshader.
- Whether the 3D island's "Too Slow" fires on the tablet with 1012 tiles. On this Mac under swiftshader it did not (the
  renderer key stayed empty through the 3D look drive and the Workshop 3D drive).
- Touch pan/pinch of the 3D island on hardware.
- The 390 px flat island's sideways scroll by finger. The drive scrolls it by `scrollIntoView`.
- The FR words (`ig4…`) are Richard's to read, with IG-006's list.

### 7.9 Merge notes (shared files, lane E's hunks)

- **`cg002Content.ts`:**
  - `plot` goes on the line after `band: Band;` and after each request's `band: N,` (13 lines).
  - An IG-004 block is appended at the end.
  - The interface doc gained two lines.
- **`cg002Scripts.ts`:**
  - `SAVE_VERSION` and `FIRST_ROBOT_ID`.
  - `SAVE_HELPERS`, `COMPLETE_REQUEST_SCRIPT`, `BRING_HOME_SCRIPT` (new), `ENCODE`/`DECODE`.
  - One row appended to `FUNCTION_SCRIPTS`.
- **`cg003Scripts.ts`:**
  - `FAMILY_SCRIPT` (two outputs), `ISLAND_ROWS_SCRIPT` (plots/robots, `blocked`), `DRAW_WORLD_SCRIPT` (three
    `else if`), and two imports.
  - The IG-004 block before `GLUE_SCRIPTS`, and five rows appended to `GLUE_SCRIPTS`.
- **`cg003Components.ts`:**
  - `C` (`isleWorld` replaces `pin`/`map`), `DRIVE` (+5), `TYPE` (appended).
  - `Island/Request card` (`blocked` in/out), `STAGE_WORLD` kept, `ISLE_WORLD` replaces PIN/SCENERY/MAP.
  - `Pages/Island` (rebuilt), `Pages/Workshop` (`wsProgVar` + one wire), `CG003_COMPONENTS` (ISLE_WORLD for PIN, MAP).
- **`cg003Content.ts`:** the `ig4…` words before the `REQUEST_SUBS` spread.
- **`cg007Look.ts`:** the IG-004 CSS block after `.bg-go *`. The old `.bg-sea` / `.bg-pin` rules are left in place and
  unused, to clean up later.
- **Both kits:** `SPRITES` (+4) plus the `ISLANDER_SPRITES` map; the cell loop (+2 branches); a fence overlay;
  `WORLD_CSS` (+5 rules) in 2D. In 3D: `PALETTE` (+9), `THING_BUILDERS` (+3), placeThing (`say`), the overlay (says),
  and 2 CSS rules. Both built files are rebuilt.
- **Specs:** `cg002Engine.test.ts` (AC5 save rows, two describes); `cg003Template.test.ts` (ruling 6's test replaced by
  two); `cg001GardenKit`/`ig007Garden3d` (one describe each, at the end).
- **Drives:** `drive-cg003-pages.js` (§7.6 item 15), `drive-ig007-workshop.js` (BOOT), `drive-ig004-island.js` (new).
- **For lanes B and F at the merge:**
  - A drive that wins a request and then opens ANOTHER one on the same family meets the plot card ("at work"). Use
    `openQuest` (or bring the robot home).
  - `Workshop/Play` must keep `gardenProgram` as the program that won: Complete request reads it.
- No `dist/` was written. Nothing in a linked build output changed.
