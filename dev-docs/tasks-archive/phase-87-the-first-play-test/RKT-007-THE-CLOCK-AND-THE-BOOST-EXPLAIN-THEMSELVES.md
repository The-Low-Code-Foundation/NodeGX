# RKT-007 — The clock and the boost explain themselves

🔴 **The game measures time in both modes and tells the child nothing about it.** Finding 7:
*"a small countdown bar but there's no visual info about what happens if it gets to zero, how long
you have left … when you answer quickly or slowly, you don't see any visual feedback about why you
went further or less far."*

## 1. The person sentence

**In Défi the child sees how long is left and knows what happens at zero. In Entraînement they see,
after each answer, that quick and right sent the rocket further — and by how much.**

## 2. What was measured (2026-09-13)

| reading | where |
|---|---|
| Défi's clock is `Game/Countdown bar`: a 300×12px bar, no number, no label; it turns rose below 30% | `tpl007Components.ts` `COUNTDOWN` (842) |
| at zero the grader runs with `timedOut`: outcome `timeout`, a "Time's up" banner, the rocket does not move — and nothing says so beforehand | |
| in both modes the grader's speed factor is a **full step when `elapsed ≤ fluentMs`, then linear down to 50% at 2 × `fluentMs`**, and 0 when wrong | `tpl007Scripts.ts:610-611` |
| the computer's gain is 0.35–0.70 of a step, set by the player's rating | `tpl007Scripts.ts:612` |
| the banner shows only the outcome word ("Fast and correct!" / "Correct"); the grader's `elapsedMs` and `gain` outputs are read by nothing | |
| `fluentMs` per skill runs from 2 500 to 12 000 ms | `tpl007Curriculum.ts` |
| TPL-007 research finding 4: no visible clock during practice. The answer to Richard is **after** the question, not during it | TPL-007 §1 |
| 🔴 **Added in RKT-006 session 7:** the bar **never refilled** for a new question. It read 0.50 and 0.63 as a question after Next showed, on session 6's deploy `rocket-p3` (the countdown wrote full and then empty in one burst, and its Animate saw only one target). So part of "how long you have left" was a bar that lied. Fixed in RKT-006 build 2 (`cdKick`); the numeral this task adds must read the same clock, not a second one | `drive-rkt006-restart.js` `clockAtNext`; `animate-to-value.ts:111-124` |

## 3. Design

- **Défi:** seconds left as a numeral beside a bar that spans the question card; the last 3 seconds
  pulse (colour only under reduced motion); a one-line rule shown at race start and in Setup —
  "Answer before time runs out. Out of time, your rocket stays put."
- **After every answer, in both modes — the boost:** "⚡ 2,1 s — full boost" / "4,8 s — boost 62 %" /
  "wrong — no boost" (decimal comma in FR), with a small meter. On the track, the distance just gained
  lights up as a segment ahead of the rocket, and the computer's move is labelled too.
- **Entraînement** still has no clock during the question.
- Setup explains both modes in one line each; today they are two bare words on a choice row.
- **One formula.** The grader publishes `speed` (0.5–1) beside `fluentMs`; the banner reads them and
  never recomputes. The kit's segment highlight takes a `Gain` input.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | Gate: the percentage shown is the grader's `speed`. Sabotage: change the formula in one place only → RED. |
| AC2 | Drive, Défi: the numeral reads N at t0 and N−2 (±0.5) at t0 + 2 s; the rule line is visible before the first question; a timeout verdict says the rocket did not move, and the sprite's position confirms it. |
| AC3 | Drive, both modes: a fast right answer, a slow right answer (the drive waits real time for one slow arm; `elapsedOverride` is for the gate only) and a wrong answer show three different boost lines, and the rocket moves fast > slow > wrong = 0. |
| AC4 | Entraînement arm: no countdown element is mounted during a question. |
| AC5 | Richard: now he can see why. |

## 5. Record

