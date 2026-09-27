# RKT-004 — "Show me how" teaches

🔴 **The button exists, the lessons exist, and nothing connects them.** Finding 2: *"'Montre-moi
comment' just shows another question, it doesn't explain anything."* TPL-007 §12.4 recorded it as
unwired — and it shipped visible anyway.

## 1. The person sentence

**A child who got it wrong taps "Show me how", sees the trick for exactly that kind of question
worked through, and goes back to the race with the rockets where they left them.**

## 2. What was measured (2026-09-13)

| reading | where |
|---|---|
| Feedback banner: Show-me **closes the banner** (`fbOpen → to-closed`) and publishes `showMe` | `tpl007Components.ts` `FEEDBACK_BANNER` (954) |
| `Race/Round` forwards `showMe`, and `teach` (the card id from `Pick next question`) | `RACE_ROUND` |
| `Race/Play` forwards both | `RACE_PLAY` (~1442) |
| **`Pages/Race` wires neither.** The signal ends at the page | `PAGE_RACE` (1628–1760) |
| with the banner closed, `rdBoxOn = !open` re-enables the box on the *same*, already-answered question — what Richard read as "another question". **Confirm with a drive before fixing** (record the prompt before and after the tap) | |
| the round's banner never sets `canTeach`, so Show-me also appears after "Fast and correct!" | s1 `07-race-verdict.png` |
| the material is ready: **16 Teach cards**, each with three faded steps and a worked example, EN/FR | `tpl007Curriculum.ts:451` |
| skill rows name a `teach` id; `Logic/Teach card` returns one card at step 0–2 | `tpl007Scripts.ts:1086` |
| missing: a visual `Game/Teach card`, the per-skill miss count that picks the step, and the wiring | |

## 3. Design

