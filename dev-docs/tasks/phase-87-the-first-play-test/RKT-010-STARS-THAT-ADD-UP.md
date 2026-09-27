# RKT-010 — Stars that add up

Added at Richard's request, 2026-09-13. It is not one of the ten findings: *"can we maybe tack on a couple of tasks to make a
bit of gameification? Something simple like total points per user coming from each session, that can be used
for something fun."*

🔴 **A race ends and nothing carries over except the maths.** The profile learns (rating, mastery, days), but the
child has nothing to show for the race and nothing to spend. RKT-011 is where the stars get spent; this task
makes them.

**Read first:** [the rewards briefing](rkt-010-rewards-research.md). It sets the rules this task must not break.

## 1. The person sentence

**A child lands the rocket, watches "+18 ⭐" count up on the result screen, sees their total grow on Home, and
never loses a star they earned.**

## 2. What is there (2026-09-13)

| reading | where |
|---|---|
| a profile is `{ id, name, look, seed, level, lang, layout, sound, answerMode, created, days, model }` with no points field | `CREATE_PROFILE_SCRIPT`, `tpl007Scripts.ts:989-1008` |
| `model` holds `rating`, `skills`, `lastSkill` and `answered`; each skill holds `m` (mastery 0–3) with **demotion** (`miss >= 2`) | `tpl007Scripts.ts:734`, `:751-758` |
| Grade answer knows the skill's mastery before and after every answer, and returns the new `model` | `tpl007Scripts.ts:753-796` |
| `Save model` **replaces** the stored model on every `graded`, and adds today to `days` | `SAVE_MODEL_SCRIPT`, `tpl007Scripts.ts:1051-1062` |
| the save code is `v: 1` and packs no points | `ENCODE_SAVE_SCRIPT`, `tpl007Scripts.ts:1162-1176` |
| Race/Result already says how many answers were right | `tpl007Components.ts:1481` |
| Home's stat row has "Due today" and "Days this week". The rank badge TPL-007 §2.1 planned was never built | `tpl007Components.ts:1880-1881` |
| two players take turns on one keyboard; **rocket B looks like a name, not a second profile** (unmeasured) | `Race/Setup` `nameWord`, `Race/Play` `rpTurnIsB` |
| TPL-007's rulings: points are garnish, no leaderboards, no hard streak, no reward a child cannot earn | TPL-007 §1 items 8–10, §7 |

## 3. Design

### 3.1 The earning rule (play-test values: Richard delegated the numbers on 2026-09-13 and gives feedback after playing)

Keep the four amounts in one exported constant (`STAR_RULE`) that the gates read, so his feedback is a one-line change.

| event | ⭐ | why this and not something else |
|---|---|---|
| a right answer | **1** | the industry norm; tied to a learning action. **The same in Practice and Défi, fast or slow.** Speed already moves the rocket (`gain`), and a timeout is simply not a right answer |
| a race finishes (a rocket lands) | **5**, win **or** lose | paying the same for a loss keeps it "you finished", not "you beat the computer" |
| a skill's mastery rises (new→familiar→proficient→mastered) | **10** | the ruled progression is mastery, so the biggest payout goes there. **It is paid once per level per skill**: a demotion followed by re-promotion pays nothing |
| a new personal best (§3.3) | **5** | unexpected praise; the reward both sides of the overjustification debate agree is safe |

**Not paid:** minutes played, a restart (RKT-006; answers already graded keep their star, but there is no finish
bonus), a winning margin, speed, days in a row.

A typical race is 10–15 questions, so about 15–25 ⭐ each. RKT-011 sets the unlock thresholds against that.

### 3.2 Where the stars live: inside `model`, so saving stays idempotent

- `model.stars` (the total) and, per skill, `st.paid` (the highest mastery level already paid for).
  - Grade answer adds the answer's stars to `model.stars` and returns `starsEarned`.
  - `Save model` goes on replacing the model as it does today. **A repeated `graded` save cannot double-count,
    because nothing is incremented at save time.**
- The finish bonus and the personal best are not answers. A small `Logic/Finish race` script adds them.
  - It is keyed by a race id that Race/Play mints on `start`, and stored as `model.lastRaceId`. A second
    `Finished` for the same race pays nothing.
  - Restart (RKT-006) mints a new id and pays no finish bonus for the race it abandoned.
  - 🔎 **As built in RKT-006 (session 7):** there is no race id yet. Start (`rpIn.start`), Play again (`rpResult.again`) and Restart
    (`rpRestart.onClick`) all enter the same reset, `rpResetA.do`, so mint the id on that one path and every way into a race gets
    one. Change the race (`rpSettings.onClick`) sends `rpRound.abandon` (the clock stops) and `changeRace`; it starts no race, so it
    mints nothing.
- **Existing profiles** (no `model.stars`) are migrated on first read:
  - the grant is `stars = 10 × (sum of mastery levels already reached)`
  - each skill's `paid` is set to its current `m`

  A child who played before today is not behind a newcomer, and is never paid twice.
- **Save code v2** packs `st` (stars), each skill's `paid`, and the personal bests. A v1 code still decodes, through
  the same migration.

