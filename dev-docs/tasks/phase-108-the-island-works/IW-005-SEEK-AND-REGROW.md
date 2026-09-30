# IW-005 — Seek and regrow

**Opened 2026-09-29** from README §0 ("seek out trees … if square contains rock, mine") and D5, D6. **Status: ✅ s3 — AC1–AC4 in the specs (s2), AC5 seen on the pages (s3, lane M: Pocket seeking the eggs on the island in 2D, and in the Workshop in 3D); `sayNone` worded per kind; `go to nearest` skips a used-up rock or a full target (lane S).**
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

### Session 2 (2026-09-30, lane J `iw005-seek`, base `a9d8850fd`) — the ENGINE, and the engine half of IW-004's conditions and values

**Built** (engine only, brief §4.3's names; nothing renamed). All in `ENGINE` (`packages/noodl-mcp/tests/cg002Scripts.ts`),
one block after `sense()`, plus small hunks in `flatten`, `step`, `apply` and the four list walkers:

- **`go_nearest` (`slots.kind`)** — step op `seek`. `pathsFrom` is one breadth-first search from the robot (up, right,
  down, left) over tiles that do not block; the world a step sees IS the robot's plot (the island steps each plot on its
  own map), so a search never leaves the plot. Each thing of that kind not reserved by ANOTHER robot is costed by its
  best facing tile (`standFor`: of its four neighbours, the one reached in fewest steps; up/right/down/left on a tie);
  the least cost wins. **Ties: the upper thing, then the left one, then the first in the world's list** — whatever order
  the world lists them in. A thing with no reachable neighbour (walled in) is skipped. One move or one quarter turn per
  tick; the block ends on the tick the robot stands on the tile facing it. Nothing reachable → delta
  `none: { id: <robot>, kind }`, `sayKey: 'sayNone'`, the block ends and the next runs.
- **The route is kept** on the step (`s.target`, `s.stand`, `s.route`) and searched again only when the target goes or
  moves, becomes another robot's, or the next tile of the route blocks (§4 trap). `s.searches` and `run.searches` count
  searches: the AROUND walk (4 moves + 1 turn) searches once; an egg taken mid-walk → 2 (it re-targets, releasing the
  old one); a wall dropped on the route → 2, walked round, 0 bumps.
- **Reservation** — `w.reserved[thingId] = robotId`, written by `apply` from delta `reserve: { thing, robot, kind, x, y }`;
  a thing with no id gets one minted there, `kind@x,y` (`#2`, `#3` if taken). Released by `apply` when the thing is picked
  (the pick branch that removes it), and by the new delta `release: { robot, thing? }` — on the tick a run ENDS (every
  reservation of that robot) and when a walk re-targets (the old one). `go_to` reserves nothing (the child chose that
  thing).
