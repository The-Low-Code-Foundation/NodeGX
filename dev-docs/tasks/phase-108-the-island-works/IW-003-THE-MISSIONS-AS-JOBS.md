# IW-003 — The missions as jobs

**Opened 2026-09-29** from README §0, §1.1. **Status: ⬜.** Depends on IW-002 (the job model), IW-004 (the blocks the
reference programs are written in), IW-005 (`go to nearest`). One lane per islander family in session 3.

## 1. The person sentence

> **Every mission has a reason a child would believe: water comes from the well in a can, a path is built stone by stone
> until it is a path, eggs go in the basket by the door, the wall is a wall. Each teaches the same idea it teaches today.**

## 2. The rule for every mission

1. It names its **source, carrier, targets, finish line and wear** (IW-002 §2).
2. It keeps the **idea it teaches today** (the ladder in README §5 and P105 CG-006 §2 stay the spine).
3. Where it teaches `until`, a count, or seeking, the **layout is seeded** so a fixed `repeat N` fails on at least one of
   three seeds (README §7).
4. Its reference program wins on three seeds, in both bands, both languages, and is written as Blockly JSON (IW-004).
5. The drawer offers only its blocks; the pad offers every action in the drawer (IW-001 F7).

## 3. The thirteen, and what changes (the idea stays)

| Mission (id) | Teaches | Today's flaw (README §1.1) | As a job |
|---|---|---|---|
| path-postbox | a sequence | walks to a tile for no reason | "Check the post box": at the box a letter pops out and Pip carries it home (a reason, a reward moment). Post arrives again on ticks. |
| tulip-door | an action | water is free | The can is on the shed tile: pick it up, fill at the well, water the tulip by the door until its meter is full (`need` 3 → three `water`). |
| tulips-three | repeat, fetch-and-return | refills before every tulip; the can's 3 is never used | 3 tulips × 3 drinks, can of 3: fill, water one tulip full, back, fill… `repeat 3`. Band 2: `until [can] is empty { water }`, `if [can] is empty → go to the well`. Wear: a tulip loses a drink every so often. |
| path-stones | pick/put, repeat | one stone per square, never a path | 4 squares × 4 stones; the hod holds 4; each trip finishes one square (dirt → gravel → cobbles → path). Band 1 `repeat 4 { go to rock, repeat 4 {pick}, go to site, repeat 4 {put} }`; band 2 `until [hod] is full`. Finish: the path reaches the post box → Cobble walks home. Wear: the most-walked square loses a stone. |
| bowl-if | if | fine, but food is endless | Biscuit's bowls empty as he eats (wear); the food sack is the source; `if [bowl ahead] is empty → put`. |
| letter-say | carry + say | the letter lies on the ground | The letter is in the post box; Pocket takes it to Sami's door and says something kind. |
| wall-until | until | no wall; a fixed 7 tiles | A real garden wall; Biscuit's ball rolls a seeded 4–7 tiles; `until [ahead] is wall { forward }`, pick the ball, bring it back. `repeat 7` fails on a seed. |
| meow-when | an event | steps toward a bowl for no reason | When Biscuit meows, bring one treat from the jar to his bowl. |
| eggs-count | a counter → a variable | eggs carried, never delivered | The hen lays on seeded tiles; the basket by Mamie's door `0/4`; `until [eggs in basket] = 4 { go to nearest egg, pick, go to basket, put }`. The child taps the basket on the island to make its chip. Band 1: `until [basket] is full`. |
| rows-trick | a named trick (procedure) | water free | Two rows, a can: the trick is "water a row"; used twice. |
| mamie-note | Olive reads | water free | The note changes each day (seeded): "the red ones today" / "the yellow ones"; the can; `if what Olive read = red`. |
| rock-flower | Olive: is it a…? | water free | As today, with the can; the rocks are the rock source (mined later by Cobble). |
| sami-thanks | Olive says thanks | the letter lies on the ground | As letter-say, and Olive writes the thank-you. |

## 4. New missions

