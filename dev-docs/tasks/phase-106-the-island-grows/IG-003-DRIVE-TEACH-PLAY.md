# IG-003 — Drive, Teach, Play: try it first, then lock it in

**Opened 2026-09-28**, from README §1 points 2 and 3, rulings R4 and R5. **Status: ✅ s3 — AC1–6 built and driven (§7); Richard reads the ig3 FR lines.** Depends
on IG-001 (D10 the pad). Lane B. **Session 3 (2026-09-29): built, AC1–6 driven — §7.**

## 1. The person sentence

> **A child presses Drive and walks the robot around the plot with the pad, trying things, nothing
> remembered. When she has the moves, she presses Teach and does them again; now every press is a block.
> Play runs the blocks. The Predict button is gone; an islander sometimes asks "show me where it stops"
> and says "you were right!"**

## 2. What it is

- **Three states on the bar** (`cg003Components.ts` Workshop): **Drive · Teach · Play · One step · Start over**.
  Drive shows the pad (IG-001 D10's allowed keys) with `record = false`: `RECORD_STEP_SCRIPT` steps the world
  and does not push a block. Teach is today's behaviour. Switching Drive → Teach resets the robot to the
  request's start (the recording must replay from the start, README §1 point 2's trap) and says so in one
  line: "Back to the start. Now show {b} the moves." Play and One step as today. The program panel greys
  while driving.
- **Free play** opens in Drive; a request opens in Drive too, with the islander's card above.
- **Predict, re-entered as a challenge (R5).** The button goes. A request may carry `challenge: 'predict'`;
  on those, when the program is non-empty and unplayed, the islander's card says "Before you press Play,
  tap where {b} will stop." A hit shows "You were right!" with a tick on the tile and then plays; a miss
  shows the flag on the real end tile and the existing `hintPredictMiss`. One step cancels the challenge for
  that run. Two requests carry it: the tulips (band 10–12 only) and one of IG-006's reads.
- **Band 7–9** gets Drive too (it is the free-roaming the younger band wanted); the challenge never shows
  there.

## 3. Acceptance criteria

1. Page drive: in Drive, four pad presses move the robot four tiles and the program stays `[]`; the block
   count reads "0 blocks".
2. Drive → Teach resets the robot to the start; the same four presses record four blocks and the robot is
   at the same end tile as in 1; Play replays from the start and ends there.
3. Teach → Drive keeps the program; driving does not change it; Play still runs it.
4. No `plPredict` in the generated template; on the tulips request at band 10–12 with a program in place the
   challenge line shows; a correct tap shows the tick line then plays; a wrong tap shows the flag and the
   miss hint; at band 7–9 nothing shows.
5. The hint table does not fire on Drive presses (a bump while driving is a bump animation, not a hint);
   the first hint after Teach begins is `hintEmpty` or the pattern hint, never a leftover.
6. Both languages, both sizes, 0 console errors; engine + template gates; byte-identical regeneration.

## 4. How to build it

The mode is one `States` node (`drive | teach | play`) with `useTransitions: false` (P105 trap D49); the pad
gets a `record` input; the Runner's `stop` is called on every transition. The challenge is a flag on the
request, read by Start world and the Owl row.

## 5. Gates

As IG-001 §5; the P105 page-drive wrappers gain the three-state clauses.

## 6. Traps

Teach after a Play used to continue from where the run ended while the recording replayed from the start:
the reset on entering Teach is the fix and the AC. `gardenRun` reset (IG-001 D2) must run on the Drive → Teach
transition too. A `Select` in a Modal closes it (editor-ui pointers): the islander's card is a card, not a
modal.

## 7. Session 3 (2026-09-29, lane B, worktree `ig003-drive` cut from `f182a2d9e`)

