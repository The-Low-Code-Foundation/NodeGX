# Phase 87 — The first play test

**Scoped:** 2026-09-13, from Richard's first play of Rocket School ([TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md),
session 1's build, deployed with the shipped production engine and served locally).
**Status: 🏗️ IN PROGRESS — 0/11 closed** (every close waits on Richard's replay). **Session 10: every task a builder can finish is built.** RKT-011's gates and drives (AC2–AC9) and all seven of RKT-008's ACs are green on template build 8 (served on 8779). RKT-009 has its research briefing, and waits on Richard's ruling on the shortlist. RKT-010 and RKT-011 (stars and the hangar) were added on 2026-09-13 at Richard's request. RKT-001 is built with AC1–AC5 ✅. RKT-002 has the look ruled and built, and session 4 built its reward moments (AC4): a burst on a right answer, rings at the landing, and a result screen inside the race stage, with a reduced-motion arm. His verdict (AC5) is left. RKT-003 is built with AC1–AC5 ✅; on AC6 Richard said *"I already tried on a smaller screen and it looks fine"*, and the tablet replay is still owed. **RKT-004 is built with AC1–AC5 ✅ (session 5):** Show me opens the missed skill's card in the race stage, fainter each miss in a row, and every maths correction works the child's own numbers. AC6 waits on Richard. **RKT-005 is built with AC1–AC5 ✅ (session 6):** a new game-kit `Answer Pad` answers by taps on a tablet with no soft keyboard, reads AZERTY digits by key code so no Shift is needed, shows `,` in French and `.` in English, and strips the typing word list's accents. The correction now opens with the child's own answer, and a typing race's course is compact so the keyboard fits. The missing Text Input ports are filed as D60. AC6 waits on Richard. **RKT-006 is built with AC1–AC5 ✅ (session 7, build 5 served on 8769).**
- **The race controls:** Restart and Change the race sit in the race stage. The page's bar steps aside in a live race, so Next and Got it stay on screen.
- **What building it found and fixed:**
  - the Défi countdown bar had **never refilled** for a new question
  - Change the race reset the setup's choices
  - a Text Input that remounts loses what was typed (D61)
- AC6 waits on Richard.

**RKT-007 is built with AC1–AC4 ✅ (session 8, build 3 served on 8771).**
- **The boost:** every verdict now says why the rocket went as far as it did, as one line beside the glyph ("⚡ 2,1 s · turbo à fond" /
  "4,5 s · turbo 75 %" / "Pas de turbo" / "Ta fusée ne bouge pas"), with a meter, and the stretch just gained lights up on the track.
- **The clock:** Défi shows the seconds left, read off the bar itself. The last three seconds pulse, and an answer freezes the bar.
- **The setup** says each mode's rule in one line.
- **One formula:** the line, the meter and the rocket's move all come from the grader's `speed`, and two sabotage arms hold that.
- AC5 waits on Richard.

**RKT-010 is built with AC1–AC9 ✅ (session 9, build 1 `rocket-s1`).**
- **Stars:** 1 per right answer, 5 per landing (win or lose), 10 the first time a skill reaches each mastery level, and 5 for a new
  best run.
- **Where they show:** "+N ⭐" and where the stars came from, on the result screen. Home shows the total. Siblings' profile cards show
  none.
- **Where they live:** inside the model, so saving twice cannot pay twice. Older profiles get a grant for the levels they already
  reached, and save code v2 carries the stars.
- **Found:** player two's answers are graded into player one's model (**D63**). Stars are paid on player one's turns only.
- AC10 waits on Richard.

**RKT-011 is built with AC2–AC9 ✅ (session 10, hangar build 5, and again on template build 7).**
- **The hangar:** a milestone's 🎁 pick becomes a face item (DiceBear's own parts) or a rocket paint, and the very next race shows both.
  Nothing is ever taken away.
- **Found:** D64 (a Static Data field named like a Model member reads as the member, so the hangar drew no tile) and D65 (the kit drew
  every wired face at 64 px, since TPL-007 session 1).
- 🟡 About 6% of Smile faces already wear the Crown, so for them a pick on it changes nothing. AC10 waits on Richard.

