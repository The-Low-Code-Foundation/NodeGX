# RKT-002 — The look

🔴 **Rocket School wears a stock preset on a white page.** Session 1 chose that on purpose, so the
preset's measured contrast would hold, and deferred the look to TPL-007 AC10. **The deferral was
defensible. Putting no alternative in front of Richard was not.** Finding 9: *"The visual style is a
bit sad."*

## 1. The person sentence

**A child opens it and it looks like a game they would pick for themselves, not a worksheet.**

## 2. What is there now

| | |
|---|---|
| theme | `tpl007Theme.ts`: the `playful` preset, `TPL007_TOKENS = []` — no overrides |
| ground | `var(--background)`, white |
| `APP_CSS` | a hover lift on game cards, and a reduced-motion guard — no other motion |
| illustration | the track's dashed line, five star dots, a 🪐 emoji, the DiceBear faces |
| reward moments | a ✅ / 🚀 / ❌ glyph in a bordered card; a synthesised sound |

Pictures of today: `../phase-78-the-templates/tpl-007-shots/` (`02-form`, `04-home`,
`07-race-verdict`, `09-french`).

## 3. What to do

1. **Three directions on one design canvas** (the `design` skill). Each is drawn as Profiles, Home and
   a Race round with the verdict open, at 1366×768 and 390×844. Starting points, there to be beaten:
   - **Night launch** — deep indigo starfield ground, the track as a glowing orbit, chunky buttons
     with a pressed-down shadow, a planet illustration per game.
   - **Sticker book** — warm paper ground, thick ink outlines, cards as stickers, hand-drawn stars;
     loud colour, calm motion.
   - **Blocky** — pixel art, matching the pixel avatars and the coming Monster Gate (Richard's own
     word was "Minecraft-blocky"); the 8-bit sounds already fit.
2. **Richard rules** one direction, or a mix. Record it here in his words.
3. **Build it as tokens**, not per-node colours: overrides in `TPL007_TOKENS`, a new composition
   only where one is missing, and `APP_CSS` for motion only. The kit's colour defaults follow the
   tokens.
4. **Reward moments are part of the look**: a burst from the rocket on a correct answer, a streak
   flourish, a landing celebration, and a result *screen* rather than a card. All of them respect
   `prefers-reduced-motion`.

## 4. Constraints carried from TPL-007

- Every colour is a token (the gate asserts it). **Overriding the palette means recomputing every
  contrast pair** — TPL-005 did sixteen. That is the work the deferral avoided, and it is now owed.
- Colour-carrying `States` keep `useTransitions: false` (D49).
- [Phase 81](../phase-81-the-look-is-the-product/) is the doctrine. Measure against its checks
  rather than by eye.

## 5. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | A published canvas: three directions × three screens × two widths. Link recorded here. |
| AC2 | Richard's ruling recorded verbatim. |
| AC3 | The ruled look built through the generator. Gate: every colour a token; the contrast table recomputed for every text/ground pair on the new palette (≥ 4.5:1 body, ≥ 3:1 large); a sabotage arm. |
| AC4 | Each reward moment is visible in a drive screenshot (burst on correct, landing, result screen); a reduced-motion arm shows none of them animating. |
| AC5 | Screens at the five viewports looked at; Richard's verdict, and his kids' when they play it (TPL-007 AC10). |

**Out:** how the race stage is arranged (RKT-003). RKT-003 is built *in* this look, so AC2 comes
first.

## 6. Record

- **AC1 ✅ 2026-09-13** — canvas published: <https://claude.ai/code/artifact/29f3b20b-93b1-49c3-8183-688f93c57470>.
  Night launch / Sticker book / Blocky × Profiles, Home, Race with the verdict open × 1366×768 and 390×844, in the
  template's real French strings. Each row carries a note with its motivation and its build tradeoff. All three
  drop the EN/FR pills for a "Joueur" menu (RKT-008) and let text wrap (RKT-001). The race arrangement is a
  placeholder for RKT-003. Source: the session scratchpad's `rkt002/gen.mjs`, which writes all 18 artboards.
- **AC2 ✅ 2026-09-13 — RULED: Sticker book, straight.** Richard, verbatim: *"Sticker book design is awesome, but
  drop the inclined groups and make everything straight please. Other than that it's perfect, rock out"*. The canvas
  was updated to match (no tilted cards, pills or eyebrow). Sticker book is now the first page, and Night launch and
  Blocky are on "Not chosen". **What gets built:** warm paper ground, ink `#2a211b` 3px outlines, hard offset
  ink shadows, tomato `#ff5a36` for *you*, teal `#12a39b` for *the other one*, sunshine `#ffc83d`, Grandstander
  titles over Nunito body.
