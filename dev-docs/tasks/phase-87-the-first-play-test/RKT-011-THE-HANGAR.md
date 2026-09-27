# RKT-011 — The hangar

Added at Richard's request on 2026-09-13, beside [RKT-010](RKT-010-STARS-THAT-ADD-UP.md). He asked for stars
*"that can be used for something fun (maybe avatar stuff??)"*.

🔴 **The one reward the research credits most is how the player looks, and today a child's face is fixed at
creation by a seed.** The same name always gives the same face, and nothing about the rocket is theirs.

**Read first:** [the rewards briefing](rkt-010-rewards-research.md), §1.5, §4 and the Don'ts.

## 1. The person sentence

**A child who has saved up opens the hangar, picks a crown for their face and paints their rocket green, and
sees both in the very next race.**

## 2. What is there (2026-09-13)

| reading | where |
|---|---|
| a face is DiceBear, `look` (one of five styles) + `seed`; the profile stores two strings | kit `Avatar`, `kit.js:333-426`; `AVATAR_STYLES`, `kit.js:54` |
| **the kit passes only `size` to DiceBear**: no option reaches it | `avatarDataUri`, `kit.js:61-64` |
| the Race Track draws each rocket's face from `styleA/seedA`, `styleB/seedB`, and paints it `colorA` / `colorB` | `kit.js:882-887` |
| DiceBear 9.4.2, installed and bundled, already has wearable parts: | `node_modules/@dicebear/*/lib/schema.js`, read 2026-09-13 |
| · pixel-art: `hat` 10, `glasses` 14, `accessories` 4, `clothing` 23, plus a `*Probability` per optional part | |
| · big-smile: `accessories` 8 (`catEars`, `sailormoonCrown`, `sunglasses`, `clownNose`, `sleepMask`, `faceMask`, `glasses`, `mustache`) | |
| · adventurer: `glasses` 5, `earrings` 6, `features` 4 (`blush`, `freckles`, …) | |
| · **fun-emoji and thumbs: nothing to wear** (only eyes, mouth, colours) | |
| no hangar page; `Pages/` is Home, Profiles, Race | `templates/rocket-school/components/Pages` |

So **no new art is needed for the face**, only the plumbing. Rocket paint is a colour already wired. Anything
beyond paint (a flame colour, a trail, a hull sticker) is a new kit port, and belongs in §3.3's second list, not
the first build.

## 3. Design

### 3.1 ✅ Ruled 2026-09-13: A, pick at a milestone

> "A is good" — Richard, 2026-09-13

He was shown A, B and C as below. **He delegated the numbers:** *"Just pick what numbers make sense to test it and
I'll give feedback later."* The curve below is therefore a play-test value, not a ruling, and AC10 is where his
feedback lands.

| option | how it works | for | against |
|---|---|---|---|
| **A. Pick at a milestone** (recommended) | The star total never goes down. Each milestone crossed gives one 🎁 **pick**, and the child chooses any item on the shelf with it. | Nothing is ever taken away (§4.2), and the child still chooses (autonomy, SDT). Home's bar always reads "next 🎁 at 150 ⭐". | "Saving up for the expensive thing" does not exist. |
| B. Shop | Items have prices, and buying spends stars. | Saving up; what TTRS, Sumdog and Mathletics do. | The total visibly drops. A child who spends is "poorer" than a sibling who doesn't. |
| C. Milestone unlocks a fixed item | 50 ⭐ unlocks the crown, 100 ⭐ unlocks green paint. | Simplest to build. | No choice; every child ends up wearing the same thing at the same point. |

**The milestone curve, chosen for the play test (2026-09-13).** It is sized against RKT-010's rule. A short race
(≈10 right + 5 for landing) earns about 15 ⭐, and a typical one about 20.

| 🎁 | at ⭐ | reached after about |
|---|---|---|
| 1 | **15** | the first race, even a short one: the tester sees the whole loop in one sitting |
| 2 | **40** | race 2 |
| 3 | **75** | race 4 |
| 4 | **120** | race 6 |
| 5 | **175** | race 9 |
| 6+ | **every 60 after 175** | every third race |

This is about one pick a day at three races a day, once the early ramp is over. The first three picks come fast on
purpose, because the free starters plus three picks let a child make the face and the rocket clearly theirs.