**RKT-008 is built with AC1–AC7 ✅ (session 10, template builds 7 and 8).**
- **The header is one row** (it was 106 px on a laptop, and 158–214 px on a phone): the face and name open a menu with Edit player, Language,
  Keyboard, Sound, Answers and Switch player. Edit renames (Create's rules), changes the face and class, and deletes after asking by name.
- **AC7, Richard's evening ruling:** the on-screen keyboard follows the real one. The first telling key press sets it (`KeyQ` typing "a" is
  AZERTY), and a FR / UK / US dropdown beside the map overrides it for good.
- **Found:** D66, a wire to an input a built-in node doesn't have passes the door (the edit form's name box opened empty).
- Its close waits on Richard's replay, like every task here.

**RKT-009 has its briefing (AC1, session 10):** [`rkt-009-question-formats-research.md`](rkt-009-question-formats-research.md). The top
three are a tap-to-place number line, "Who is right?", and fill the gap. It waits on Richard's ruling (AC2). 🟡 The race rewards guessing
today (a wrong answer costs nothing), which bears on that ruling and on the menu's "Answers: Buttons".

**Prefix: `RKT`.**

> "a few initial bugs:
> 1. a lot of texts don't wrap
> 2. 'montre moi comment' just shows another question, it doesn't explain anything
> 3. It's tough for French keyboards typing numbers requires the shift key held down. I wonder if we should have a string of numbers, commas / dots that they can tap if they're on a tablet for example to avoid the tablet keyboard or the French keyboard with shift key. We should replace the number string with an accented letters string when in typing mode
> 4. There's some visibility problems. First, the answer / next question block comes up below the fold, so you're scrolling down and up every question. Second, the rocket pathway becomes very small and hard to see when width is reduced
> 5. The user can't change their profile details once set
> 6. You can't reset the game once in the game. If the player sees they're losing they should be able to reset from within the game
> 7. When in 'Défi' mode, you see a small countdown bar but there's no visual info about what happens if it gets to zero, how long you have left, etc. The same in entertainment mode, when you answer quickly or slowly, you don't see any visual feedback about why you went further or less far because of your answer speed
> 8. We could have more question type variations, right now it's just open answer for every question, some could be multiple choice or other question types, research requires as to what question types are more appropriate
> 9. The visual style is a bit sad.
> 10. The language choice doesn't need to be on the screen at all times, it's a waste of space and users don't switch languages every five minutes. Another example of poor UX UI consideration."
> — Richard, 2026-09-13

(His "entertainment mode" is **Entraînement**, the FR word for Practice — `tpl007Curriculum.ts:661`.)

## 1. The person sentence

**A French eight-year-old on a tablet answers ten questions in a row without scrolling, without
holding Shift, and without wondering what just happened — and asks to play again.**

## 2. 🔴 Why this phase goes before Merge, Hunt and Monster

TPL-007 §12 lists three more games. **Every finding below lives in a part those games reuse** — the
`text()` helper, `Game/Header`, `Game/Question box`, `Game/Feedback banner`, `Game/Countdown bar`,
the theme. Fixed now, each is fixed once. Fixed after, each is fixed four times, and three more
games get played with the same ten complaints.

## 3. The ten findings, their measured causes, and the tasks

Every cause below was read from source on 2026-09-13, not guessed. Line numbers are at that date.

