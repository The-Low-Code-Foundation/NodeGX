# Phase 95 — next session

**Session 1 (2026-09-18) built the engine of all six of Richard's findings and the surfaces of
four. Nothing has been driven. Your first job is a drive, not more building.**

## The board, re-derived from the task files

| task | built | gated | driven | what is left |
|---|---|---|---|---|
| [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) the shelf fits the face | ✅ | ✅ AC2–AC6 | ❌ | AC7, AC8 drives · AC9 Richard |
| [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) paint basic, pattern the prize | ✅ | ✅ AC2, AC3 | ❌ | AC4 kit gate · AC5 · AC6, AC7 drives · AC8 save-code gate · AC9 Richard |
| [PLY-003](PLY-003-MORE-WAYS-TO-HUNT-A-NUMBER.md) more ways to hunt | ✅ | ✅ AC2–AC5 | ❌ | AC6 drive · AC7 Richard |
| [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) the monster types, and can win | ✅ | ✅ AC2–AC5 | ❌ | AC6, AC7 drives · AC8 Richard |
| [PLY-005](PLY-005-A-STEP-BACK-IN-THE-FACE-ROLL.md) a step back in the roll | ✅ | ✅ AC2–AC5 | ❌ | AC6, AC7 drives · AC8 Richard |
| [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) bigger rockets, a way back | 🟡 | ✅ AC2–AC6 | ❌ | 🔜 **AC7 layer 3 is UNBUILT** · AC8, AC9 drives · AC10 Richard |

**Where it is:** `fd7cc4700` and `19e68cccc` on `cline-dev`.

## 1. First job — the drive

Every one of the six has an untested surface, and this phase's close condition (§6) says a green
gate closes nothing. **Drive in this order**, because each one is cheap once the app is up:

1. **PLY-002 AC6** — the buy card. Tap an unowned pattern, read the three numbers **on the
   screenshot**, check they add up, press No, press Yes, and check the purse fell by exactly the
   price and the next race's rocket wears the decal.
2. **PLY-006 AC8** — the comeback. Lose four answers on purpose, then answer three right, and read
   the chain line, the turbo button, and a doubled move.
3. **PLY-001 AC7**, **PLY-005 AC6**, **PLY-004 AC6/AC7**, **PLY-003 AC6**.

```sh
npm run template:rocket                                   # check EXIT=0
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket
node -e "require('./scripts/devtools/drive-deployed.js').serveFolder(process.argv[1], 8765)" <scratch>/rocket
node scripts/devtools/drive-tpl007-rocket.js <scratch>/rocket --shots <dir>
```

🔴 The existing drive script knows nothing about the hangar's buy card, the turbo button or the
monster's mode row. **Extend it; do not hand-click and call it driven.**

🔴 **Two taps on anything inside a card that a Modal could be measuring** — and look at every shot.
Text clauses could not see a doubled pill in TPL-007 s1 and they will not see a clipped buy card.

## 2. The one thing not built

**PLY-006 layer 3 — the bought Starter turbo** (Richard's ruling R2, "buy boosts with stars too").
Designed in [PLY-006 §3.2](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md); none of it
exists. It needs: a shelf row of a third kind, a `boosts` count on the profile, a buy that
increments it, and a race start that consumes one into `startTurbo` (**the grader already takes
that input and the engine gate already covers it**). 🔴 Off in two-player races, and it must stay a
head start on layer 2 rather than a capability money alone buys — the briefing's "no reward a child
cannot earn by playing".

## 3. What this session learned that will bite you

- 🔴 **A backtick inside one of the script template literals ends the generated script early.**
  `tpl007Scripts.ts` holds every Function node's source in TS template literals, so a prose comment
  written with `backticks` truncates it. It cost three cycles; `tsc` reports it as `',' expected`,
  which does not sound like what it is.
- 🔴 **The door is the compiler.** Every graph change should be run through `npm run template:rocket`
  before more is piled on top: it caught an undeclared port, a `baseline` that is not a valid
  `alignItems`, three logic components whose interfaces were short of their new outputs, a row whose
  `space-between` distributed nothing, and a Variable shared between two placements of one component.
  Each was a real defect and none would have shown up in a unit test.
- 🔴 **A test harness that calls a random picker twice** (`grade(q(), q().answer)`) grades one
  question against another's answer, so every answer is wrong, every multiplier reads 1, and the
  feature looks dead when it is the harness that is.
- 🔴 **Look at the picture.** The first rocket redesign made the hull deeper and the window bigger,
  and hid every decal behind the cockpit. No gate could have said so.

## 4. Rules, unchanged

[§5 of the README](README.md) — build only through the generator, kit before generator, never
hand-edit `templates/rocket-school/**` or `game-kit/project/**`, every number in one exported
constant, the five viewports with FR + AZERTY first, and reproduce before fixing.
