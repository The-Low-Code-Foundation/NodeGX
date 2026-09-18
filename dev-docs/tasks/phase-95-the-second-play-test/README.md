# Phase 95 — The second play test

**Scoped:** 2026-09-18, from Richard's second play of Rocket School — the first play that reached the
**hangar, Number Hunt and Monster Gate**, all of which shipped in [P87](../phase-87-the-first-play-test/README.md)
and [TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md) without a child ever touching them.

**Status: 🏗️ IN PROGRESS — 0/6 closed** (every close waits on Richard's replay).

**Session 1 built the engine of all six and the surfaces of four.** 344 gates green
(`tpl007Engine` 200, `tpl007GameKit` 47, `tpl007Template` 97 — up from 322), and
`npm run template:rocket` reproduces the template byte-for-byte on a second run.

| | built | gated | driven |
|---|---|---|---|
| [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) the shelf fits the face | ✅ | ✅ AC2–AC6 | — |
| [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) paint basic, pattern the prize | ✅ | ✅ AC2, AC3 | — |
| [PLY-003](PLY-003-MORE-WAYS-TO-HUNT-A-NUMBER.md) more ways to hunt | ✅ | ✅ AC2–AC5 | — |
| [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) the monster types, and can win | ✅ | ✅ AC2–AC5 | — |
| [PLY-005](PLY-005-A-STEP-BACK-IN-THE-FACE-ROLL.md) a step back in the roll | ✅ | ✅ AC2–AC5 | — |
| [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) bigger rockets, a way back | 🟡 layers 1–2 | ✅ AC2–AC6 | — |

🔴 **Nothing here has been driven.** Every AC that says "Drive" is open, and a green gate
closes nothing in this phase (§6). **The one thing still unbuilt is PLY-006's layer 3**, the
bought Starter turbo (R2) — designed, not written; the comeback works without it.

**Prefix: `PLY`.**

> "1. The hangar has a few problems. Kids like putting on sunglasses and hats on their avatars, but it needs to
> correspond to the type of avatar they picked. Right now you have pixel avatar sunglasses that don't fit on the
> adventurer avatar the kid picked offered in the hanger. We need to build a restricted range of rewards that are
> consistent with the type of avatar picked
> 2. Rocket colours are ok but in general a bit of a sad reward. You'd think the colour would be a basic thing, and
> the reward would be stripes or polkadots or something. We need more thought on this. Also when you choose a colour
> it sort of 'auto-buys' it which is strange UX, it should have a confirmation popup showing you your balance, how
> much it costs, what you'll have left after
> 3. There's a couple of games that need updating: The 'find the two numbers that make X' game, normally you have a
> 3 numbers addition variant, a multiplication, addition, maybe subtraction variant? In any case, more variations
> would be good, more or less depending on the kid's age
> 4. The monster game needs to get its typing version as well as the maths version. Also it's a bit too easy at the
> moment, you have to really fuck up a lot to have the monster break down your door. In the defi mode it works well
> with the timer adding stakes, but in the entrainement mode it's pretty much unlosable. I'm not saying make it as
> hard as defi, but a good compromise please
> 5. The avatar chooser. I feel like rolling works fine, but if you accidentally roll when you wanted the previous
> avatar, there should be a 'back' button. I dunno if it's too hard to let them go all the way back maybe forget it
> and just let them go one step back, but going back and then rolling forward again would be nice
> 6. If the rockets are going to get upgrades, I think it'd be nice to make them bigger and a tiny bit more detailed,
> certainly to be able to see your avatar inside the rocket better. Also we might need to introduce boosts or
> something that you can buy or win, because when you've fucked up the beginning and the CPU rocket is at the middle
> point, you're fucked and you know it. I'll let you have a think about the best system for letting someone make a
> spectacular comeback using the research we've already done and stored in the project"
> — Richard, 2026-09-18

## 1. The person sentence

**A child who chose the adventurer face is offered adventurer things, saves up for polka dots on a rocket big enough
to see themselves flying it, and — four questions down with the computer at halfway — still believes they can win.**

## 2. What his six findings actually are

Every cause below was read from source on 2026-09-18, not guessed. Line numbers are at that date.

| # | Finding | Measured cause | Task |
|---|---|---|---|
| 1 | hangar offers items the chosen face cannot wear | `HANGAR_SHELF_SCRIPT` shows **every** item of the tab and greys the misfits — [RKT-011 §3.2](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md) ruled it that way on purpose (`tpl007Scripts.ts:1964`, the `!fits` branch). Of 12 face items, **3 fit pixel-art, 6 fit big-smile, 3 fit adventurer** (`tpl007Curriculum.ts:797`) | [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) |
| 1b | two faces can wear **nothing at all** | `fun-emoji` and `thumbs` have no wearable part in DiceBear 9.4.2 — only `eyes`, `mouth`, `face`, `shape` (read from `node_modules/@dicebear/*/lib/schema.js`, 2026-09-18). They are 2 of the 5 styles the chooser offers (`kit.js:55`) | [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) |
| 2a | colour is a thin reward | the shelf's 18 items are **12 face parts and 6 flat paints**, and paint is the whole of the rocket (`tpl007Curriculum.ts:797`). The kit draws one `fill` per rocket and has no port for anything else (`kit.js:777`) | [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) |
| 2b | choosing a colour "auto-buys" it | `PICK_ITEM_SCRIPT` spends the pick on the tap that chose the item; there is no second surface between the tap and the spend (`tpl007Scripts.ts:1911`; the tile's note reads "🎁 Touche pour choisir") | [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) |
| 3 | Number Hunt needs more variations, by age | four kinds exist (`add2`, `add3`, `mul2`, `add100`) and the level picks from three of them (`tpl007Scripts.ts:1250`). **No subtraction, no division, no decimals** — and CM2 and 6e share one band | [PLY-003](PLY-003-MORE-WAYS-TO-HUNT-A-NUMBER.md) |
| 4a | Monster Gate has no typing version | `Monster/Setup` publishes `style` and `timed` only; there is no `mode` row, and nothing downstream can ask for words (`tpl007Components.ts:3521`) | [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) |
| 4b | Entraînement is unlosable | in `gate` style a correct answer sets `g.start = 1` — **the monster is thrown all the way back to the far side by any right answer** (`tpl007Scripts.ts:1540`). At `creep.practice = 1/3` that means *three wrong answers with no right one between them* costs one heart, and nine in a row loses the game | [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) |
| 5 | no way back from an accidental roll | Roll writes a fresh random seed straight over the old one; nothing keeps the one before (`tpl007Components.ts:1646-1648`) | [PLY-005](PLY-005-A-STEP-BACK-IN-THE-FACE-ROLL.md) |
| 6a | the rocket is too small to see yourself in | the sprite is 64 units nose to tail and the face is a **20 × 20 image clipped to a 9-unit circle** — about 14% of the rocket's length. At the 44px floor that is a **12px face** (`kit.js:487, 778-786, 960`) | [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) |
| 6b | a bad start is an unwinnable race | `cpuGain = RACE_STEP × (0.35 + 0.35 p)` (`tpl007Scripts.ts:877`) — **the computer moves on every question, including the ones the child gets wrong**, while the child's `gain` is 0 on a miss (`:876`). There is no term anywhere that reads the gap. Four missed answers at the start is a lead of ≈0.25 the child can only close by being perfect | [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) |

## 3. Richard's three rulings, 2026-09-18

Asked before any file was written, because each fork changed the work:

| # | Ruling | What it overturns |
|---|---|---|
| R1 | **Stars become spendable prices.** Items carry a star cost; buying subtracts from the total; a confirmation shows balance, cost and what is left. | 🔴 Reverses [RKT-011 §3.1](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md)'s ruling **A** (pick at a milestone) for **B** (shop). `HANGAR_MILESTONES` / `HANGAR_EVERY` retire; save code goes to **v3**; Home's "next 🎁 at N ⭐" becomes a purse. |
| R2 | **Boosts can be bought with stars too** — as well as earned in the race. | Adds a second, non-cosmetic sink to R1's economy. [rkt-010's](../phase-87-the-first-play-test/rkt-010-rewards-research.md) "no reward a child cannot earn" still binds: every boost must also be earnable by playing, so a child with 0 ⭐ is never short of one. |
| R3 | **Drop `fun-emoji` and `thumbs` from the chooser.** | The chooser offers three styles, not five. Existing profiles on a dropped style must keep their face and still get a shelf — see [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) §3.4. |

## 4. Order

| # | Task | Why here | Blocks |
|---|---|---|---|
| 1 | [PLY-005](PLY-005-A-STEP-BACK-IN-THE-FACE-ROLL.md) A step back in the face roll | smallest, touches one component, nothing depends on it | — |
| 2 | [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) The hangar fits the face you chose | R3 reshapes the shelf data PLY-002 then prices | PLY-002 |
| 3 | [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) Paint is basic, pattern is the prize | R1's economy is what PLY-006's buyable boost spends | PLY-006 |
| 4 | [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) Bigger rockets, and a way back into the race | the kit change PLY-002's patterns are drawn by | — |
| 5 | [PLY-003](PLY-003-MORE-WAYS-TO-HUNT-A-NUMBER.md) More ways to hunt a number | self-contained, one rule block | — |
| 6 | [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) The monster can type, and practice can be lost | reuses Race's mode row; the tuning is a constant | — |

## 5. Rules every task inherits

From [P87 §5](../phase-87-the-first-play-test/README.md), unchanged, and they are not negotiable:

- **Build only through the generator**: `npm run template:rocket`. 🔴 **Check its exit before believing a drive** —
  an aborted edit script twice let a drive grade the OLD artefact with identical readings.
- **The kit is built before the generator**: `node library/modules/game-kit/build.mjs`. `src/kit.js` is the source;
  `project/noodl_modules/game-kit/index.js` is generated, and so is `templates/rocket-school/**`. 🔴 **Never hand-edit
  either** — the next regeneration deletes it.
- **Gates**: `tpl007GameKit.test.ts`, `tpl007Engine.test.ts`, `tpl007Template.test.ts` in `packages/noodl-mcp/tests`.
- **Every number lives in one exported constant** and the gates read it, never a literal, so Richard's feedback is a
  one-line change.
- **The five runtime traps** (P78 D53–D57) and **every colour a token**.
- **The viewport set, every drive:** 1366×768 · 1280×720 · 1024×768 touch · 768×1024 touch · 390×844 touch.
  **FR + AZERTY is the primary arm.**
- **Reproduce before fixing:** each task's first AC is RED on today's build.
- **Look at the screenshot.**

## 6. Close condition

**Richard replays all four games and the hangar, and none of the six findings reproduces** — recorded in his words
in each task. A green gate closes nothing here.
