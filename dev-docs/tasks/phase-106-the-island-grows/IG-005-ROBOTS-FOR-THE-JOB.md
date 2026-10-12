# IG-005 — The right robot for the job: a catalogue, unlocked by islanders, each with its own blocks

**Opened 2026-09-28**, from README §1 point 7 and ruling R8. **Status: 🟡 s4 built (lane B, 2026-09-29): AC1, AC2, AC4, AC5, AC6 driven; AC3 driven as six pours from one fill (no plot has six tulips and a pond — the engine gate waters six tulips); Richard reads the `ig5` FR lines and grades My robots against the mockup — §7.** Depends on IG-004
(robots live on plots). Lane B.

## 1. The person sentence

> **Pip waters. When Sami asks for a path, the child has no robot that carries stones, so Sami lends Cobble,
> who is orange, wears a hod, and knows `pick` and `put`. She names him, teaches him, leaves him laying the
> path, and goes back to Pip. Later Mamie gives Pip a bigger can.**

## 2. What it is

- **The catalogue** (`cg002Content.ts`, `ROBOTS`): four robots, each `{ id, defaultName: {en, fr}, colour,
  accessory, palette, canMax, basket, lentBy, unlockedBy }`:

  | id | default name | accessory | palette (beyond `fwd left right` and the controls of the band) | unlocked by |
  |---|---|---|---|---|
  | `pip` | Pip | the can | `water fill` | the start |
  | `cobble` | Cobble | a hod | `pick put` (stones) | Sami's first request |
  | `pocket` | Pocket | a satchel | `pick put` (letters, food), basket 6 | Biscuit's bowl |
  | `echo` | Echo | a bell | `say`, and the `ask Olive` blocks (band 10–12) | Mamie's note (IG-006) |

  Every robot can be renamed (≤ 16, the existing `ROBOT_NAME_MAX`) and wears any owned hat.
- **Upgrades** as rewards: `can+` (canMax 3 → 6, from Mamie), `basket+` (4 → 8, from Sami), `boots` (Step
  Ms × 0.7, from Biscuit). Rewards today (hats, stickers, items, seeds) stay; `item` gains the upgrade ids
  and `robot` is a new reward kind.
- **The palette becomes band × request × robot:** `PALETTE_SCRIPT` takes `robot.palette` as a third input; a
  request names the robot kind it needs (`needs: 'cobble'`) and the plot is padlocked until that robot is
  owned (IG-004 AC5's line).
- **My robot → My robots** (`cg003Components.ts`): a card per owned robot (name, colour from the catalogue,
  eyes, hat, its blocks as chips, its upgrade, "at work on … / at home"); the new-player form picks Pip's
  name only. Save v4 already carries `island.robots`.
- **Both renderers** draw the accessory (kit sprite + 3D primitive) and the robot's colour from the catalogue.

## 3. Acceptance criteria

1. Engine gate: the palette for band 7–9 × tulips × Pip is `fwd left right water fill`; × path-stones × Cobble
   is `fwd left right pick put`; × Cobble on tulips is refused (`needs`).
2. A `robot` reward adds the robot to `island.robots` with its default name in the profile's language; the
   page drive wins Sami's letter and finds Cobble on My robots, unnamed by the child, named "Cobble" / "Cobble".
3. `can+` on Pip makes `fill` give 6; the drive waters six tulips on one fill after the upgrade and three
   before.
4. Two robots on the island at once, each on its plot, each in its colour with its accessory; a screenshot
   looked at in both renderers.
5. The padlock line names the lender and the request; both languages.
6. Both languages, both sizes, 0 console errors; save code round-trip with three robots; template gates.

## 4. How to build it

The catalogue and the palette input first (engine gate); then the reward kinds and Complete request; then My
robots on the page; then the sprites and the 3D accessories; then the padlock text. The mockup's robot cards
(IG-000) are the look.

## 5. Gates

As IG-001 §5.

## 6. Traps

Echo carrying the Olive blocks is a palette choice, not an engine rule: the engine's ask blocks stay usable by
any robot in tests. A hat is per profile (owned) and per robot (worn): two fields. The kit's `HATS` list draws
only `cap sun crown`; a new hat owes both renderers.

## 7. Session 4 (2026-09-29, lane B, worktree `ig005-robots` cut from `7ed9f065e`)

### 7.1 The save model — v4 stays v4, the robot rows gain optional fields (written before the page was built)

```
profile.island.robots = [ { id: 'r1' },                                                    // Pip: his look stays profile.robot
                          { id, kind, name, color, eye, hat } … ]                          // a lent robot: its id IS its kind
code row[14] (robots)  = [ 'r1', [id, kind, name, color, eye, hat] … ]                     // a string = an id (session 3's shape)
upgrades               = item ids in profile.stickers: 'can+' | 'basket+' | 'boots'       // owned per profile, no new field
```

- **The version stays 4.** Every new field is optional: a row `{ id }` (session 3's) reads exactly as before, and a
  session-3 code (robots packed as ids) decodes to the same model and says not migrated (engine gate). No migration, so
  no on-load save is owed.
- **A lent robot's row** is written once by `Complete request` (`lendRobot`): `{ id: kind, kind, name: the catalogue's
  defaultName in the profile's language, color: the catalogue's colour, eye: 'round', hat: 'none' }`. `modelOf` keeps
  each field only when it is sound (kind in the catalogue, a name of 1–16 characters, `#RRGGBB`, a known eye, a hat
  string); a row missing its kind reads its kind from its id when that is a kind, else Pip.