- **AC3 — how it is being built (decided 2026-09-13, from measurement):**
  - **Tokens, over `playful`:** paper `--background #f6ecd9`, ink `--foreground #2a211b`, card `--surface #fffdf7`,
    tomato `--primary #f5522e` with an **ink** label, teal `--secondary #12a39b`, costly `--destructive #b3261e`,
    sunshine `--accent #ffd76a`, every `--border*` ink, `--border-1: 3px`, radii 12–28px. Every pair the
    template draws was computed first (the session scratchpad's `sticker-contrast.mjs`); the gate recomputes them.
  - 🔴 **No tomato can be both a button with an ink label and a colour on paper.** An ink label at 4.5:1 needs
    luminance ≥ 0.250, and 3:1 on paper needs ≤ 0.248. So tomato is a **fill**, and text only when **large**
    (3.37 on a card: the stat number, the banner headline). Selection is shown by a **fill** (a tomato pill, a
    sunshine profile card) and every edge stays ink. "Whose turn" moves from teal to ink.
  - The banner's ground follows the news: sunshine with an ink headline for a good answer (a tomato headline on
    sunshine is 2.2), the card surface with a costly headline for a wrong one.
  - **Hard shadows are node ports** (`boxShadow*` on Group, Button and Text Input, colour `var(--foreground)`), not
    CSS, because a class cannot beat an inline style. `APP_CSS` keeps motion only.
  - 🔴 **Fonts are bundled, never fetched.** s1 never loaded Nunito: no library module ships a font, and the preset
    only *names* it, so Richard played it in the platform fallback. Grandstander 800 and Nunito variable (Latin
    and Latin-extended, because French needs œ) are in `packages/noodl-mcp/tests/tpl007Assets/noodl_modules/rocket-school-fonts/`
    with their OFL licences. `installModules` copies them, and they are kept out of `REQUIRED_MODULES` because
    that list's write check wants an `index.js`.