**The curve lives in one exported constant** (`HANGAR_MILESTONES = [15, 40, 75, 120, 175]`, `HANGAR_EVERY = 60`)
and the gates read it, not literals. Feedback is then a one-line change, with every gate following it.

### 3.2 The shelf

- `Data/Hangar` is a Static Data array of `{ id, kind, looks, part, value, en, fr }`:
  - `kind` is `face` or `rocket`
  - `looks` is the DiceBear styles the item fits (empty for rocket items)
  - `part` + `value` is the DiceBear option, for example `hat` + `variant03`
- **Three items are free from the start**, so no child owns nothing: two rocket paints and one face item per style
  that has parts.
- **A first shelf of about 18:**
  - 6 rocket paints
  - 12 face items across pixel-art, big-smile and adventurer
- The shelf shows everything: owned, wearable, and still to pick.
  - A face item that does not fit the child's current look is shown, greyed, with "fits the Pixel and Smile faces".
    It is never hidden, so the shelf does not shrink under a child who changed their face.
- **Nothing is random, time-limited or paid.** The shelf is the same every day.

### 3.3 The plumbing

**Kit, in the first build:**
- `Avatar` gains an `Options` port (JSON object), passed to `createAvatar`.
- The Race Track gains `Avatar Options A` / `B`.
- 🔴 **Wearing a part must set that part's `*Probability` to 100.** Otherwise the seed decides whether the hat is
  drawn at all. The gate checks the SVG, not the options object.
- Rebuild the kit (`node library/modules/game-kit/build.mjs`) **before** the generator.

**Kit, later (not the first build):** flame colour, trail, hull sticker.

**Profile and scripts:**
- The profile gains `owned: [id]` and `wear: { face: {part: value}, paint: id }`.
  - `wear.face` is keyed by look, so switching from pixel-art to big-smile and back keeps the pixel-art hat.
