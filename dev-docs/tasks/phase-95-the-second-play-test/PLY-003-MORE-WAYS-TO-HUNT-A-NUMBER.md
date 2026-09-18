# PLY-003 — More ways to hunt a number

> "The 'find the two numbers that make X' game, normally you have a 3 numbers addition variant, a multiplication,
> addition, maybe subtraction variant? In any case, more variations would be good, more or less depending on the
> kid's age" — Richard, 2026-09-18

## 1. The person sentence

**A CE2 child hunts sums and differences; a 6e child hunts products, exact divisions and decimals — and neither is
ever shown the other's grid.**

## 2. What is there (read 2026-09-18)

| reading | where |
|---|---|
| four kinds exist: `add2`, `add3`, `mul2`, `add100`. **No subtraction, no division, no decimals** | `HUNT_WORDS` / `huntTry`, `tpl007Scripts.ts:1210-1253` |
| three bands for four classes — `li === 0 ? … : li === 1 ? … : […]`, so **CM2 and 6e get the same grids** | `huntGrid`, `tpl007Scripts.ts:1250` |
| `Logic/Check hunt pick` computes the running total as `kind === 'mul2' ? × : +` | `CHECK_HUNT_SCRIPT` |

## 3. Design

**Eight kinds, one band per class**, pinned to the 2025 programmes (the briefing's §3 carries the BO references).
`HUNT_KINDS` and `HUNT_LEVEL_KINDS` are exported, and the gates read them, never a literal.

| kind | the grid asks for | classes |
|---|---|---|
| `add2` · `add3` | 2 or 3 squares that add to the target | all |
| `sub2` | 2 squares whose **difference** is the target | all |
| `mul2` | 2 squares whose product is the target | CM1 → |
| `div2` | 2 squares where the bigger **÷** the smaller is the target | CM2 → |
| `add100` · `add1000` | 2 squares that make 100 / 1000 | CE2 → / CM2 → |
| `dec` | 2 **decimals** that add to the target | 6e |

- **Subtraction and division are asked of the pair, not of the tap order**: the bigger takes the smaller, so a child
  who taps 3 then 12 has made the same 9 as one who tapped 12 then 3.
- **A division that is not exact makes nothing** — it can never equal a whole target.
- 🔴 **Some kinds will not turn up by chance**, so those grids are **planted**: one or two true pairs written in, the
  rest filled at random, and the ways then counted honestly over the whole grid.

## 4. What building it found

🔴 **`Logic/Check hunt pick` knew addition and one multiplication and nothing else.** It is the node that shows the
running total under a grid, and the moment subtraction, division and decimals existed it would have told a child their
right answer was wrong. It now calls `huntValue`, the same function that grades the move, so the number under the grid
and the verdict on it cannot disagree. **The gate found this, not a person.**

🔴 **`dec` was first written as "two tenths that make 1" and FAILED about four times in five.** With sixteen squares
drawn from 0,1–0,9 a grid holds about thirteen pairs that make 1, so it was rejected for having more than three ways
and **fell back to `add2` — silently**. A 6e class would have quietly been served CE2 sums. Caught by counting which
kind each level actually produced over 600 draws, not by reading the code.

## 5. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ (s1) **RED on today's build:** four kinds, three bands, CM2 and 6e identical. Recorded in §2. |
| AC2 | ✅ (s1) Engine gate: every class builds only grids of ITS OWN kinds, over 600 draws — **no silent fallback**. |
| AC3 | ✅ (s1) Engine gate: every grid's target has 1–3 ways, and each way is independently re-derived from PLY-003's table (not read from the script) and agrees. |
| AC4 | ✅ (s1) Engine gate: `Logic/Check hunt pick` agrees with the grader on every kind. |
| AC5 | ✅ (s1) Engine gate: the instruction says the target in the child's own punctuation — `5,3` in French, `5.3` in English. |
| AC6 | Drive, FR and EN: play a hunt at CE2 and at 6e; the instructions read correctly and a correct pick is accepted on every kind. |
| AC7 | Richard plays a hunt at two classes and says whether the range and the age-fit are right. |