### 3.3 Personal bests (per mode, practice and défi)

- The stored value is the **most right answers in a row within one race**. It has no time in it.
- Beating it shows **"Nouveau record ! / New best!"** on the result screen, with +5 ⭐.
- **The first race sets the record silently.** There is nothing to beat yet, and a record on the first try means
  nothing.

### 3.4 Where the stars are shown, and where they are not

- **Race/Result:** "+18 ⭐" counts up under "how many were right", broken down on one quiet line ("12 right · landed
  +5 · new skill +10"). Reduced motion shows the final number with no count-up (`tests/reducedMotion.ts`).
- **Home:** a third Stat, "Stars ⭐", in the `you` tone, beside Due today and Days this week. RKT-011 adds the bar to
  the next unlock.
- **🔴 Never on `Game/Profile card`.** The who-is-playing page shows every sibling's card side by side, and a
  number there is a family leaderboard for exactly the age the briefing warns about (§1.4).
- In two-player races: **measure first** whether B's answers are graded into the active profile's model. If they
  are, that is a defect in its own right (B's answers change A's mastery). Register it in P78's defect register,
  and pay stars only for A's turns until it is fixed.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED on today's build:** after a finished race, the stored profile has no stars field, and the save code carries none. |
| AC2 | Engine gate: the earning table in §3.1, per row, with a sabotage arm per row (a timeout pays 0; a slow right answer pays the same as a fluent one; a loss pays the same finish bonus as a win). |
| AC3 | Engine gate, **monotonic**: 1,000 seeded answers, a third of them wrong, with forced demotions and re-promotions. `model.stars` never decreases, and each skill's mastery bonus is paid at most once per level. Sabotage: pay on re-promotion, and the gate goes RED. |
| AC4 | Engine gate, **idempotent**: the same `graded` model saved twice and the same race id finished twice each give one payout. |
| AC5 | Engine gate: migration and save code. A v1 profile with known mastery gets exactly the §3.2 grant and is not paid again for those levels. Encoding v2 and then decoding gives the same stars, `paid` values and bests. A v1 code still decodes. |
| AC6 | Template gate: no star number is bound anywhere inside `Game/Profile card` (walk its nodes and connections). Sabotage: bind it, and the gate goes RED. |
| AC7 | Drive, FR 390×844 and EN 1366×768: play a race to the planet. The result screen shows the earned count, and it equals the stored delta. Home shows the new total, and so does a reload. |
| AC8 | Drive: Restart mid-race (RKT-006) pays no finish bonus. The stars from answers already graded are still there. |
| AC9 | Drive, reduced motion: the result shows the final number with nothing animating. |
| AC10 | Richard (or a child) plays two races and says, in their words, whether the stars read as theirs. Recorded here. |

## 5. Record

### Session 9 (2026-09-13)

- **The drive is `scripts/devtools/drive-rkt010-stars.js`.** Every number on screen is graded against the stored profile, never
  against another number on screen.
  - **race** (FR 390×844, EN 1366×768), to the planet twice. Clauses: `stored` (known-firing), `hasStars`, `resultStars`, `delta`,
    `animated`, `again`, `home`, `reload`, `cardClean`, `quiet`.
  - **restart** (the same cells). Clauses: `paying` (known-firing), `kept`, `noLanding`, `delta`, `quiet`.
  - **`--reduced`** (FR 390×844): `still`.
- **AC1 reproduced RED ✅ on RKT-007 build 3 (`rocket-k3`, before RKT-010), FR 390×844, RED_EXIT=1: 2/10.**
  - `stored` and `quiet` pass: the store was read, and `answered` went 0 → 8 → 18.
  - 🔴 Failing: `hasStars` (the stored model is `{answered: 8}` and has no stars), `resultStars` and `delta` (no "+N ⭐"), `again`,
    `home` and `reload` (Home shows no stars tile), and `cardClean` (its known-firing half: Home shows no ⭐ either).
  - Static reading of the checked-in artefact at the same time: 0 component files mention `stars`, and 17 mention `answered`.
- **§3.4 measured first, from source: player two's answers are graded into player one's model.** Registered as **D63** in P78's
  register. Stars are paid on player one's turns only, as §3.4 says.
- **Build 1, as designed:**
  - **One table.** `STAR_RULE = { right: 1, finish: 5, level: 10, best: 5 }` is exported from `tpl007Scripts.ts`. The scripts read it
    through `STAR_HELPERS`, and the gates read it directly.
  - **`withStars(model)` migrates on first read.** It grants 10 per mastery level already reached and sets each skill's `paid` to its
    `m`. Grade answer runs it *before* the answer moves any mastery.
    - Active profile runs it on a copy, so Home shows a pre-RKT-010 player's grant before their first new answer.
  - **Grade answer** (new inputs `raceId`, `forB`; new outputs `starsEarned`, `stars`):
    - pays 1 for a right answer, fast or slow, and 0 for a timeout
    - pays 10 × (m − paid) when a level rises past `paid`, then raises `paid`. A demotion never lowers it.
    - `forB` (player two's turn) pays nothing, but still raises `paid`
    - keeps `model.race = { id, run, bestRun, rightStars, levelStars }` for the current race id
  - **`Logic/Finish race`** (new): if `raceId` is set and is not `model.lastRaceId`, it pays the landing (5) and the personal best.
    - The best is `bestRun` per mode (`practice` / `defi`). The first race sets it without paying, and a longer run pays 5.
    - It publishes the model, `starsText` ("+18 ⭐") and `why` ("Nouveau record ! · bonnes réponses +4 · arrivée +5 · record +5").
    - It has no winner input, so a loss pays the same landing as a win.
  - **Race/Play:**
    - `rpMint` (a Function) mints the id on `rpResetA.done`, the one reset that Start, Play again and Restart all enter. Change the race
      does not enter it.
    - `rpTurnIsB → rpRound.forB`.
    - Both landings run `rpFinish` on `rpRound.model`. Its model leaves through the same Model and Graded outputs a round uses, so
      Pages/Race saves it with no new wiring.
  - **Race/Result** gains `rrStars` (class `rkt-stars`, which pops in 700 ms after the card and is stilled under reduced motion) and
    `rrWhy`.
    - 🟡 **Not built as written:** the number pops in rather than counting up. A count-up needs a per-frame number the Text node
      cannot take from CSS. AC9 holds either way.
  - **Home** gains a third Stat, "étoiles gagnées ⭐ / stars earned ⭐". The row already wraps on a phone.
  - **Save code v2:** `v: 2`, `st` (stars), `b` (bests), and `paid` as index 8 of each skill. The prefix stays `RS1.`, and v1 still
    decodes, then migrates on first read.
  - **Gates added:**
    - engine: AC2 (the table, with four sabotage arms), AC3 (1,000 seeded answers, known-firing on re-promotion, sabotage: a demotion
      lowers `paid`), AC4 (with a save-time sabotage), AC5 (migration with a sabotage, v2 round trip, a hand-built v1 code), and the
      profile list has no stars
    - template: AC6 (Profile card, known-firing on Home, sabotage), the mint and finish wiring, `forB`, the result and Home wiring,
      and `rkt-stars` in the reduced-motion list
- **Build 1 (`rocket-s1`): GEN_EXIT=0, gates 231/231, `typecheck:mcp` 0, DEPLOY_EXIT=0.**
- **RKT-010 drive on build 1: STARS_EXIT=0 and STARS_REDUCED_EXIT=0. AC7, AC8 and AC9 are green.**

  | arm | cell | reading |
  |---|---|---|
  | race | FR 390×844 | 10/10. Race 1 "+13 ⭐ · bonnes réponses +8 · arrivée +5", stored 0 → 13. Race 2 +13 (a run of 7 again, so no record), stored 26, new race id. Home 26, and 26 after a reload |
  | race | EN 1366×768 | 10/10. Race 1 +13 (best set silently at 4). Race 2 **"+18 ⭐ · New best! · right answers +8 · landed +5 · new best +5"** (a run of 5), stored 31. Home 31, and 31 after a reload |
  | restart | FR 390×844 | 5/5. Three answers stored 3; Restart kept 3 and paid nothing; the race after it showed +13, stored 16 |
  | restart | EN 1366×768 | 5/5. The same shape: stored 2 before Restart, 2 after it, then +13 → 15 |
  | race `--reduced` | FR 390×844 | 6/6. `still`: animation `none`, opacity 1 the moment the result showed. The motion arm's `animated` read `rkt-pop` |

  - `cardClean` passed in both cells: Home shows ⭐ and the Profiles page shows none.
  - ⚠️ `noLanding` is weaker than it reads: a restarted race never lands, so nothing could have paid a landing. The real guard is
    engine AC4 (one landing per race id) plus the template gate that Change the race does not mint.
  - Looked at:
    - [x] the FR 390×844 result: the card fits, with "+13 ⭐" and the breakdown between the count and the two buttons
    - [x] EN Home at 1366×768: three tiles in one row
    - [x] the Profiles page: face, name and class only
    - 🟡 **For Richard:** on a 390×844 Home the stars tile wraps to a row of its own, about 150 px more before "Jouer", on a Home
      whose header is already three rows (RKT-008 AC2).
- **The regression set on build 1: 16 of 18 exit 0, including the full RKT-007 drive 8/8 and RKT-006 12/12.**
  - FADE and PAD_DECIMAL went red, and both are drive faults.
    - **Fade:** when a wrong answer ended the race, the teach drive took the empty verdict for a right answer and reset that skill's
      miss count.
      - Fixed.
      - On the re-run the fix's note fired twice and `step` was 40/40.
      - `fading` could not be graded there, because no skill was asked three times.
    - **Decimal:** no decimal question came up in 45 rounds. Re-run.
  - Details in NEXT-SESSION-PROMPT's Traps.
- **Left:**
  - AC10: Richard or a child plays two races and says whether the stars feel like theirs

## 6. Not this task

- Spending the stars, and the unlock bar: [RKT-011](RKT-011-THE-HANGAR.md).
- The rank badge (TPL-007 §2.1). If it is built, it comes from mastery, not stars, and it is still never shown on a
  sibling's card.
- Any streak.
