# RKT-006 — Restart from inside the race

🔴 **Once a race starts, the only way out is Home.** Finding 6: *"If the player sees they're losing
they should be able to reset from within the game."*

## 1. The person sentence

**A child who is losing taps Restart; both rockets go back to the start and a fresh question is
waiting — or they step back to change the race settings.**

## 2. What was measured (2026-09-13)

| reading | where |
|---|---|
| `Race/Play.start` already zeroes both rockets and the round count, then asks a question | `tpl007Components.ts:1361-1367` |
| only Race/Setup's Start fires it (through `rcSetPlaying`) | `PAGE_RACE` |
| there is no in-race control; `racePlaying` returns to false only on `finished` | |
| the model is saved every round (`rcSave` on `graded`), so learning survives a restart — which is right | |

## 3. Design

- Two small controls in the race stage: **Restart** (same settings) and **Settings** (back to
  Race/Setup, race abandoned). **Decide** whether to confirm, and after how many rounds — a one-tap
  "Sure? Your rocket goes back to the start."
- Restart also stops the countdown, closes the banner and any teach card (RKT-004), and gives the turn
  back to player A in a two-player race.
- ⚠️ D57: rocket progress lives in `Variable`s (`raceProgressA/B`), which are global by name. That is
  harmless with one race per page; say so in the component description.
- An abandoned race counts as a loss nowhere. There is no race stat yet; if RKT-002's result screen
  adds one, it must not count restarts.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | Drive, one player: answer three rounds (rockets moved, read); Restart → both progress values 0, **read on the kit's rendered sprite positions, not only the variable**; round count 0; one prompt showing; banner closed; clock full in Défi. |
| AC2 | Two-player arm: Restart on player B's turn → it is player A's turn. |
| AC3 | Settings arm: back to setup with the previous choices kept; Start begins a clean race. |
| AC4 | The model's `answered` count is the same after a restart as before it (learning kept). |
| AC5 | Défi arm, abandoned: Restart while the clock runs → no timeout verdict arrives afterwards. A stale `Timer` firing into the new race is a self-healing defect that only an abandoned arm can see. |

## 5. Record

- **Decided (session 7, 2026-09-13): no confirmation.** A child who is losing wants out in one tap. Restart costs nothing that
  was learned (the model is saved on every `graded`), and RKT-010 pays no finish bonus for an abandoned race. The two controls sit
  above the course, away from the answer and Next, so a tap meant for those cannot land on them. If Richard's replay shows
  accidental restarts, a confirm after three rounds is the fallback.
- **Measured from source before building:**
  - A Delay's `Restart` calls the scheduler's `start()` again, and its `Stop` means *"Finished never fires for it"*
    (`noodl-viewer-react/src/nodes/std-library/timer.ts:67-108`). So a Restart that asks a new question re-arms the deadline
    and cannot leave a stale one behind. **Change the race asks no new question**, so before this task nothing would stop the
    clock of the question it left. Race/Round gains `Abandon` → `rdClock.stop`.
  - 🔴 Predicted, not yet measured: `Race/Setup` writes its defaults (maths, one player, practice) on its card's `didMount`, and the
    card remounts every time the setup comes back. So "Change the race" would reset the child's choices (AC3). The settings arm
    measures it on build 1 before anything is fixed.
- ⚠️ **Names:** "build 1/2/3" below are this task's builds. The build RKT-006 was reproduced on is **session 6's deploy
  (`rocket-p3`, served on 8768)**, which the phase hand-off also calls "build 3".
- **AC1 reproduced RED ✅ 2026-09-13 — session 6's deploy (`rocket-p3`, before RKT-006), `drive-rkt006-restart.js --arm solo --lang fr --only 1366x768`:**
  `moved` passed (three right answers moved rocket A, sprite and `raceProgressA` both, which is the known-firing signal), and
  `control` FAILED: *"restart null, reachable false"*. There is no in-race control.
