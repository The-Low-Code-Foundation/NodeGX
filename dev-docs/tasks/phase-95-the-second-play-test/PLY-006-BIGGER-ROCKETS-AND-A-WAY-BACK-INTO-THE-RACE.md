# PLY-006 — Bigger rockets, and a way back into the race

> "If the rockets are going to get upgrades, I think it'd be nice to make them bigger and a tiny bit more detailed,
> certainly to be able to see your avatar inside the rocket better. Also we might need to introduce boosts or
> something that you can buy or win, because when you've fucked up the beginning and the CPU rocket is at the middle
> point, you're fucked and you know it. I'll let you have a think about the best system for letting someone make a
> spectacular comeback using the research we've already done and stored in the project" — Richard, 2026-09-18

**Read first:** [the TPL-007 briefing](../phase-78-the-templates/tpl-007-research-briefing.md) §2 and its design
implications 5, 12 and 14, and [the rewards briefing](../phase-87-the-first-play-test/rkt-010-rewards-research.md)
§3–4. **Read also [RKT-007](../phase-87-the-first-play-test/RKT-007-THE-CLOCK-AND-THE-BOOST-EXPLAIN-THEMSELVES.md)**,
whose rule — *one formula: the number the line says IS the number that moved the rocket* — binds everything below.

## 1. The person sentence

**A child four answers down, with the computer at halfway, strings three right answers together, fires the turbo they
just earned, and lands first — and can see their own face in the window the whole way.**

## 2. What is there (read 2026-09-18)

### 2.1 The rocket

| reading | where |
|---|---|
| the sprite is 64 units nose to tail | `ROCKET_UNITS`, `kit.js:487` |
| the face is a 20 × 20 image clipped to a **9-unit circle** — about 14% of the rocket's length | `kit.js:778-786` |
| the floor is 44 screen px, so on a phone the face is drawn at about **12 px** | `rocketSize`, `kit.js:960` |
| the hull is one `fill`; there is no second layer and no port for one | `kit.js:777` |

### 2.2 The race — 🔴 measured through the real grader, 400 seeded races per number

`gain = RACE_STEP × speed` on a correct answer (`tpl007Scripts.ts:876`); `cpuGain = RACE_STEP × (0.35 + 0.35 p)`
(`:877`). **The computer moves on every question, including the ones the child gets wrong. Nothing anywhere reads the
gap.**

The scenario is the one Richard named — *"the CPU rocket is at the middle point"* — so it is defined by that STATE:
the child answers wrong until the computer reaches halfway, then answers at 75%.

| | wins today |
|---|---|
| **a bad start** (computer at halfway, then 75% right) | **1%** |
| a clean race at 75% right | 98% |

🔴 **Richard's sentence is a number, not an impression.** Note also that the base balance is not the problem — so this
task must fix the bad start **without** making the race easier than it already is.

🔴 *Four-wrong-then-play was tried as the scenario first and is NOT his: four misses leave the computer at about 0.2,
and a child recovers from that unaided 73% of the time. The complaint is about the computer being at halfway.*

## 3. Design

### 3.1 The rocket (✅ built, s1)

Longer hull, so there is room for both a cockpit and a decal: `ROCKET_UNITS` 64 → **78**, window **12.5 units at
cx 15**, floor 44 → **72 px**. The face is `size × 2·WINDOW_R ÷ ROCKET_UNITS` — **23 px where it was 12**. Detail
added: a nose cone, a hull band, a rimmed canopy with a glass highlight, outlined fins and a two-tone exhaust.

🔴 **The first attempt was wrong and the picture is what said so.** Making the hull *deeper* (±12 → ±15) and the
window 13 units gave a big face on a rocket that was all cockpit: every decal from [PLY-002](PLY-002-PAINT-IS-BASIC-PATTERN-IS-THE-PRIZE.md)
was hidden behind the window, and the lightning bolt was invisible. Lengthening instead of deepening gives both.
**Every change here was rendered and looked at before it was believed** (`scratchpad/rockets.png`, before/after and
all seven decals).

### 3.2 The comeback — three layers, all earned, all visible, none random

The Don'ts bind: nothing random, nothing a child cannot earn, and **never reward speed without accuracy**. So every
layer below multiplies a gain that is *already zero on a wrong answer* — no layer can ever pay for being wrong.

