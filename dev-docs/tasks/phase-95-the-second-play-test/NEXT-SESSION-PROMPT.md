# Phase 95 — next session

**Session 2 (2026-09-18) drove all six. Four surfaces are green on the screen, one defect was found
and fixed, and three reds are left — two of them things that were designed and never built.**

## The board, re-derived from the task files

| task | built | gated | driven | what is left |
|---|---|---|---|---|
| [PLY-001](PLY-001-THE-HANGAR-FITS-THE-FACE-YOU-CHOSE.md) the shelf fits the face | ✅ | ✅ AC2–AC6 | 🟡 | 🔴 **AC8 RED — §3.4's sentence was never built** · AC9 Richard |
| [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md) paint basic, pattern the prize | ✅ | ✅ AC2, AC3 | ✅ | AC4 kit gate · AC5 template gate · AC8 save-code gate · AC9 Richard |
| [PLY-003](PLY-003-MORE-WAYS-TO-HUNT-A-NUMBER.md) more ways to hunt | ✅ | ✅ AC2–AC5 | ✅ | AC7 Richard |
| [PLY-004](PLY-004-THE-MONSTER-CAN-TYPE-AND-PRACTICE-CAN-BE-LOST.md) the monster types, and can win | ✅ | ✅ AC2–AC5 | ✅ | AC8 Richard |
| [PLY-005](PLY-005-A-STEP-BACK-IN-THE-FACE-ROLL.md) a step back in the roll | ✅ | ✅ AC2–AC5 | ✅ | AC8 Richard |
| [PLY-006](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md) bigger rockets, a way back | 🟡 | ✅ AC2–AC6 | 🟡 | 🔴 **AC9 RED** · 🔴 AC8 line clipped · 🔜 AC7 layer 3 UNBUILT · AC10 Richard |

**Where it is:** `cline-dev`. Session 2's commit carries the PLY-005 fix, the regenerated template,
the strengthened gate, and the drive scripts.

## 1. First job — the three reds, in this order

### a. PLY-006 AC9 — the rocket is still too small to see yourself in 🔴

**This is Richard's finding 6a, unfixed on the screen.** AC2 is green and honest, but it measures
the kit's exported seam at `ROCKET_SIZE_DEFAULT = 72` (face ≈ 23 px). The race never draws at that
size: `rtRoot` gives the course `30vh` capped at `56vw` and the sprite is fitted to that box. What a
child actually sees, measured in a real race:

| viewport | rocket hull | face |
|---|---|---|
| 1366×768 · 1280×720 · 1024×768 | 39×19 | **15 px** |
| 768×1024 | 50×25 | **19 px** |
| 390×844 | 39×18 | **14 px** |

The hull is 39 px for a sprite 78 units long — **half unit scale**. `kit.js:533` claims "a phone
draws a face of about 26px instead of 12"; it is 14. At 390×844 the two rockets also start stacked
on each other with their name labels overlapping them.

🔴 **Fix the course box, not the kit's default** — and then re-drive, because this is exactly the
budget-on-a-fixture trap that let it ship: *a gate on the kit cannot see what the race draws.*
Give AC9 a clause that reads the rendered `<image>`, which is what
`drive-ply-rocket.js --scenario ply006face` now does at all five viewports.

### b. PLY-001 AC8 — the sentence that was designed and never written 🔴

A `thumbs` profile still draws its face and its rocket tab still works, but **its face tab shows
nothing at all** — no tiles, no explanation. §3.4's third bullet ("The Thumbs face doesn't wear
things. Change your face in the player menu to dress up.") exists **nowhere**: not in
`tpl007Curriculum.ts`, not in any `tpl007*` source, not in the built template. AC6's gate is green
because it grades the chooser's narrowing, which is §3.4's *other* half.

### c. PLY-006 AC8 — the line that says why is clipped on the phone 🔴

At FR 390×844 the fired-turbo line measures `left: -7, right: 397` in a 390-wide viewport:

```
"⚡ 2,8 s · turbo à fond · ⚡⚡ turbo lancé · 🌀 aspiration +2 %"
```

Both ends are cut off. It is the longest the line ever gets — speed, turbo and slipstream at once —
and it exists for exactly one answer per race. EN 1366×768 is clean. `innerText` holds the whole
string either way, so **only the box measurement or the picture can see this**; the clause is in
the drive already.

## 2. Then: PLY-006 layer 3, and the four ungated ACs