**Built, in three commits on `ig003-drive`:** `0c1486b25` (the vocabulary: `challenge?: 'predict'` on the request, the
`tick` kind in both kits, the Block List's `?`, the leftover-win fix in Choose hint, the `ig3` words; kits rebuilt, template
regenerated), `3662ce15c` (the Workshop: the mode, the pad, Teach start, the challenge, the `?` wired; template
regenerated), `a966c1b53` (the drives). This docs commit follows. Every line the task and README §1 cite was re-measured
first; all still stood (Predict at `plPredict`, the pad recording every press, `gardenRun` reset by Stop since IG-001 D2).

- **The bar** is Drive · Teach · Play · One step · Start over (`.bg-i-drive` new, the mockup's wheel; Teach keeps
  `.bg-i-rec`; `plPredict`, `plStop` "Done teaching", `plPredictLine` and `.bg-i-predict` are gone). Drive is the mockup's
  motion-blue pill (a new `btn` kind); the mode on wears the mockup's ring (`.bg-mode-on`: ink, then white).
- **The mode** is one `States` node `plMode` (`drive,teach,play`, `useTransitions: false`) carrying `mode`, `teaching`,
  `padShown`, `record` and four class strings. A request, free play and Start over open in **Drive** (`plStart.ran →
  to-drive`). Drive: the pad for the request's allowed actions (IG-001 D10's `Pad keys`), the robot moves by the engine's
  step, **nothing is recorded** — `RECORD_STEP_SCRIPT` takes `record` (unset or anything but `false`/`'no'` records: the
  P105 callers and tests), and the program Variable is written only through `plRecGate` (`recorded`), so no program change
  reaches the hint. The Runner's `stop` runs on Drive and on entering Teach; Play and One step drive the Runner as before
  and move the mode to `play` (the pad goes). The steps panel "greys": the list sits on `--paper-2` with the note
  "Just driving: nothing here changes. Press Teach and every move becomes a block." — never faded (P105 ruling 5; the
  contrast clause measures it). A tag on the world says "Just driving" / "{b} is learning…"; one line under the world
  says "Just driving: nothing is remembered." / "Back to the start. Now show {b} the moves." (`Logic/Mode line`).
- **Teach** (`plTeachGate`: a second press while teaching does nothing) empties the run (Runner stop → IG-001 D2's reset →
  Choose hint), clears a miss and the challenge outcome, clears the teach bumps, and puts the robot where the recording
  continues: **`Logic/Teach start`** = the request's start world, then the program already there run with no Olive
  (`runToEnd`). With no program that is the start (AC2); with blocks it is where they end, and the line says
  "{b} is where your steps end. Show {b} what comes next." Teach → Drive keeps the program (no transition writes it).
- **AC5 in the engine** (`CHOOSE_HINT_SCRIPT`, the brief gives it to this lane): a met goal with no run behind it is not a
  win (`goalMet && ran`). Goal met keeps its last answer until the next run ends; after Teach emptied the run, the old
  "Perfect!"/"did what you said" could come back. Gated red first (137 → 1 red), then green.
- **The challenge (R5).** `challenge: 'predict'` on `tulips-three` and on **`sami-thanks`**: of IG-006's three it is the
  one whose Olive block (a thank-you) never moves the robot, so the tile `runToEnd` predicts (asks take the fallback) is the
  tile the real run reaches with the stub's scripted answer **for any program**, not only the reference. Mamie's note is
  the counter-example in the gate (`read → if red → fwd` ends one tile apart with "red tulip" vs the fallback); the vote on
  `rock-flower` can steer the robot the same way. **`Logic/Challenge`** arms at band 10–12 only, on a request carrying it,
  while the program has blocks, no run is live, and it has not been settled for this program text (`gardenChallengeFor`:
  Play, One step and a guess settle it). Armed, the islander's card line (`plTaskP`, via the challenge) says
  "Before you press Play, tap where {b} will stop."; a tap on EITHER renderer (`plGarden`/`plGarden3d` `onTileTapped →
  plGuessGate`, `onTileX/Y → plGuessEnd`, the IG-007 wire-parity gate still green) runs Predict end: a **hit** sets the
  outcome, the card says "You were right!", Draw world puts the `tick` on the tile, and 700 ms later it plays; a **miss**
  shows the flag on the real end and `hintPredictMiss`. Pressing Drive while it is armed puts the robot back at the start.