- **The drive is `scripts/devtools/drive-rkt007-boost.js`** (session 8, 2026-09-13). Two arms × FR/EN × 1366×768/390×844:
  - **defi** clauses: `rule`, `clock` (known-firing), `numeral`, `sameClock`, `pulse`, `timeout`, plus the shared five below.
  - **practice** clauses: `rule`, `noClock` (AC4), plus the shared five.
  - **Shared (AC3):** `lines`, `boostIsGain`, `meter`, `moves`, `segment`.
  - The slow answer waits real time. In Défi it waits 1.6 × the fluent window, read from the bar's own glide; in Practice, 12.5 s.
- **AC2–AC4 reproduced RED ✅ 2026-09-13, on RKT-006 build 5 (`rocket-b5`, before RKT-007), FR 1366×768 (RED_EXIT=1):**

  | arm | reading |
  |---|---|
  | defi 2/10 | `clock` and `moves` pass: the known-firing signals. The bar is mounted, and rocket A moved 0.125 fast, 0.063 slow and 0 wrong (sprite 131 px, 80 px, 0). 🔴 Failing: `rule` (neither line), `numeral` ("no numeral ticked", secs null), `pulse`, `lines`/`meter` (no boost element), `segment` (nothing lit), and `timeout`: the verdict was "Temps écoulé." and the rocket stayed put, but **nothing said so** |
  | practice 2/7 | `noClock` and `moves` pass. 🔴 `rule`, `lines`, `boostIsGain`, `meter`, `segment` fail |

  So today the rocket already moves fast > slow > wrong = 0, and nothing on the screen says why.
  - Seen, not explained yet: the Défi slow answer moved 50 % of a step, not the 70 % the drive aimed for. The drive now prints the limit it read and how long it held.
- **Build 1 (session 8), as designed:**
  - **One formula.** Grade answer publishes `speed` (0.5–1; 0 when wrong or timed out) and `boost`, the line.
    - The line's percentage is `Math.round(speed × 100)`, and the rocket's `gain` is `RACE_STEP × speed`.
    - The banner shows `boost` as sent, and its meter is `round(speed × 48)` px. Nothing downstream reads `elapsedMs`.
  - **The lines:**
    - fluent: "⚡ 2,1 s · turbo à fond" / "⚡ 2.1 s · full boost"
    - slow: "4,5 s · turbo 75 %" / "4.5 s · boost 75%"
    - wrong: "Pas de turbo" / "No boost"
    - timeout: "Ta fusée ne bouge pas" / "Your rocket stays put"
    - 🟡 "turbo" is the French word chosen for boost, for Richard's replay.
  - **The boost shares the glyph's row** (`fbTop`), so the banner gains no row. RKT-006 measured what a row costs on the stage.
  - **Défi seconds** are read off the bar's own Animate: `ceil(currentValue × limit / 100000)`, beside the 300×12 track (kept, because the drives read it). The last 3 seconds swap to `rkt-clock-last`, which pulses; under reduced motion only its colour changes.
    - **An answer now freezes the bar** (Stop → a 1 ms glide to its own current value). It used to glide on under the verdict, so a numeral would have counted down and pulsed while the child read the correction.
  - **The setup's rule line** (`rsRule`) follows the chosen mode:
    - Entraînement: "Pas de chrono. Juste et rapide, ta fusée va plus loin."
    - Défi: "Réponds avant la fin du temps. Temps écoulé : ta fusée ne bouge pas."
  - **The kit's Race Track** takes `targetA/B`. A rise lights the stretch that move gained (`[data-gain]`, `gk-gain`, 3.2 s), growing with the rocket's glide. The computer's rocket gets its own lit stretch.
  - **Not built, on purpose:**
    - A rule line inside the race stage: the stage has no height to give, and the setup says it before the first question.
    - A bar that spans the question card: every drive reads the 300×12 track.
    - A text label on the computer's move.
  - **Gates added:**
    - engine: AC1 over 20 answer times × 2 languages, with a sabotage arm for each of the two places a second formula could creep in
    - template: seven RKT-007 tests
    - kit: three tests, and `gk-gain` in the reduced-motion list