**One threshold**, `BEHIND_FROM = 0.15`: about a rocket's length. Nothing helps a child who is not behind it.

| layer | rule | why |
|---|---|---|
| **1. Slipstream** | a correct answer while behind gains `× (1 + 0.6 × min(1, (gap − 0.15) ÷ 0.45))` — up to +60% at a 0.6 gap | continuous, needs no decision, and decays to nothing as the child draws level, so a lead still means something |
| **2. The chain ⚡** | 3 correct answers **in a row** charge one turbo. The child **taps it** to spend it, and their next correct answer counts **double**. One held at a time; a wrong answer breaks the chain but never discharges a turbo already earned; it can only be spent while behind | the "spectacular" part. Earned by accuracy alone, deterministic, and **the child chooses the moment** — autonomy, which the SDT work calls the strongest of the three needs a game can meet |
| **3. A turbo you bought** | the hangar sells **Starter turbo, 60 ⭐**: begin your next race already holding one ⚡ | Richard's R2. 🔴 It buys a *head start on layer 2, never a capability money alone has* — the briefing's "no reward a child cannot earn by playing" is met because three right answers give the same turbo to everyone, free, forever |

🔴 **Off in two-player races.** Two-player is one child against another on the same browser; a sibling who saved must
not out-buy a sibling who did not. Layers 1 and 2 are on for both players; layer 3 is single-player-vs-computer only.

🔴 **Slipstream never touches the computer**, and the computer's own step is unchanged. One dial, in one direction,
that a child can be told about in a sentence.

### 3.3 What it does — 🔴 measured through the real grader, 400 seeded races per number

| | before | after |
|---|---|---|
| **a bad start** (computer at halfway, then 75% right) | **1%** | **57%** |
| a clean race at 75% right | 98% | 98% |
| a child guessing (35% right) | — | 13% |

**A bad start becomes a race again, a clean race is untouched, and a child who is guessing still loses.** The child in
that 57% answers well for the whole of the recovery and still loses two times in five: it is a comeback, not a
rescue.

🔴 **Slipstream alone was measured first, because it was the obvious design, and it moved almost nothing** — the
multiplier decays exactly as the child closes, so it cannot bridge a gap on its own. **The chain is what does the
work.** Recorded because it was the obvious answer and it was wrong.

### 3.4 Saying it

RKT-007's rule holds: **the line says the number that moved the rocket.** The verdict line gains a second clause only
when it applies — `⚡ 2,1 s · turbo à fond · 🌀 aspiration +45 %` — and the chain shows as three pips under the track,
filling. A charged turbo is a button beside Next, not a hidden state.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ (s1) **RED on today's build:** with the comeback switched off, a bad start wins **1%** of 400 seeded races. Recorded in §2.2. |
| AC2 | ✅ (s1) The rocket: the face is ≥ 20 screen px at the default floor, and `2·WINDOW_R ÷ ROCKET_UNITS` ≥ 0.3. Read from the kit's own exported `rocket` seam, not from a copy. |
| AC3 | ✅ (s1) **The picture was looked at**: before/after and all seven decals rendered and read, and the first attempt rejected for hiding them. |
| AC4 | ✅ (s1) Engine gate: the comeback maths — slipstream is 1 at and below `BEHIND_FROM`, rises with the gap, caps at +60%, is **never** applied to a wrong answer and **never** to the computer. Sabotage: apply it to a wrong answer, and the arm goes RED. |
| AC5 | ✅ (s1) Engine gate: the chain charges at exactly 3 in a row, holds one, survives a wrong answer once charged, and is spent only while behind. Sabotage: let it charge at 2. |
| AC6 | ✅ (s1) Engine gate, the one that grades Richard's sentence: a bad start wins ≥ 15% with the comeback on and ≤ 2% with it off, **and** a clean race rises by no more than 15 points, **and** a child guessing still wins ≤ 35%. Four clauses, because a fix that makes the race easy is not a fix. *As built: 1% → 57%, clean 98% → 98%, guessing 13%.* |
| AC7 | 🔜 **Not built.** Layer 3 (the bought Starter turbo) is designed in §3.2 and nothing of it exists yet: no shelf row, no `boosts` count on the profile, no consume at the start of a race. Layers 1 and 2 deliver the comeback without it, so this is a task and not a hole. Its clause: layer 3 is off in a two-player race, and a bought turbo is consumed exactly once. |
| AC8 | 🟡 (s2) **DRIVEN — the comeback works, at SIX misses not four, and the line that says why is clipped on the phone.** `--scenario ply006`. The chain line counts `1/3 → 2/3`, the turbo charges on the third right answer, `⚡ Fire the turbo!` appears and is reachable (not behind a blocker), firing it puts `⚡⚡ turbo fired` / `turbo lancé` in the line, and the answer it grades wins **1.81–1.85×** the distance of the preceding plain right answer — read from the kit's own `data-gain` dasharray, which is the app's own arithmetic. Not exactly 2× because `gain = RACE_STEP × speed × slip × turboMult` and the slipstream shrinks as the gap closes. **Two findings, both in §5.** |
| AC9 | 🔴 **RED (s2) at ALL FIVE viewports.** Measured on the rendered `<image>` in a real race: **15, 15, 15, 19 and 14 px** at 1366×768, 1280×720, 1024×768, 768×1024 and 390×844 — short of 20 by 1 to 6 px. See §5. |
| AC10 | Richard comes back from a bad start, and says whether it felt earned or given. |