- Changes go through a `Logic/Equip` script and a `Logic/Pick item` script, which spends one 🎁.
- Save code v2 (RKT-010) packs `owned` and `wear`.
- **Paints are theme tokens** (`--rocket-paint-*`), each ≥ 3:1 against the track ground in both looks (the
  README §5 token rule, and RKT-002's contrast gates).

**Where the wearing shows:**
- the header face
- Home
- the Race Track (rocket A's face and paint)
- `Game/Profile card`: wearing the crown there is fine; it is the stars count that must never appear there

### 3.4 The moment

- **When a race crosses a milestone,** the result screen gets a **"🎁 Tu as gagné un choix ! / You earned a pick!"**
  line with a button to the hangar, beside Play again.
  - Play again stays focused, so Enter still plays on (RKT-003).
- In the hangar, picking an item puts it straight on the face or rocket preview at the top, with a short pop. The
  reduced-motion arm shows it with no animation.
- **Home** shows the bar to the next 🎁 under the Stars stat (RKT-010).

### 3.5 Pages

- `Pages/Hangar`, reached from Home (a card beside the games) and, once [RKT-008](RKT-008-THE-PLAYER-MENU.md) lands,
  from the player menu.
- One screen at every viewport in README §5:
  - the preview (face + rocket) on top
  - tabs "Visage / Fusée" (Face / Rocket)
  - a grid of item tiles, each ≥ 44px by touch

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ Richard's ruling on §3.1: **A**, recorded 2026-09-13. He delegated the numbers; the play-test curve is in §3.1, and his feedback lands at AC10. |
| AC2 | ✅ (s10) **RED on today's build:** the kit Avatar given `{ hat: ['variant03'], hatProbability: 100 }` draws the same SVG as without it. Reproduced on the RKT-010 build 1 kit before any change (§5). |
| AC3 | ✅ (s10) Kit gate: for every face item on the shelf, the SVG with the option differs from the SVG without it. The same seed, with the part removed, gives the original face back. Sabotage: drop the `*Probability`, and at least one item goes RED. *As built: a seed whose own face already draws that exact part is a counted coincidence, told apart from a miss by the picture with the part forced off (§5).* |
| AC4 | ✅ (s10) Template gate: every shelf row's `part` + `value` exists in the installed DiceBear schema for each look it lists (read from `node_modules/@dicebear/<look>/lib/schema.js`, not a copied list). Every paint is a token that passes contrast. Sabotage arm. *As built: ≥ 3:1 on four grounds; plus D64, no `Data/*` row field is a name the runtime Model answers for itself.* |
| AC5 | ✅ (s10) Engine gate: picks follow the ruled curve. Over a seeded 60-race simulation at ≈20 ⭐ a race, the count of 🎁 matches the curve, and **nothing the child owns is ever removed**: owned only grows, the star total never drops, and a pick is spent exactly once. Sabotage arm: let a pick be spent twice. *As built: also on a real runtime Collection of the shelf (D64).* |
| AC6 | ✅ (s10) Engine gate: change `look` to one the worn item does not fit → nothing crashes, the item stays owned, the face draws without it, and switching back draws it again. |
| AC7 | ✅ (s10, builds 3 and 5) Drive, FR 390×844 and 1024×768 touch and EN 1366×768: finish races until a milestone → the result screen offers the pick → hangar → pick a face item and a paint → the next race's rocket shows both (**read on the rendered track and in a screenshot**) → both still there after a reload. |
| AC8 | ✅ (s10, builds 4 and 5) Drive: the hangar is one screen with no sideways scroll at all five viewports. Every tile is ≥ 44×44 px by touch. A greyed item says which faces it fits. |
| AC9 | ✅ (s10, builds 3 and 5) Reduced-motion arm: picking an item animates nothing. |
| AC10 | Richard (or a child) earns and picks something, and says in their own words whether it was worth playing for, and whether picks came too fast or too slow. Recorded here, and any change goes into the §3.1 constant. |

## 5. Record

### Session 10 (2026-09-13)

- **AC2 reproduced RED ✅ on the RKT-010 build 1 kit, before any change.**
  - Rendered on the server, the kit Avatar given `{ hat: ['variant03'], hatProbability: 100 }` drew the same markup as without it.
  - Its ports were `look, seed, size, background, ringColor, ringWidth`.
  - Known-firing: the bundle's own `avatarSvg` did change with that option.
  - Without `hatProbability`, it did not change for seed "Léa". §3.3's 🔴 is real.
- **Build 1, as designed, with where it differs from §3:**
  - **Kit:** Avatar `Options` (an object, or its JSON; junk draws the plain face). Race Track `Avatar Options A` / `B`.
  - **One curve:** `HANGAR_MILESTONES = [15, 40, 75, 120, 175]` and `HANGAR_EVERY = 60` in `tpl007Scripts.ts`. The scripts read them through
    `HANGAR_HELPERS`, and the engine gate works the curve out from §3.1's words instead.
  - **Picks are counted, never stored.** Earned is worked out from the star total, and spent is the number of items owned. A free item is
    never owned, so it spends nothing. Nothing in any script removes an item.
  - **The shelf is `Data/Hangar`, built from `HANGAR_SHELF` in `tpl007Curriculum.ts`.**
    - ≠ §3.2: a face row is `faces: { look: { part, value } }` instead of `looks` plus a single `part`/`value`. That way "Glasses" fits
      the Pixel, Smile and Adventurer faces, each with that face's own glasses. (Build 1 called the field `on`; see the build 1 drive below
      and D64.)
    - 12 face items and 6 paints. The values were chosen by looking at each part drawn on a contact sheet.
    - Free: Glasses, which fits every face that can wear anything, plus Forest green and Sky blue. That is 3 items, as §3.2's first line
      says, even though its second line counted 5.
  - **Scripts:** `Logic/Pick item` and `Logic/Wear item`, plus `Logic/Hangar shelf`, which gives each tile what a tap does.
    - ≠ §3.3: `Logic/Equip` is named **`Logic/Wear item`**, because the template gate requires a Logic name to be a job ("Verb noun").
  - **The profile** gains `owned` and `wear: { face: { look: { part: value } }, paint }`.
    - Active profile publishes `faceOptions`, `paint` (tomato when unpainted), `picks`, `nextPct` and `nextText`.
    - Finish race publishes `earnedPick`.
    - Save code v2 packs `o` and `w`.
  - **The graph:**
    - `Pages/Hangar`: a preview (the face, and the rocket on a short course), then a Shelf with Face and Rocket tabs over the tiles.
    - `Game/Next pick` sits under Home's stars, and a Hangar card sits beside the Race.
    - The result screen shows "🎁 Tu as gagné un choix !" with a To the hangar button between Play again (still focused) and Change the race.
    - Every face wears what was chosen: header, Profiles cards, preview, and rocket A.
  - The preview's pop swaps between `rkt-wear-a` and `rkt-wear-b`, and APP_CSS stills both.
- **Gates added:**
  - **kit:** AC3, with a sabotage arm that drops the probability. Also: both port sets are documented.
  - **engine:**
    - AC5: 60 seeded races, with sabotage "spend twice".
    - AC6.
    - The refusal rules, the shelf's notes, Home's line, `earnedPick` across a milestone, and the save code.
  - **template:**
    - AC4: DiceBear parts read from the installed `schema.js`, and paints ≥ 3:1 on four grounds, each with a sabotage arm.
    - The shelf in the graph is the shelf, and three items are free.
    - Wiring: the track, every face, the result's pick line, Home's bar, and a tile answering once.
    - The pop classes.
- **Readings, on the uncommitted tree over `eb12ebe99`:**
  - The generator's first run: GEN_EXIT=1 (Race/Result's Component Outputs never declared `hangar`; nothing was written).
  - Kit build: KIT_EXIT=0. Generator: GEN_EXIT=0.
  - The three suites: 248/252 on the first run, then **252/252, JEST_EXIT=0**. `typecheck:mcp` TC_EXIT=0. Deploy (`rocket-h1`): DEPLOY_EXIT=0.
    Served at `http://127.0.0.1:8773/`.
  - Of the first run's 4 reds, 3 were my own literals: RKT-002's list of animated classes, and a guessed contrast ratio.
  - The 4th was a finding. 🔴 **"Moustache" on the Smile face changed nothing for seed Léa, because Léa's own Smile face already wears a
    moustache.** DiceBear's Smile style draws a random accessory half the time (`accessoriesProbability` 50).
    - The gate now tells a coincidence from a miss, using the picture with that part forced off.
    - 🟡 **For Richard:** about half of Smile faces already wear one of the accessories on the shelf, so a child can spend a pick on
      something their face already has. Should the Smile face's random accessory be turned off, so every face starts bare? That changes
      how existing Smile faces look.
