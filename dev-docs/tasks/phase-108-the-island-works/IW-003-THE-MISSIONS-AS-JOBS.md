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

### Session 3 (2026-09-30, lane S `iw003-stones`) — Sami's stones: path-stones, rock-flower, sami-bench (new)

**Built** (base `2e1035bfa`; every name is the s3 brief §4's; nothing renamed).

- **path-stones** (Cobble, band 7–9, trick 2 — pick/put, repeat). Source: two rocks of eight (`left 8, max 8`, ids `r1 r2`),
  laid by the seed (`seeded.place`: r1 among (1,1) (2,1) (0,2), r2 among (5,1) (6,2) (4,5) (6,1) — three layouts on seeds
  1–3). Carrier: Cobble's hod of four (`robotStart.basket 4`). Targets: four sites `s1–s4` at (3..6, 3) between Sami's
  path and the post box, `need 4` each — dirt → gravel → cobbles → path. Finish: the path reaches the post box; home =
  the start (2,3) facing east. Wear: the most-walked square loses a stone (`WEAR.site` 120). Reference (the graded
  mockup's program, block for block): `repeat 4 { go to nearest rock, repeat 4 { pick up }, go to nearest site, repeat 4
  { put down } }` — 7 blocks; band 7–9 records it unrolled. Band 10–12's other path, `until [hod] is full { pick }` /
  `until [hod] is empty { put }`, wins on every seed too (engine spec row). Words: title "Build the path to the post box",
  the line says why (four squares of dirt, four stones a square, the hod holds four, the rocks move).
- **rock-flower** (Echo, band 10–12, trick 4 — Olive: is it a…?). As today, with the can: Echo carries an empty can of
  three (`robotStart can 0, canMax 3`; Echo has fill) and fills it at the pond below the start (row 4 now `WWWGGGGG`); the
  two flowers are the targets (`t1 t2`, a drink each — a meter 0/1); the rocks are rock sources (`max 4`); home = the
  start. Reference: `right, fill, left, repeat 4 { forward, left, is it a…? (a flower, 3 times), if Olive says yes
  { water }, right }` — 10 blocks.
- **sami-bench** (new, Cobble, band 10–12, trick 3 — until; plot (46, 8), islander `sami`, the last entry of the literal
  `REQUESTS` before `...IG006_REQUESTS()`, through `SAMI_BENCH()` declared beside `IG006_REQUESTS`). One site `bench` at
  (4,2) with `build: 'bench'`, `need 8`; three rocks whose stones the seed chooses (`seeded.choose` on `left`: r1 among
  2 3 4, r2 among 2 4 6 3, r3 among 4 6 — at least 8 on every seed), the hod of four. Reference: `until [bench] is done
  { until [hod] is full { go to nearest rock, pick up }, go to [bench], until [hod] is empty { put down } }` — 7 blocks,
  the bench and the hod as chips. Why band 10–12 and `until`: the lesson is the big meter — eight stones is two hods, and
  a rock holds a different number each day, so "pick four" runs dry on some days (NAIVE_S loses on seeds 1 and 3, wins
  on 2); band 7–9 would only repeat path-stones' repeat. Reward: the bench sticker (`STICKER.bench` 🪑).
- **Engine** (`ENGINE`, a lane S block after `varStep`, no backtick, no `${`): `seekSkips(t)` — go to nearest passes over a
  rock with no stones (`left` 0; one with a `max` stays on the map) **and a target already full** (a site or a tulip at
  its need — the mockup's rule; `go to nearest site` needs it); `pathSite(t)` / `buildSite(t)`. Call-site hunks: `nearestOf`
  (one line, `if (seekSkips(t)) continue;`), `tileAt` (only a path site reads as `P` when full), `blocked` (`||
  buildSite(th[i])`). **The bench blocks at every stage** (robots walk round a building; a finished bench is furniture
  Sami sits on) and **never reads as path**.
- **Kits**: the bench by stage in both — `benchStage(t)` = 0 pegs and string on dirt · 1 a leg · 2 two legs · 3 the seat ·
  4 built (the back; Sami sits on it), by have/need (need 8: 0–1, 2–3, 4–5, 6–7, 8), on both job looks and pinned equal.
  garden-kit: `SPRITES.bench0–4`, `benchEls` (the Garden region, after `WORLD_CSS`), one call-site line before the path
  site's; garden-3d-kit: `THING_BUILDERS.site` wrapped (a bench branch; the path square's builder unchanged), the chip
  lifted over it (`placeThing`, one line). `Draw world` passes `build` (`JOB_FIELDS.push('build')`).
- **The blocks say bench** (`blocks.js`, three small hunks — lane B's file): a thing named by its id wears its own word on
  the chip (`iw3sK_<id>`) and its states theirs (`iw3sS_<state>_<id>`); `wordsOf` takes those two prefixes. Measured
  before: the bench's until read "until [🟫 square] is path"; now "until [🪑 bench] is built" / "jusqu'à [🪑 banc] est
  construit" (driven).
- **Words** (lane S blocks): `WORDS` `iw3sBench…`, `iw3sStickerBench`, `iw3sGiftBench`; `REQUEST_SUBS` `sami-bench` →
  `iw3sSubBench`; `PAGE_WORDS` `iw3sK_bench`, `iw3sS_done_bench`, `iw3sS_dirt_bench`; in place: `rqStonesTitle`,
  `rqStonesLine`, `subPathStones`, `rqFlowerLine`, `subRockFlower`.
- **NAIVE_S** (`iw003Missions.test.ts`): path-stones — the walk taught on day 1 (seed 1's rocks), wins seed 1, loses 2
  and 3; sami-bench — `repeat 2 { go to nearest rock, repeat 4 pick, go to [bench], repeat 4 put }`, wins seed 2, loses
  1 and 3 (a used-up rock, a bump, the bench short).

**Readings** (worktree, on the final commit; spec files one at a time; drives on ONE deploy made by `drive-pages.sh`;
previous = the brief's §3 readings on `2e1035bfa`):

| gate | exit | total | previous |
|---|---|---|---|
| `cg002Engine.test.ts` | 0 | **237 / 237** | 226 (+2: sami-bench's AC1 rows EN/FR; +9: the lane S describe — 5 rows, 4 arms) |
| `iw003Missions.test.ts -t "[S]"` | 0 | **12 passed** (51 skipped) | 5 of 12 (7 red by design) |
| `iw003Missions.test.ts` (whole, for the orchestrator) | 1 | 35 passed, 28 failed (lanes M, P, B not merged) | 28 passed |
| `cg003Template` · `cg005Olive` · `cg006Requests` · `ig004Island` · `p108s2Join` | 0 each | 141 · 41 · 83 · 23 · 4 | same |
| `cg001GardenKit` · `ig007Garden3d` | 0 · 0 | **51** · **44** | 50 · 43 (+1 each: the bench by stage) |
| `iw004Blocks` | 0 | **56** | 54 (+2: sami-bench's two bands) |
| `npm run template:garden` | 0 | drift committed with the source; re-run in the drive: 0 drift | 0 |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **327 / 327** | 331 — 4 fewer by design: IG-002's four stones clauses a pass (rock shrinks, load, laid, Perfect) are three on the job model (rocks mined + load, stages, Perfect) × 4 passes |
| `drive-iw003-stones.js` (new) 2D | 0 | **32 / 32** | — |
| `drive-iw003-stones.js --mode 3d` | 0 | **14 / 14** (no Too Slow on this run; one earlier run fell back to 2D mid-run under swiftshader — the known flake — and the drive now resets the stored renderer before each 3D request and says when 3D is not on the stage) | — |
| kit fixture 2D `drive-cg001-kit.js` | 0 | **39 / 39** | 38 (+1 the bench) |
| kit fixture 3D `drive-ig007-3d.js` | 0 | **26 / 26** | 25 (+1) |
| island 2D `--perf` · 3D | 0 · 0 | **65 / 65** (AC6 p95 16.8 ms at CPU ×4, 1199 frames, 23 moves) · **5 / 5** | 65 · 5 |
| robots 2D · 3D | 0 · 0 | **60 / 60** · **4 / 4** | 60 · 4 |
| IW-001 · IW-004 2D · IW-004 3D · modes | 0 each | 38 · 19 · 3 · 90 | same |
| Workshop 3D · nogl | 0 · 0 | 24 · 8 | same |
| Olive `drive-olive.sh pages` | 0 | **22 / 22** | 22 |
| shell `node --test` | 0 | 91 / 91 | 91 |

**Arms** (each rule mutated, the row red, restored by copy): the used-up-rock skip dropped from `nearestOf` → the IW-003
[S] rows path-stones and sami-bench red (2) and the engine arm row picks the empty rock; the full-target skip dropped →
`go to nearest site` stops at the square that is path; the bench reading as path → its tile is `P`; the bench not
blocking → a robot walks onto it; 2D Sami never drawn → the kit row red; 3D first leg missing → the kit row red.

**Screenshots looked at** (`iw003-stones-scratch/pages/iw003s-2d`, `iw003s-3d`, `kit2d/shots`, `kit3d/shots`):
`iw3s-ps-1368-en-03-mid` — Cobble with a stone on his back beside the first square turned gravel, the other three dirt
0/4, the rocks' chips 4/8 and 8/8; beside the mockup's `09-path-running` the program is the mockup's block for block and
the squares, chips and hod read the same; `iw3s-ps-3d-1368-en-03-mid` — the same in the round (dirt and cobbles patches,
chips over the squares and rocks), the mockup's 3D look; `iw3s-ps-*-03-home` — four sand path squares 4/4 green, "Home!
All done.", Cobble on his start tile; `iw3s-sb-1024-en-03-mid` — two legs of the bench (4/8) in the watch ring;
`iw3s-sb-*-03-home` — the bench built, Sami on it, 8/8 green, Cobble home; the win card "New: Bench sticker · Cobble
learned: repeat until"; the program reads "until [🪑 bench] is built { until [✋ what Cobble holds] is full { go to the
nearest 🪨 rock, pick up }, go to [🪑 bench], until [✋ what Cobble holds] is empty { put down } }"; `iw003s-2d-bench-0…8`
and `iw003s-3d-bench-0…8` — pegs and a dashed plan on dirt, a leg, two legs, the seat, the built bench on gravel with Sami
sitting (the first 2D look had his head under the chip and the 3D back on the path side hiding him — both fixed and
re-looked at); `ig004-ac6-three-robots` — Cobble at work on the stones' plot with its chips, the bench's plot at (46, 8)
with 0/8 and its rocks; `iw3s-rf-*-03-home` — both flowers 1/1, Echo home.

**Against §5:** AC1 ✅ for S's three (job, targets + home, `job_done`, no `carrying`/`thing_at`). AC2 ✅ (three seeds × EN/FR
× bands; path-stones and sami-bench seeded, NAIVE_S loses on ≥1 seed and wins on ≥1; rock-flower teaches `if`, not
seeded). AC3 ✅ in words (FR below for Richard's read). AC4 🟡 — the island draws my plots with their meters and Cobble at
work (island drive 65/65, screenshot), and the engine spec proves the stones' plot trace; the drive clauses "finishing,
walking home, going back after wear" on a plot are lane M's (brief §4.3) — not driven on my plots. AC5 ✅ for S (page
drive, my drive 2D + 3D, both languages, 1024/1368/390, looked at beside IW-000). Owned: `go_nearest rock` skips a used-up
rock ✅ (spec row + arm); the bench in the engine ✅ and drawn by stage in both kits ✅ (specs + kit drives + screenshots).

**Deviations, with the reason:**

1. **path-stones is seeded** (`place`, the rocks' tiles), though §4.2's table says "—": the gate's row 3 demands a seeded
   layout and a losing NAIVE for any mission whose reference walks with `go_nearest`, and the graded mockup's program
   walks with it. Measured: seeds 1–3 lay three layouts; the taught walk of seed 1 loses on 2 and 3.
2. **`go to nearest` also skips a full target** (a site or a tulip at its need), not only a used-up rock — the mockup's
   rule, and what `go to nearest site` needs (without it the second trip walks back to the first square, the arm row).
   Lane M: a full tulip is passed over too.
3. **The bench blocks at every stage** (asked: "decide whether a finished bench blocks") — a building is walked round,
   never over, while it rises and after; `JOB_VOCABULARY`'s `site` row keeps `blocks: false` (a path square); the
   engine's `buildSite` is the one rule.
4. **sami-bench's goal is `job_done` alone** (no `uses until`): the gate's row 3 needs the fixed-count program to WIN on a
   seed, which a `uses until` goal forbids; the seeded rocks carry the lesson (the naive run bumps a used-up rock).
5. **rock-flower's can is Echo's own** (`robotStart can 0`), not a can thing to pick up: the lesson is Olive's vote, the
   brief says "as today, with the can", and a pick would have added two blocks to a 10-block program.
6. **Blocks words for a thing named by its id** — three hunks in `blocks.js` (lane B's file) and `iw3s…` words: the bench's
   until read "until [🟫 square] is path" (measured on the page) — a 7-year-old's misreading. B may prefer to fold this
   into its own words; the key shapes are `iw3sK_<id>`, `iw3sS_<state>_<id>`.
7. **WEAR unchanged**: path-stones' longest run is 110 ticks (band 10–12, seed 3) < `site` 120; sami-bench 78; rock-flower 47
   < `tulip` 60.
8. **Spec clauses the rewrite broke, changed** (each a small hunk): `cg002Engine` — AC1 row count (from the list, not 34),
   the known goal names (+ `job_done`), IG-002 AC3's stones consequence, the fill-palette row (+ `go_nearest`,
   `ROCKS_ON_PURPOSE` + sami-bench), the fold-nudge bodies (+ each repeat body as recorded), IG-005 AC1's two stones
   palettes, IW-002's wear-vs-run rule (per target kind), IW-002 AC4's "no job, no seed" (the requests with neither;
   known-firing on the job ones), IW-005's "only the sixteen" (every block the engine's or Olive's); `cg006Requests` —
   the rest list, the tick bound (a job's by its targets' wear), 2b's wrong program and its row; `cg003Template` — Start
   world / Record step / Draw world on the stones (seed 1), Island rows (+ sami-bench), the 13-unchanged half (requests
   with no job); `cg005Olive` — its world laid as Start world lays it; `ig004Island` — the solo trace's seed and window,
   AC4's laid plot; `cg001GardenKit` / `ig007Garden3d` — the 13-unchanged clauses (no job, no seed); `iw004Blocks` — the
   "as stored" arm only where Block List could hold the program (no object slot).
9. **Drive clauses changed**: `drive-cg003-pages.js` — IG-002 stones (AC4 rocks + load, AC4 stages, AC3 Perfect: built
   from the drawer and Played), IG-001 D9/D5/D3 stones (built from the drawer), IG-006 AC3 (right, fill, left first), the
   AC9 words filter (a meter's "n/m"); `drive-ig005-robots.js` — `winRequest` builds a go-to-nearest reference from the
   drawer (no pad key walks to a thing), IG-005 AC1's palette list (+ the walks); `drive-cg005-olive.js` — P-IG6-AC3
   (right, fill, left first). New clauses at the END of `drive-cg001-kit.js` / `drive-ig007-3d.js` (the bench).

**FR lines for Richard's read:**

- rqStonesTitle — « Construis le chemin jusqu'à la boîte aux lettres »
- rqStonesLine — « Quatre cases sont encore de la terre. Quatre pierres font d'une case un chemin, et la hotte de {b} en
  porte quatre. Les rochers ne sont pas toujours au même endroit ! »
- subPathStones — « Au rocher, quatre pierres dans la hotte, à une case, quatre pierres posées. Quatre cases, le même
  trajet : range-le dans un « répéter ». »
- rqFlowerLine — « Des fleurs et des rochers, côte à côte. Remplis l'arrosoir à la mare, puis demande à Olive si chacun est
  une fleur avant que {b} l'arrose : les rochers ne boivent pas. Si elle se trompe, demande trois fois. »
- subRockFlower — « Remplis d'abord l'arrosoir à la mare. Olive a raison presque tout le temps, pas à chaque fois.
  Demande trois fois, et le compte décide. »
- iw3sBenchTitle — « Construis un banc pour Sami » · iw3sBenchBlurb — « Répéter jusqu'à »
- iw3sBenchLine — « J'aimerais tant un banc pour m'asseoir. Il faut huit pierres : deux hottes pleines. Les rochers ont
  plus de pierres certains jours, moins d'autres jours : remplis la hotte jusqu'à ce qu'elle soit pleine, et continue
  jusqu'à ce que mon banc soit construit ! »
- iw3sSubBench — « Personne ne sait combien de pierres a un rocher aujourd'hui. {b} peut remplir la hotte jusqu'à ce
  qu'elle soit pleine, et continuer jusqu'à ce que le banc soit construit. »
- iw3sStickerBench — « Autocollant banc » · iw3sGiftBench — « Un autocollant banc, offert par Sami »
- iw3sK_bench — « 🪑 banc » · iw3sS_done_bench — « est construit » · iw3sS_dirt_bench — « n'est pas encore construit »

**Not done, and why:** the island clauses for my plots (finishing, walking home, going back after wear) — lane M owns the
island drive's job clauses this session; the mockup's job card (source · carrier · target · finish line · wear) and its
"1/4 squares are path" summary are not on the Workshop — no lane owns them this session.

**Could not verify / seen, not mine:** the tablet (touch; Sami's size on a small tile); a real GPU (3D under swiftshader
fell back to 2D once mid-run — the known flake); at 1024 × 768 the bench's program runs past the workspace's right
edge, so the drive brings a slot in with ⤢, a drag of the background and − (8 zooms, 4 drags in the 2D run) — lane B's
look fix; the drawer's `go to nearest` always starts on "egg", so on Cobble's missions a child must change it (lane B's
drawer); Cobble's name pill sits over the chip of the square below him (2D); on the island the flowers' and rocks'
compact chips on rock-flower's plot touch (lane B's compact chips); a built bench shows Sami sitting while his islander
pin may also stand on the island (two Samis), not driven.
