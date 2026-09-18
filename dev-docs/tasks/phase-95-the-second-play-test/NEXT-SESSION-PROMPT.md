# Phase 95 — next session

**Session 3 fixed all three of s2's reds in source, built two of Richard's new rulings, and drove
NOTHING — a peer held the box for P93's CDP drives and a `test:ci`. 347 gates are green. The drive is
your FIRST JOB, and until it runs, every 🟡 below is a prediction and not a result.**

## The board, re-derived from the task files

| task | built | gated | driven | what is left |
|---|---|---|---|---|
| [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) the shelf fits the face | ✅ | ✅ AC2–AC6, **AC8 (s3)** | 🟡 | 🟡 **AC8 built, undriven** · AC9 Richard |
| [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) paint basic, pattern the prize | ✅ | ✅ AC2, AC3 | ✅ | AC4 kit gate · AC5 template gate · **AC8 = a v3 GATE, not code** · AC9 Richard |
| [PLY-003](PLY-003-MORE-WAYS-TO-HUNT-A-NUMBER.md) more ways to hunt | ✅ | ✅ AC2–AC5 | ✅ | AC7 Richard |
| [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) the monster types, and can win | ✅ | ✅ AC2–AC5 | ✅ | AC8 Richard |
| [PLY-005](PLY-005-A-STEP-BACK-IN-THE-FACE-ROLL.md) a step back in the roll | ✅ | ✅ AC2–AC5 | ✅ | AC8 Richard |
| [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) bigger rockets, a way back | 🟡 | ✅ AC2–AC6, **AC9 (s3)** | 🟡 | 🟡 **AC9 + AC8 line fixed, undriven** · 🔜 **AC7 layer 3 UNBUILT** · AC10 Richard |

**Where it is:** `cline-dev`, commit `1957b9605`. The deploy is already done and verified — 33 files
in the scratch folder, `{"ok":true}`.

## 1. First job — DRIVE. Nothing in s3 has been seen on a screen.

```sh
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket \
  --allow-development-engine
node scripts/devtools/drive-ply-rocket.js <scratch>/rocket --scenario ply006face --shots <dir>
node scripts/devtools/drive-ply-rocket.js <scratch>/rocket --scenario ply006 --shots <dir>
node scripts/devtools/drive-ply-rocket.js <scratch>/rocket --scenario ply001 --shots <dir>
```

Four things to measure, each of which could have gone wrong in a way no gate can see:

1. **The face is 23 px at all five viewports** (`ply006face` reads the rendered `<image>`). Predicted
   `rocketSize × 25/78` = 23.1. 🔴 **Watch the phone**: at 390×844 the two rockets ALREADY started
   stacked on each other with their name labels overlapping, and the rocket is now 72 long instead of
   44 — there is more to stack. If it collides, the course box is the thing to change *then*, and
   that is a real change, not the one s2 thought it was (see PLY-006 §5.4).
2. **The verdict line does not spill at 390×844** — read the BOX, never `innerText`; it measured
   `left: -7, right: 397` before. **And the banner must not have grown a row at 1280×720**, which is
   the screen RKT-006 measured Next falling off. The wrap is `@media (max-width: 480px)`, so 1280
   should be untouched — confirm it, do not assume it.
3. **A `thumbs` profile's face tab shows the sentence and no tiles**, in EN and FR, and its rocket
   tab still works and stays silent.
4. **R6, which no drive has ever seen**: tap a tile, and the buy card must appear OVER the shelf —
   then press No and land back on **the tab you were on**, not Face. 🔴 Use `pressUntil`, never "press
   twice": pressing No twice is what bought a 40 ⭐ face item while the drive believed it was grading a
   120 ⭐ pattern. And check the tiles are still tappable after a No — an overlay left mounted would
   swallow every tap and look exactly like the tiles going dead.

## 2. Then: PLY-006 AC7, the last unbuilt thing

Layer 3, the bought Starter turbo (60 ⭐), designed in
[§3.2](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md). It needs a shelf row of a third kind,
a `boosts` count on the profile, a buy that increments it, and a race start that consumes one into
`startTurbo` — **the grader already takes that input and the engine gate already covers it**. Off in
two-player races: a sibling who saved must not out-buy a sibling who did not.