- **AC3 ✅ built, 2026-09-13**, through the generator (GEN_EXIT=0, `typecheck:mcp` EXIT=0):
  - **Gates 148/148.** The new RKT-002 block in `tpl007Template.test.ts`:
    - every contrast pair, recomputed from `tpl007TokenEntries()`, with a sabotage arm (a lighter tomato fails
      `--primary on --surface` by name)
    - tomato and teal colour text only at large sizes, as a parameter or through a States value wired into `color`,
      with a sabotage arm ("whose turn" back to teal is caught by name)
    - every face the stylesheet names ships with its licence
    - titles and buttons wear Grandstander
  - **On the deployed build**, `scripts/devtools/drive-rkt002-look.js` passed **14/14**, LOOK_EXIT=0:
    - Grandstander 800 and Nunito are loaded, and the headline and buttons are set in Grandstander
    - the body is `rgb(246, 236, 217)`
    - a button has a `3px rgb(42, 33, 27)` edge and a `4px 5px 0px` ink shadow
    - a wrong answer's banner is the card surface with a berry headline, and a right answer's is sunshine with an
      ink headline
    - no console or network errors
  - `drive-rkt001-wrap.js` on the same build: 60/60, so the wider display face and 3px borders broke no wrap.
  - Screenshots are the `rkt-shots/rkt002-sticker-*` files.
  - 🔴 **The probe needed four runs, and every failure was the probe's.** The answer box sits below the fold at
    1366×768 (RKT-003's finding), so a click at its unscrolled centre lands off-screen. Questions come in two kinds,
    typed and option buttons. And a prompt can be `? × 5 = 35`. The probe now scrolls into view, answers both
    kinds, and names the first missing verdict it meets.
- **AC4, reward moments — built 2026-09-13 (session 4).** The design, and the reason for each part:
  - 🔴 **The end of a race had to move into Race/Play.** The page used to set `racePlaying` false on `finished`, which
    unmounted Race/Play, and with it the track, in the same update the rocket landed. So no landing could ever be seen.
    Now `Race/Play` has a `Racing, or the result` States node. The round sits in a slot that the `racing` state mounts, and
    the new **`Race/Result`** is mounted by `over`, beside it. The track is mounted by neither, so it stays on screen with the
    landing. Play again restarts the race from inside the stage. Change the race is the only way back to setup.
  - `Race/Result` is a sticker card: 🏆 on sunshine for a win, 🚀 on the card for a loss, the headline, "8 / 10 bonnes réponses"
    (solo only), and **Rejouer** (focused, so Enter plays on) beside **Changer de course**. Two new words: `otherRace` and
    `rightAnswers`.
  - **The burst lives in the kit**, because a kit React node cannot take a signal (the viewer logs "Signals not supported as a
    react prop"). The Race Track gained `Boost A` / `Boost B` (numbers) and `Celebrate`. A count that *rises* draws a burst of
    sparks from that rocket's tail. The count the track mounts with, a reset to 0, or the same value again draws nothing.
    `Race/Play` counts the right answers that moved each rocket. A rocket at progress 1 rings the planet in its colour.
  - **All the motion is CSS that a reduced-motion setting stills**: the kit's own stylesheet (`gk-spark`, `gk-ring`) and
    `APP_CSS` (`rkt-pop` on the card, `rkt-cheer` on its glyph). Under reduced motion the burst is not shown at all, and the landing
    keeps its rings, standing still.
  - 🔴 **A defect the move uncovered, read from source and not heard:** the fanfare was a Condition fed the winner's *letter*.
    `condition.ts` reads `!!value`, so `'B'` (the computer) was true too, and a lost race played the win fanfare. Race/Play now
    publishes `Cheer` (A landed, or B in a two-player race) and `Sigh` (the computer landed).
- **AC4 gates (167/167, up from 157):** `reducedMotion.ts` reads a stylesheet and names every class it animates that its
  `prefers-reduced-motion: reduce` block leaves moving.
  - Kit: the burst rule, both kit animations stilled plus a sabotage arm (block removed → both named), the stylesheet
    renders with the track, a track mounted with a Boost already up draws no burst, and the three new ports are documented.
  - Template: both `APP_CSS` animations stilled plus a sabotage arm, the Boost wiring, the result taking the round's slot while
    the track is mounted by neither (and the page holds no banner), and the fanfare wires.
- **AC4 drives, build 1 (`drive-rkt003-stage.js --reward`, rounds answered right until a rocket lands):**
  - **Motion arm: 4/4 cells (1366×768, 390×844 × FR/EN), REWARD_EXIT=0.** Every race was played to the planet. Every per-round clause
    passed, and so did every end clause: `landing` (gk-ring), `resultMoves` (rkt-pop + rkt-cheer), `resultFold` (the headline,
    both buttons *and the track* on screen, scrollY 0), `resultReach`, `resultFocus` and `againPlays`. The `burst` clause runs on
    right verdicts only, and prints only when it fails. The `burst` screenshot is taken inside that branch, and it exists for
    all four cells.
  - **Reduced-motion arm: 4/4 cells, REDUCED_EXIT=0.** The page reported `prefers-reduced-motion: reduce` in every cell, and the arm
    fails when it does not. `burstStill` (the burst was drawn, which is the known-firing signal, but it was not shown and carried
    no animation), `landingStill`, `resultStill` and `stillAll` (no `gk-`/`rkt-` animation anywhere in the document) all passed.
  - 🔴 **Looked at, and changed:** in build 1's screenshot the burst read as ~8px sparkles on a phone. They were drawn, but too
    small to feel like a reward. Build 2 draws the sparkle 26 units across instead of 7, and flies the sparks further.
- **AC4 drives, build 2 (bigger sparks, heavier ring), run one at a time:**
  - reward, 1366×768 + 390×844 × FR/EN: **4/4 cells**, every end clause, reward_EXIT=0. The laptop burst screenshot shows sunshine
    sparkles with ink edges fanning out behind the rocket.
  - 🔴 **The loss, forced** (`--plan` wrong × 35, FR 390×844): the computer landed and the consolation screen ("L’ordinateur est
    arrivé avant. On recommence ?") passed every end clause, lose_EXIT=0. Every earlier race had been won, so this screen had never
    been drawn.
  - The stage matrix, 10 cells with `foldWorst`: ALL PASS, stage_EXIT=0. The keyboard arm, 4 cells: ALL PASS, keys_EXIT=0.
  - `drive-rkt001-wrap.js`: **60/60 cells**, wrap_EXIT=0. Its race now ends on the result screen, and that screen passed too.
    `drive-rkt002-look.js`: **14/14**, look_EXIT=0.
  - Seen in the wrap log, not failing: on the 390×844 result screen, the landing rings (right edge 396px) and two sparks (414px)
    pass the right edge of the screen. `document.scrollWidth` stayed 390 in FR and EN, so the page does not scroll sideways. The
    only cost is that the ring is clipped at the screen edge while it grows. If Richard finds it ugly, shrink `LANDING_SPARKS`
    or pull the planet in from the course's edge.
- **AC5**: Richard. The reward moments are new since he last played.
- **AC5**: Richard. The build is served at `http://127.0.0.1:8766/` this session.