- **Build 1 (2026-09-13): GEN_EXIT=0, gates 199/199, `typecheck:mcp` 0, DEPLOY_EXIT=0.** Restart and Change the race above the course
  (mounted by `rpPhase.controls`: racing and teaching, not over); Restart wired as Play again; Change the race → `rpRound.abandon` →
  `rdClock.stop`, then `changeRace`. Driven, FR/EN × 1366×768/390×844, 12 cells (RESTART_EXIT=1):

  | arm | reading |
  |---|---|
  | solo | `control`, `spritesHome`, `onePrompt`, `learning` (AC4), `freshClock`, `countAfter` all 4/4. 🔴 `clockFull` **0/4**: the bar read 0.36–0.47 just after Restart. `moved` 3/4, a probe fault: the solver guessed all three FR prompts wrong, so A never moved (the clause now takes either rocket) |
  | two | `turnB`, `control`, `turnA` 4/4 (AC2) |
  | settings | `control`, `setupBack`, `noStale` 4/4. 🔴 **`choicesKept` 0/4, as predicted**: back at setup the Variables read practice / 1 / maths, and B's name box is unmounted. So `cleanStart` 0/4 (no turn line, no clock: it started a solo practice race) |

  🔴 **`clockFull` is not the restart's: the bar never refilled for ANY new question.** The control, `clockAtNext` (a question
  reached by Next, read as it shows), on session 6's deploy (`rocket-p3`, no RKT-006 at all), EN and FR at 1366×768: the bar was at **0.50 and 0.63**. From
  `animate-to-value.ts:111-124`: the countdown wrote target 100 and then 0 in one burst, so its Animate saw one target, and a target equal to
  its end value is ignored. That a duration of 0 is not a jump is **inferred from source, not measured**. Build 2 changed both
  things (the 40 ms kick and the 1 ms jump), so which of the two was needed is not isolated. The Défi bar has never shown how much time a question had left. It blocks AC1's
  clock clause, so it is fixed here (build 2): `cdKick`, a 40 ms Delay, puts empty a frame after full, and the jump takes 1 ms.
  `noStale` passing grades nothing yet: no build without the `abandon` wire has been driven. A sabotage arm is owed.
- **Build 2 (2026-09-13): GEN_EXIT=0, gates 201/201, `typecheck:mcp` 0, DEPLOY_EXIT=0.**
  - **Race/Setup writes its defaults once.** `rsSeeded` is a States node with `fresh` as its first state, and it gates the init chain
    that `didMount` used to run on every mount.
  - **The countdown refills** (`cdKick`).
  - Two gates were added, and the stage-children gate was updated for `rpControls`.
- **The sabotage arm for `noStale`, the build half:** the source was snapshotted, and exactly one wire was removed
  (`rdIn.abandon → rdClock.stop`; count 1 → 0). The generator exited 0. The template gate went **RED on exactly that test** (1 failed, 41
  passed), and the sabotaged build was deployed to `rocket-sab`. The source was restored and is byte-identical to the snapshot (`cmp`), and build 2 was
  generated from it. The drive half (does `noStale` read RED on `rocket-sab`?) runs first in the build 2 drive chain.
- **Build 2 driven (2026-09-13, one drive at a time):**

  | drive | reading |
  |---|---|
  | **sabotage** (`rocket-sab`, no `abandon` wire), settings FR 1366×768 | 🔴 **`noStale` RED**: `answered` 1 → 2 and `countdownExpired` true, 58 s after Change the race. The question left behind graded itself. So the clause can see the defect, and the wire is what prevents it |
  | RKT-006, 12 cells | `two` 4/4 (AC2). solo: `moved`, `control`, `spritesHome`, `onePrompt`, `learning`, `freshClock`, `countAfter` 4/4. settings: `control`, `setupBack`, **`noStale` 4/4**. ✅ **Setup keeps Défi and two players** (`raceTimed` challenge, `racePlayers` 2), but 🔴 **B's name box comes back empty** (`nameBox ""`). The bar refilled (0.78–0.83, against 0.36–0.63 on build 1), but a single reading against a 0.85 threshold grades how late the probe looked. The clock clauses now extrapolate when the bar was last full from two readings |
  | reward, fade, touch, decimal, azerty, fine, home-lang, wrap 60/60, look 14/14 | all pass |
  | 🔴 **stage** (1280×720), **keys** (1280×720), **typing** (FR 1280×720) | `foldWorst`: with the longest correction, Next ends at **743 on a 720 screen**. keys also has `focusNext` 2 rounds. typing: one cell failed |
  | 🔴 **teach / hold** (390×844) | `cardWorst`: with the longest step, Got it ends at **845–867 on an 844 screen** |

  **Every regression is the controls row's vertical cost** (about 56 px: a 44 px button row plus the stage's 12 px gap). Seen in
  [`rkt006-solo-fr-390x844-after-restart.png`](rkt-shots/rkt006-b2-solo-fr-390x844-after-restart.png): a full row between the header and
  the course. The controls have to cost the stage no height.