## 5. What driving found that the gates could not (s2, 2026-09-18)

### 5.1 🔴 AC2's ≥ 20 px is true of the kit and false of the race

AC2 is green and honest: it reads the kit's own exported `rocket` seam at `ROCKET_SIZE_DEFAULT = 72`, where the face
is `72 × 2·12.5 ÷ 78 ≈ 23 px`. **The race never draws at that size.** Its course box is `30vh` capped at `56vw`
(`rtRoot`), and the sprite is fitted to that box, so what a child actually sees is:

| viewport | course svg | rocket hull | face | AC2 wants |
|---|---|---|---|---|
| 1366×768 | 928×230 | 39×19 | **15 px** | ≥ 20 |
| 1280×720 | 928×216 | 39×19 | **15 px** | ≥ 20 |
| 1024×768 | 928×230 | 39×19 | **15 px** | ≥ 20 |
| 768×1024 | 736×307 | 50×25 | **19 px** | ≥ 20 |
| 390×844 | 358×218 | 39×18 | **14 px** | ≥ 20 |

The hull is 39 px for a sprite that is 78 units long — the race draws the rocket at **half** unit scale. `kit.js:533`
claims "a phone draws a face of about 26px instead of 12"; the measured phone face is **14 px**. Richard's finding 6a
("too small to see yourself in") is **not fixed on the screen**, only in the kit's geometry. A budget measured on a
fixture bounds the fixture. At 390×844 the two rockets also start stacked on each other with their name labels
overlapping them (`29-ply006-face-390x844.png`).

### 5.2 🔴 The verdict line is clipped at both ends on the phone

At FR 390×844 the fired-turbo line runs off **both** edges. Measured on its own box:

```
text  : "⚡ 2,8 s · turbo à fond · ⚡⚡ turbo lancé · 🌀 aspiration +2 %"
left  : -7      right: 397      innerWidth: 390      (overflows 7 px each side)
```

so the leading ⚡ is cut off the left and the slipstream figure off the right
(`05-ply006-fr-turbo-fired.png`). AC8 asks that the line **say why**, and on a phone a child cannot read the whole
why. EN 1366×768 is clean. This is the longest the line ever gets — speed, turbo and slipstream at once — and it
exists for exactly one answer per race, which is why no earlier drive met it. `innerText` holds the whole string
either way, so only a box measurement or the picture can see it.

### 5.3 AC8's "four" should be six

After **four** misses the chain still charges (`race.turbo` → 1 on the third right answer) but the button never
appears: by then the slipstream has pulled the child back inside `BEHIND_FROM` (0.15), and `rdCanFire` requires
`behind`. The turbo is not lost — it waits for the next time they fall behind — but AC8's sequence cannot be
completed at four. At **six** the gap survives three right answers and the button appears. Either the AC's number
moves to six, or a charged turbo becomes spendable while level; **Richard's call.**