🔴 **It was deliberately NOT started in s3.** The compiler is what catches an undeclared port, an
invalid enum and an interface short of its outputs, and it could not be run while the box was held.
Build it with `npm run template:rocket` available, not before.

🔴 **Correct the inherited remaining-work line while you are there:** the save code is ALREADY `v: 3`
and already carries `sp: spentOf(mdl)` (`tpl007Scripts.ts:2460`). PLY-002 AC8 is therefore a **gate**,
not code — the only save-code arm in the engine test decodes a **v1** code. A v3 round-trip of
`spent`, `owned` and `wear` is what is missing.

## 3. Richard's calls — all three from s2 are ANSWERED. Do not re-derive them.

R4 (the rocket is 72 long, a 23 px face — the kit's own default), R5 (a charged turbo is spendable
while level), R6 (the card sits over the shelf, and closing it keeps the tab) are recorded in
[README §3](README.md) with what each overturns. What is still his:

- **PLY-001 AC9, PLY-002 AC9, PLY-003 AC7, PLY-004 AC8, PLY-005 AC8, PLY-006 AC10** — the six
  "Richard plays it and says" clauses. These are §6's close condition and nothing else can close them.

## 4. What s3 learned that will bite you

- 🔴 **A gate on a kit cannot see a placement that overrides it.** AC2 was green, honest and about the
  wrong thing: it read the kit's `ROCKET_SIZE_DEFAULT` while the race asked for `rocketSize: 44` — one
  literal, one placement, a 14 px face. **`spriteScale` floors the sprite at `rocketSize` whatever the
  box measures**, so s2's course-box diagnosis was wrong. The fix was to DELETE the override, not
  raise it: inheriting means there is no second copy of the number to drift. The new clause reads the
  built artefact and was verified RED by putting the 44 back.
- 🔴 **A justification goes stale silently.** `CONTENT_SIZED_TEXTS` said the verdict line was "a short
  line … at most 'Ta fusée ne bouge pas'". PLY-006 made it three clauses long and nobody revisited the
  entry, so a line that cannot wrap grew past the phone. When you change what a node holds, re-read
  the reason it was allowed to be what it is.
- 🔴 **Two symptoms, one cause.** The lost hangar tab was not a bad tab value: unmounting the shelf and
  remounting it re-fired `hsWrap.didMount → hsInitTab`, whose whole job is to open on Face. R6's "card
  over the shelf" and "keep my tab" were the same bug.
- 🔴 **Measure a rule change as a control pair in ONE harness.** R5's numbers (bad start 41→47%, clean
  93→98%, guessing 10→16%) were produced by patching only the term under test. §3.3's "1% → 57%" came
  from a different harness and is **not** comparable — the columns compare with each other and nothing
  else.
- 🔴 **A backtick in a comment inside a generated script ends it early — and `APP_CSS` in
  `tpl007Components.ts` is a generated script too.** It bit twice in s3. The first failure says
  `ReferenceError: behind is not defined` or `TS1005 ',' expected`, and neither mentions backticks.
- 🔴 **Ask a peer before you take the box.** `drive-deployed.js` picks a free port for both its server
  and CDP and uses its own temp profile, so it cannot steal the editor's 9222 — but jest workers and a
  headless Chrome still perturb a peer's timing-sensitive CDP evals. s3's drive waited, and that is why
  this handoff has predictions in it instead of results.

## 5. Rules, unchanged

[§5 of the README](README.md) — build only through the generator, kit before generator, never
hand-edit `templates/rocket-school/**` or `game-kit/project/**`, every number in one exported
constant, the five viewports with FR + AZERTY first, and reproduce before fixing.

🔴 **`--allow-development-engine` is not optional.** Without it the deploy **exits 0 and writes
nothing**, reporting `{"ok":false}` on stdout, and a drive then grades whatever was in the folder
before. **Check the folder, not the exit code.**

🔴 **`--scenario all` takes over 20 minutes and gets killed at about that mark** (exit 144). Run it in
two or three batches, or in the background.

**§6 still stands: a green gate closes nothing here.** Richard replays all four games and the hangar,
and none of the six findings reproduces.
