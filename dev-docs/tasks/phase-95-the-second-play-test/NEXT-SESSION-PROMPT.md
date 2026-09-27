# Phase 95 — next session

**Session 3 fixed all three of s2's reds, built two new rulings, and DROVE ALL SIX SCENARIOS GREEN.
347 gates green. The face a child sees went from 14–19 px to 23–24 px, the verdict line is whole on a
phone, the sentence nobody had written is on the screen in both languages, and the buy card sits over
the shelf without losing the tab.**

**One thing the drive found that no clause could see, and it is Richard's call: the two rockets
overlap each other.** See PLY-006 §5.6 — measured, not fixed.

## The board, re-derived from the task files

| task | built | gated | driven | what is left |
|---|---|---|---|---|
| [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) the shelf fits the face | ✅ | ✅ AC2–AC6, AC8 | ✅ 18/18 | AC9 Richard |
| [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) paint basic, pattern the prize | ✅ | ✅ AC2, AC3 | ✅ 44/44 | AC4 kit gate · AC5 template gate · **AC8 = a v3 GATE, not code** · AC9 Richard |
| [PLY-003](PLY-003-MORE-WAYS-TO-HUNT-A-NUMBER.md) more ways to hunt | ✅ | ✅ AC2–AC5 | ✅ 14/14 | AC7 Richard |
| [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) the monster types, and can win | ✅ | ✅ AC2–AC5 | ✅ 18/18 | AC8 Richard |
| [PLY-005](PLY-005-A-STEP-BACK-IN-THE-FACE-ROLL.md) a step back in the roll | ✅ | ✅ AC2–AC5 | ✅ 28/28 | AC8 Richard |
| [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) bigger rockets, a way back | 🟡 | ✅ AC2–AC6, AC9 | ✅ 20/20 + 7/7 | 🔜 **AC7 layer 3 UNBUILT** · 🔴 **§5.6 the rockets overlap — Richard** · AC10 Richard |

**Where it is:** `cline-dev`, commits `1957b9605`, `166af1614`, `5ca1192ae`.

## 1. First job — PLY-006 AC7, the last unbuilt thing

Layer 3, the bought Starter turbo (60 ⭐), designed in
[§3.2](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md). It needs a shelf row of a third kind,
a `boosts` count on the profile, a buy that increments it, and a race start that consumes one into
`startTurbo` — **the grader already takes that input and the engine gate already covers it**. Off in
two-player races: a sibling who saved must not out-buy a sibling who did not.

🔴 **Correct the inherited remaining-work line while you are there:** the save code is ALREADY `v: 3`
and already carries `sp: spentOf(mdl)` (`tpl007Scripts.ts:2460`). PLY-002 AC8 is therefore a **gate**,
not code — the only save-code arm in the engine test decodes a **v1** code. A v3 round-trip of
`spent`, `owned` and `wear` is what is missing.

## 2. Richard's calls — ask these, do not resolve them

1. 🔴 **The two rockets overlap** (PLY-006 §5.6, measured). The lane offset is 14 units either side —
   28 apart — for a sprite **54 units tall** fin to fin, so the fins always overlapped and even the
   hulls cross by 4 units. It is a ratio, so it looks the same at 1366×768 as at 390×844, and R4 made
   it 24 px instead of 15 px while leaving the proportion untouched. Clearing the fins needs the lane
   at ≥ 27 units, the hulls alone ≥ 16. **It is a change to the kit's look — two lanes further apart
   means a taller course, or the same course with less room on it.** Show him
   `01-ply006-face-1366x768.png` and ask.
2. **The six "Richard plays it and says" clauses** — PLY-001 AC9, PLY-002 AC9, PLY-003 AC7, PLY-004
   AC8, PLY-005 AC8, PLY-006 AC10. These are §6's close condition and nothing else can close them.

R4 (the rocket is 72 long, a 23 px face), R5 (a charged turbo is spendable while level) and R6 (the
card over the shelf, keeping the tab) are **answered and built** — see [README §3](README.md).

## 3. The instrument — all six scenarios pass, and one of its faults is fixed

```sh
npm run template:rocket                                    # gate on EXIT, quiet on success
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket \
  --allow-development-engine
node scripts/devtools/drive-ply-rocket.js <scratch>/rocket --scenario ply006face --shots <dir>
```

Scenarios: `ply001 ply002 ply003 ply004 ply005 ply006 ply006face`, comma-separated or `all`.

🔴 **`--allow-development-engine` is not optional.** Without it the deploy **exits 0 and writes
nothing**, reporting `{"ok":false}` on stdout. **Check the folder, not the exit code.**

🔴 **`--scenario all` takes over 20 minutes and gets killed at about that mark** (exit 144). Run it in
batches — each scenario alone is two or three minutes.

## 4. What s3 learned that will bite you

- 🔴 **A green clause and a broken picture are not a contradiction.** AC9 asked "is the face ≥ 20 px",
  got a truthful yes at all five viewports, and the same screenshots show the two rockets sitting on
  top of each other. **Look at the shots even when the run says 100%.**
- 🔴 **A gate on a kit cannot see a placement that overrides it.** AC2 read the kit's
  `ROCKET_SIZE_DEFAULT` while the race asked for `rocketSize: 44` — one literal, one placement, a
  14 px face. `spriteScale` floors the sprite at `rocketSize` **whatever the box measures**, so s2's
  course-box diagnosis was wrong. Deleting the override beats raising it: inheriting means there is no
  second copy to drift. The new clause reads the built artefact and was verified RED by putting 44
  back.
- 🔴 **An inline style beats a class, and Noodl writes a lot of inline styles.** A Group writes
  `position: relative` inline (`group.ts` defaultCss) and content-sizing writes `white-space` inline.
  The overlay CSS did **nothing** until every positioning property was `!important` — and the failure
  read as "the buy card is clipped", which was a true sentence about a card one whole shelf further
  down the page.
- 🔴 **`absolute` inside a long scrolling list is a trap.** Pinned to a 17-tile shelf the card sat at
  y = -47 for a child who had scrolled to tap a tile. `fixed` is what "over the shelf" means on a
  screen you scroll.
- 🔴 **A backtick in a comment inside a generated script ends it early — and `APP_CSS` in
  `tpl007Components.ts` is a generated script too.** It bit **three times** in s3, once in the very
  comment warning about it. The errors say `ReferenceError` or `TS1005 ',' expected` and never mention
  backticks. The house style escapes them.
- 🔴 **An instrument fault reads exactly like a product defect.** `solveHunt` tested `/make 100/`
  before `/make 1000/`, and "make 1000" contains "make 100" — so a grid was hunted for a pair summing
  to 100, none was found, and Number Hunt was reported broken. The grid it printed held 600 + 400 and
  500 + 500. **Before believing a lone red, check the instrument's own arithmetic.**
- 🔴 **Ask a peer before you take the box.** `drive-deployed.js` picks free ports for its server and
  CDP and uses its own temp profile, so it cannot steal the editor's 9222 — but jest workers and a
  headless Chrome still perturb a peer's timing-sensitive CDP evals. s3 held, and drove after the
  teardown.

## 5. Rules, unchanged

[§5 of the README](README.md) — build only through the generator, kit before generator, never
hand-edit `templates/rocket-school/**` or `game-kit/project/**`, every number in one exported
constant, the five viewports with FR + AZERTY first, and reproduce before fixing.

**§6 still stands: a green gate closes nothing here.** Richard replays all four games and the hangar,
and none of the six findings reproduces.