- **PLY-006 AC7 — the bought Starter turbo** (R2), still the one thing unbuilt. Designed in
  [§3.2](PLY-006-BIGGER-ROCKETS-AND-A-WAY-BACK-INTO-THE-RACE.md). Needs a shelf row of a third
  kind, a `boosts` count on the profile, a buy that increments it, and a race start that consumes
  one into `startTurbo` (**the grader already takes that input and the engine gate already covers
  it**). Off in two-player races; it must stay a head start on layer 2, not a capability money
  alone buys.
- **PLY-002 AC4** (kit gate: seven decals inside the hull path), **AC5** (template gate: every
  price is a constant), **AC8** (save code v2 → v3).

## 3. Richard's calls — do not resolve these yourself

1. **PLY-006 AC8 says "lose the first four answers".** Four is not enough: after four misses the
   chain charges (`race.turbo` → 1) but the button never appears, because the slipstream has
   already pulled the child back inside `BEHIND_FROM` (0.15) and `rdCanFire` requires `behind`. At
   six it works. **Either the AC's number moves to six, or a charged turbo becomes spendable while
   level.** The drive uses six and says why.
2. **The buy card replaces the shelf** instead of sitting over it (§3.4 says "over the shelf"), and
   **closing it returns the shelf to the Face tab**, losing the tab the child was browsing.
3. **PLY-006 AC9's threshold.** 20 px is AC2's number. Ask what "legible" is on a phone before
   picking a course-box size.

## 4. The instrument — it is built now, use it

```sh
npm run template:rocket                                    # gate on EXIT, and it is quiet on success
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket \
  --allow-development-engine
node scripts/devtools/drive-ply-rocket.js <scratch>/rocket --scenario all --shots <dir>
```

Scenarios: `ply001 ply002 ply003 ply004 ply005 ply006 ply006face`, or `all`. A scenario taking only
the driver runs its own viewports; the rest run FR 390×844 then EN 1366×768.

🔴 **`--allow-development-engine` is not optional here.** Without it the deploy **exits 0 and writes
nothing**, reporting the refusal as `{"ok":false}` on stdout — the viewer in this checkout is a
development build. A drive then grades whatever was in the folder before. **Check the folder, not
the exit code.**

🔴 **`--scenario all` takes over 20 minutes and gets killed at about that mark** (exit 144). Run it
in two or three batches, or in the background.

## 5. What this session learned that will bite you

- 🔴 **The old drive ran at 1100×1500, which is none of the five viewports §5 requires.** That is
  the only reason it ever passed: the new-player form's "Let's go!" sits at y≈850 and is **below
  the fold at four of the five**, where `elementFromPoint` returns null and the press lands on
  nothing. Every click in the new instrument scrolls its target into view first — instantly, never
  smoothly, because a smooth scroll leaves `scrollTop` at 0 for the next synchronous read.
- 🔴 **"Press twice for a Modal" is wrong as a blanket rule.** Pressing "No" twice on the buy card
  closed it and then re-opened the tile underneath, and the drive bought a 40 ⭐ face item while
  believing it was grading a 120 ⭐ pattern. Use `pressUntil(label, expr)`: press, look, press again
  only if nothing happened.
- 🔴 **A gate can be green over a defect it is shaped to miss.** PLY-005's clause said "the two
  arrows show only when they lead somewhere" and asserted only that two wires existed. Both did. ▶
  had never mounted once. Grade the value, not the topology.
- 🔴 **Four instrument faults, each of which made a working feature look broken.** `owned` is on the
  PROFILE and `spent` on `p.model`; the avatar data URI shares a long prefix so a truncated compare
  made four faces read as one **and passed a clause that looked at nothing**; the Edit form has two
  avatars (a 40 px chip and the 96 px face) so `querySelector` got the wrong one; and the ●○○○ row
  is hits landed, not the monster's creep — the monster's place is `.rkt-monster` along `.rkt-lane`,
  gate at the left.
- 🔴 **A drive that answers questions needs a real solver.** At 77% the chain never reached three in
  a row and the comeback read as dead. It is at **100% in both languages** now (`solve()` in
  `drive-rocket-lib.js`), which needed French number words ("quatre-vingt" is 4×20, not 4 then 20),
  and the knowledge that a comma is a thousands separator in English and a decimal point in French.

## 6. Rules, unchanged

[§5 of the README](README.md) — build only through the generator, kit before generator, never
hand-edit `templates/rocket-school/**` or `game-kit/project/**`, every number in one exported
constant, the five viewports with FR + AZERTY first, and reproduce before fixing.

**§6 still stands: a green gate closes nothing here.** Richard replays all four games and the
hangar, and none of the six findings reproduces.