| Mission | Teaches | The job |
|---|---|---|
| **envelopes** (Pocket, band 2) | Olive reads → `go to` (D6, supersedes P106 R10) | Three envelopes in the post box, each with a name; `read [envelope]` → `go to [what Olive read]'s door` → put. Seeded names each day. |
| **the first build** (Cobble) | a job with a big meter | Sami's bench: a site needing 8 stones; Cobble mines and delivers until it rises in stages; the islander sits on it. Introduces IW-007's build site. |
| **the watering can** (Pip, band 1, early) | picking up a tool | Richard's example: the can is somewhere on the plot, not in hand; pick it first. Folded into tulip-door if one mission is enough. |

## 5. Acceptance criteria

1. Every mission in §3 and §4 is built on the job model; none uses `carrying` or `thing_at` as its win.
2. Each wins with its reference program on three seeds, both bands, EN/FR; the `until`/count/seek ones have a
   `repeat N` program that loses on at least one seed (the engine gate asserts both).
3. Each mission's copy (title, blurb, line, hint keys) says the reason in words a 7-year-old reads; FR lines for
   Richard's read listed in §7.
4. The island: every won plot shows its robot working, finishing, walking home, and going back after wear.
5. Page drive, island drive 2D + 3D, both languages, screenshots of each mission looked at beside IW-000.

## 6. Traps

- A mission rewritten changes what a pinned v4 program does: IW-004's migration flags "teach again" when a stored
  program no longer wins its rewritten mission; the robot waits at home, it does not flail.
- The hint table keys off goals (`CHOOSE_HINT_SCRIPT`); every rewritten goal needs its hint row, or "Not quite yet"
  comes back (P106 D4 was this).

## 7. Notes

(empty)

### Session 3 (2026-09-30, lane B `iw003-biscuit`, base `2e1035bfa`) — Biscuit's missions; the ball; teach again

**Built** (commits `112611263`, `daa458cf9`, `ff3ebbe45`, `0865296c8`).

- **bowl-if** (Cobble, band 10–12, if): source the food sack (`store` `sack`, item food, count 99, no capacity: no chip)
  at 0,2; carrier Cobble's hands; targets three bowls `b1 b2 b3` at 2,2 · 4,2 · 6,2, capacity 1 each; the seed deals
  which one Biscuit has NOT eaten from (`seeded.shuffle` of `food` over `[0, 0, 1]`); home = start 0,3 facing right.
  Reference: `left, pick, pick, right, repeat 3 { fwd, fwd, left, if [the bowl is empty] { put }, right }` (11 blocks).
  Goal `job_done` + `uses if`. Wear: a bowl empties every `WEAR.bowl` (60) island ticks and Cobble goes back.