- **Build 1 (`rocket-k1`): KIT_EXIT=0, GEN_EXIT=0, `typecheck:mcp` 0, DEPLOY_EXIT=0.**
  - Gates 215/216. The one red was my own probe: `/fluent/` matched the headline's `fluentWord`. It now matches identifiers that
    carry time, beside a known-firing check. After that, 216/216.
  - RKT-007 drive: **8/8 cells** (Défi 11/11, Practice 7/7).
  - 🔴 **But a new console error in 8 of 8 cells:** `Group (/Game/Feedback banner): "Width" was sent {"value":null,"unit":"px"}`.
  - 🔴 **The Défi slow arm landed on the 50 % floor** in 3 of 4 cells ("7,0 s · turbo 51 %"). The drive's own latency adds about 2 s:
    a fast answer reads 2,2 s. The drive now holds 1.2 fluent windows, not 1.6.
  - Looked at:
    - the setup's Défi line under the mode pills
    - "3" in red beside a red bar
    - "7,6 s · turbo 54 %" with a half meter on the glyph's row
    - after a timeout, "0" beside an empty bar and "Your rocket stays put"
    - the computer's teal stretch lit ahead of it
    - the bar frozen at the moment of the answer ("4" beside a third of a bar under "Bravo !")
    - 🟡 **For Richard:** both lit stretches follow the course's centre line, so when the rockets are neck and neck the computer's
      teal stretch is drawn over the child's.
- **Build 2 (`rocket-k2`): `round((s || 0) * 48)`.** Gates 216/216, typecheck 0, RKT-007 8/8, and the slow arm is off the floor
  ("6,0 s · turbo 75 %", "4.8 s · boost 70%").
  - 🔴 **The null Width was still there, 8 of 8.** So the guard was not the cause.
  - From source: `connectInput` seeds a new wire's target with the source's current value unless it is `undefined`
    (`noodl-runtime/src/node.ts:545-569`). An Expression's Result is `null` until it first evaluates, and it evaluates only once an
    input has arrived (`expression.ts:208-212`). A size port turns a bare `null` into `{value: null}` and reports it
    (`react-component-node.ts:662-689`).
  - A Function's outputs (`simplejavascript.ts:137-166`) and a Component Inputs output (`componentinputs.ts:53-54`) read
    `undefined` before a value exists, and seed nothing.
  - ⚠️ **Not explained:** the countdown's `cdWidth → cdFill.width` has the same shape and has never raised this.
- **Build 3 (`rocket-k3`, served on 8771):** the grader publishes `boostPct` (the line's own number), wired straight into a 100 % fill.
  No Expression sits between them, and a gate pins that the fill's Width has exactly one source, `fbIn.boostPct`.
  - GEN_EXIT=0, gates **216/216**, `typecheck:mcp` 0, DEPLOY_EXIT=0.
  - RKT-007 drive **8/8, with no console errors in any cell**.
  - **The regression set on build 3, all exit 0** (`regress.sh`, one drive at a time, finished 2026-09-13 19:19):

    | drive | reading |
    |---|---|
    | stage | 10/10 cells |
    | keys | 4/4 |
    | reward | 4/4 |
    | teach | 10/10 |
    | hold | 4/4 |
    | fade | 1/1 |
    | pad | touch 4/4, decimal 2/2, azerty 2/2, fine 1/1, typing 1/1 |
    | home-lang | 2/2 (9/9 clauses each) |
    | RKT-006 restart | 12/12 |
    | wrap | pass |
    | look | 14/14 |
    | RKT-007 Défi under reduced motion (FR 1366×768) | 11/11 ("7,2 s · turbo 78 %" on the slow arm) |

  - The log was read drive by drive (`<NAME>_EXIT=` lines), not from the background command's exit.
