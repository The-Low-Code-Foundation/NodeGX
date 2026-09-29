# IW-002 — The job model: sources, carriers, meters, a finish line, wear

**Opened 2026-09-29** from README §4.1. **Status: 🟡 s1 — the ENGINE half built (lane J, §6); AC6 drawing (lane D) and the page/island drive clauses (once IW-003 gives a request a `job`) owed.** Depends on nothing (engine first). Lanes J (engine) then D (drawing).

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