- The card opens **inside the race stage** (RKT-003's verdict slot), not on a separate Teach page —
  leaving the page would lose the race.
- It shows: the title; the step for this skill's miss count (full → partial → one line); the worked
  example in a mono box; and, where the generator can do it, **the child's own question worked
  through** (46 + 9 → 46 + 4 + 5 → 50 + 5 = 55), with the card's example as the fallback.
- Buttons: "Got it — next question", and, where the skill allows it, "Try one like it" (same skill,
  graded, the rockets move as normal).
- Défi: the clock stays stopped while the card is open. It already stops on an answer — verify
  nothing restarts it.
- Show-me appears after a wrong answer or a timeout. **Decide** what a correct-but-slow answer gets
  ("A faster way", showing the strategy line, or nothing) and record why.
- The Teach page reachable from Home (TPL-007 §12.4) reuses this part. It is not built here.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced first:** the s1 behaviour (no card; the same question re-enabled, or whatever the drive shows) recorded here with a screenshot, so the fix is graded against what Richard saw. |
| AC2 | Engine gate: every curriculum row's `teach` id resolves to a card; every card has three steps and an example in both languages. Sabotage arm (a bad id) is RED. |
| AC3 | Drive, FR and EN: answer wrong → Show me → the card's title is the missed skill's card; Got it → a new prompt. Rocket progress and round count are read before and after, and are unchanged. |
| AC4 | Fading: miss the same skill three times in a race; the three cards show the text of steps 1, 2 and 3. |
| AC5 | Défi arm: open the card, wait longer than the limit, and no timeout verdict fires. |
| AC6 | Richard: it explains. |

## Seen while driving RKT-001 (2026-09-13)

🔴 **The wrong-answer banner explains a different sum from the one the child was asked.** At 390×844 FR, the
question was **36 + 7**, and the banner said *"La réponse était 43. 46 + 8 : va d’abord à 50 (4), puis encore
4."* The strategy line is a fixed worked example with its own numbers, not this question. To an eight-year-old
that reads as the game being wrong. Screenshot: [`rkt-shots/rkt001-after-fr-wrong-390x844.png`](rkt-shots/rkt001-after-fr-wrong-390x844.png).
The fix belongs here: the correction should work through the numbers that were asked, or say plainly that it is
an example.

## 5. Record

- **AC1 ✅ 2026-09-13 — reproduced on build 2 (the build Richard is being shown), FR, 1366×768.** The drive is
  `scripts/devtools/drive-rkt004-teach.js`. It answers wrong, presses Show me, and grades what comes back. Run with `--plan wrong,wrong`,
  AC1_EXIT=1:
  - the question was *"Arrondis 9 114 à la dizaine"*. The verdict said *"Pas tout à fait."*, and the correction read *"La réponse était 9110.
    Regarde le chiffre juste à droite : 5 ou plus, on monte."*
  - after Show me: **no card, and no verdict. The same question came back, with the answer box enabled again** (the skill's name, the
    prompt, the box, and Vérifier). This is what Richard read as "another question". The rockets did not move.
  - Pictures: the session scratchpad's `rkt004-ac1/rkt004-fr-1366x768-r1-verdict.png` and `…-r1-after-show-me.png`.
  - 🔴 **The probe's first run could not name the skill.** The eyebrow is uppercased by CSS, and `innerText` returns the drawn text
    (*ARRONDIR À LA DIZAINE…*). The drive now matches the skill on `textContent`.
- **Decided, 2026-09-13 — a right answer gets no Show me, fast or slow.** The card teaches a skill the child got wrong. Why a slow right
  answer moved the rocket less is RKT-007's to show (the boost explains itself). So `canTeach` is *wrong or timed out, on a skill with a
  card*. In s1 it was never wired, and Show me appeared under "Rapide et juste !".
- **Decided — the step follows the misses in a row, from the learner model.** `Logic/Grade answer` already counts `miss` per skill and
  resets it on a right answer. Miss 1 shows step 1, miss 2 shows step 2, and miss 3 or more shows step 3. The count lives in the profile,
  not the race, so it carries into the next race until the child gets that skill right.
- **Suspected while building, measured, not a defect:** `round-dec` rounds `Math.round(n * 10) / 10` with `n = k / 100`. That looked like a
  float trap, but over every k from 101 to 999, both arms (to the whole, to the tenth) agree with half-up rounding on whole hundredths:
  **0 mismatches**. No fix was made. The engine gate now holds the property, because the worked line says "5 or more, so up" and must agree
  with the answer.
- **Built, 2026-09-13 (session 5), through the generator.** What changed:
  - **`Game/Teach card`** (new) draws in `Race/Play`'s stage. `rpPhase` gained a third state, `teaching`. Show me moves to it and unmounts
    the round's slot; the round keeps its state and the track stays. Got it goes back to `racing` and fires `rpGoOn`, the same gate Next uses,
    so a race that has landed still ends.
  - The card is fed by `Logic/Teach card` (built in TPL-007, never placed until now). Its cards come from `Data/Teach cards` through
    `Pages/Race`, and its step is `min(2, max(0, missCount − 1))` from the grader.
  - **The clock:** only `rdPick.done` starts it, so an open card cannot time out. The gate holds this.
  - **`canTeach`** is `correct !== true` and the skill has a card.
  - **The second finding (the correction worked other numbers), fixed at the source.** Every maths generator returns `worked`: the
    question's own numbers, worked the way its card teaches (*"Passe par la dizaine : 35 + 7 = 35 + 5 + 2 = 40 + 2 = 42."*). The banner's
    correction says `worked`. The skill's fixed strategy is said only where there is no worked line (typing drills, custom sets). The card
    shows the question and its working in a sunshine box, and falls back to the card's example.
- **Gates 179/179** (167 → 179), GEN_EXIT=0, `typecheck:mcp` EXIT=0:
  - Engine, AC2: every skill's card exists with a title, three steps and an example in both languages. Sabotage arm: a bad id is named.
  - Engine: every maths skill's `worked` line (40 questions per skill, EN and FR) contains every number of its prompt and the answer.
    Sabotage arm: with `worked` dropped, all maths skills are named.
    - 🔴 Its first run was RED on three real lines, and they were fixed: "1/8 or 1/2" and "2/3 or 2/10" named only one fraction, and the EN
      rounding line said "hundreds" but never "100".
  - Engine: the correction says the worked line and not the strategy, and an `=` is held to both neighbours with no-break spaces.
  - Engine: `drive-rkt003-stage.js`'s WORST correction is still at least as long as the longest real one, so `foldWorst` still stresses.
  - Template: the four RKT-004 wirings, and `canTeach`'s expression.
  - Template: only `rdPick.done` starts the clock.
  - Template: the card's question step-down, tied to the drive's copy of the rule.
- **Looked at, and changed (the drive passed each time):**
  - **Build 1:** the card showed the working but never the question it works, and *"13."* broke onto its own line. Build 2 puts the question
    above its working and holds `=` to its neighbours.
  - **Build 2:** the drive's `cardWorst` clause (the longest real title, step and question swapped in) put Got it at **780 on a 768px screen**.
    That pairing is a real one: a spelled-out nine-digit number opens the place-value card.
  - **Build 3:** the eyebrow ("Comment ça marche") is gone, since the title says it. Padding went from 24 to 16px, and a question over
    24 characters steps down from xl to base. The drive mirrors that rule (a probe that writes text bypasses the graph, RKT-003's trap).
    FR 1366×768: all clauses pass, `cardWorst` included, T3_EXIT=0.
- Seen, not changed: a card's own step text can still break before `=` (*"8 +"* / *"2 = 10"*). The no-break spaces go on the worked line
  only, because the drive matches step text exactly against `Data/Teach cards`.
- **Build 3's full chain (2026-09-13):**
  - Regressions all pass: stage matrix, 10 cells with `foldWorst`, stage_EXIT=0. The keyboard arm, 4 cells, keys_EXIT=0. The reward arm,
    4 cells, reward_EXIT=0. Wrap 60/60, wrap_EXIT=0. Look 14/14, look_EXIT=0.
  - The teach matrix: every real card passed `card`, `step`, `kept`, `cardFold` and `gotIt` in all 10 cells. The Défi hold (`still`, 40s
    with the card open) passed in all 4 cells.
  - 🔴 **`cardWorst` failed on the smaller screens:** Got it bottom 724 on 1280×720, and 854–892 on 390×844.
  - 🔴 **The fade arm stopped on the probe:** its prompt reader needed a digit or a "?", so *"Écris en chiffres : quatre mille quatre cents"*
    read as no question. The reader now accepts letters, as the stage drive's does.
- **Build 4:** the card title steps down to xl (it took two display-size lines on a phone), the "Ta question" label is gone (the bold
  question says it), the card's gaps are 8px, and the worked box's vertical padding is 8px. `cardWorst` now passes at 390×844 and 1280×720,
  FR and EN (T4_SMALL_EXIT=0). Gates 179/179, GEN_EXIT=0, `typecheck:mcp` EXIT=0. The phone card was looked at, and it fits with room below.
- **Build 4's chain (2026-09-13), one drive at a time, all green:**
  - **AC3 ✅** — `drive-rkt004-teach.js`, 5 viewports × FR/EN, teach_EXIT=0. In every one of 10 cells, a wrong answer offers Show me, and the
    card is the missed skill's (32 cards). Both rockets are unmoved after Show me and after Got it, and Got it brings a question.
    - `cardFold` and `cardWorst` pass everywhere: Got it is on screen and reachable, even with the longest title, step and question swapped in.
    - `worked` ran on 21 sum-shaped prompts and passed.
    - `noShowMe`: no Show me after a right answer (9 checks).
  - **AC4 ✅** — `--fade`, FR 1366×768, fade_EXIT=0. Over 43 cards and two races, `step` passed 43/43, and steps 1, 2 and 3 were all shown.
  - **AC5 ✅** — `--hold 40000` in Défi, hold_EXIT=0. With the card open 40s (longer than any limit at CM1, 12s × 3 = 36s), no verdict fired
    and the card stayed: `still` passed in **3 cells** (FR 1366×768, FR 390×844, EN 1366×768). In the fourth (EN 390×844), the planned wrong
    answer landed right on an options question, so no card opened. The template gate holds the same thing: only `rdPick.done` starts the clock.
  - Regressions: stage matrix, 10 cells with `foldWorst`, stage_EXIT=0. Reward arm, 4 cells, reward_EXIT=0. Keyboard, wrap and look passed on
    build 3, and none of them opens the card, which is all that changed.
- **AC6**: Richard. Build 4 is served at `http://127.0.0.1:8765/` (2026-09-13).
