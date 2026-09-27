# RKT-009 — More kinds of question

Finding 8: *"right now it's just open answer for every question, some could be multiple choice or
other question types, research requires as to what question types are more appropriate."*

## 1. The person sentence

**Each idea is asked in the form that teaches it best — recall where speed is the point, a number line
where size is the point, "who is right?" where the misconception is the point.**

## 2. What is there (2026-09-13)

| reading | where |
|---|---|
| two kinds: `typed`, and `options` (four buttons carrying the misconception's own answers) | curriculum `answer: 'typed' \| 'options' \| 'either'`, `tpl007Curriculum.ts:70`; the Question box's `typed`/`options` States |
| `options` is used only by the place-value, comparison, fraction and decimal skills | `tpl007Curriculum.ts:175-243` |
| a profile's `answerMode` can force options | `Pick next question`, `tpl007Scripts.ts:518` |

⚠️ **Not everything should become multiple choice.** Producing an answer (typed recall) is generally
the stronger retrieval exercise than recognising one. Typed stays the default for fact fluency, and
other formats are chosen where they teach something recall cannot. The research must confirm or
overturn that sentence.

## 3. Research first

A briefing in this folder, cited, in the shape of
[`tpl-007-research-briefing.md`](../phase-78-the-templates/tpl-007-research-briefing.md). For ages
8–12, per format: what it is good for, the evidence and its strength, the known failure modes, and
whether it works by touch and by keyboard. Candidates to weigh, not a list to build:

- recall versus recognition (the testing effect; multiple choice with competitive lures)
- **number line placement** — magnitude of whole numbers, fractions, decimals
- **"Who is right?" / spot the error** — incorrect worked examples; the natural home of the eleven trap skills
- **fill the gap** — `7 + _ = 15`, `_ × 6 = 42`
- **order / sort** — decimals smallest to largest
- **true or false, with a reason**
- **estimate** — "closest to", a slider
- **tap the digit** — "tap the thousands"
- **match pairs** — fraction ↔ decimal ↔ picture
- bar models and pictures for fractions

Output: a ranked shortlist mapping each format to the strands and skills it suits, with the strength of
its evidence.

## 4. Then

1. **Richard rules** the shortlist: which formats, for which skills.
2. Build the top three as Question box kinds (a `States` variant plus a generator output shape per
   kind), each working with the pad (RKT-005), the keyboard and touch, in both languages.
3. Curriculum rows gain `answer` values for them. A skill may list several, and the picker varies
   them — interleaving across formats, not only across skills.

## 5. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ (s10) The briefing, with URLs, in this folder: [`rkt-009-question-formats-research.md`](rkt-009-question-formats-research.md). |
| AC2 | Richard's ruling recorded. |
| AC3 | Engine gate: every new kind generated 60× for each skill that uses it, in both languages; the answer always gradeable; a misconception distractor present wherever the skill is a trap. |
| AC4 | Template gate: the Question box's kinds and the curriculum's `answer` values are the same set — a kind nobody asks for, or one asked for with no variant, is RED. |
| AC5 | Each new kind driven by pointer, touch and keyboard, graded both right and wrong. |
| AC6 | The TPL-007 §8 rebuild proof still holds: a skill added with a new kind appears in the race with no other change. |

## 6. Record

### Session 10 (2026-09-13): the briefing (AC1)

[`rkt-009-question-formats-research.md`](rkt-009-question-formats-research.md), cited. Nothing was built.

**The ranked shortlist (§4 there), for Richard to rule (AC2):**

| # | Kind | For | Evidence |
|---|---|---|---|
| 1 | **Number line, tap to place** (a tolerance band; arrow keys on a laptop) | magnitude: `frac-unit`, `frac-compare`, `dec-compare-2/3`, `frac-dec`, `frac-quotient`, `round-*`, `compare-10000` | the strongest here: a meta-analysis, two randomised trials, and a WWC "Strong" rating |
| 2 | **"Who is right?"** (two short worked answers, one the misconception's) | all 11 trap skills | moderate: two randomised trials. It needs no clock: score it on correctness, not speed |
| 3 | **Fill the gap, as an inline box** | more `calc` skills (`bond-*`, `table-*`, `equals-balance`, then `pow10-*`, `percent` …) | moderate. It stays production, and the pad and keyboard are unchanged |

Then: "closest to" as buttons, tap the digit, tuning today's `options`, tap in order, and one match pair.

**Do not build:** a slider, drag-to-sort, a match-pairs memory grid, pie or area pictures as a size question, bare true/false in
the race, options on times-table fluency, and a speed-scored "Who is right?". The reasons are in §5 there.

**§2's sentence is half overturned.** "Producing an answer is the stronger retrieval exercise" is not supported in classrooms (Yang
2021, 222 studies: recall and recognition about equal). "Typed stays the default for fact fluency" is confirmed, for other reasons:
fluency is production, seeing the answers lets a child skip recall, and a clock makes four buttons guessable.

🟡 **For Richard: the race rewards guessing today.** A wrong answer gains 0 and costs nothing (`tpl007Scripts.ts:861`, read by the
briefing), so a fast guess on four buttons comes out ahead on average. That bears on this ruling, and on RKT-008's new "Answers:
Buttons" setting.

⚠️ No study compares these formats inside a speed race, so every judgement about the race in the briefing is marked inferred. Three
sources were read second-hand, and each is labelled.
