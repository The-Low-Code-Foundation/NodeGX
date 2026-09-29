# IW-002 — The job model: sources, carriers, meters, a finish line, wear

**Opened 2026-09-29** from README §4.1. **Status: ⬜.** Depends on nothing (engine first). Lanes J (engine) then D (drawing).

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

(empty)