- **wall-until** (Pip, until): a real wall `L` on the path at a seeded column 5–7 (`wallAt`), Biscuit's ball in the
  corner by it — the tile before the wall, one row up (`seeded.byWall`, new, see engine) — and his basket `bed`
  (item ball, capacity 1) at 0,3, beside Pip's start 1,3. Reference: `until [the wall is ahead] { fwd }, left, pick,
  left, until [the wall is ahead] { fwd }, put` (8 blocks; the way back ends facing the basket, which blocks). Goal
  `job_done` + `no_bump` (new) + `uses until`. `repeat 7 {fwd}` bumps into the wall on every seed (spec row); the
  NAIVE_B program (until out, a counted `repeat 4` back) wins on the wall at 6 and loses at 5 (a bump) and 7.
  Wear: Biscuit takes the ball out of the basket (`WEAR.basket`, 90) and it rolls back to its spot by the wall.
- **meow-when** (Pip, when): source the treat jar (`store` `jar`, item food) at 1,2; target the bowl at 2,3,
  capacity 2; meows at ticks 1 and 8 (the handler, a noop and four steps, ends before the next). Reference:
  `when meow { left, pick, right, put }` — turn to the jar, take a treat, turn back, put it in the bowl. Goal
  `job_done` + `handled meow 2`; Pip never leaves home.
- **Engine hunks** (`cg002Scripts.ts`, each under a `P108 IW-003 (lane B)` comment): `goalMet` — goal `no_bump` (one
  line); `SEED_HELPERS.layOut` — one call line after `place` + new `layByWall` (a thing laid at the drawn wall + dx/dy,
  its tile written as `spot` on the container `spotOn` names; draws nothing from the seed); `apply`'s `wear` — a call
  to new `rollOut` (after `varStep`): a container with a `spot` puts the worn item back there when it is PICKABLE;
  `CHOOSE_HINT_SCRIPT` — one line: every target full and home but no win → `iw3bTrick`.
- **Content**: `Goal.name` + `'no_bump'`; `SeededSpec.byWall`; `HINTS.iw3bTrick` (lane block); copy edited in place
  (`rqBowlLine`, `rqWallTitle`, `rqWallLine`, `rqMeowTitle`, `rqMeowLine`); `PAGE_WORDS.iw3bTeachAgain`.
- **Draw world**: the `ball` passes through; a bowl with a capacity and no `count` is handed its `food` as `count`.
- **Both kits**: the ball (2D sprite / 3D `ballOf`: sphere + seam), on the grass, as a robot's load, and in Biscuit's
  basket (`basketBall`); a store of food shows biscuits, not stones (`storeFood` / 3D biscuits); a container's meter
  reads `count`, else `food` (the engine's rule; both copies of `meterOf`, still pinned equal); the island's compact
  meter is a bar (2D ≤ min(12 px, 82 % of the tile); 3D ≤ 12 px and 80 % of the tile as the camera sees it, set each
  frame) — neighbouring tulips' chips no longer overlap on the 14 px island.

**Readings** (worktree, each spec file alone, exit 0 unless named; previous = brief §3 at `2e1035bfa`):

| gate | exit | total | previous |
|---|---|---|---|
| `iw003Missions -t "\[B\]"` | 0 | **12 / 12** | the base's B rows red by design (count per lane not measured) |
| `iw003Missions` whole file | 1 | 35 passed, 28 red (M, S, P rows, not in this worktree) | 28 / 35 red |
| `cg002Engine` | 0 | **232** | 226 (+6: lane B describe — wall and ball over 40 seeds, repeat 7 / repeat 4, the ball rolls back, bowl-if's seeds, meow-when, the iw3bTrick hint) |
| `ig004Island` | 0 | **29** | 23 (+6: teach again ×4, wall-until and bowl-if/meow-when going round on the island) |
| `cg001GardenKit` · `ig007Garden3d` | 0 · 0 | **53** · **46** | 50 · 43 (+3 each) |
| `cg003Template` · `cg005Olive` · `cg006Requests` · `iw004Blocks` · `p108s2Join` | 0 each | 141 · 41 · 83 · 54 · 4 | same |
| `npm run template:garden` | 0 | engine gate 232/232; 0 drift after `0865296c8` | 0 |
| page drive `drive-pages.sh` (`--mockup`), final deploy | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **331/331** | 331/331 |
| `drive-iw003-biscuit.js` (new), final deploy | 0 | **24/24** | — |
| island 2D `--perf` / 3D | 0 / 0 | **65/65** (AC6 p95 16.7 ms at CPU ×4, 1200 frames) / **5/5** | 65/65 / 5/5 |
| IW-004 2D / 3D | 0 / 1 then 0 | **19/19** / 2 of 4 (the chip not found, a lone red) then **3/3** | 19/19 / 3/3 |
| IW-001 · modes · robots 2D / 3D | 0 each | **38/38** · **90/90** · **60/60** / **4/4** | same |
| Workshop 3D / nogl | 1 then 0 / 0 | 3D fell back to 2D (Too Slow under swiftshader: the brief's known flake), then **24/24** (p95 26.1 ms) / **8/8** | 24/24 / 8/8 |
| Olive `drive-olive.sh pages` · shell `node --test` | 0 · 0 | **22/22** · **91/91** | same |
| kit fixtures 2D / 3D | 0 / 0 | **41/41** / **27/27** (BALL, FOOD, BARS; 3D BALL, BARS) | 38/38 / 25/25 |

Drives and screenshots (all LOOKED at): `iw003-biscuit-scratch/pages/iw003b/` — `iw003b-look-1368-en-wall-until.png`
(the stone wall on the path, the ball red in the corner above the tile before it, the basket 0/1, the program whole),
`iw003b-look-1024-wall-until.png` (the whole program at scale 0.53 beside the drawer, the pad and Play on the first
screen), `iw003b-look-390-wall-until.png`, `iw003b-bowl-if-1368-en-won.png` (three bowls 1/1 green, Cobble home, "Thank
you, Cobble!", Biscuit lends Pocket), `iw003b-meow-when-1368-fr-won.png` (the bowl 2/2, « Merci, Pip ! »),
`iw003b-island-meow-when-again.png` (Cobble on bowl-if with green bars, Pip on meow-when, Pocket home),
`iw003b-teach-island-en.png` and `iw003b-teach-workshop-fr.png` (below); kit fixtures `kit2d/shots/iw003-2d-*`,
`kit3d/shots/iw003-3d-*` (the ball on Pip's back in 3D; the island bars apart).

**Against §5:** AC1 ✅ (the three on the job model, no `carrying`/`thing_at`). AC2 ✅ (seeds 1–3 × EN/FR, band 10–12;
wall-until seeded, its fixed walks lose on a seed). AC3 🟡 copy says the reason; FR lines below for Richard's read.
AC4 ✅ for Biscuit's plots (spec: wall-until and both bowls go round; drive: meow-when's Pip finishes, waits, goes back).
AC5 🟡 page and island drives both languages, 1024 / 1368 / 390, 2D + 3D kits; the look beside IW-000 is Richard's.
Owned items: the ball in both kits ✅; the Workshop look ✅ (IW-004 §6); teach again ✅ (IW-004 §6).

**Deviations, with reasons:** (1) **`no_bump`, a new goal**: without it a `repeat 7 {fwd}` walks into the wall and
stops where `until` stops (a bump is harmless), so "repeat 7 must lose" could not hold. (2) **`seeded.byWall` and
`rollOut`, new**: the base's `wallAt` and `place` draw independently, so the ball could not be "just before the wall";
and a ball stowed in the basket leaves the map, so wear would reopen a job with nothing to fetch (the robot would
flail). (3) **wall-until keeps `uses until`**, so NAIVE_B uses an until out and a counted walk back (a fully fixed walk
cannot win the goal on any seed; the near-miss is the counted way home). (4) **bowl-if's `if` does not change the
world**: a put into a full bowl is refused ("It's full!", the item stays carried), so a walk that puts everywhere
fills the job too; the goal keeps `uses if`, and the new hint `iw3bTrick` tells her the job is done but not the way
the card asks. (5) **The sack and the jar hold 99 and never refill** (`store` wears in `wearOf`; no source refill for
a store): about an hour of island play. (6) **meow-when's Pip never walks** (turn, take, turn, put), so the two meows
never interleave. (7) **wall-until's robot starts at 1,3** (the basket stands at 0,3).

**FR lines for Richard's read:** « Je mange dans mes trois gamelles toute la journée. Prends à manger dans le sac et
remplis seulement les vides, {b} ! » · « Rapporte ma balle du mur » · « Ma balle a roulé jusqu’au mur. Avance jusqu’au
mur, ramasse-la et rapporte-la dans mon panier — sans te cogner, {b} ! » · « Quand je miaule, apporte-moi une
friandise » · « À chaque miaulement, {b} prend une friandise dans le bocal et la met dans ma gamelle. Miaou ! » ·
« Réapprends à {b} — le travail a changé. {b} attend à la maison. » · « Le travail est fait ! Maintenant, apprends à {b}
comme la carte le demande — avec son bloc à elle. »

**Could not verify:** the tablet; a real GPU; the look beside IW-000 (Richard's); the other lanes' rewritten missions
under teach again (proved on a fixture of a rewritten request and on Biscuit's three old programs); a Blockly `when`
block shows its event slot "…" until a child picks one (the engine reads meow when none is set — IW-004's).