| # | Finding | Measured cause | Task |
|---|---|---|---|
| 1 | texts don't wrap | the template's `text()` helper gives **every** Text `sizeMode: 'contentSize'` (`tpl007Components.ts:154`); the runtime renders content-sized text as `white-space: pre` (`Text.tsx:79-81`) — it never wraps, by design | [RKT-001](RKT-001-TEXT-THAT-WRAPS.md) |
| 2 | "Montre-moi comment" explains nothing | the banner's Show-me closes the banner and publishes `showMe`; Race/Round → Race/Play forward it; **Pages/Race wires nothing to it**. 16 Teach cards and `Logic/Teach card` exist; no part draws them | [RKT-004](RKT-004-SHOW-ME-HOW-TEACHES.md) |
| 3 | Shift for digits on AZERTY; tablet keyboard | the only answer surface is a Text Input; Text Input has **no `inputmode` port**; its Set **abstains while the field has focus** (`text-input.ts:149`) | [RKT-005](RKT-005-THE-ANSWER-PAD.md) |
| 4a | verdict below the fold | Race/Round is one column — clock, question, **banner under the question**, keyboard; in s1's `07-race-verdict.png` Next sits at y≈1010 | [RKT-003](RKT-003-ONE-SCREEN-PER-QUESTION.md) |
| 4b | track tiny when narrow | the kit's Race Track is a fixed 1000×420 viewBox at `width: 100%`; rockets scale with it (≈16px at 390px wide) | [RKT-003](RKT-003-ONE-SCREEN-PER-QUESTION.md) |
| 5 | can't edit a profile | no edit UI; `Logic/Update settings` writes seven fields but **not the name**; `Logic/Delete profile` shipped with no button | [RKT-008](RKT-008-THE-PLAYER-MENU.md) |
| 6 | can't restart mid-race | `Race/Play.start` already resets both rockets and the round count; only Setup's Start fires it | [RKT-006](RKT-006-RESTART-FROM-INSIDE-THE-RACE.md) |
| 7 | clock and speed say nothing | the countdown is a bare 300×12px bar; the grader's speed factor (full step ≤ `fluentMs`, 50% at 2×) is computed and never shown | [RKT-007](RKT-007-THE-CLOCK-AND-THE-BOOST-EXPLAIN-THEMSELVES.md) |
| 8 | one question type | two kinds exist (`typed`, `options`), and almost every skill is `typed` | [RKT-009](RKT-009-MORE-KINDS-OF-QUESTION.md) |
| 9 | the look is sad | `playful` preset, **zero overrides**, white ground; the look was deferred to AC10 and no alternative was ever shown | [RKT-002](RKT-002-THE-LOOK.md) |
| 10 | language toggle on every screen | `Game/Header` carries an EN/FR pill row on every page, and it wraps to a second header row at desktop width | [RKT-008](RKT-008-THE-PLAYER-MENU.md) |

### 3.1 Added on 2026-09-13: stars and the hangar

> "Since we're rocking phase 87 to fix the maths game, can we maybe tack on a couple of tasks to make a bit of
> gameification? Something simple like total points per user coming from each session, that can be used for
> something fun (maybe avatar stuff??)" — Richard, 2026-09-13

This is not a finding but a request. It has a cited [research briefing](rkt-010-rewards-research.md). Its rules
inherit TPL-007's: points are garnish, no leaderboards, no hard streak, and no reward a child cannot earn. The
briefing adds four:
- no stars for speed
- nothing random
- nothing ever taken away
- **stars never shown on a sibling's profile card**, because our players are 8–11, the age at which a rank starts
  to hurt