- **Build 1 (`rocket-h1`, served on 8773) was driven, and the hangar drew no tile.** Every gate had passed.
  - The pick arm, FR 390×844, re-run (after the pad trap below): **PICK2_EXIT=1, 3 of 4**.
    - Green: `crossed` (10 ⭐ seeded, and the race passed 15), `offered` ("🎁 Tu as gagné un choix !" and "Au hangar" on the result), and
      `focus` (Rejouer kept it).
    - 🔴 `hangar`: the page showed its header, the preview's "🎁 1 choix à faire au hangar" and the Visage/Fusée tabs, and no tile at all.
      Looked at in the screenshot.
  - The screen arm, EN 1366×768: **NOT REACHED, SCREEN1_EXIT=1**. The same empty shelf for a Pixel face at 45 ⭐. The console said
    `/Logic/Hangar shelf: The script threw: Cannot read properties of undefined (reading 'part')`, twice.
  - 🔴 **My first explanation was wrong, and the throw is what excluded it.** I read that Static Data hands a Function a Collection, and
    blamed `Array.isArray`. But a list that failed `Array.isArray` would never have reached the loop, so it could not have thrown on
    `.part`, and a runtime Collection extends Array.
  - **Measured instead (D64):** the runtime makes each Static Data row a Model, and the Model's proxy answers any of its own member
    names with the member. `row.on` was `Model.prototype.on` (`typeof` function). Reproduced headlessly: the shipped script, given a real
    runtime Collection of the shelf, threw the browser's exact message, while a plain array gave 12 rows. `Logic/Pick item` refused every
    item as not fitting, so the tiles would have been dead even if they had drawn.
  - **Fixed in build 2:** the field is `faces`.
    - The template gate reads the reserved names from the runtime's own Model and checks every `Data/*` row, with a sabotage arm.
    - The engine gate runs the shelf, pick and wear scripts on a real runtime Collection. Its sabotage arm puts `on` back and must throw.
