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

### Session 3 (2026-09-30, lane P `iw003-post`) — the post: path-postbox, letter-say, sami-thanks, and the envelopes

**Built.** Every name is brief s3 §4's; nothing renamed.

- **The four missions on the job model** (`cg002Content.ts`). Each: source = a `postbox` thing with its letter(s) on its
  tile; carrier = the robot's hands (Pip) / satchel (Pocket); target = a `door` thing (`owner`, `count 0`, `capacity 1`,
  item `letter`) under its owner's house; finish line = every door full, then the walk home; wear = `WEAR.door` (90).
  Home = the start tile and pose.
  - `path-postbox` (Pip, band 1, trick 1): post box (2,2), Sami's door (7,3) at the path's end under his house (7,2).
    Reference: `fwd fwd left pick right fwd fwd fwd fwd put` — still a sequence, 10 blocks. Palette `fwd left right pick put`.
  - `letter-say` (Pocket, band 2, trick 1): post box (1,4), Sami's door (7,3). Reference `fwd right pick left repeat 5
    {fwd} put say(thanksSami)`; goal `job_done` + `said`.
  - `sami-thanks` (Pocket, band 2, predict): the note stays; post box (2,4), Mamie Rose's door (5,2) under her house.
    Reference `repeat 2 {fwd} right pick left repeat 3 {fwd} left put olive:say-thanks(Mamie Rose, carried her letter)`.
  - **`envelopes` (NEW; Pocket, band 2, islander `mamie`, plot (46,1), the LAST entry of `IG006_REQUESTS()`; tricks [2]):**
    a street of three houses and doors (Mamie Rose (1,1), Sami (4,1), Biscuit (7,1)), the post box (2,2) with letters
    `e1 e2 e3` whose `to` is `shuffle`d per seed over the three names; Pocket starts (3,3) facing the houses. Reference
    `repeat 3 { go_to [post box], pick, olive:read, go_to {ref:'read'}, put }` (6 blocks). Palette `fwd left right pick
    put go_to repeat`, rung `read`; goal `job_done`. Reward: sticker `envelope` (💌).
- **The door in the engine** (`ENGINE`, new functions after `varStep`, lane-P comment): `mailPick` (a letter picked keeps
  its `to` on the delta; a letter taken back out of a door wears its owner's name), `mailPut` (a door ahead: only its item,
  one at a time, to capacity — `full` + `sayFull` past it; a letter with a name only into the door whose `owner` equals
  it, else delta `wrongDoor: { id, x, y, to, owner }`, sayKey `iw3pWrongDoor`, `run.wrongDoors`, the letter stays in
  hand; a letter with no name goes into any door; a posted letter is delta `post: { id, x, y, into, owner, to }` + `meter`,
  sayKey `iw3pPosted`), `mailWear` (from `wearOf`: every `WEAR.door` ticks one full door — the seed picks — takes its
  letter in, and the letter the post box gets that tick is addressed to that owner, else to a door still waiting),
  `mailApply` (from `apply`), `mailEnvelopeTo` / `mailRead` / `mailFallback` (Olive), `mailRan` (the hint).
  **The carry design:** `carry` stays a list of plain strings. An addressed letter's name rides in `carryTo`, a list
  BESIDE it (`carryTo[i]` is the name on `carry[i]`, `''` for none), kept in step by `mailApply` (both lists only ever
  pop and push at their ends) and deleted when no carried thing has a name — so a robot that never touches an addressed
  letter has exactly the JSON it had (spec rows). A letter put on the ground keeps its `to` there.
  Call-site hunks: `exec` pick (two `mailPick` calls), `exec` put (one `mailPut` line), `wearOf` (one `mailWear` line),
  `apply` (one `mailApply` line before `return w`), `CHOOSE_HINT_SCRIPT` (one `iw3pRead` line before `oliveRung`).
- **Olive's read of an envelope** (IW-005 dev. 6, closed): `OLIVE_ENGINE.oliveRequestOf` → `mailRead`: when the robot
  holds an addressed letter (else the letter a pick would take from the tile ahead), the read's `note` is the envelope —
  `notes_read` "For Sami." / "Pour Sami." — and her `options` are the doors' owners on the plot, in world order;
  `oliveAnswered` → `mailFallback`: an envelope read that comes back with NO word (the island's tick and `runToEnd` take
  the fallback with none) reads the name, exactly the shell's written answer. `go_to {ref:'read'}` then walks to the door
  by `owner` (IW-005's REF read, unchanged). The shell's table: `notes_read` + 3 envelopes (EN/FR index-aligned),
  `plot_objects` + `Mamie Rose`, `Sami`, `Biscuit` (the same in both languages), `written.read` + the 3 → the name.
  `cg005Olive.ts` exports `ENVELOPE_NAMES` / `ENVELOPE_NOTES` (built from the shell's table; it throws if the table
  lacks one). Pocket's palette gains `olive:read` (ROBOTS row — the envelopes need it; the drawer shows it only where a
  request's rungs offer read).
- **The hint** (§6 trap 2): after a run whose Olive read an envelope, `oliveRung2` ("use if Olive read… to send {b} to
  the right row") would send a child to the if block — `iw3pRead` "Olive read the name on the envelope. “Go to” what
  Olive read takes {b} to that door." takes its place (only when the run read an envelope; Mamie's note keeps oliveRung2).
- **Drawn in both kits:** 2D sprites `door` / `doorMail` (the letter's corner in the slot once one is through), a name
  plate (`.gd-plate`, `data-owner`) under the door, hidden on a wide world (the island); 3D `THING_BUILDERS.door`
  (step, frame, panel, letterbox, knob; + the letter at count > 0), its chip over the lintel (`METER_LIFT.door` 0.98), the
  plate a `gd3-plate` pill in the overlay seated on the door's step. `Draw world` passes `door` and `owner`
  (`JOB_THINGS.door`, `JOB_FIELDS.push('owner')`); a letter's `to` is NOT passed (Olive reads it; the child does not).
- **The drawer** (`blocks.js` `toolboxOf`, lane B's file, one hunk): the envelopes' palette has go to and Olive's read but
  no until/if, and the value blocks came only with until/if — so "what Olive read" could not be put into go to. A band
  10–12 drawer with `go_to` + `olive:read` and no until/if now offers that one chip (nothing else).
- **Words** (EN + FR): `WORDS` lane-P block `iw3pEnvTitle iw3pEnvBlurb iw3pEnvLine iw3pStickerEnvelope iw3pGiftEnvelope
  iw3pPosted iw3pWrongDoor`; `HINTS` `iw3pRead`; `PAGE_WORDS` (REQUEST_SUBS) `iw3pSubEnvelopes`; edited in place:
  `rqPathTitle rqPathLine rqLetterLine thanksSami` (WORDS), `rqThanksTitle rqThanksLine` (IG006_WORDS), `subPathPostbox
  subLetterSay` (REQUEST_SUBS).

**Readings** (worktree, final commit `94ffd2f3a`; spec files one at a time; the drives on ONE deploy from
`drive-pages.sh` at `4888ec79c` + the drive fix; previous = brief s3 §3):

| gate | exit | total | previous |
|---|---|---|---|
| `iw003Missions -t "\[P\]"` | 0 | **16 passed** (47 skipped) | 6 of 16 green at the base |
| `iw003Missions` whole | 1 (other lanes' rows, by design) | 38 passed, 25 failed, 63 | 28 / 35 |
| `cg002Engine` | 0 | **239** | 226 (+13: the lane-P describe's 7 rows + 4 arms, and the envelopes' 2 AC1 rows) |
| `cg003Template` | 0 | **143** | 141 (+2 lane P) |
| `cg005Olive` | 0 | 41 | 41 |
| `cg006Requests` | 0 | 83 | 83 |
| `ig004Island` | 0 | **24** | 23 (+1 lane P) |
| `cg001GardenKit` | 0 | **52** | 50 (+2 lane P) |
| `ig007Garden3d` | 0 | **45** | 43 (+2 lane P) |
| `iw004Blocks` | 0 | **57** | 54 (+1 drawer row, +2 envelopes round-trip rows) |
| `p108s2Join` | 0 | 4 | 4 |
| shell `node --test` | 0 | **92** | 91 (+1 envelope test) |
| `npm run template:garden` | 0 | drift committed with the source; re-run inside the last page drive: 0 drift | — |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **331/331** | 331/331 (the first run read 329/331: the AC9 island language pair — my doors' "0/1" chips; fixed below) |
| `drive-iw003-post.js` 2D (new) | 0 | **17/17** | — |
| `drive-iw003-post.js --mode 3d` (new) | 0 on run 3 | **10/10** (run 1: 9/10 — the FR doors' 3D chips read empty after the win while the engine read 1/1 ×3; run 2: crashed before the first clause at the new-player form, fixed by waiting for it; run 3: 10/10) | — |
| island drive 2D `--perf` | 0 | **65/65**; AC6 p95 16.8 ms at CPU ×4 (1196 frames, 23 moves) | 65/65, 16.7 ms |
| island drive 3D | 0 | **5/5** | 5/5 |
| `drive-iw001-workshop.js` | 0 | **38/38** (36/38 before the AC6 fix below) | 38/38 |
| `drive-iw004-blocks.js` | 0 | 19/19 | 19/19 |
| `drive-ig003-modes.js` | 0 | 90/90 | 90/90 |
| `drive-ig005-robots.js` | 0 | 60/60 | 60/60 |
| `drive-olive.sh pages` | 0 | 22/22 | 22/22 |
| kit drive 2D `drive-cg001-kit.js` | 0 | **40/40** (+2 lane P) | 38/38 |
| kit drive 3D `drive-ig007-3d.js` | 0 | **27/27** (+2 lane P) | 25/25 |

Not re-run: Workshop 3D / nogl (no
tulip-plot change of mine), robots 3D, IW-004 3D.

**Screenshots looked at** (`iw003-post-scratch/`): `pages/post-2d/iw003-p1-postbox-start-1024.png` — Sami's plot: the red
post box with the letter peeking at (2,2), Sami's house at the path's end with the door under it, its "Sami" plate and a
"0/1" letter chip; the band 7–9 drawer (go, left, right, take, drop); `…-p1-postbox-won-1024.png` — "Home! All done." over
Pip at the start, the win card "Thank you, Pip!", 10 blocks, New: Cap, Sami lends Cobble; `…-p3-envelopes-built-2d-en.png`
— the street: three houses, three doors with plates Mamie Rose / Sami / Biscuit and 0/1 chips, the post box ringed violet
(the go-to chip watched), the program `repeat 3 { go to [post box], pick up, read the note, go to [what Olive read],
put down }`, the pad with arrows, take, drop and Olive's read; `…-p3-envelopes-won-2d-fr.png` — « Merci, Poche ! », 6 blocs,
Nouveau : Autocollant enveloppe, Poche a appris : répéter; `…-p3-envelopes-no-put-en.png` — Pocket at Biscuit's door
carrying letters, three 0/1 chips, the owl: "Olive read the name on the envelope. “Go to” what Olive read takes Pocket to
that door."; `…-p4-sami-thanks-390.png` — the note, the post box with its letter, Pocket; Mamie Rose's plate shows and
her door sits UNDER the drive pad (see findings); `pages/post-3d/iw003-p3-envelopes-built-3d-fr.png` — Garden 3D: the
houses, the doors in the round with their plates on their steps, 0/1 chips, the post box ringed, the FR program
(aller à [boîte aux lettres] … aller à [ce qu’Olive a lu]); `kit2d/shots/iw003-2d-doors-after.png` — Sami's door with
the letter in its slot and a green 1/1, the others 0/1, Biscuit's letter still peeking from the post box;
`kit3d/shots/iw003-3d-doors-after.png` — the same in 3D, the plates on the steps, the post box visible (the first 3D
cut put the plate a tile forward, over the post box — seen, fixed in `cae8ea4cc`, re-driven);
`pages/island-2d/ig004-ac6-three-robots.png` — Pip home on Sami's path plot beside a green 1/1 door chip, the
envelopes' plot padlocked top right, no plates on the island.

**Acceptance, against §5 (my missions) and brief §4.3 row P:**

1. ✅ path-postbox, letter-say, sami-thanks and envelopes are jobs (`job` targets + home, `job_done`, no `carrying` /
   `thing_at`) — gate row 1 ×4.
2. ✅ each wins on seeds 1–3 × EN/FR × every band from its own (gate row 2 ×4; the longest run: the envelopes, 46 ticks <
   `WEAR.door` 90, and below `WEAR.tulip` 60, which the IW-002 row measures against every request); the envelopes teach
   `go_to`, are `seeded` (shuffle; seeds 1 / 2 / 3 deal Biscuit·Mamie·Sami / Sami·Mamie·Biscuit / the same as 2), and
   `NAIVE_P.envelopes` (the three doors in a row, no read: seed 1's order) wins on seed 1 and loses on 2 and 3 (row 3).
3. ✅ the copy says the reason in a 7-year-old's words, EN + FR (FR lines below, for Richard).
4. 🟡 the island: the spec (`ig004Island` lane P) plays the envelopes plot on the tick: Olive's read with no word, three
   letters to three doors, home, wait; at `WEAR.door` a neighbour takes a letter in, the post box gets one addressed to
   that door, Pocket goes back and delivers it there (never a wrong door). The island drive shows Pip home on Sami's
   path plot with its door green; no island DRIVE clause of mine (the island's job clauses are lane M's).
5. ✅ page drive, my drive 2D + 3D (both languages, 1024 / 1368 / 390), island 2D + 3D, screenshots looked at.

Owned items: ✅ the door in the engine (spec rows + arms: the owner check, the name kept on pick, the fallback read, the
wear's address); ✅ doors in both kits (specs + both fixture drives, screenshots); ✅ Olive's read of an envelope
(options, written answers, the shell's own slot check and grammar in a shell test; the real route through the stub in my
drive: the note sent was the envelope, the options the three names).

**Deviations and choices, with reasons:**

1. **The engine reads the name itself when Olive gives no word** (`mailFallback`): the island's tick and `runToEnd`
   answer every ask with a bare fallback, so without it a pinned envelopes program could never deliver on the island.
   The value it reads is exactly the shell's written answer for that envelope. Mamie's note is unchanged (no word → no read).
2. **A new delta `post`** (not `stow`): `stow` is the site/basket/store put, and a door also carries `owner` / `to`.
   New delta keys: `post`, `wrongDoor`; `pick.to`, `letter.to`; robot field `carryTo`; run counter `wrongDoors`.
3. **Pocket's palette + `olive:read`** (a `ROBOTS` row): the gate requires every block to be the robot's, and the
   envelopes are Pocket's. **A `blocks.js` hunk** (lane B's file): the read chip for go to (above).
4. **Home = start** for all four; for **sami-thanks' Predict** that means a program that finishes the job always ends at
   home — the challenge now asks "does the job get done?" more than "where". Kept (IW-002 dev. 7); flagged for Richard.
5. **envelopes: tricks [2]** (the loop over three letters; no trick number names "go to what Olive read"). Start (3,3)
   facing the houses and the post box at (2,2), so the run (46 ticks) stays under every wear period (first layout: 64).
6. **Shared spec / drive rows re-cut** because a mission on the job model changes them (each named): `cg002Engine` AC1
   rows count (derived from REQUESTS), goal names (+ `job_done`), Start world's no-job row (a job request starts with its
   job and a seed), the "sixteen old blocks" row (any engine block); `cg006Requests` `rest` (+ envelopes);
   `cg005Olive` IG-006 three (not the last three any more; worlds laid through `seedWorld`); `ig004Island` AC4 (a
   seeded field is the plot's seed's); `cg003Template` Island rows blocked (+ envelopes), Draw world's known-firing half
   (requests with no job); `cg001GardenKit` / `ig007Garden3d` the 13-requests rows (requests with no job);
   `iw004Blocks` the v4-stored half skipped for programs with a chip slot (Block List never stored one). Drives:
   `drive-cg003-pages.js` S4-PATH (the missed run on Sami's path says "0 of 1 done"), AC9 `words()` (a meter's "0/1" is
   language-free); `drive-iw001-workshop.js` AC6 pick/put (the letter is in the post box now).

**FR lines for Richard's read** (IW-003 AC3): rqPathTitle « Apporte ma lettre depuis la boîte aux lettres » ·
rqPathLine « Une lettre m’attend dans la boîte aux lettres. {b} peut aller la chercher et l’apporter à ma porte ? » ·
rqLetterLine « Il y a du courrier pour moi dans la boîte aux lettres ! Apporte-le à ma porte, et dis quelque chose de
gentil en arrivant. » · thanksSami « Du courrier pour toi, Sami ! Belle journée ! » · rqThanksTitle « Porte la lettre,
puis dis merci » · rqThanksLine « Il y a une lettre pour Mamie Rose dans la boîte aux lettres. Porte-la à sa porte, puis
laisse Olive trouver les mots pour la remercier. » · iw3pEnvTitle « Apporte chaque lettre à la bonne porte » ·
iw3pEnvBlurb « Aller à ce qu’Olive a lu » · iw3pEnvLine « Trois lettres sont arrivées pour mes voisins. Demande à Olive
de lire le nom sur chacune, puis {b} l’apporte à cette porte ! » · iw3pStickerEnvelope « Autocollant enveloppe » ·
iw3pGiftEnvelope « Un autocollant enveloppe, offert par Mamie Rose » · iw3pPosted « Livrée ! » · iw3pWrongDoor « Pas cette
porte ! Quel nom est écrit sur la lettre ? » · iw3pRead « Olive a lu le nom sur l’enveloppe. « Aller à » ce qu’Olive a lu
emmène {b} à cette porte. » · subPathPostbox « Conduis {b} jusqu’à la boîte aux lettres, prends la lettre, et porte-la à la
porte de Sami. Chaque pas devient un bloc. » · subLetterSay « Va chercher la lettre dans la boîte aux lettres, porte-la à
la porte de Sami, puis donne à {b} quelque chose de gentil à dire. » · iw3pSubEnvelopes « Un programme ne sait pas lire un
nom, Olive si. {b} prend une lettre, Olive la lit, puis « aller à » ce qu’elle a lu. » · the envelopes' notes « Pour Mamie
Rose. » « Pour Sami. » « Pour Biscuit. »

**Found, not mine to fix (for the orchestrator):** the read block's label is "read the note" / « lire le mot » (the
rung's word) on the envelopes too; on the phone (390) the drive pad sits over the world's right half on every mission
(sami-thanks' door and chip are under it); the 3D world's plate sits on the door step, but on the 14 px island all
plates are hidden (the doors show only their compact chips).

**Could not verify:** a REAL model reading an envelope (the stub and the written answer only; the exam has no envelope
probe); sami-thanks played to its win on a page (drawn at 390 only — its Olive block's slots need the picker); the
tablet; the island DRIVE seeing Pocket go back after a door wears (the tick spec does); the 3D drive's run-1 red
(FR chips read empty after the win, engine 1/1 ×3) did not come back on run 3.

**For the merge:** shared regions touched — `ENGINE` (lane-P functions after `varStep`; hunks in `exec` pick/put,
`wearOf`, `apply`, `CHOOSE_HINT_SCRIPT`), `OLIVE_ENGINE` (`oliveRequestOf`, `oliveAnswered`), `DRAW_WORLD_SCRIPT`
(`JOB_FIELDS.push('owner')`, `JOB_THINGS.door`), `LOOK_ROWS_SCRIPT` STICKER (+ `envelope`), `ROBOTS` (Pocket), `WORDS` /
`HINTS` end blocks, `REQUEST_SUBS` (end), `IG006_WORDS` (rqThanks*), the kits (Garden region sprite table end + one
cell branch; `THING_BUILDERS` end, `METER_LIFT.door`, the overlay's plate loop, the labels' position line), `blocks.js`
`toolboxOf`. Both kits' built `index.js` and `templates/bot-garden` must be rebuilt / regenerated after the merge.
