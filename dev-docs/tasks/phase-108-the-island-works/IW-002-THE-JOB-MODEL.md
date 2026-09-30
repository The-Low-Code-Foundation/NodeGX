# IW-002 — The job model: sources, carriers, meters, a finish line, wear

**Opened 2026-09-29** from README §4.1. **Status: 🟡 s2 — the engine (s1, lane J) and the drawing in both kits (s2, lane D: AC6 ✅, AC4's kit half ✅) built, and the page now hands the kits every job field (s2 merge, §6); the page/island DRIVE clauses of AC3 and AC5 are owed once IW-003 gives a request a `job`.** Depends on nothing (engine first). Lanes J (engine) then D (drawing).

## 1. The person sentence

> **The tulip shows it has had two drinks of three; the path square is gravel, one stone from being path; the basket
> by the door says 3/4. When every one is full the robot walks home. Later, while she plays, a tulip gets thirsty and
> the robot goes back.**

## 2. What it is

**Engine (`cg002Scripts.ts`), in the world JSON:**

- **Targets with meters:** a thing may carry `have` and `need`. `water` on a tulip adds one drink (to `need`); `put` of
  a stone on a `site` square adds one stone; `put` of an egg into a `basket` thing adds one. A full target stops taking
  (a fifth stone on a 4-stone square is a `full` event, the stone stays carried).
- **Path squares by stage:** a `site` thing on a tile with `need` N; at `have = need` the tile becomes `path`; the
  sprite has stages (dirt, gravel, cobbles, path) by `have/need`.
- **Containers:** `basket`, `bowl`, `store` things with `count` and `capacity`, per item kind; `put` facing one fills it,
  `pick` facing one takes from it.
- **Carriers as things:** the can is a thing (`can`, on a shed tile) the robot picks up; `fill` needs a held can;
  `canMax` stays a robot field for the upgrades; a robot with no held can cannot `fill` (an event, a hint).
- **Sources that refill** on island ticks: `rock.left` regrows to its max; the well never empties; a `hen` lays one
  `egg` on a free tile of its pen (seeded); a `postbox` receives a `letter`.
- **Walls:** a new tile code (`L`, `wall`) added to `BLOCKING_TILES` (`cg002Scripts.ts:138`, today `W R T H`), drawn in both renderers; the map edge stays blocked but no mission uses it as
  its wall.
- **The finish line:** a request's `job` = the list of targets; `jobDone` when every target is full; the robot then
  walks to its `home` tile (a generated path, not the child's program) and the `done` event fires.
- **Wear (R2, D7):** each target kind has `wearEvery` island ticks: a tulip loses a drink, a path square a stone (the
  most-walked one), a bowl a food. Wear runs **only on ticks**, which only run while a page is open. Nothing dies: a
  thirsty tulip droops and makes nothing.
- **Seeded layouts:** `world.seed` + a small PRNG (mulberry32) in the engine; a request may say "wall at 5..7",
  "eggs on 4 of these 8 tiles". `Start world` picks a seed per run; tests pass seeds.
- **The island tick (`ig004Island.ts`):** replaces "hold 3 ticks, reset, restart" (ISL:26-37) with: a pinned robot works
  until its job is done, walks home, waits; when wear reopens the job it starts its program again (D3). The plot is
  never reset to the request's start.

**Drawing (lane D, after the engine):** both kits (`garden-kit`, `garden-3d-kit`) draw meters (a small bar or pips over
the thing), the can level on the held can, path stages, the basket count, the wall, the hen, the droop. The vocabulary
table stays one table in `cg002Content.ts` that both renderers read (P106 s2's pinned-copy gate).

## 3. Acceptance criteria

1. Engine gate: each new primitive and event, both languages, both bands — a tulip takes exactly `need` drinks; a site
   square turns to path at `need`; a basket fills to capacity; a can must be held to fill; the rock regrows; the hen
   lays on a free pen tile; a full target refuses and says so.
2. `jobDone` fires when the last target fills and the robot reaches `home` by a path that avoids blocking tiles.
3. Wear: after `wearEvery` ticks a done job reopens; the pinned robot restarts; with no page open, no tick → no wear
   (a drive closes the page, waits, reopens: the meters are as left).
4. Seeds: the same seed gives the same layout in the engine, the 2D kit and the 3D kit; three seeds differ.
5. The island drive: a done plot is never reset to its start; a robot is seen walking home and going back.
6. Both renderers draw every new thing; screenshots of each looked at; the 3D pinned-copy gate green.

## 4. Gates

Engine spec (`cg002Engine.test.ts`), island spec, kit gates, page drive, island drive 2D + 3D, template byte-identical.
The 2D island frame gate (P106 IG-004 AC6, p95 16.7 ms at CPU ×4) re-read with meters drawn.

## 5. Traps

- The engine is JS in a template literal: **no backtick and no `${` inside the script text** (P106 README §7).
- A request's old `goals` (`thing_at`, `carrying`) stay valid until IW-003 moves each mission; do not break the 13 that
  still win today — the reference programs stay green through this task.
- `ISLAND_HOLD_TICKS` is read by the island drive; change the drive with the tick.

## 6. Notes

### Session 1 (2026-09-29, lane J `iw002-engine`, base `ac5fb8227`) — the ENGINE half

**Built** (engine only; drawing is session 2's lane D). Every name is brief §4.2's; nothing renamed.

- **Content** (`cg002Content.ts`, appended at the END): `WEAR`, `JOB_VOCABULARY` (the one table: kind, role, fields,
  item, blocks, wear key), `JOB_KINDS` (kind → role), `JOB_ITEMS`, `SITE_STAGES` (`dirt gravel cobbles path`),
  `WALL_TILE` (`L`), `HEN_CAPACITY` (4), the `JobSpec` / `SeededSpec` types; `GardenRequest.job?` / `.seeded?` and the
  goal name `job_done` added to the existing types; `sayFull`, `sayNoCan`, `sayHome` (EN + FR) at the end of `WORDS`.
- **Engine** (`ENGINE` in `cg002Scripts.ts`): `L` in `BLOCKING_TILES`; `basket store can hen postbox` in
  `BLOCKING_THINGS` (a `site` does not block). Tulip `have/need` (a tulip with no `need` keeps today's `watered` flag:
  one pour, and no `have` written — the 13 requests' worlds are byte-identical); site stages (full reads as `P` through
  `tileAt`, the site thing stays, `stage` and `walked` written on it for the renderers); `basket/bowl/store`
  `count/capacity/item` (put fills, pick takes one; a bowl's `food` is its count, both written); the `can` thing
  (`pick` → `holds: 'can'`, `r.can = level`, `r.canMax = max`; `put` on a free tile puts it back with its level); the can
  world (`noCan`); `full` refusals (`sayFull`, the item stays carried; a full meter tulip spends no water); `rock.max`
  (a rock with a max stays at 0 and regrows); `job { targets, home }` with `t<n>` minted for a target named by its tile
  `[x, y]`; `jobDone` → the walk home appended (`step`'s `home` op: one BFS step or quarter turn per tick over tiles
  that do not block, then `home: { id, x, y }` + `sayHome`); goal `job_done` (every target full AND the robot home);
  `wearOf(world, age)` (called ONLY by the island tick) → deltas `wear`, `regrow`, `lay`, `letter`, `seed`, written by
  `apply` (still the only writer); `SEED_HELPERS` = `rngOf` (mulberry32, state written back to `w.seed`), `layOut`,
  `seedWorld`, carried by `ENGINE` and by `Start world`.
- **Start world** (`cg003Scripts.ts`, the seed line only + one import line + the helpers appended at the script's end,
  where their function declarations hoist): `Outputs.world = seedWorld(Outputs.world, req, Inputs.seed)` — a seed from
  `Inputs.seed` (tests) or picked, the job copied onto the world, the seeded layout laid. A request with neither `job`
  nor `seeded` is untouched (spec: all 13 start with no `seed`, no `job`, their own map).
- **Island tick** (`ig004Island.ts`): a plot whose request has a `job` is laid once at build from its own seed (djb2
  of the request id, so every build lays it the same), carries `job` and `seed`, and ticks through `islStepJob`: wear
  first, then `work` → (job done: the walk home) → `wait` at home → a worn target reopens the job → a fresh run of the
  pinned program (`lap + 1`) on the plot AS IT STANDS. A program that ends with the job not done walks home (`return`)
  and starts again. The live state adds `phase`, `age`, `seed`, `worn` (this tick's wear deltas) and `delta` (this
  tick's step delta) for the renderers. `hold` stays 0 on a job plot. A plot with no job is untouched:
  hold `ISLAND_HOLD_TICKS` (3), reset, restart — the island drive reads it as before.

**WEAR, in island ticks** (`{ tulip: 60, site: 120, bowl: 60, basket: 90, store: 120, rock: 30, hen: 20, postbox: 90 }`).
The island tick is `STEP_MS × 2` = 760 ms (about 78 a minute, only while the Island page is open). Measured: the
longest reference run is 41 ticks (rows-trick; tulips-three 31, path-stones 23, rock-flower 33) and the walk home on
an 8 × 6 plot is at most ~12 moves plus turns, so no target wears sooner than 60 ticks (~46 s): a job that finishes is
SEEN done with its robot home before it reopens, and a child sees the robot go back within about a minute of play
(Richard's "over and over", D3). The path wears slowest (stone, ~1.5 min); Biscuit eats every 60; Mamie takes an egg
every 90. Sources run faster than the targets they feed so a reopened job never waits on them: a rock regrows a stone
every 30 ticks (four in ~2 min, a path square's worth), the hen lays every 20 (a full pen of four in ~1 min), a letter
every 90. One thing per kind per period (a tulip/bowl/basket/store chosen by the seed, the most-walked site), never
below 0, nothing removed; a worn tulip `droop: true` until full again. The spec pins "every target period > the longest
reference run", so a longer mission added by IW-003 fails there first.

**Readings** (worktree, after the commit; each spec file alone; previous = brief §3's merged reading at `0ed7447c9`):

| gate | exit | total | previous |
|---|---|---|---|
| `cg002Engine.test.ts` | 0 | 199 passed / 199 | 167 (+32: IW-002 AC1–AC4 rows, both languages × both bands where a band applies, 4 arms) |
| `ig004Island.test.ts` | 0 | 21 / 21 | 15 (+6: the job tick, the no-job control beside it, return-and-again, AC3 engine side, one arm, perf) |
| `cg003Template` · `cg006Requests` · `cg005Olive` · `cg001GardenKit` · `ig007Garden3d` | 0 each | 124 · 83 · 41 · 34 · 38 | same |
| garden specs, all seven files | 0 | **540** | 502 |
| `npm run template:garden` | 0 | engine gate 199/199; drift committed with the source (17 files: the engine scripts, Words, Translate, Start world's `seed` input) | 0 drift |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **328/328** | 328/328 |
| island drive 2D (`--perf`) | 0 | **65/65**; AC6 p95 16.7 ms at CPU ×4 (1199 frames, 23 moves) | 65/65 |
| island drive 3D | 0 | **5/5** | 5/5 |

(The first 2D island run without `--perf` read 62/62: the three missing clauses are exactly `--perf`'s AC6 three —
diffed clause by clause against `p106-s4-merge-scratch/island.log`; re-run with `--perf`: 65/65.) Screenshots looked
at: `iw002-engine-scratch/island-2d/ig004-1368-en-02-robot-at-work.png` (Pip on the tulips' plot with his can drops,
the padlocked plots, the islanders' bubbles — as before) and `island-3d/ig004-3d-island-1368.png` (the whole island
framed, three bubbles, Pip named on the tulips' plot).

**Acceptance, against §3:**

- **AC1 ✅ (engine):** each primitive and event in `cg002Engine` "IW-002": a tulip takes exactly 3 of 3 and refuses
  the 4th (`full`, `sayFull`); a site turns dirt → gravel → cobbles → cobbles → path at 4 and refuses the 5th (the stone
  stays carried), the tile reads `P` and is walked on; a basket fills to 4 and refuses the 5th, `pick` takes one back;
  a bowl's `food` is its count (`bowl_has` still met); the can must be held to fill and to water (`noCan` twice, then
  picked, filled, watered, put back with level 2, `noCan` again); the rock regrows 1 → 2 → 3 and stops at its max; the
  hen lays on free pen tiles only, four and no more, the same tiles again from the same seed; a letter comes to the post
  box and no second one. Each in EN and FR (the sayKeys resolve in both) and band 7–9 (unrolled) and 10–12 (repeat).
- **AC2 ✅:** `jobDone` fires once, on the tick after the last drink; the robot walks round the wall (`3,2 2,2 1,2 0,2
  0,1 0,0 1,0 2,0` — never an `L` or the tulip), faces `home.d`, says `sayHome`; `job_done` met; not met while the job is
  done and the robot is not home; the child's remaining steps run first; no job → no walk; an unreachable home gives up
  (`lost`), the run ends.
- **AC3 🟡:** engine side ✅ — `wearOf` is called by nothing but the island tick (a text gate over every Function
  script); a finished job left 3 × the longest period on `step` + `apply` loses nothing, while `wearOf` at a tulip tick
  takes the drink; on the island the pinned robot restarts on the wear tick (lap 1, first step taken); an island given no
  tick does not wear and the held state goes on with its meters as left. **Not done:** the DRIVE clause (close the page,
  wait, reopen) — no request carries a job until IW-003, so the page has nothing to wear. Measured risk for whoever
  writes it: the island's live state is NOT in the save (v4 keeps program + robot only), so after an app restart a job
  plot starts again from its request's start; within one session the `gardenIsland` Variable holds it (same build → the
  held state goes on). Keeping meters across a restart is the save v5 (IW-006).
- **AC4 🟡:** engine ✅ — the same seed lays the same layout twice; seeds 1, 2, 3 lay three; over 40 seeds the wall takes
  every column of 5..7 on the robot's row and four eggs land on four distinct tiles of the eight; `rngOf` equals the
  spec's own mulberry32; Start world with `seed: 2` lays exactly what `seedWorld` lays. **Not done:** "the 2D kit and the
  3D kit" — session 2 (lane D) draws from the laid world JSON (the layout is in `map`/`things`, no kit-side PRNG needed).
- **AC5 🟡:** the island spec grades it on fixture requests (a job plot is never reset — the no-job plot beside it resets
  > 3 times in the same window; the robot is seen leaving the tulips for home through `2,1`, waits, and goes back on the
  wear tick). **Not done:** the island DRIVE clause — no request carries a job until IW-003; the drive stays green on
  the 13 (65/65).
- **AC6 ⬜:** session 2's (drawing in both kits).

**Deviations and choices, with reasons:**

1. **The walk home is appended after the child's remaining steps**, not in place of them ("appends", brief §4.2): the
   program keeps its meaning; a step after the job (a `say`) still runs. A step after the job that UNDOES it (picks an
   egg back) is the program's to own.
2. **Contract superset, nothing renamed:** `meter` and `full` also carry `x, y`; `holds` carries `x, y, level, max`;
   `wear` carries `kind, x, y`; new delta keys `stow` (a put into a site/basket/store: `{ id, kind, x, y, into, target }`),
   `lost` (the walk home found no path), `seed` (the wear's PRNG state, written by `apply`); `pick` gains `box/from`
   (taken from a container, like today's `rock: true`); `job.home.d` (face it at home: the pinned program replays from
   the pose it was written for); `job.targets` may name `[x, y]`; `seeded.wallRow` (default the robot's start row).
   `JOB_ITEMS`, `SITE_STAGES`, `WALL_TILE`, `HEN_CAPACITY`, `JOB_VOCABULARY` added beside `WEAR` / `JOB_KINDS`; `WEAR`
   adds `basket` and `store` (a container target must wear or its job never reopens).
3. **Today's behaviour kept where the new fields are absent:** a tulip with no `need`/`have` waters as before (no meter
   written, a second pour is not refused); a container with no `capacity` is never full (bowl-if's bowls); a rock with
   no `max` vanishes at 0 as before. The one change to today's JSON: a fed bowl now carries `count` beside `food` (the
   contract's "write both").
4. **`pick` of a can with no `max` keeps the robot's `canMax`** (IG-005's can+ upgrade); with a `max` the can's wins, as
   the contract says. IW-006 should decide which wins when both exist.
5. **`put` order:** into a site/container ahead first, then the held can onto a free tile, then today's put.
6. **Start world** gains an input port `seed` (the component's `Inputs.seed`; unwired on the pages → a seed is picked).
   Its hunk is two lines plus one import line and `${SEED_HELPERS}` appended at the end of the script. A seed is picked
   each time Start world runs (a request opened, Start over), not per Play: Predict and Play read the same laid world.
7. **A job plot's program that ends with the job not done** walks home and starts again (the brief did not say);
   a pinned program replays from home, so it should be written from the home pose (IW-003's missions: home = start).

**Could not verify:** anything drawn (both kits, session 2); a job on a real page (no request carries one until IW-003 —
the page and island drives prove only that nothing that plays today broke); the tablet's tick time with job plots (the
spec's 300 ticks × 2 job plots + 1 reset plot read p95 0.2 ms on the Mac, gate < 5 ms).


### Session 2 (2026-09-30, lane D `iw002-drawing`, base `a9d8850fd`) — the DRAWING half (AC6) and the two world inputs

**Built** (both world kits; nothing in the engine, the pages or `cg003*`). Every name is the engine's (§6 session 1) and
brief s2 §4.4–§4.5's; nothing renamed.

- **One helper block, copied into both kits** (`garden-kit` after `loadOf`, `garden-3d-kit` before `LOCAL_WORLD`): copies
  of `JOB_VOCABULARY`, `SITE_STAGES`, `WALL_TILE` (the one table stays `cg002Content.ts`); `meterOf(thing)` (the chip:
  icon, have, need, pips ≤ 8, text, full — green only for a target or a container), `siteStage` (the engine's `stage`,
  else its rule by have/need), `penOf` (a hen's `[x0,y0,x1,y1]`), `watchRefs` / `resolveWatch` (a chip → the thing with
  its id, else the first of its kind on its tile, else — a `can` — the robot that `holds` it, else the tile). Exposed as
  `Garden.world.job` and `Garden3D.world.job` / `.job`. `L: 'wall'` in both legends, `wall` in both `KINDS`;
  `parseRobots` carries `holds` in both copies, and only when it is `'can'`.
- **garden-kit (the Garden region):** sprites `wall`, `hen`, `basket` / `basketEggs`, `store` / `storeFull`, the watering
  can drawn per thing with its water at level/max; a site is a ground layer by stage (dirt speckled, gravel dotted,
  cobbles, path with sand edges); a tulip with drinks but not all stands half up (`gd-part`), a worn one (`droop`) hangs
  lower than dry (`gd-droop`); a bowl with a counted capacity shows fed; a rock with a `max` at 0 stays as a faint stub; a
  hen's pen is straw tiles plus one rail element over the grid; a letter on a post box THING peeks from its slot; a robot
  that holds the can carries it whatever it wears. Every meter is the mockup's chip (icon, pips, numbers; green when
  full), over its tile's top edge — inside the tile on the top row (the world clips there), compact on a wide world
  (w > 16, the island: numbers only). **Watch** rings each resolved thing, robot or tile in violet and draws its meter
  large (15 px); **Picking** frames the world violet (`gd-picking`, `data-picking`) and lifts the things under the
  pointer (`:hover` / `:active`); the tiles stay the same buttons, so Tile X / Tile Y / Tile Tapped are unchanged.
- **garden-3d-kit:** the wall tile is grass-height with a dry-stone wall on it (two instanced meshes however many); new
  `THING_BUILDERS` `site` (the mockup's patch by stage + a stone per stone laid, sand edges at path), `basket` (wicker tub,
  handle, an egg per egg), `store` (crate, stones heaped), `can` (body, spout, handle, its level box), `hen` (the mockup's
  hen + her straw floor and four rails, from the hen's `pen`); tulip part / droop tilts; a fed bowl by count; a used rock
  stub; a letter stands in a post box thing's slot. The meters are the mockup's DOM chips in the overlay, projected every
  frame; a held can's level is an ink chip under its robot's name. `setWatch` rebuilds only the overlay (rings are DOM
  ellipses sized by the tile on screen — never a scene rebuild); `setPicking` lifts the things on the hovered tile by
  `PICK_LIFT` (0.14) in the frame loop, one frame per change. Ports: `watch` and `picking` with the 2D node's exact
  definitions (the port gate diffs them).

**Readings** (worktree; spec files one at a time; previous = brief s2 §3 at `a9d8850fd`):

| gate | exit | total | previous |
|---|---|---|---|
| `cg001GardenKit.test.ts` | 0 | 45 / 45 | 35 (+10: the table's copies; the 13 requests' start AND end worlds draw byte-identical with Watch '' / [] and Picking off, no new marker, no meter; tulip, site, basket/store/bowl, can, rock/hen/pen/letter each from worlds the engine wrote via Step + Apply delta; AC4 seeds; Watch; Picking) |
| `ig007Garden3d.test.ts` | 0 | 43 / 43 | 38 (+5; two existing port clauses gained `watch`, `picking`, as the brief foresaw) |
| `cg003Template` · `ig004Island` · `cg005Olive` · `cg006Requests` | 0 each | 134 · 21 · 41 · 83 | same |
| `cg002Engine` (the generator's gate) | 0 | 199 / 199 | same |
| garden specs, seven files | 0 | **566** | 551 |
| `npm run template:garden` | 0 | drift = the two kit copies under `templates/bot-garden/noodl_modules`, committed with the source | — |
| kit drive 2D `drive-cg001-kit.js` | 0 | **38 / 38** (10 new) | — |
| kit drive 3D `drive-ig007-3d.js` (swiftshader) | 0 | **25 / 25** (7 new) | — |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0), template drift none | **331 / 331** | 331 / 331 |
| island drive 2D `--perf` | 0 | **65 / 65**; AC6 p95 **16.7 ms** at CPU ×4 (1199 frames, 23 moves) | 65 / 65, 16.8 ms |
| island drive 3D | 0 | **5 / 5** | 5 / 5 |
| Workshop 3D · nogl | 0 · 0 | **24 / 24** · **8 / 8** | same |

**The frame gate WITH meters** — the island page draws none (below), so the reading is a kit-fixture clause (METER-PERF,
`drive-cg001-kit.js`): a 46 × 22 world, 13 plots of job things = **65 meters**, three robots stepping every 380 ms, CPU ×4
(a fixed loop measured ×4.0), 20 s of rAF: **p95 16.8 ms** (p99 16.8, max 16.8, 1201 frames, 52 robot moves drawn,
0 long tasks) beside the same world with no job fields: p95 16.7 ms. Gate ≤ 50 ms (IG-004 AC6's).

**Mutation arms** (each source mutated, both kits rebuilt, the IW-002 clauses of both specs run, the source restored by
copy): a container meter without a capacity → 2 red; `L` out of the 2D legend → 3 red; the 3D table copy drifts
(`item: 'eggs'`) → 1 red; 3D Watch by id dropped → 2 red; 3D lifts every thing while picking → 1 red; 2D picking class
always on → 1 red; 2D droop never drawn → 1 red. One arm stays green, honestly: 3D ignoring `holds` (an engine-held can
always has a level, and the level already draws the can).

**Screenshots looked at** (scratch `iw002-drawing-scratch/`): `kit2d/shots/iw002-2d-job-world.png` — two stone walls,
the tulips half up / upright / drooping with 2/3 · 3/3 (green) · 2/3 chips, the four site squares brown → dotted gravel →
cobbles → sand path with 0/4 … 4/4 (green), the basket with eggs 3/4, the crate with stones 2/6, the blue can 2/3, a
medium rock 2/4 and a faint stub 0/4, the hen in a straw pen with a wooden rail and two eggs, a letter in the post box's
slot, Pip with the can's drops at his side; `iw002-2d-watch.png` — violet rings on the tulip, Pip, the empty tile ahead
and the basket, the basket's and the tulip's chips large, Pip's drops outlined; `iw002-2d-picking.png` — the world
framed violet, the basket tile outlined and the basket lifted; `iw002-2d-island-meters.png` — the 46 × 22 world with
compact number chips (neighbouring tulips' chips overlap at 14 px tiles — a look item for IW-003); `iw002-2d-seed-1/2/3`
— the wall and three eggs where the engine laid them. 3D: `kit3d/shots/iw002-3d-job-world.png` — the same world in the
round (grey stone wall, patches by stage with stones, wicker basket with eggs, crate, can, rocks, white hen in her
fenced straw pen, the chips over each thing, Pip's ink chip 1/3); `iw002-3d-watch.png` — violet ellipses on the tulip,
Pip, the tile ahead and the basket, three chips large; `iw002-3d-picking.png` — violet frame, the basket raised;
`iw002-3d-seed-3.png` — the wall block and three eggs. Page drives: `pages/island-2d/ig004-ac6-three-robots.png` and
`pages/ws-3d/ac1-3d-03-first-tulip.png` look as before.

**Acceptance, against §3:**

- **AC6 ✅ (the kits):** both renderers draw every new thing from the world JSON the engine writes (specs on engine-run
  worlds; both fixture drives feed an engine-made world through the Variables; screenshots of each looked at); the 3D
  pinned-copy gate covers the three tables in both kits and the helpers. **Not on the pages yet** — see below.
- **AC4 ✅ (the kits' half):** the engine's `seedWorld` on seeds 1, 2, 3 draws three layouts in both kits, each exactly
  the wall and eggs the engine laid; the same seed draws the same (spec + both drives).
- AC1–AC3, AC5: unchanged from session 1 (engine; the drive halves wait for IW-003).

**Deviations and choices, with reasons:**

1. **A container's meter needs a `capacity`** (brief: "count/capacity"). Session 1's deviation 3 writes `count` on a fed
   bowl with no capacity (the bowl requests); counting those would put a chip on a request of the 13.
2. **`parseRobots` carries `holds`** (both copies; only when `'can'`, so every robot row without it parses exactly as
   before) — the kit needs it to put the can in the hand of a robot that wears something else, and for Watch.
3. **A letter peeks from the slot only on a post box THING** (the IW-002 source), never on the map's `B` tile: the
   letters request ends with a letter there and would have changed look.
4. **Compact meters on a wide world** (w > 16: numbers only unless watched) and **inside the tile on the top row** (the
   world's `overflow: hidden` clipped them — seen in the first 2D shot, fixed, re-driven).
5. **Rings and meters are DOM in both kits** (the mockup's chips); in 3D the rings are projected ellipses, so a Watch
   change never rebuilds the scene. The 3D root now always carries `data-picking` and `data-watched` (attributes only).
6. `aim` (a walk's target tile) is not drawn — optional in the brief, and nothing emits a walk until IW-005 lands.

**Not done, and why — for whoever wires the pages (IW-003 / lane B / the orchestrator):** the pages draw none of this
yet. `DRAW_WORLD_SCRIPT` (`cg003Scripts.ts`, not this lane's) passes the kit only `tulip / puddle / letter / stone / egg /
food / bowl (full) / label / rock (left) / sign / note / islander / fence / padlock` with their old fields, and robots
without `holds`: a job's `site`, `basket`, `store`, `can`, `hen`, `postbox` things and every meter field (`have`, `need`,
`droop`, `stage`, `count`, `capacity`, `item`, `level`, `max`) are dropped there. Passing the thing through with its
fields (and `holds` on the robot row) is all the kits need. Watch / Picking are B's to wire (brief §4.4).

**Could not verify:** the tablet (touch has no hover: Picking lifts on `:active` in 2D and on pointer-down in 3D); a
real GPU; a job on a real page (no request carries one until IW-003, and the page strips the fields — above); the look
graded by Richard.

### Session 2 merge (orchestrator, 2026-09-30, `p108-s2-merge`)

Lane D found that the page's `Logic/Draw world` (`DRAW_WORLD_SCRIPT`, `cg003Scripts.ts`) passed only the old thing kinds and
fields, so no page could show a meter. Fixed at the merge (`5213ab8bf`): every job field the engine wrote (`id have need droop
count capacity item level max stage walked pen`) is copied onto the thing, the new kinds (`site basket store can hen postbox`)
pass through, and a robot's `holds: 'can'` reaches the kits. Spec (`cg003Template`, end): a job world reaches the kits with
every field; beside it, the 13 requests are drawn with exactly the keys they had before. Red on the old script (1 of 2), green
on the new.
