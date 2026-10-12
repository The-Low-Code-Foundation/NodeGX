# IG-002 — Resources: water is fetched, stones are mined, the load is drawn

**Opened 2026-09-28**, from README §1 point 1 and ruling R3. **Status: ✅ built and driven in session 2 (2026-09-29), branch `ig002-resources` — §7. The 3D gate reads 19/20 on this
branch alone until lane D's copy of the three `parseRobots` lines lands (the pinned-copy clause, by design).** Depends on IG-001
(D9 sprites, D10 pad). Lane A.

## 1. The person sentence

> **The robot's can holds three waters; at the pond it fills; each tulip drinks one; with an empty can the
> tulip stays dry and that is the error. Stones come out of the rock one `pick` at a time, and the rock gets
> smaller. The loop a child discovers is fetch, go, use, come back.**

## 2. What it is

- **Engine (`cg002Scripts.ts`).** New primitive `fill`: with a water tile ahead, `can = canMax` (default 3,
  a robot field, IG-005 upgrades it); `water` spends one; `water` with `can = 0` does nothing but raise a
  `dry` event (no puddle). New sensor `can empty`. `pick` with a rock ahead: the rock thing's `left`
  decrements, a `stone` enters `carry`; at `left = 0` the rock tile becomes grass. `basket` (already 4)
  bounds stones as it bounds letters. The world's `robots[]` gains `can` and `canMax`.
- **Things (`cg002Content.ts`).** `rock` becomes a thing `{kind:'rock', x, y, left}` on a grass tile (the
  tile kind `R` stays for decorative rocks that yield nothing); `stone`, `postbox`, `sign` and `note` are
  things (IG-006 reads `note`/`sign`).
- **Requests (`cg002Content.ts`, `cg006`).** *Tulips* becomes "three tulips, the pond two tiles behind you,
  a can of three": the reference program is `repeat 3 { fill, fwd, fwd, water, back, back }` or the child's
  own with turns; the fold finds the six-block dance. *Path-stones* starts with an **empty** basket and a
  rock of four beside the start. The two requests' hint keys and FR/EN copy are rewritten; every other
  request keeps its map with `R` tiles as decoration.
- **Kit (`kit.js`).** Sprites: the rock at three sizes by `left`, the stone, the post box (D9), the sign, the
  note, and on the robot: the can's level (0–3 drops on the can) and the load (a stone or letter on the
  back). The 3D node (IG-007) draws the same vocabulary; this task writes the vocabulary once in
  `cg002Content.ts` and both renderers read it.
- **Pad (from D10).** `fill` and `pick` keys appear where allowed.

## 3. Acceptance criteria

1. Engine gate: `fill` at a pond fills to `canMax`; `water` ×3 then a fourth on a tulip leaves it dry and
   raises `dry`; `fill` with no water ahead is a no-op with a `bump`-free event; `pick` on a rock of 4 ×4
   fills the basket and the rock is gone on the fifth `pick` (a bump, nothing carried); FR and EN lines for
   `hintDry` ("The can is empty. Where is the pond?") and `hintRockGone`.
2. The fold on the recorded tulips dance (`fill fwd fwd water left left fwd fwd right right` ×3) offers
   `repeat 3` with the nine-block body; the engine gate asserts it in both bands.
3. Tulips and path-stones each win with their reference program and say `hintPerfect` (IG-001 D3); each is
   driven by hand in the page drive, EN and FR, both sizes.
4. Every new thing renders as inline SVG with a kit class; the can shows 3/2/1/0 drops as the drive waters;
   the stone on the back appears after `pick` and vanishes after `put`. Screenshots looked at.
5. The Skills page's trick 1 card says "forward, turn, fill, water, pick, put" in both languages.
6. Garden specs, kit gate, page drive, template byte-identical, 0 console errors.

## 4. How to build it

Engine first with the gate (`cg002` spec: primitives, sensors, goals, the fold); then the vocabulary table
and the two requests; then the kit sprites; then the pad and the drive. `canMax` and `basket` are robot
fields from day one so IG-005's upgrades are a number, not a branch.

## 5. Gates

As IG-001 §5, plus the P105 engine gate's rule: every request generated in both languages and both bands
with its reference program winning.

## 6. Traps

`water` on a non-tulip tile still makes a puddle when the can is not empty: the puddle is the error message
the spec keeps. A thing on a tile blocks a move (tulips and bowls do); the rock must block too, or the robot
walks into it. The `.gd-label` shortcut is gone after D9: any new thing without a sprite draws NOTHING, and
the drive must assert the element, not the absence of an error (`verify-the-consequence-not-just-the-mechanism`).