- **Build 2 (`rocket-h2`): GEN_EXIT=0, gates 256/256 (JEST_EXIT=0), TC_EXIT=0, DEPLOY_EXIT=0.** Served on 8773 in place of build 1.
  - **The screen arm, EN 1366×768: SCREEN_EN1366_EXIT=0, 6 of 6.**
    - The clauses: `sideways`, `fold`, `tiles44`, `greyed` (Crown greyed, "Fits the Smile faces"), `tap` (Cap picked) and `quiet`.
    - Looked at: the Smile-only items show greyed on a Smile face, and the Pixel items show Léa's own Pixel face wearing them.
  - **The pick arm, FR 390×844: PICK_FR390_EXIT=1, 11 of 13.** A re-run with better diagnostics gave the same 11 of 13.
    - Green: `crossed`, `offered`, `focus`, `hangar`, `picked`, `popped`, `painted`, `expected`, and, in the very next race, **`trackFace`**
      (rocket A carries the crowned face) and **`trackPaint`** (its body is the blue paint, and it was not blue the race before), plus `quiet`.
    - Looked at: the next race shows Léa's blue rocket wearing the crown, and the computer's is teal. That is the person sentence.
    - 🔴 `preview`: the preview face was **`crowned64`**, the crowned picture at `width="64"`, where the graph asks for 96.
    - 🔴 `reload`: the store kept everything (`owned ["crown"]`, the crown worn, `paint var(--rocket-paint-blue)`, 23 ⭐), but Home had
      **no 40 px header face**.
    - 🔴 **Both reds are D65, and older than this task.** Every `Game/Face` has drawn at 64 px since TPL-007 session 1. The kit Avatar read
      its wired Size (`{value, unit}`) as `Number(...)`, which is NaN, so it fell back to 64. It was measured on the built kit, and the
      artefact was correct.
    - Fixed in the kit, through `padPx`, with a gate and a sabotage arm. That is **build 3**.
    - ⚠️ **For Richard:** the header face now draws at the 40 px it always asked for, so every header is smaller than in the build he
      played.
- **Build 3 (`rocket-h3`, served on 8774): KIT_EXIT=0, GEN_EXIT=0, gates 258/258 (JEST_EXIT=0), TC_EXIT=0, DEPLOY_EXIT=0.**
  - **The pick arm: PICK_EXIT=0, 13 of 13 in all three cells** (FR 390×844 touch, FR 1024×768 touch, EN 1366×768).
    - `preview` and `reload` are green now: the preview face is the crowned picture at 96 px.
    - After a reload the store still holds the crown and the blue paint, and Home's 40 px header face wears the crown.
  - **Reduced motion: REDUCED_EXIT=0, 7 of 7.** `still`: right after the pick changed the preview's class, nothing on it was animating
    (AC9).
  - **The screen arm: SCREEN_EXIT=1. Five of six cells are green:** FR 1366×768, FR 1280×720, FR 1024×768 touch, FR 768×1024 touch, and
    EN 1366×768 (`sideways`, `fold`, `tiles44`, `greyed`, `tap`, plus `coarse` on touch).
    - 🔴 **FR 390×844 is 6 of 7, and `fold` is red:** the preview ends at 547 and the tabs at 660, but the first row of tiles ends at
      **882 on an 844-tall phone**. The other five clauses pass there.
    - `fold` is my reading of AC8's "one screen": the preview, the tabs and the first row of tiles all above the fold. A phone Home was
      already tall (RKT-008 owns the three-row header).
- **The regression set on build 3** (`h3-regress.log`, 19 drives, one at a time, finished 22:10): **18 of 19 exit 0.**
  - Red: BOOST_EXIT=1 on one cell, Défi FR 1366×768 `sameClock` ("numeral 15; bar 0.823 × glide limit 16405 ms = 13.50 s").
  - 🔴 **It was the drive.** `barLimit()` works the limit out from two bar readings 600 ms apart, each timed when the round trip returns,
    so a few tens of ms of jitter moves a ~17 s limit by over a second. That cell was re-run six times, three on build 4 and three on
    build 5: **11/11 every time, `sameClock` green.**
- **Build 4 (`rocket-h4`, served on 8775):** the preview keeps the face and the course on one line (`flexWrap: nowrap`), with a gate.
  - GEN_EXIT=0, TC_EXIT=0, DEPLOY_EXIT=0, but **JEST_EXIT=1, 258/259.** The door raised a new `inactive-conditional-parameter`: `row()`
    carries `rowGap`, and a row that never wraps never reads it. The door was right.
  - **Screen: SCREEN_EXIT=0, all six cells.** FR 390×844's `fold` is green now.
  - **Pick: PICK_EXIT=1.** FR 1024×768 was 13/13, but FR 390×844 and EN 1366×768 were 12/13, with `expected` red (`differs: false`).
    - Measured with DiceBear in Node: seeds `n4sa38` and `qamv84` already wear `sailormoonCrown` on their plain Smile face, and the control
      `hiep5c` does not. **124 of 2,000 random seeds do.** The instrument could grade nothing in those cells; the product did what it should.
  - Reduced: REDUCED_EXIT=0, 7/7.
