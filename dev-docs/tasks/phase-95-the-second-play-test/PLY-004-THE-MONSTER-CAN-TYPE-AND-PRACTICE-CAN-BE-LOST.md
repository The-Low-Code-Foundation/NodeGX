# PLY-004 — The monster can type, and practice can be lost

> "The monster game needs to get its typing version as well as the maths version. Also it's a bit too easy at the
> moment, you have to really fuck up a lot to have the monster break down your door. In the defi mode it works well
> with the timer adding stakes, but in the entrainement mode it's pretty much unlosable. I'm not saying make it as
> hard as defi, but a good compromise please" — Richard, 2026-09-18

## 1. The person sentence

**A child picks Typing, watches the monster gain ground every time they hesitate, and finishes with one heart left.**

## 2. What is there (read 2026-09-18)

| reading | where |
|---|---|
| `Monster/Setup` publishes `style` and `timed` only — **there is no mode row** | `tpl007Components.ts:3521` |
| the question inside the game is placed **hard-coded**: `place('zpRound', C.raceRound, …, { mode: 'maths' })` | `tpl007Components.ts:3613` |
| in Practice a correct answer sets `g.start = 1` — **any** right answer throws the monster all the way back | `MONSTER_MOVE_SCRIPT`, `tpl007Scripts.ts:1540` |
| so a heart needs **three wrong answers with no right one between them**, and the game needs nine | the two readings above |

## 3. Design

### 3.1 Typing

Monster Gate already asks the race's questions through `Race/Round`, and `Race/Round` already takes a `mode`. So the
whole of the typing version is: a Maths / Typing row on the setup (the race's own `Choice row`, its own words), a
`mode` output, a `mode` input on `Monster/Play`, and the one wire that replaces the hard-coded parameter. **Nothing in
the monster's own rules changes.**

### 3.2 The compromise

In Practice:
- a **wrong** answer creeps `creep.practice` (a third) closer, and the creeps now **accumulate across the game**
- a **right-but-slow** answer holds the monster exactly where it stands — it neither gains nor loses ground
- only a **quick** right answer pushes it back, by `back.practice` (0.15)

Challenge is untouched: Richard says the clock already carries it.

🔴 **The quick/slow half is what does the work, and it is why this is not just "a bigger number".** Practice has no
visible clock and is not getting one (TPL-007 §1.4, briefing §4 — a soft "fluent" flag, never a countdown). The flag
already exists and the child already sees ⚡ on a fluent answer. **Hesitating is now the only thing in Practice that
lets a monster gain**, which is stakes without a timer and without punishing a child for being right.

### 3.3 What it does — 🔴 measured, 200 seeded games per row, half the right answers quick

| the child answers | loses the game | hearts lost when they win |
|---|---|---|
| 40% right | **59%** | 1.3 |
| 50% right | 25% | 1.0 |
| 60% right | 7% | 0.8 |
| 70% right | 1% | **0.5** |
| 80% right | 1% | 0.2 |

🔴 **The honest part.** `Pick next question` serves questions the child gets right about three times in four
(Klinkenberg's ~75%), so **a child playing normally should still win** — that is the pedagogy, not a bug. What this
buys is that they spend about half a heart getting there and can see the monster near the gate. A rule that made a
75%-accurate child lose would be punishing them for being right.

### 3.4 The words follow the rule

`monsterGatePractice` said *"Three wrong in a row and it reaches the gate."* That is now false, and it is the sentence
the child reads before pressing Start. It becomes: *"Every wrong answer brings it closer. A quick answer ⚡ pushes it
back; a slow one only holds it."*

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ (s1) **RED on today's build:** the setup has no mode row and `zpRound` is placed with `{ mode: 'maths' }`; and in Practice wrong-right-wrong leaves the monster **one** creep in, not two. Both recorded. |
| AC2 | ✅ (s1) Engine gate: a slow right answer holds it, a quick one pushes it back, wrong answers accumulate. Sabotage arm: restore the full knock-back and the same sequence reads one creep in. |
| AC3 | ✅ (s1) Engine gate: measured over 120 seeded games, a child at 40% right loses >40% of games, a child at 75% loses <10% **but spends >0.25 hearts**. Sabotage arm: restore the full knock-back and both numbers fall. |
| AC4 | ✅ (s1) Engine gate: Challenge is unchanged — a right answer still knocks it all the way back, and the creep is still a quarter. |
| AC5 | Template gate: `Monster/Play` has a `mode` input, wired from the setup, and **no node in the template places `Race/Round` with a literal mode**. Sabotage arm. |
| AC6 | Drive, FR 390×844: start a Monster game in **Typing**, Practice — words are asked, the keyboard shows, and the lane behaves. |
| AC7 | Drive: answer slowly and correctly three times in Practice → the monster has not moved back; answer quickly → it does. **Read on the screenshot.** |
| AC8 | Richard plays Entraînement and says whether it is now losable without being Défi. |