## 7. Session 2 (2026-09-29, lane A, worktree `ig002-resources` cut from `f784833b8`)

**Built, in two commits on `ig002-resources`:** `c630ce224` (the engine, the vocabulary, the two requests, the kit, the page
glue, the gates, the template regenerated) and `7d880a7aa` (the page drive, the load moved upright beside the robot after
the screenshots, the islander lines shortened, the template regenerated). Every gate assertion was red first: the new
engine gate against HEAD's engine read 15 failed / 131; the new kit clauses against HEAD's built kit 5 failed / 27.

- **Engine** (`cg002Scripts.ts`): `fill` at a `W` tile ahead sets `can = canMax` (robot field, default `CAN_MAX` 3) and
  says `sayFill`; with no water ahead it is `nothing` (no bump). `water` with a numeric can spends one (on a tulip, and on
  grass where it still makes the puddle); with `can 0` it raises `delta.dry` (`run.dries`, `sayDry`) and pours nothing. A
  robot with `can: null` waters for free, as before. Sensor `can_empty` (false for a robot with no can). `pick` at a `rock`
  thing ahead (with room in the basket) takes a `stone`; `apply` decrements `left` and at 0 removes the rock and records
  the tile in the world's new optional `spent` list; a `pick` there is a bump with nothing carried (`run.rockGone`,
  `hintRockGone`). `rock` and `sign` block a move; `note` does not. The fold looks for bodies up to `FOLD_MAX_LEN` (12; the
  mockup's 6). Choose hint: `hintPerfect` (≤ the reference's blocks) now outranks `hintDoneMany`; `hintRockGone` and
  `hintDry` sit above `hintBump`.
- **Vocabulary and requests** (`cg002Content.ts`): `fill` is a block (band 7–9's palette is seven); things `rock{left}`,
  `sign{text}`, `note{text}`; `robotStart.can/canMax`. **Tulips**: the pond is the left edge (x 0, rows 1–4), the bed x 3
  rows 1–3, the robot at (1,1) facing the pond with an empty can of three; reference `repeat 3 { fill, left, left, fwd,
  water, right, fwd, right, fwd }` (ten blocks). **Path-stones**: an empty basket, a rock of four at (2,2) beside the start;
  reference `left, repeat 4 { pick }, right, repeat 4 { put, fwd }` (seven). New lines `hintDry` ("The can is empty. Where
  is the pond?" / « L’arrosoir est vide. Où est la mare ? »), `hintRockGone`, `bFill`/`cFill`, `sCanEmpty`, `sayFill`,
  `sayDry`; both islander lines rewritten; trick 1's card (`n1p`) ends "forward, turn, fill, water, pick, put" /
  « avancer, tourner, remplir, arroser, ramasser, poser ».
- **Kit** (`kit.js`): `parseRobots` gains exactly the s2 brief §4 lines (`can`, `canMax`, `carry`); sprites `rockBig`,
  `rockMid`, `rockSmall` (class `gd-thing gd-boulder gd-boulder-big|mid|small`, `data-left`; `left` ≥ 3 big, 2 medium, 1
  small, 0 nothing, unset = whole), `sign`, `note` (text never drawn), `parcel`; the can's level as a column of `canMax`
  drops (`gd-can`, `data-can`, `gd-drop-full|empty`) upright at the robot's left, none when `can` is null; the load
  (`gd-load gd-load-<kind>`, the LAST of `carry`: stone, letter, egg, food as themselves, anything else the parcel) in a
  white chip upright at the robot's right; a `fill` icon.
- **Glue** (`cg003Scripts.ts`): Start world puts `can` (null or a number) and `canMax` on the robot; Draw world passes
  rock/sign/note and `can`/`canMax`/`carry`; Record step, the kit palette's icon, the tidy line know `fill`; the picker
  offers "the can is empty"; the win card says `winFew` at the reference's own length (counted from the request it already
  receives — no graph change). **The pad** needed no change: `Logic/Pad keys` already filters the IG-001 table by the
  request's blocks, so `fill` and `pick` appear where allowed (tulips `fwd left water right fill`, stones
  `fwd left right pick put`, free play all seven).