- **The `?` on a placed block** (IG-006 deviation 2): `garden-kit`'s Block List gains `Show Help` (default false), `Help
  Block` (the block's `t`) and `Help` (signal). The Workshop's list shows it; Help Block → `gardenCardOpen` opens the same
  card the palette's first tap opens. A press on it never starts a drag or removes the block (`[data-help]` in the
  pointer-down exclusions). The example list on the card shows none.
- **Both kits** draw `tick` (brief §4.4): garden-kit a green disc with a white check (`gd-thing gd-tick`), garden-3d-kit a
  standing green disc with a two-stroke check (3 primitives). Both rebuilt; `ig007Garden3d` and `cg001GardenKit` green.
- **Words** (`cg003Content.ts`, the `ig3` block at the end of the table, EN + FR): `ig3Drive`, `ig3Teach`,
  `ig3DrivingTag`, `ig3Driving`, `ig3TeachOn`, `ig3TeachGoOn`, `ig3StepsDriving`, `ig3PredictAsk`, `ig3PredictRight`.

**Readings (final tree, exit code first):**
- Garden specs, each file exit 0: `cg001GardenKit` **29/29** (27), `cg002Engine` **139/139** (137), `cg003Template`
  **111/111** (103), `cg005Olive` 41/41, `cg006Requests` 83/83, `ig007Garden3d` **31/31** (30) — **434** (421). New
  assertions were red first: the engine's AC5 case (hintPerfect for hintStart), the three kit clauses (3 failed / 29), the
  3D tick (1 failed / 31); the Workshop graph clauses were shown to kill a mutant (the Drive-press program write wired
  straight, the 3D tap unwired: 2 failed) with the source copied aside and restored (`cmp` identical).
- `npm run template:garden` exit 0; run again on the committed tree: **0 files of drift**. Both kits rebuilt again: 0 drift.
- Page drive (`drive-pages.sh` repointed to this worktree; generate 0, assemble 0, deploy 0 with index.html fresh, drive 0):
  **323/323**, 0 console / 0 network errors. (The brief's 327: the base tree's own run, lane F's at 13:16 on `f182a2d9e`,
  reads 323/323; its clause names diffed against mine differ only by the AC6 clause renamed below.) First run 321/323: the
  two AC9 workshop language clauses — the pad is now up when a request opens, and its keys were labelled with the op
  names (`fwd`, `left`…); fixed in the product (`Pad keys` labels each key in the child's language; gated).
- **`drive-ig003-modes.js`** on that deploy: exit 0, **90/90**, 0 console / 0 network errors, EN and FR at 1368×912 and
  390×844. JSON: `shots/ig003-s3/drive-ig003-modes.json`; log and all shots `…/ig003-drive-scratch/pages/ig003.log`,
  `pages/shots-ig003/`. First run 82/86: the drive expected free play's "did what you said" after four forwards, but the
  fold nudge outranks it by the ladder's design — the clause was mine and wrong; it now plays a bumping run (the IG-001 D4
  program) and asserts Teach's first hint is not the bump. The run before that found a real defect, fixed: see deviation 4.
- Workshop 3D drive on that deploy: `--mode 3d` **run 1 exit 1** (22 of 23 before it threw: after the right tap the 3D node
  was gone — the engine ended on 2,1, `drawn` null, then the slow arm's `querySelector` on a null root threw); **run 2 exit
  0, 23/23**; run 3 (with the new tick clause) **exit 0, 24/24**, Frame Ms readout 16.9–17.2 ms p95. Run 1 had no diagnostic
  on that clause; it now reports the stored renderer and console errors. The likeliest cause is the Too Slow rule under
  swiftshader (s2 lost the node the same way at the same spot, run 2) — not measured, so named here. `--mode nogl` exit 0,
  **8/8**.
- Olive page drive (`drive-olive.sh pages` on the same deploy): exit 0, **22/22**, 0 skip. Shell `node --test`: exit 0,
  **91/91**.

**Screenshots looked at** (copies in `shots/ig003-s3/`): `01-drive` — Drive ringed, the blue "Just driving" tag, the line
under the world, the empty list on the paper with the note, the pad up; `03-teach` — Pip back on 0,3, "Pip is learning…",
"Back to the start. Now show Pip the moves.", Teach ringed; `05-challenge` — Mamie's card reads "Before you press Play, tap
where Pip will stop.", Pip back at the pond's edge (1,1), a `?` on each placed block; `06-miss` — the flag one tile right of
Pip, the owl's "You tapped one tile, Pip stopped on another…", Mamie's own line back; `07-hit` — "You were right!" and the
green tick beside Pip on 2,1 before he moves; `390-fr-07-hit` — « Tu avais raison ! » with the tick, nothing wider than
the phone; `09-band1` — at 7–9 no challenge (Mamie's line) after a program and a tap; `ws3d-predict-miss` /
`ws3d-predict-hit` — the flag, then "You were right!" in 3D (the tick is on 2,1 in the scene; at the end Pip stands on it,
so it is mostly behind him in that frame). What I saw that is not right: (a) in `09-band1` the first block wears the
running ring after One step then Start over — the Runner's `glowId` is never cleared by Stop, so a new program's block with
the same id glows (pre-existing since P105; not this task's; not fixed); (b) at band 7–9 the `?` sits in the block's column
under the caption, making each placed block taller; (c) the challenge line is in the card's muted ink like the islander's
own line — it reads, but it does not stand out.

**Acceptance criteria:** 1 ✅ (four Drive presses: 0,3 → 4,3 in the engine and on screen, the program `[]`, "0 blocks" /
« 0 blocs »). 2 ✅ (Teach: back to 0,3, the line said; four presses, four blocks, 4,3; Play seen at 0,3 then ending on 4,3;
Teach with blocks there waits where they end). 3 ✅ (Drive keeps the same block ids, drives to 4,4, Play ends on 4,3).
4 ✅ (no `plPredict` anywhere in the artefact — a template-gate grep, also `plStop`, `plTeachMode`, `.bg-i-predict`; the
ask line, the miss's flag and hint, the hit's line and tick then the play, One step cancelling, nothing at 7–9 — both
languages, both sizes, both renderers for the tap). 5 ✅ (a Drive press and a Drive bump change no hint — the bump is the
kit's `data-bump`; Teach's first hint is `hintEmpty` on an empty program, and after a run that bumped it is the start line,
never the bump — the engine gate also covers `hintPattern`). 6 ✅ (EN/FR, 1368/390, 0 console errors; the gates above;
byte-identical regeneration).

**Deviations, with the reason and the measurement:**
1. **Teach with blocks already there does not put the robot at the start, but at the start and then along those blocks.**
   The task's "resets the robot to the start" is the case with no program (AC2's, driven). With blocks, a reset to the start
   would record the next press from the start while Play replays the earlier blocks first — the very trap §6 names. The line
   says where the robot is ("… where your steps end").
2. **Teach pressed while teaching does nothing** (there is no "Done teaching" any more; leaving Teach is Drive or Play). So
   `control('rec')` twice — every older drive's "Done teaching" — keeps working, as brief §4.3 needs.
3. **"The program panel greys"** is the list on the paper ground with a note, not an opacity: a faded block label is under
   4.5:1 and the contrast clauses measure every text (P105 ruling 5). The gate forbids an opacity rule on `.bg-driving`.
4. 🔴 **`record` travels as the string `'no'`/`'yes'`, not a boolean.** First drive: four Drive presses recorded four
   blocks. A `false` in the States node's FIRST state never reached Record step (the input stayed unset, and unset records);
   the strings of the same state did arrive (the ring, the tag). The script accepts `false` too; the template gate pins the
   string type and the `'no'` behaviour.
5. **AC5's "hintEmpty or the pattern hint"**: with a non-empty program and no pattern, the ladder's only line that is not a
   run's is `hintStart` (driven after a bumping run). The fix is in the engine (a win needs a run), so no page leftover can
   come back through Goal met.
6. **The challenge also arms while teaching** (the brief's condition: blocks, unplayed). While teaching the robot stands on
   the answer — that is how Teach works. So **Drive, pressed while it is armed, puts the robot back at the start** (the
   question is about Play, which starts there); the drives ask it from there. For Richard: whether the islander should ask
   only after Drive (or on the first Play press — not built: it would break brief §4.3's `rec → keys → play`).
7. **A miss settles the challenge for that program** (a second tap would read the flag); one more block asks again. A hit
   waits 700 ms (the tick and "You were right!" seen) before it plays.
8. **IG-006's `?` chip row is kept** beside the new `?` on the block: the IG-006 page clauses and the Olive drive's contrast
   list read it. Dropping it is one line (`plHelps` out of `plRight`'s children) if Richard wants one `?`.
9. **The bar says "Teach", not "Teach {b}"** (`ig3Teach`): five pills at 390 px; AC4's "Play on screen at scroll 0" holds.
10. **The tap path is `plGuessGate` / `plGuessEnd` / `plHitGate`**: AC4's "no `plPredict` in the generated template" is
    read literally (the substring). The engine's `Logic/Predict end` keeps its name (it is the challenge's instrument), and
    so do the words `predict`/`predictAsk` (the engine's table; unused now).
11. **Beyond the task:** the pad keys' labels are the words in the child's language (they were op names, invisible but
    read by a screen reader and by the AC9 clause, which went red when the pad became visible at open).

**Drive clauses changed in place (my change broke them):** `drive-cg003-pages.js` AC6 — "Predict asks where the robot will
end" is now "the islander asks where the robot will end (IG-003: the challenge line, no Predict button)"; the wrong-tap, the
hint, the no-score and the right-tap clauses keep their names and assertions, reached through the challenge (Drive puts Pip
at the start; after the miss, Teach + one turn asks again). `drive-ig007-workshop.js` — the Predict pass answers the
challenge the same way (no `control('predict')`); the hit clause's report gained the stored renderer and console errors; one
clause added (the tick in 3D and "You were right!").

**Could not verify:** the tablet; a real GPU (every 3D reading is swiftshader); the cause of the one red 3D run (above);
the challenge on `sami-thanks` driven in a page (engine-gated only: the stub's thank-you never moves the robot); the FR
lines — `ig3Drive` « Conduire », `ig3Teach` « Apprendre », `ig3DrivingTag` « Juste conduire », `ig3Driving`, `ig3TeachOn`
« Retour au départ. Maintenant, montre les gestes à {b}. », `ig3TeachGoOn`, `ig3StepsDriving`, `ig3PredictAsk` « Avant
d’appuyer sur Jouer, touche la case où {b} va s’arrêter. », `ig3PredictRight` « Tu avais raison ! » — are Richard's to read;
the kids.

**Files another lane may touch:** `cg002Content.ts` (the `challenge?` member after `rungs?`, and one line after `palette:`
in `tulips-three` and `sami-thanks`); `cg002Scripts.ts` (`CHOOSE_HINT_SCRIPT`'s `goalMetNow` line); `cg003Content.ts` (the
`ig3` block at the END of `IG006_WORDS`); `cg003Scripts.ts` (Start world's `challenge` output, Draw world's tick line, Record
step, Pad keys, three new scripts before `GLUE_SCRIPTS`, three rows at its end); `cg003Components.ts` (`DRIVE`/`TYPE`
appends, the `drive` button kind, `Workshop/Pad`'s two inputs, `Workshop/Play`); `cg007Look.ts` (`ICONS.drive` for
`predict`, four rules after `@keyframes bg-blink`); both kits (`SPRITES.tick`/`THING_SPRITES`, `THING_BUILDERS.tick`;
Block List's Show Help); `drive-cg003-pages.js` (the AC6 block only). No `dist/` was written.


## 8. Session 4 (2026-09-29, lane G — s3's leftovers (b) (c) (d) (f), worktree `p106-s4-leftovers` cut from `7ed9f065e`)

- **(d) the stale running ring — fixed.** Measured: the Runner's Glow Id was wired straight from `rnStep`, and Stop
  (Start over, Teach, Drive) never touched it, so after One step then Start over the first block of the next program
  (same id) wore the ring. New `Logic/Glow` (`GLOW_SCRIPT`, appended to `GLUE_SCRIPTS`) inside `Workshop/Runner`: Step's
  id while `rnMode.live` (playing or paused), `''` otherwise. A `Function` publishes only on change, so it takes Live as an
  input rather than a reset signal: One step → Start over → One step reads `'1'`, `''`, `'1'`. The ring now also goes
  off when a Play ends (the run is no longer live). Looked at: `09-band1` has no ringed block after One step then Start over.
- **(c) the owl in Drive — fixed.** Measured: the line was `hintStart` ("Hello! Someone on the island is waiting. Press
  Teach and show Pip what to do."), which Choose hint picks for any program not yet run. It is a voiced key (the shell's
  `olive-templates.json`) and IG-003 AC5's drive pins it as Teach's first hint, so it was not reworded. Instead Choose hint
  takes `mode` (wired from `plMode.mode`) and, in Drive with a program not run, says the new unvoiced `hintDriveReady`:
  "{b} still knows your steps. Press Play to watch them, or Teach to change them." / « {b} connaît toujours tes pas.
  Appuie sur Jouer pour les regarder, ou sur Apprendre pour les changer. » (the button words are the gate's). Teach and
  no mode keep `hintStart`.
- **(b) the pad over the plot — fixed at every width but a phone.** With the pad on, `.bg-stage:has(> .bg-pad)` lays the
  world and the pad side by side (flex, wrap); the world keeps 640 px where it fits and gives way to 300; the pad is in
  the flow (`position: relative`). **Deviation:** under 600 px the pad keeps the old corner overlay — there is no room
  beside, and under the world it pushes Play below 844 px, which CG-003 AC4's drive clause forbids. **For Richard's grade:**
  at 1024 × 768 the world is now 352 px (8 × 44 px tiles) beside the pad, where it was ~548 px under it; at 1368 it
  keeps 640. A first try with a 400 px basis wrapped the pad under the world at 1024 × 768, off the first screen.
  Looked at: 1368 (`07-hit`, `09-band1`), 1024 (`07-hit`), 800 portrait (`01-drive`), 390 (`07-hit`, unchanged overlay).
- **(f) the `--mockup` side-step — fixed.** The P105 mockup (`tpl-012-mockups/bot-garden.html`) loads its Google font as a
  render-blocking stylesheet, so its script (and `go`) could arrive after the fixed boot wait; s3's run threw `go is not
  defined` after 327 PASS and lost the JSON. A standalone probe today saw `go` at the first read (the network was quick),
  so the cause is inferred, not reproduced. The side-step now waits up to 30 s for `go` and is a clause of its own
  (`CG-007 AC1 (--mockup)`), so a failure is recorded and the JSON is always written.
- **Readings (lane G, on `541b55e74` + the D8 clause):** specs cg002Engine **157/157**, cg003Template **116/116**,
  cg001GardenKit **32/32**, ig007Garden3d **37/37**, ig004Island **12/12**, each exit 0. Modes drive **90/90** at
  1368/390, and **90/90** at 1024/800 (a scratch copy with those viewports). Island `--mode 3d` **5/5**. Page drive with
  `--mockup` **327/328**, `drive.exit` 1: the mockup clause PASSED (five shots). The one FAIL was IG-001 D8, which
  hard-coded `hintStart` as the line after the first edit in free play. Free play opens in Drive, so after (c) that line
  is `hintDriveReady` by design. The clause now expects that ("in Drive"), and the merged tree's page drive grades it.