- **r1 stays `{ id: 'r1' }`** and its look stays `profile.robot` (one source: renaming Pip on My robots, in the new-player
  form or in a v3 code is the same field). `robotsOf` still puts r1 first.
- **The save code** packs r1 (and any row with no kind) as its id, a lent robot as `[id, kind, name, color, eye, hat]`;
  decode reads either. The P105 shell's `copies.js` packs the same bytes (its test pins it).
- **Upgrades are items** (`Complete request` pushes the catalogue's upgrade for the request won into `stickers`, as every
  `item` reward is kept): owned per profile; each fits the robots its catalogue row names (`can+` → Pip and Echo, `basket+`
  → Cobble, `boots` → Pocket). A hat stays per profile (owned, `hats`) and per robot (worn, the row's `hat`).
- **What the pages read** is `robotRow(profile, row)` (Read family's `robots` output): `{ id, kind, name, color, eye, hat,
  accessory, palette, canMax, basket, stepFactor, upgrade, upgraded, lentBy, working }` — the look, what it can do, the
  upgrades applied, the plot it works. Nothing of that is stored.

### 7.2 What was built (branch `ig005-robots`: `4ac9339cd`, `5b5d34d3b`, `18cfdc498`, and this docs commit)

- **The catalogue** (`cg002Content.ts`, appended): `ROBOTS` (Pip, Cobble, Pocket, Echo — `{ id, defaultName, colour, accessory,
  palette, canMax, basket, upgrade, lentBy, unlockedBy }`), `UPGRADES` (`can+` 3 → 6 after `rows-trick`, Mamie; `basket+` 4 → 8
  after `path-stones`, Sami; `boots` Step Ms × 0.7 after `wall-until`, Biscuit), `ROBOT_MOVES`, `ROBOT_CONTROLS`, `needsOf`. Each
  request may name `needs` (one line after its `palette:`): the stones and Biscuit's bowl need **Cobble**; the letter, the eggs
  and Sami's thank-you need **Pocket**; the rock and the flowers need **Echo**; everything else is **Pip**'s. `reward.kind` gains
  `robot`. The chain, gated (no loop, both bands): Pip → the post-box walk lends Cobble → the bowl lends Pocket; Pip → Mamie's
  note lends Echo.
- **The engine** (`cg002Scripts.ts`): `Logic/Palette` takes `robot` (a row, or a kind) and `needs`: band × request × robot
  (moves and the band's controls always, then the robot's own blocks and Olive blocks); another robot than the one needed is
  **refused** (no palette, `refused` true); no robot (free play) filters nothing. `Complete request` gives the catalogue's gifts
  for the request won — the robot an islander lends (its row: the catalogue's name in HER language, colour, round eyes, no
  hat) and the upgrade (an item id in `stickers`) — beside the request's own reward, once; a `robot` reward lends too; outputs
  `lent`, `upgraded`. `SAVE_HELPERS`: `robotsOf` keeps a lent robot's own fields (§7.1), `robotRow` resolves a row for the pages
  (look, blocks, the upgrades applied, where it works), `jobRobotId`, `lendRobot`. Encode/Decode pack a lent robot as
  `[id, kind, name, color, eye, hat]`. New **`Logic/Update robot`** (name / color / eye / hat of one robot; r1's is the
  profile's own).
- **The glue** (`cg003Scripts.ts`): **`Logic/Job robot`** (the robot a request needs, hers of that kind — or the catalogue's,
  `owned` false —, its id, name, look, step time with boots, a `robotKey` text); **`Logic/Gift line`** (the win card's "Sami lends
  you Cobble! Cobble lays stones." / "Mamie Rose gives you Bigger can · 6 waters."); **`Logic/Robot cards`** (My robots, a card
  per robot of the catalogue). `Start world` puts the job robot's can (6 with `can+`), basket (never below the request's) and
  look on the world robot, and says `needs`; its `robot` input is **quiet** (does not re-run it), `robotKey` does — so a win that
  upgrades the robot never resets the world under the win card. `Draw world` draws each robot in its own look (name, colour,
  eyes, hat, accessory) when it carries one, else in the page's (Pip, with his can). `Read family` gives the resolved rows.
  `Island rows` blocks a request while she has no robot of its kind or while that robot works another plot, and says
  "{its name} works here".
- **The island** (`ig004Island.ts`): a plot is `locked` (`card.lock` = `band` | `robot`, `card.needs`) while she lacks its
  robot: fenced and padlocked; its card says, in one line, **"🔒 This job needs Cobble, who lays stones. Sami lends Cobble after
  “Walk the path to the post box”."** (FR « 🔒 Ce travail a besoin de Cobble, qui pose des pierres. Sami te prête Cobble après
  « Suis le chemin jusqu’à la boîte aux lettres ». »); the band lock keeps IG-004's line. The plot card's robot, its words'
  `{b}` and **Bring {b} home** are the job robot's (a new `robotId` output, wired to `Bring home`). Every robot on the island —
  at work or at home — carries its look. Found by the drives: the robots at home stand apart (`HOME_SPOTS`), and an islander
  stands below her plot's third tile so her bubble lies over her own open plot (deviation 8).
- **The pages** (`cg003Components.ts`): the Workshop's robot is the job's (`wsJob`: name in every line, look, palette robot,
  robot key, step time; `wsComplete.robotId`); the win card's gift line (`wnLent`, `.bg-win-lent`). **My robots**: the page head is
  "My robots — The right robot for the job"; Pip's big stage and options panel stay; below, **"Your robots"**, a
  `Robot/Card` per robot (new `Robot/Card`, `Robot/Ability`): its drawing with its accessory, its name (a box to change it, when
  it is hers), Yours / Lent by … / Locked, what it wears, its colours and hats (for hers), its blocks as chips in their block
  colours, its upgrade slot (owned, or "Empty slot · … · from …"), where it works — or who lends it and after what. Each
  change goes through `Update robot` (one per field). `Bring home` on the island takes the job robot. The CSS block is appended
  in `cg007Look.ts`.
- **Both kits:** `accessory` in both `parseRobots` (identical lines; missing = `can`, `''` or unknown = none); 2D draws it on
  the robot (`gd-acc gd-acc-<kind>`, `data-accessory` on `.gd-bot`): Pip's can, Cobble's hod (a trough on a pole, a stone in
  it), Pocket's satchel (strap and bag), Echo's bell; 3D: an `accessory` group of primitives (the hod, the satchel, the bell),
  and the can only on a robot that carries it or has a level. Both built files rebuilt (deterministic).
- **The P105 shell:** `copies.js` packs lent robots byte-identical to the page (its test: a family with Cobble and Pocket, a
  renamed and recoloured one, and hand-broken rows).
- **Words:** 28 `ig5…` keys (EN + FR) in a lane-B block at the end of `PAGE_WORDS`; `navRobot` is now "My robots" / « Mes robots ».

### 7.3 Readings (the worktree; exit code first; the drives on the deploy of `drive-pages.sh` run 4, source = `5b5d34d3b`)

- **Garden specs, one file each** (base `7ed9f065e` in brackets): cg002Engine exit 0 **166/166** (156) · cg003Template exit 0
  **121/121** (113) · cg001GardenKit exit 0 **34/34** (32) · ig007Garden3d exit 0 **35/35** (34) · ig004Island exit 0 **15/15**
  (12) · cg005Olive exit 0 41/41 · cg006Requests exit 0 83/83 — **495** (471). Red first: the IG-005 engine describe on the base
  scripts 8 failed / 10 (the two content rows are content-only); the kit clauses on the base built kits 2 failed; the shell's new
  assertions on the base `copies.js` 1 failed; three arms kill the palette, the decode and the upgrades.
- `npm run template:garden` exit 0, 108 components through one plan; a second run: **0 files of drift**.
- **Page drive** (`drive-pages.sh`; generate 0, assemble 0, deploy 0 — index.html fresh — drive): run 1 **320/327** (the seven reds
  below, §7.5 item 10), run 2 **327/327**, run 3 **324/327** (door moved: S3-LOOK 390 still — Sami's bubble × Cobble — and the AC6
  pair after a lost Teach press, §7.7), run 4 **327/327 exit 0**, 0 console / 0 network errors. `readings.lent` 1, `broughtHome` 1
  (6 in s3: Pip at work no longer blocks the stones). JSON `…/ig005-robots-scratch/pages/drive.json`.
- **`drive-ig005-robots.js`** (new) 2D: exit 0 **60/60** (twice: before and after the door fix), 0 console / 0 network errors;
  `--mode 3d` (swiftshader): exit 0 **4/4**. JSON `shots/ig005-s4/drive-ig005-2d.json`, `drive-ig005-3d.json`.
- `drive-ig004-island.js --perf`: exit 0 **65/65**, AC6 p95 **16.8 ms** (1198 frames, 23 moves, CPU ×4, 3 robots incl. Cobble);
  `--mode 3d` exit 0 **5/5**. `drive-ig003-modes.js`: run 1 exit 1 **89/90** (a lost Teach press, §7.7), run 2 exit 0 **90/90**.
  Olive page drive exit 0 **22/22**, 0 skip. `drive-ig007-workshop.js --mode 3d` exit 0 **24/24**, `--mode nogl` exit 0 **8/8**. 3D
  fixture drive (assemble 0, deploy 0, index fresh) exit 0 **18/18**. Shell `node --test` exit 0 **91/91**.

**Screenshots looked at** (`shots/ig005-s4/`): `01-locked` — the stones fenced, the violet card's one line naming Cobble, what he
does, Sami and the post-box walk, no Go and help; `02-lent` / `390-fr-02-lent` — the win card: the cap, then « Sami te prête Cobble !
Cobble pose des pierres. » on violet; `03-my-robots` — Pip's stage and panel, then four cards: Pip (Yours, the can), Cobble (Lent by
Sami, the hod, slate), Pocket and Echo locked on the paper with their satchel and bell; `04-workshop-lent` — "Lay four stones",
Cobble drawn with his hod and named, "Cobble's steps", palette forward · turn left · turn right · pick up · put down · repeat;
`05-two-robots` (1368 EN, 390 FR) — Pip (coral, the can) on the post-box plot and Cobble (slate, the hod) on the stones, the
bubbles over their own plots; `06-three-robots` — Rocky (Cobble renamed) at work, Pocket (the third, green, satchel) at home;
`07-bigger-can` — six drops beside Pip after one fill, all spent after six pours; `3d-island-two-robots` — Pip and Cobble named
on their plots in 3D; `3d-workshop-lent` — Cobble a slate box with the hod on his back; `look-island-390` — the bubbles readable
over their own plots, nothing covering them. What I saw that is not right: in 3D the robots are ~12 px at the island framing (the
names say who is where; IG-007's own note), and the hod reads as a brown block at that size.

### 7.4 Against the acceptance criteria

1. ✅ Engine gate: band 7–9 × tulips × Pip = `fwd left right water fill`; × path-stones × Cobble = `fwd left right pick put`;
   Cobble on the tulips refused (and every request's reference program is placeable by its robot at every band it allows).
   On the page: the stones' palette with Cobble is band × request × robot (drive).
2. ✅ A `robot` reward and the catalogue's lend add the robot with its default name in her language; the page drive wins Sami's
   **post-box walk** (deviation 1) and finds Cobble on My robots, unnamed by the child, "Cobble" / "Cobble", lent by Sami.
3. ✅ with a deviation (5): `can+` makes `fill` give 6 (engine: six tulips watered on one fill after, three before); on the page one
   fill gives 6 drops and six pours water (the seventh dry) after, 3 before — the tulips' plot has three tulips.
4. ✅ Two robots on the island at once, each on its plot, each in its colour with its accessory — asserted by element in 2D and
   looked at in 2D and 3D.
5. ✅ The padlock line names the robot, what it does, the lender and the request, EN and FR (engine and drive).
6. ✅ Both languages, both sizes, 0 console errors; the save code round-trips with three robots through the Grown-ups box (and
   in the engine gate); template gates green, 0 drift.

### 7.5 Deviations, with the reason

1. **Cobble is lent by Sami's first request, the post-box walk** (the table's "Sami's first request"), not by "Sami's letter"
   (AC2's words, and the padlock example "after the letter"): the letter (`letter-say`) is band 10–12 only and the stones are band
   7–9, so a 7–9 child could never lay the stones. The chain gate proves every needed robot reachable at each band.
2. **A lend and an upgrade come WITH the request's reward, not instead of it.** The catalogue's `unlockedBy` is the one source; every
   existing reward (hats, stickers, items, seeds — CG-006's table) stays. `robot` is a reward kind Complete request honours
   (engine-gated), but no request's `reward` is one. Upgrades are item ids kept in `stickers` ("`item` gains the upgrade ids"),
   shown on the sticker page as upgrades.
3. **Palettes beyond the table, so every request stays winnable by its robot:** Pip also has `olive:read` (Mamie's note is
   Pip's job: Echo is lent AFTER it); Pocket also has `say` and `olive:say-thanks` (the letter and Sami's thank-you carry a letter
   and speak); Echo also has `water` (the mockup's Echo card; the flowers need it). Biscuit's bowl needs **Cobble** (it lends Pocket,
   so it cannot need her). Echo is needed by the rock and the flowers only.
4. **Upgrades:** `can+` fits Pip and Echo (every robot that waters), `basket+` Cobble, `boots` Pocket; given after the rows (Mamie),
   the stones (Sami), the wall (Biscuit).
5. **AC3 on the page is six pours from one fill, not six tulips:** no request has six tulips and a pond (the rows have six and no
   can; the tulips have a pond and three). The engine gate waters six DIFFERENT tulips on a row with one fill. The drive writes
   `can+` into her stored stickers as its win writes it (winning the rows through the pad is not this AC's point).
6. **Free play has no robot filter** (Pip, with every block of the band, as before): the garden is where anything is tried.
7. **An upgrade reaches the Workshop the next time the request opens**, not mid-win (Start world's `robot` input is quiet).
8. **The island placement (IG-004's, lane E's) changed, found by the look drive at 390:** (a) the robots at home stood side by side
   one tile apart and at 16 px tiles (a robot is drawn 56 px at least) their names covered one another — they now stand 3–5 tiles
   apart on the home slot, Pip still on `ISLAND_HOME`; (b) an islander stood below her plot's right corner, so her bubble spread
   over the NEXT plot, under a robot at work there (Sami's under Cobble) — she stands below her plot's third tile, and the 2D bubble
   is at most seven tiles wide (`max-width: min(170px, 700%)` of her cell), so it lies over her own open plot, where nobody works.
   A first try (her plot's first tile) cut the bubbles at the island's left edge (seen in the screenshots, run 3), hence the third.
9. **My robots keeps Pip's big stage and options panel** (name, paint, eyes, hat, stickers) above the four cards (the mockup has
   only the cards): the page drive's rename, hat and contrast clauses read that panel. Pip's name, paint and hat can be changed in
   either place (the same fields). Eyes are on Pip's panel only.
10. **Drive clauses changed where my change broke them (every one named):** `drive-cg003-pages.js` — `openQuest` lends a padlocked
    plot's robots (the request data's `needs`) into her stored island and taps again (counted in `readings.lent`); **S3-RENAME**
    and **S4-PASTE** read her robots' names as a list (Pip among them); **AC9 `langClause`** treats a robot's catalogue name as a name
    (like Pip's). `drive-cg005-olive.js` — `openRequest` lends the same way. `drive-ig004-island.js` — the AC3 "at work" pair and "Go
    and help opens …" use **another of Pip's jobs** (read from the request data: the tulip by the door) instead of the stones (they
    need Cobble now); AC5's fence count includes the robot locks and its reason is read on a band-locked plot; the `--perf` family
    gives the stones their robot. Spec expectations changed: cg003Template's warning list (+`Robot/Card`, same D50 reason as
    `Robot/Options`) and Draw world's robot (+`accessory: 'can'`); cg001's s2 pinned `carry` line (a trailing comma); ig004Island's
    synthetic island (r2 is a Cobble), its AC3 (the tulip by the door), AC5 and Draw-world counts; cg006's sticker page (+ the
    upgrades); ig007's pinned-copy robot inputs (+ accessories).

### 7.6 Not done, and why

- **Pocket and Echo lent through the UI in a drive:** the bowl (an `if`) and Mamie's note (an Olive read) are engine-gated as the
  lending requests; the drives write the lent rows into the store where a clause only needs the robot. Cobble is lent through the UI.
- **Boots and the bigger basket on the page:** glue-gated (`Job robot` step time × 0.7; `Start world` basket 8), not driven.
- **R10 and R11** are Richard's; not touched.

### 7.7 Could not verify

- The tablet (3D frame time with more robots at work); a real GPU (every 3D reading is swiftshader).
- **A lost Teach pad press, twice in eight drive runs** (page drive run 3: AC6's program ended one tile off — one `left` missing —
  and its right tap then played nothing new; modes run 1: 2 blocks for 3 presses at band 7–9). Both drives were green on the next
  run with no change between. Not seen in session 3's readings; its cause (a press read before the last one's world was written?)
  is not measured. For the orchestrator's merged gate: a lone red of this shape is this, run it once more.
- The FR words (`ig5…`, and « Poche », « Écho ») are Richard's to read; the look of My robots against `09-robots.png` is his grade
  (the cards are narrower than the mockup's, and Pip's big panel stays above them).
- The kids.

### 7.8 Merge notes (shared files, lane B's hunks)

- `cg002Content.ts`: the `needs?` member and one `reward.kind` word in `GardenRequest`; a `needs:` line after `palette:` in six
  requests; `navRobot`'s value; the IG-005 block at the END (after IG-004's).
- `cg002Scripts.ts`: one import; `SAVE_HELPERS` (`ROBOTS`/`UPGRADES` vars, `robotsOf` + new helpers after it); `PALETTE_SCRIPT` (the
  robot block, two `continue` lines, `refused`); `COMPLETE_REQUEST_SCRIPT` (gifts, two outputs); `UPDATE_ROBOT_SCRIPT` (new, before
  ENCODE); ENCODE/DECODE robot rows; one row appended to `FUNCTION_SCRIPTS`.
- `cg003Scripts.ts`: imports; `ISLANDER_WORDS`/`ROBOT_WORDS` above `ALL_WORD_KEYS`; `START_WORLD_SCRIPT`; `DRAW_WORLD_SCRIPT`'s robot
  loop; `FAMILY_SCRIPT`'s `robots`; `ISLAND_ROWS_SCRIPT`; `LOOK_ROWS_SCRIPT`'s sticker map; the `ISLAND_CHOOSE_SCRIPT` call; three
  scripts before `GLUE_SCRIPTS`, three rows at its end. Lane G's mode-say script (≈963) is untouched.
- `cg003Components.ts`: `C` (+2), `DRIVE` (+1), `QUIET` (new) and one line of `logicComponent`, `TYPE` (appended), the Win card
  (+`wnLent`), `Workshop/Play` (`plIn` +5 ports, 7 wires), **`Pages/Workshop` (the four `wsFam → wsPlay` wires for botName, color, eye,
  hat now come from `wsJob`)**, `Island/World` (+1 wire), `Robot/Ability` and `Robot/Card` (new), `Pages/My robot`,
  `CG003_COMPONENTS` (+2). Nothing of `pdBox`/the pad, the `rn*` Runner nodes or the 3D camera.
- `cg003Content.ts`: the `ig5` block at the end of `PAGE_WORDS` (after `ig4…`, before the `REQUEST_SUBS` spread).
- `cg007Look.ts`: the IG-005 block after the workshop marks, before `${spriteRules}`.
- `ig004Island.ts`: `islStart` (+`bot`), `islLook`; the world script's `mine` helpers, the plot status (`lock`, `needs` on the card),
  the islander's door, `HOME_SPOTS`; the choose script's options (`robots`, `robotWords`), the job robot, the robot-lock line,
  `robotId`/`needs` outputs.
- Both kits: the `accessory` line in `parseRobots` (identical); 2D `accessorySvg`, `data-accessory`, the `.gd-isl-say` max-width;
  3D `buildCan`, `accessoryGroup`, six `PALETTE` entries. Both built files rebuilt.
- Drives: see §7.5 item 10; `drive-ig005-robots.js` is new.
- No `dist/` was written; nothing in a linked build output changed.