- **`go_to` (`slots.thing`, a REF)** — step op `goto`, the same walk to face the thing: a chip (by `id`, else the first
  thing of `kind` at `x,y`, else — kind `can` — the can in hand, which ends the block at once), or `{ ref: 'read' }`.
  Not found / unreachable → `none` (kind = the chip's kind, or `read`).
- **`{ ref: 'read' }`** — the first thing whose `id`, `name` or `owner` equals `run.lastAnswer.object` (trimmed, any case)
  **or whose read-object id is it** (`oliveObjectOf`: so `red_tulip` finds the tulip with `color: 'red'`); then, when her
  word is not one of Olive's object ids (`object` is `''`, e.g. a name), the first whose `id`, `name` or `owner` equals her
  WORD (`lastAnswer.value`/`text`). No new field: `name` and `owner` are read as the contract says.
- **`evalCond(w, run, cond)` / `evalVal(w, run, val)`** — every COND (`is`, `cmp`, `and`/`or`/`not`, `sensor`), VAL (`num`,
  `text`, `count`, `level`, `var`, `read`), REF (`ahead`, `here`, `held`, `robot`, `read`, a chip) and STATE of the tables.
  Never throws: a malformed expression, an unknown state, a thing not found → false / 0; an expression nested deeper
  than `EXPR_DEPTH` (32) or a cycle is malformed as a WHOLE (false / 0, not a flipped half).
- **`until` / `if`**: `slots.cond` present → `evalCond`, the `sensor`/`arg` ignored; absent → `sense()` exactly as before.
  `check` for a cond: `{ sensor: 'cond', on: true, cond: true, value }` (the legacy `{ sensor, on }` kept when no cond).
  `run.sensed.cond` counts a cond read, and each legacy sensor inside it counts as itself (the `senses` goal).
- **`if` + `else`**: the block's `else: [...]` runs when the check is false; an `if` with no `else` is today's.
  `collectTricks`, `collectHandlers`, `countUses`, `countBlocks` walk `else` too (a trick defined in an else is a trick;
  the block count — brain size — includes the else).
- **`set` / `change`** (`name`, `value` / `by`, default `{op:'num',n:1}`): `run.vars` (created on first write); delta
  `vars` = every var after the write.
- **Content**: `go_nearest go_to set change` at the END of `BLOCK_TYPES`; their `BLOCK_META` rows at the end
  (`motion`/`motion`/`control`/`control`; slots `kind` · `thing` · `name, value` · `name, by`); `sayNone` at the end of `WORDS`.
- **Island tick** (`ig004Island.ts`): `islView` hands the plot's `live.reserved` to the step; `islKeep` writes it back on
  the plot's live state (only on a plot that has ever reserved — a plot that never seeks keeps its shape). Nothing else
  changed there: the job tick, wear and regrowth are session 1's.
- **Regrow (AC4) re-measured, not rebuilt**: rock `left` regrows toward `max` every `WEAR.rock` island ticks, the hen lays on
  a free pen tile below `HEN_CAPACITY`, the post box gets a letter — all IW-002 s1, all in `wearOf`, called only by the
  island tick (IW-002 AC3's text gate). The gap filled: a row proving the Workshop (`step` + `apply`, 3 × the longest
  source period) regrows no rock, lays no egg, brings no letter, while `wearOf` on the same world does all three.

**Readings** (worktree, each spec file alone; previous = brief §3's merged reading at `a9d8850fd`):

| gate | exit | total | previous |
|---|---|---|---|
| `cg002Engine.test.ts` | 0 | **226 / 226** | 199 (+27: the IW-005 describe block, 4 arms) |
| the 27 new rows against the BASE engine (`a9d8850fd`'s `cg002Scripts.ts`/`cg002Content.ts`, restored after) | 1 | 26 failed, 1 passed | — (the one passing is the AC4 guard over IW-002's regrowth) |
| `ig004Island.test.ts` | 0 | **23 / 23** | 21 (+2; the seek row was red before the tick carried `reserved`) |
| `cg003Template` · `cg005Olive` · `cg006Requests` · `cg001GardenKit` · `ig007Garden3d` | 0 each | 134 · 41 · 83 · 35 · 38 | same |
| garden specs, all seven files | 0 | **580** | 551 |
| `npm run template:garden` | 0 | engine gate 226/226; drift committed with the source (19 files: the engine scripts, Palette's meta, Words, Translate words' `sayNone` port); re-run in the drive: 0 drift | 0 drift |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **331/331** | 331/331 |
| island drive 2D (`--perf`) | 0 | **65/65**; AC6 p95 16.7 ms at CPU ×4 (1200 frames, 23 moves) | 65/65 |
| island drive 3D | 0 | **5/5** | 5/5 |
| robots drive 2D | 0 | **60/60** | 60/60 |

The island spec's perf row: 300 ticks × (2 seek plots + 1 reset plot), p95 0.34 ms (gate < 5 ms), 164 walk moves for 37
searches that found something. Screenshots looked at: `iw005-seek-scratch/island-2d/ig004-1368-en-02-robot-at-work.png`
(Pip on the tulips' plot with his can's drops, the padlocked plots, three islanders' bubbles — as before),
`island-3d/ig004-3d-island-1368.png` (the whole island framed, three bubbles, Pip named) and
`pages/shots/ac3-1368-en-03-workshop.png` (the tulips' drawer: forward, turns, water, fill, repeat — no new block
offered, no raw id).

**Acceptance, against §3:**

- **AC1 ✅ (engine)**: path not straight line (egg a 2 tiles away behind a wall costs 11 steps; b costs 4 and is found;
  with no wall a is found — the known-firing twin); ties (upper, then left, whatever the world's order, the same deltas
  twice); `none` + `sayNone` (EN, FR) when nothing is reachable or nothing exists, the next block runs; a walled-in egg is
  skipped for a farther one; one move or quarter turn per tick, ends facing it, `pick` takes it. Arms: nearest by
  straight line → the row picks a; no route cache → 5 searches for the walk.
- **AC2 ✅ (engine)**: two robots, one pen of 3 eggs, both 3 steps from the middle egg: pip reserves it, pocket goes for
  the right one; three picks on three eggs, one `none`; after every step of either robot, each walker's target is
  reserved by THAT walker; nothing reserved at the end. A run that ends releases what it did not pick. Arm: nearest
  ignores reservations → the invariant breaks.
- **AC3 ✅ (engine, see deviation 6)**: `read` then `go_to {ref:'read'}` then `water`: the note says red, the real model's
  answer shape `{ ok: true, value: 'red tulip' | 'tulipe rouge' }` and the fallback (the shell's written answer, through
  `writtenAnswer`) both send Pip past the nearer yellow tulip to the red one, EN and FR; an answer naming the yellow one
  sends him there. Mamie's door: a `door` thing with `owner: 'Mamie'` is found by an answer whose word is `Mamie`
  (`object` is `''`); the fallback for "Take the letter to Mamie Rose." is `letter`, so it goes to the letter.
- **AC4 ✅**: built by IW-002 s1 (re-measured above); the Workshop-never-regrows row added.
- **AC5 ⬜**: the drives (a robot SEEN seeking a moved egg, a regrown rock SEEN, 2D and 3D) — no request offers
  `go_nearest` until IW-003, and the eggs/hen/rock meters are drawn by lane D this session. The engine half is in the
  island spec: a hen plot with no egg at the start — `none` + `sayNone` before the first lay, then the pinned robot walks
  to each egg where the hen laid it, picks each once, fills the basket, walks home and waits, never outside its plot, its
  target reserved in the plot's live state on every walking tick.

**The engine half of IW-004** (brief §4.3) is complete: `evalCond`/`evalVal` over every shape, `set`/`change`/`run.vars`,
`if` + `else`, the new delta keys. Graded in the same describe block (COND `is` × every state by kind, 45 rows; VAL and
`cmp`/`and`/`or`/`not`/`sensor`, 40 rows; the malformed list; `until (i = 3)`; `until [basket] is full` and
`until count of egg in [basket] = 4` both fill the basket by seeking, EN and FR, `senses cond` met). Arms: the cond
ignored → `until (i = 2)` walks to the wall; the else never runs → the if/else row stays put.

**Deviations and choices, with reasons:**

1. **No palette offers the new blocks** (brief: no palette changes, IW-003's): `BAND_PALETTE[2]` was `[...BLOCK_TYPES]` and
   `PALETTE_SCRIPT` read `BLOCK_TYPES` directly, so appending would have put four unlabelled blocks (`go_nearest`…) in
   free play's band 10–12 drawer. Two one-line hunks outside my region: `BAND_PALETTE[2] = BLOCK_TYPES.slice(0,
   indexOf('ask') + 1)` (`cg002Content.ts`) and `ALL_BLOCKS = JSON.stringify(BAND_PALETTE[2])` (`cg002Scripts.ts`). The
   palette output is byte-identical to before (spec row). IW-003 opens them (a request's `palette`, or the band list).
2. **`sayNone` has no `{what}`**: EN "There’s none left to find." FR "Il n’y en a plus à trouver." The Runner fills only
   `{b}` in a sayKey's line (`cg003Scripts.ts` Runner, the `split('{b}')` line), so "No more {what} here." would show the
   braces. The `none` delta carries `kind`, so IW-003 can word it per kind (the task's "No more eggs here — the hen is
   still laying") when the Runner learns a second placeholder.
3. **Contract superset** (nothing renamed): new delta key `release: { robot, thing? }`; `reserve` also carries
   `kind, x, y` (to find an id-less thing and write its minted id); `vars` carries every var after the write; `check` for
   a cond carries `sensor: 'cond'` beside `cond: true, value`; VAL `read` is `object`, else her word when `object` is `''`;
   VAL `level` of `held` with no can (and of `robot`) = how many it carries; VAL `count` of `egg` in a `hen` = eggs in her
   pen; `is ahead/here nothing` ignores a puddle; `front` works for any thing; `run.searches` / `s.searches` counters.
4. **`go_to`** reserves nothing; `go_to` the held can or `{ref:'ahead'}` ends at once (delta `nothing`); `here`, `robot`
   and a held carry list → `none`.
5. **`go_nearest rock` still finds a used-up rock** (`left: 0`, a rock with a `max` stays on the map): the contract seeks by
   kind. If IW-003's Cobble mission wants "the nearest rock with stones", a state filter on the seek is a small addition.
6. **"The named door" by Olive's REAL read is not possible yet**: `read` answers from the rung's `plot_objects` enum
   (tulips, rock, stone, letter, bowl, egg — `olive-templates.json`), and the shell checks her answer against the options
   the engine sends (`oliveObjectsOf`). So a place or a name ("Mamie") is proved on the engine with the real model's answer
   SHAPE only. The envelope mission (IW-003) must add destinations (doors by owner) to the read rung's options and its
   written answers (cg005 + the shell's table, not the engine); the engine side already resolves them by `owner`/`name`.
7. **Expression depth** 32: deeper (or cyclic) reads false / 0 as a whole.

**For lane B (the translator, the fold) — measured, not mine to change:** `FOLD_HELPERS` (`findBlock`, `parentListOf`,
`maxId`, `reId`, `shapeOf`, `sameBlock`) and `FOLD_SCRIPT`'s `countBlocksFold` do not walk `else`: folding inside an else
is never offered, and `maxId` ignores an else's ids (a fold could mint an id an else block already has). `SENSE_SCRIPT`
takes no `cond` (unchanged).

**Could not verify:** seek on a real page or the island drive (no request offers it until IW-003; B's blocks place it);
`aim`/`none`/`reserve` drawn (lane D); the tablet's tick time with seek plots (Mac: p95 0.34 ms in the spec); a real
model's answer naming a place (deviation 6).

**Seen on the shared box:** a headless Chrome from 2026-09-23 (pid 21691, PPID 1, `nodegx-deployed-i5OaGy`) — not this
lane's; left alone.

### Session 3 (lane M `iw003-mamie`, 2026-09-30) — AC5 on the pages, and deviation 2 closed

- **AC5 ✅ 2D (the island)**: eggs-count pinned to Pocket — his drawn tile SEEN walking into the hen's pen for the eggs where
  the hen laid them, the eggs drawn there going, the basket's number on the island rising 0/4 → 4/4, and after the wear
  (Mamie takes an egg) the hen has laid again and he walks to one of HER new eggs (island spec: every egg he picks on lap 1
  lay there before the tick). `drive-iw003-mamie.js --part island`.
- **AC5 ✅ 3D (the Workshop, swiftshader)**: in Garden 3D, taught with the pad's "go to the nearest 🥚" (one press walks the
  whole way), pick up, "go to the 🧺", put, and played: Pocket's name chip SEEN walking tile by tile to stand by an egg where
  the hen laid it. `--part look3d --mode 3d`. The whole island in 3D under software GL hands back to the flat island
  (IG-007's Too Slow) within a few ticks — recorded as a readout, not the gate (a real GPU: could not verify).
- **The regrown rock** of AC5 is lane S's (rocks are Cobble's).
- **Deviation 2 closed**: `sayNone` is worded by kind — the step says `sayNone:<kind>`, the page words it from `iw3mNone<Kind>`
  ("No more eggs here — the hen is still laying.") in Draw world and on the pad, else the plain `sayNone`.

Readings: see IW-003 §7 (lane M).