- **Decided for build 3: in a live race the page's bar is hidden, and the controls keep their row.** The bar cannot hold the
  controls on a phone. A 390 px screen has 358 px inside the gutters. Measured on the build 2 phone shot, Recommencer is 148 px,
  Changer de course 180 px, Accueil 102 px, and the face with its name about 100 px. So the bar would wrap to more rows, not fewer.
  Hiding the bar (44 px plus the page's 16 px gap) gives back more than the controls row costs (44 plus 12), so every screen is at least back to the budget session 6's deploy passed every drive on. The
  child's face is already on their rocket, and Home is one tap past Change the race (the setup shows the bar again).
  🟡 **For Richard's replay:** no Home button inside a live race.
- 🔴 **B's name box comes back empty: a runtime defect.** A Text Input renders `props.startValue` when it mounts
  (`text-input.ts:372-373`), and typing never writes `props.startValue`. So whatever a person typed is gone the next time the field
  mounts. The template works around it by feeding the typed text back into Start Value (build 3). The runtime is not fixed; it is
  owed to P78's register.
- **The clock clauses graded honestly (2026-09-13).** `clockAtNext`, `clockFull` and `cleanClock` no longer compare one reading
  with a threshold. Two readings 600 ms apart give the glide's slope, the slope gives the moment the bar was last full, and it must be at most
  1 500 ms before the question was seen. **Control on session 6's deploy (`rocket-p3`), FR 1366×768: RED:** *"bar 0.47 → 0.43 over
  606 ms; last full 8027 ms before the question was seen"*. So the clause sees a bar that never refilled.
- **Build 3 (2026-09-13): GEN_EXIT=0, gates 202/202, `typecheck:mcp` 0, DEPLOY_EXIT=0.**
  - The race page's bar is hidden in a live race. Header `hdShown` is `m !== false`, and Home and Profiles do not wire Mounted.
  - B's name is kept (`rsNameKeep`).
  - D61 is filed in P78's register.
- **Build 3 driven (2026-09-13, one at a time):**

  | drive | reading |
  |---|---|
  | stage 10/10, keys 4/4, reward 4/4, teach 10/10, hold 4/4, fade, touch 4/4, decimal, azerty, fine, typing 4/4, wrap 60/60, look 14/14 | ✅ **every build 2 regression is gone** (Next back on a 1280×720 screen, Got it back on a phone, the typing keyboard fits) |
  | RKT-006 | `two` 4/4. settings: `control`, `setupBack`, **`choicesKept` 4/4 (Défi, two players and "Tom" kept)**, `noStale` 4/4, `cleanStart` 4/4. solo: all but `clockFull` 4/4. 🔴 `clockFull` 0/4: *"the bar is not gliding: 0.88 then 0.94"*. The bar was still refilling when read, so the refill is a short glide, not a jump (the drive run predates the fix to its own Restart wait). 🔴 `cleanClock` 3/4: *"last full 1575–2061 ms before the question was seen"*. The drive sleeps 2.1 s after Start before it looks. **Both are probe faults.** The clock clauses now date the refill from the press, wait for the glide down, and record a 100 ms trace after Restart |
  | 🔴 **home-lang, 2/2 cells** | **Home lost its whole bar**: EN 0, FR 0, Switch player 0. The screenshot `rkt008-1366x768-home-en.png` has no face, no Home and no toggle. The header's new port was named `mounted` and read `m !== false`; Home never wires it, and the bar was hidden anyway. Whether an unwired boolean delivers `false` or the name collides with the instance's own Mounted port is **not isolated**. Build 4 renames it `hideBar`, read as `hide !== true`, fed by `racePlaying`: that is safe under either cause, and the gate forbids a header port named `mounted` |

  `drive-rkt008-home-lang.js` was the only drive that looked at Home's bar. wrap and look passed on a Home with no bar.
- **Build 4 (2026-09-13): SYNTAX_EXIT=0, GEN_EXIT=0, gates 202/202, `typecheck:mcp` 0, DEPLOY_EXIT=0.** The press-dated clock clause, controlled on
  session 6's deploy (`rocket-p3`, FR 1366×768): **RED** with *"bar 0.47 → 0.45 over 608 ms; last full 15691 ms before Next was pressed"*,
  so the clause still sees a bar that never refills.
- **Build 4 driven (2026-09-13):**

  | drive | reading |
  |---|---|
  | **RKT-006, 12 cells** | ✅ **ALL PASS (RESTART_EXIT=0)**: solo 9/9 × 4 (including `clockAtNext` and `clockFull`), two 3/3 × 4, settings 6/6 × 4 (`choicesKept`, `noStale`, `cleanStart`, `cleanClock`). The bar after Restart, traced (FR 1366×768): `1:0.92 106:1 210:0.99 … 1475:0.87`. It is full within about 100 ms and glides down from there |
  | wrap 60/60, look 14/14, stage 1280×720 + 390×844 4/4, teach and hold 390×844 2/2 | all pass |
  | 🔴 **home-lang, 2/2 cells again** | EN 0, FR 0, Switch player 0 on Home, **with the port renamed `hideBar`**. So the name was never the cause: that hypothesis is **excluded by measurement**. What is left is the wire. An Expression wired straight into the bar's Mounted hands Mounted its unevaluated result when Home never feeds it (cf. "a wire seeds its target"). Build 5 uses session 6's proven pattern: a States node whose first state is `shown`, mounted only through `hdBarRoom.on`, and a gate pins it |
- **Build 5 (2026-09-13): GEN_EXIT=0, gates 202/202, `typecheck:mcp` 0, DEPLOY_EXIT=0.** The header's bar is mounted by `hdBarRoom`
  (first state `shown`). Driven, one at a time, all exit 0:
  - **RKT-006 12/12 cells, every clause.**
  - home-lang 9/9 × 2: Home's bar, EN/FR and Switch player are back.
  - stage 1280×720 + 390×844 4/4; teach and hold 390×844 2/2; wrap 60/60; look 14/14.
- **Looked at (build 5):**
  - [Home, FR phone](rkt-shots/rkt008-390x844-home-fr-b5.png): the bar is back (face, Changer de joueur, EN/FR, still three rows,
    which is RKT-008's to fix).
  - [After Restart, FR phone](rkt-shots/rkt006-solo-fr-390x844-after-restart-b5.png): no page bar; Recommencer and Changer de course on
    the top row; both rockets home; the bar near full; the question card ends with room to spare.
  - [Change the race, FR phone](rkt-shots/rkt006-settings-fr-390x844-settings-b5.png): the setup is back with Maths, Deux joueurs, Défi
    and "Tom" kept, and the bar (with Accueil) shows again.
- **Status: AC1–AC5 ✅ (build 5).** AC6 waits on Richard. Build 5 is served at `http://127.0.0.1:8769/`.
  - 🟡 **Two decisions for his replay:** no confirmation on Restart, and no page bar (so no Home) inside a live race.
- Probe faults on the drive's first run: it looked for a `.rkt-prompt` class that the template never had, so every cell read NOT
  REACHED. The stage drive only ever used that class with a largest-font fallback. The prompt is now found as that drive finds it,
  and a single question is counted by its answer surfaces.