| Task | What |
|---|---|
| [RKT-010](RKT-010-STARS-THAT-ADD-UP.md) Stars that add up | ⭐ per right answer, per finished race, per mastery level gained, and for a personal best. Stored inside `model`, so saves stay idempotent; save code v2 |
| [RKT-011](RKT-011-THE-HANGAR.md) The hangar | stars become face items (DiceBear's own hats, glasses and accessories, no new art) and rocket paint; ✅ Richard ruled **pick at a milestone** (the total never drops) |

> "you can type anything you want and it'll progress to the second character view and keyboard letter highlighted
> [...] I feel disturbed by the visual of typing the wrong letter 3 times and the keyboard continues showing the next
> letter as if everything's fine keep going." — Richard, 2026-09-14

| Task | What |
|---|---|
| [RKT-012](RKT-012-A-WRONG-KEY-IS-REFUSED.md) A wrong key is refused | the lit key counted characters, not letters. ✅ Ruled **refused, flash only**: the key never enters, the box and the key flash red, the due letter stays lit, ⌫ sits beside the box, and 1–2 wrong keys cost fluency, 3 a miss |

## 4. Order

| # | Task | Why here | Needs Richard |
|---|---|---|---|
| 1 | [RKT-001](RKT-001-TEXT-THAT-WRAPS.md) Text that wraps | mechanical, every page; honest screenshots for every task after | — |
| 2 | [RKT-002](RKT-002-THE-LOOK.md) The look | a three-direction canvas; **start it beside RKT-001**, because it waits on his ruling | ✅ rules the direction |
| 3 | [RKT-003](RKT-003-ONE-SCREEN-PER-QUESTION.md) One screen per question | built in the ruled look; the stage every later task draws into | — |
| 4 | [RKT-004](RKT-004-SHOW-ME-HOW-TEACHES.md) "Show me how" teaches | the one finding that is a broken promise | — |
| 5 | [RKT-005](RKT-005-THE-ANSWER-PAD.md) The answer pad | the French and tablet child | — |
| 6 | [RKT-006](RKT-006-RESTART-FROM-INSIDE-THE-RACE.md) Restart from inside the race | small; lands in RKT-003's stage | — |
| 7 | [RKT-007](RKT-007-THE-CLOCK-AND-THE-BOOST-EXPLAIN-THEMSELVES.md) The clock and the boost explain themselves | lands in RKT-003's verdict slot | — |
| 8 | [RKT-008](RKT-008-THE-PLAYER-MENU.md) The player menu | findings 5 + 10 are one surface | — |
| 9 | [RKT-009](RKT-009-MORE-KINDS-OF-QUESTION.md) More kinds of question | research, then a ruling, then build | ✅ rules the shortlist |
| 10 | [RKT-010](RKT-010-STARS-THAT-ADD-UP.md) Stars that add up | after RKT-006, because a restart must pay no finish bonus; independent of RKT-007–009 and can run earlier | — |
| 11 | [RKT-011](RKT-011-THE-HANGAR.md) The hangar | spends RKT-010's stars; its second entry point is RKT-008's player menu | ✅ ruled **A, pick at a milestone** (2026-09-13); numbers delegated (play-test curve 15/40/75/120/175, then +60); his feedback lands at AC10 |
| 12 | [RKT-012](RKT-012-A-WRONG-KEY-IS-REFUSED.md) A wrong key is refused | lands in RKT-005's pad and RKT-003's verdict; independent of the rest | ✅ ruled **refused, flash only** + ⌫ beside the box (2026-09-14); the threshold of 3 is his to feel at AC6 |

## 5. Rules every task inherits (from TPL-007 session 1)

- **Build only through the generator**: `npm run template:rocket` (the plan door). 🔴 **Check the
  generator's exit before believing a drive** — twice in s1 an edit script aborted and the drive
  graded the OLD artefact with identical readings.
- **Gates**: `tpl007GameKit.test.ts`, `tpl007Engine.test.ts`, `tpl007Template.test.ts` in
  `packages/noodl-mcp/tests` (140/140 at s1). `Tests: 0 total` means the wrong directory.
- **The five runtime traps, all with 0 console errors** (P78 register D53–D57): a kit React node as a
  component's root draws nothing (wrap it in a Group); an `Expression` makes every identifier a port
  (`'' + n`, not `String(n)`); an `Expression` with no delivered input never evaluates; a `Variable`
  is **global by name** (local state is a `States` node); a repeater row needs an `id`.
- Every colour a token; every colour-carrying `States` has `useTransitions: false` (D49).
- **The viewport set — every drive, every task:** 1366×768 laptop · 1280×720 · 1024×768 touch
  (tablet landscape) · 768×1024 touch (portrait) · 390×844 touch (phone). **FR + AZERTY is the
  primary arm**, EN + QWERTY the second.
- **Reproduce before fixing**: each task's first clause is RED on today's build, so the fix is graded
  against what Richard saw.
- **Look at the screenshot.** Text clauses could not see a doubled pill or a second open banner in s1,
  and they will not see a clipped line either.

### Play it the way Richard did

```sh
npm run template:rocket                                   # check EXIT=0
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket
node -e "require('./scripts/devtools/drive-deployed.js').serveFolder(process.argv[1], 8765)" <scratch>/rocket
open http://127.0.0.1:8765/
node scripts/devtools/drive-tpl007-rocket.js <scratch>/rocket --shots <dir>
```

## 6. Close condition

**Richard replays the race on a tablet and on a French laptop, and none of the ten findings
reproduces** — recorded in his words in each task. A green gate on its own closes nothing here:
every one of these ten shipped past 140 green assertions and a 17/17 drive.