**Readings (final tree, exit code first):**
- `cg001GardenKit` exit 0 — 27 / 27 (22 before) · `cg002Engine` exit 0 — 131 / 131 (122) · `cg003Template` exit 0 — 93 / 93
  (92) · `cg005Olive` exit 0 — 34 / 34 · `cg006Requests` exit 0 — 83 / 83 · `ig007Garden3d` **exit 1 — 19 / 20** (20): the
  one red is the pinned-copy clause (garden-kit's `parseRobots` now returns `can/canMax/carry`; `kit3d.js` differs from it by
  exactly the brief's three lines — diffed). Garden specs 388 (373).
- `npm run template:garden` exit 0; run again on the committed tree: **0 files of drift**.
- Page drive (the P105 wrapper repointed to this worktree; regenerate, assemble, deploy — index.html fresh — drive):
  exit 0, **219 / 219 clauses** (179 before), 0 console errors, 0 network errors. JSON/log:
  `ig002-resources-scratch/pages/drive.json`, `drive.log`; shots `pages/shots/ig002-*.png`.
- Olive page drive (`drive-olive.sh pages` on that deploy): exit 0, **22 / 22**, 0 skip. Shell `node --test`: exit 0, **90 / 90**.
- Screenshots looked at: `ig002-1368-en-can-3` (three blue drops beside the robot at the pond, the pad showing the fill key),
  `ig002-1368-en-dry` ("Empty…" over the robot, three outlined drops, the first tulip pink), `ig002-1368-en-rock-mid` (the
  rock at (2,2) medium, a stone in the chip at the robot's right), `ig002-1368-en-laid` (four stones on the path),
  `ig002-390-fr-mined` (the rock gone, the chip visible), `ig002-390-fr-stones-perfect` (« 7 blocs. Bien joué ! »).

**Acceptance criteria:** 1 ✅ (engine gate, the IG-002 describe). 2 ✅ (the fold finds `i 0, len 9, count 3, cover 27` in
both bands; offered at 10–12 only, as every fold). 3 ✅ at band 10–12 (both requests, EN and FR, both sizes, driven by hand
and "Perfect!"); at band 7–9 both win (engine gate) but the line is the fold nudge — deviation 6. 4 ✅ (every new thing an
inline SVG with a kit class, asserted by element; 0/3 then 3/2/1/0; the stone carried 1–4, then 3/2/1/none). 5 ✅ (the
template gate reads the n1 card in EN and FR). 6 ✅ with the one expected 3D-copy red named above.

**Deviations, with the measurement:**
1. The task's recorded dance (`fill fwd fwd water left left fwd fwd right right`) cannot run: after `fill` the pond is
   ahead, so the first `fwd` bumps (the engine gate asserts the bump at (0,1)); and it is ten blocks, not nine. The built
   dance is fetch, turn round, walk, water, step down, walk back: nine blocks, ten with the repeat — over `MANY_BLOCKS` (8),
   so `hintPerfect` now outranks `hintDoneMany` when the program is no longer than the reference, and the win card says Neat
   there (`MANY_BLOCKS` untouched).
2. "`can` starts at 0 on a request that has a pond": read as "a request that declares `robotStart.can`". The tulip by the
   door has decorative `W` tiles; the literal rule would have made its reference dry. Every other request keeps `can: null`.
3. "The rock is gone on the fifth pick (a bump, nothing carried)": the rock is removed on the pick that takes `left` to 0
   (the fourth); the fifth is the bump. Counted in `run.bumps` (the robot shakes) and `run.rockGone` (the hint names why).
4. The load is not on the literal back: drawn there (inside `.gd-turn`) it sat under the name tag whenever the robot faced
   up (first run's `ig002-1368-en-rock-mid`, `ig002-390-fr-mined`). It is an upright chip at the robot's right, the gauge at
   its left.
5. Teach presses speak nothing (Record step's `sayKey` has no wire to Draw world, in `cg003Components.ts`, not this lane's):
   "Full!" / "Empty…" are read through Play. Pre-existing.
6. Band 7–9 cannot say `hintPerfect` on either request: its palette has no repeat, so its program is the unrolled one
   (27 / 14 blocks) and Choose hint (which knows no band) gives the fold nudge. Pre-existing ladder; not changed.
7. The first islander lines pushed the owl off the 390 screen (owl top 875 > 844, EN); shortened to fit (EN 64 chars, FR 68).
8. `hintDry` and `hintRockGone` are not voiced (as `hintPerfect`/`hintFree`, IG-001 deviation 2).
9. Garden's `Things`/`Robots` port descriptions are unchanged: the 3D gate pins Garden 3D's descriptions to them, and lane D
   cannot copy text it has not seen. The node's `docs` line names the new things.
10. `subPathStones` (the append-only word table in `cg003Content.ts`) still reads "Put a stone down, step, and again…" —
    true of the second half; not rewritten.

**Could not verify:** the tablet; the real model (stub only); Garden 3D drawing this vocabulary (lane D's); the merged 3D
gate; band 7–9 driven through the pad with `fill` (the drives are band 10–12); the drops' and chip's contrast measured live
(#2B7FC0 and #8E8B9A on white, by token only); Windows.

**Files another lane may touch:** `cg002Scripts.ts` (ENGINE: `BLOCKING_THINGS`, `canOf`/`canMaxOf`/`spentAt`, `sense`
`can_empty`, `newRun` counters, `exec` water/fill/pick, `apply` pick/can; `FOLD_HELPERS` length; `CHOOSE_HINT_SCRIPT`
ladder; `PALETTE_SCRIPT` LABEL; `BLOCK_META` fill); `cg002Content.ts` (`BLOCK_TYPES`, `SENSORS`, `BAND_PALETTE[1]`,
`Thing`, `robotStart`, the two requests, `HINTS` after `hintFree`, `WORDS`: bFill, cFill, sCanEmpty, sayFill, sayDry, the two
lines, n1p — the END of `REQUESTS` untouched); `cg003Scripts.ts` (Start world, Draw world, Record step `OPS`, Kit palette
`ICON` and the `SENSORS` line — lane C's `olive_read` may land on the same line, Tidy line `LABEL`, Win summary);
`scripts/devtools/drive-cg003-pages.js`; `cg005Olive.test.ts`, `cg006Requests.test.ts` (small hunks for the two requests).


## 7. Session 3 (2026-09-29, lane F, worktree `p106-s3-leftovers` cut from `f182a2d9e`) — items (a) and (b)

### (a) The fold nudge offered `turn right, forward` ×2 inside the tulips dance — FIXED (`2fc7cd535`)

- **Measured first** (a scratch script over the engine's own `FIND_REPEAT_SCRIPT` and `CHOOSE_HINT_SCRIPT`): every
  request whose palette has `repeat`, its reference program laid out and recorded ONE PRESS AT A TIME, the finder asked
  after each press. 65 presses got a fold offer or the "do this n times" hint; **9 were a run the reference does not
  hold, all on the tulips, presses 9–17**: `i 5, len 2, count 2` (right, forward ×2 — the end of the first dance), both
  the tidy offer and `hintPattern`. From press 18 the nine-block body ×2 wins on coverage, at 27 ×3. Every other
  request's offers were one of its own repeats (path-stones' picks and `put, fwd`; the letter's forwards; the rows
  trick's body). The three requests whose repeat body holds an `if` or an Olive block (`bowl-if`, `mamie-note`,
  `rock-flower`) are never offered a fold (`sameBlock` refuses a block with a body) — pre-existing, not changed.
- **The rule chosen, from that measurement:** "prefer the fold that covers the most" already held (press 18 on), so the
  defect was only the window before the long body repeats. **A run seen only twice that does not start the list is held
  back** (`findRepeatIn`, `FOLD_HELPERS`, one line): it may be the tail of a longer body still being recorded; seen a
  third time, or from the list's start, it is offered. It sits in the helper both the tidy offer and Choose hint read,
  so the two never disagree. All 30 AC3 fixtures are unchanged (none expects a count-2 run away from the start).
- **Gate (red first):** `cg002Engine` "P106 s3 lane F (a)" — (1) every request with a repeat, press by press: every
  offer and every `hintPattern` is one of the reference's own repeat bodies, beside a known-firing count (> 40 offers);
  (2) the tulips: no offer and no `hintPattern` at presses 9–17, the nine-block body ×2 at 18 and ×3 at 27; `K L R F R F`
  held, `K L R F R F R F` offered ×3, `R F R F K L` offered. Red on the base at press 9 (both clauses), green after.
- **On the page** (a scratch drive, `p106-s3-leftovers-scratch/look/fold-press9.js`, the tulips taught through the pad
  at 1368×912 on the 2D node, `.bg-tidy` read after each press): no fold offered at presses 1–17; "I spotted the same 9
  steps, 2 times in a row. Fold it / Not now" from 18; "… 3 times …" at 27. Shot `look/after/fold-press9.png` LOOKED at:
  nine blocks in the steps, no tidy bar.

### (b) Dry red and dry yellow tulips read mauve and tan — FIXED in both kits (`3adc7db5c`)

- **Measured before** (the same deploy twice, only the two kit files swapped for `f182a2d9e`'s; Mamie's note opened
  with every row dry; `p106-s3-leftovers-scratch/look/mamie-look.js`):
  - 2D (computed style + a screenshot pixel at the petal): `.gd-tulip.gd-dry` = `opacity .55`, `filter: saturate(0.3)`,
    `rotate(18deg)`. Dry red **#ba8d7d** (hue 16°, a brown), dry yellow **#d4b88e** (hue 36°, tan). CIE76 ΔE between
    them **20.0**; the dry red is ΔE 20.5 from the bed itself.
  - 3D (the petal's material colour, read off the running scene): dry red **#e6b7c6** (pale mauve), dry yellow
    **#ebd9a9** (cream), ΔE 34.8, both tilted 0.31 rad.
- **Changed:** 2D — the `saturate(.3)` filter is dropped from `.gd-tulip.gd-dry`; the droop (`rotate(18deg)
  translateY(6%)`) and the fade (`opacity .55`) stay, so the reduced-motion page clause still reads dry apart from wet
  by opacity. 3D — `PALETTE.tulipDry` / `yellowDry` are now exactly the 2D composite (the petal at .55 over the bed
  `#C79A63`), so the two renderers show the same dry colour; the tilt stays. Nothing else of the look was touched; every
  class name and data attribute is the same (`gd-tulip gd-dry [gd-yellow]`, `data-sprite="tulip|tulipYellow"`).
- **Measured after:** 2D dry red **#e67f81** (hue 359°), dry yellow **#e5b864** (hue 39°) on screen — the model in the
  gate predicts #e68081 / #e6b865 (within 1 unit per channel); ΔE **46.7** (was 20.0); dry vs wet still ΔE 25 (red) and
  13 (yellow) plus the droop. 3D materials **#e68081 / #e6b865**, tilt 0.31, wet ones upright.
- **Gates (red first):** `cg001GardenKit` "P106 s3 lane F (b)" reads the BUILT kit's CSS and sprite table: droop and
  fade present, no `saturate|grayscale|sepia|hue-rotate`, each dry petal within 30° of its wet hue, dry red vs dry yellow
  ΔE ≥ 40, dry vs wet ΔE ≥ 10, and the class names/attributes on a render (red: the filter was there). `ig007Garden3d`
  "P106 s3 lane F (b)" builds a scene with red/yellow × dry/wet tulips and reads each petal's material colour: equal to
  the 2D kit's dry composite and wet fill, the same hue/ΔE bars, dry tilted and wet upright (red: #e6b7c6 ≠ #ba8e7d).
  The colour maths is one helper, `packages/noodl-mcp/tests/dryTulipLook.ts`.
- **Screenshots LOOKED at** (`p106-s3-leftovers-scratch/look/{before,after}/mamie-note-dry-{2d,3d}.png`, 1368×912):
  before, 2D — the top row a dusty brown-mauve, the bottom a pale tan, the rows read as two shades of one dead colour;
  after, 2D — the top row pink-red, the bottom amber-yellow, both drooping and faded, told apart at a glance. 3D before —
  small pale lilac heads vs cream; after — coral-red vs amber (the heads are small at the Workshop framing: the colour
  helps, the size is the look Richard grades). The page drive's own `pages/shots/ig006-ac2-note-1368-en.png` after the
  run: the watered red upright and bright, the two dry reds drooping pink, the three dry yellows drooping amber.

### Readings (this lane's final tree; exit code first)

- Garden specs, one file each: `cg001GardenKit` exit 0 **28/28** (27) · `cg002Engine` exit 0 **139/139** (137) ·
  `cg003Template` exit 0 **103/103** (103) · `cg005Olive` exit 0 **41/41** · `cg006Requests` exit 0 **83/83** ·
  `ig007Garden3d` exit 0 **31/31** (30) — **425** (421 on the merged tree).
- Both kits rebuilt twice: the same sha256 (`19cb70c3…` 2D, `f0e796b9…` 3D). `template:garden` exit 0; a second run
  exit 0 with 0 further drift, after each item.
- Page drive (`drive-pages.sh` repointed to this worktree): generate 0 · assemble 0 · deploy 0 · drive 0,
  **323/323**, 0 console errors, 0 network errors — against the merged reading 327: the four missing are the
  orchestrator's "`<tag>` merge: the red row draws red and the yellow row yellow…" clauses, which are an **uncommitted
  edit in the primary checkout's `scripts/devtools/drive-cg003-pages.js`** (+3 lines, not in `f182a2d9e`); every other
  clause name matches. Log/JSON `p106-s3-leftovers-scratch/pages/drive.{log,json}`, shots `pages/shots/`.

**Could not verify:** the tablet; the 3D node at 390×844 and in FR for the dry look (the scratch drive is 1368×912 EN);
the dry colours under the win card's blur; a child telling the rows apart (IG-008).