- **Build 5 (`rocket-h5`, served on 8776):**
  - The preview row is spelled out without `rowGap`.
  - The pick drive re-rolls a Smile seed whose plain face already wears the crown, telling it apart with the page's own DiceBear, and
    notes it when it fires.
  - CHECK_EXIT=0, GEN_EXIT=0, **gates 259/259 (JEST_EXIT=0)**, TC_EXIT=0, DEPLOY_EXIT=0.
  - **Pick: PICK_EXIT=0, 13/13 in all three cells.** The re-roll did not fire (seeds `v565xq`, `msn19j`, `wcpwc9`), so that branch has not
    run yet.
  - **Screen: SCREEN_EXIT=0, six of six cells. Reduced: REDUCED_EXIT=0, 7/7.** AC7, AC8 and AC9 are green on build 5.
- 🟡 **For Richard, now measured:** 6% of Smile faces (124 of 2,000) already wear the Crown, so for them a pick on it changes nothing on the
  face. Turning off the Smile face's random accessory would make every face start bare, but it changes how existing Smile faces look.
- **Traps (session 10):**
  - 🔴 **A known-firing clause that reads "false" is the instrument saying it is blind.** Two cells of three drew a seed that already wore
    the crown. Measure the seed before blaming the product, and make the drive choose an input it can grade.
  - 🔴 **After a `/clear`, `ps | grep` found no queued waiter, and it ran anyway.** Its three re-runs finished on their own a few minutes
    later. Read the task notifications and the output files, not only `ps`.
  - 🔴 **A drive clause that prints a 60-character prefix cannot tell a wrong picture from a wrong size.** `preview` read "same: false"
    for two runs. Naming WHICH known picture the face was (crowned or plain, at 96, 64 or 40) turned it into a kit finding in one run.
  - 🔴 **A gate that feeds a script plain JSON cannot see what the runtime hands it.** All 252 passed on a shelf the product could not
    read. The arm that closes the hole builds the input the way the runtime does (`Collection.get().set(rows)`).
  - 🔴 **`${PIPESTATUS[0]}` is bash.** In this zsh it printed nothing, so the chain wrote `JEST_EXIT=` and `TC_EXIT=` with no number.
    Write `echo X_EXIT=$?` straight after the command, with no pipe in front of it.
  - 🔴 **A touch cell reloads into a coarse pointer, and then the pad has no box (RKT-005).** The first drive run waited for a box and read
    "no first question" with the question on screen: NOT REACHED, PICK1_EXIT=1, while the notification said exit 0 (its last command was
    `cat`). The drive now answers on the pad's keys.

### 2026-09-14 — the hangar left Home's games (Richard's request)

> "move the hanger to somewhere out of the game type menu" — Richard, 2026-09-14

- §3.5's "a card beside the games" is gone. The hangar is reached from:
  - Home's bar to the next 🎁, under the stars (unchanged)
  - **the player menu** (§3.5's second entry point, now built): "🎁 Hangar" is its first item, on Home, the race setup and Make Ten
    Merge. `Game/Header` gains `showHangar` (false on the hangar itself) and a `hangar` output; `headerWires` wires it to each page's navigate.
  - the result screen's "To the hangar" after a milestone (unchanged, and Make Ten Merge's end screen offers it too)
- Built with TPL-007 §13 (Make Ten Merge), template build 2 of that session. Template gate: Home's game cards are exactly Race, Merge,
  Hunt and Monster, beside the known-firing menu wires. Driven: `drive-tpl007-merge.js --arm home`, EN 1366×768 and FR 390×844, ALL PASS
  (`games`, `nextPick`, `menu`: the menu's 🎁 Hangar opens `/hangar`).
- `drive-rkt011-hangar.js`'s screen arm opened the hangar from the Home card; it now opens it from the bar to the next pick.

## 6. Not this task

- A pet or a room: a later task, if AC10 says customisation lands.
- Rocket parts beyond paint (flame, trail, sticker): a kit follow-up once the face plumbing is proven.
- Anything the Make Ten Merge, Hunt or Monster games draw. They reuse the header face, so they inherit what is worn
  for free.
