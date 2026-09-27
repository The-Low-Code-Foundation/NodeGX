# CG-006 — The requests: the coding tricks, the Olive ladder, and the moments worth ring-fencing

**Opened 2026-09-27**, scoped from TPL-012 §2.3 and §2.6. **Status: ⬜ not started.** Depends on CG-002
(and CG-005 for §3). Lane B.

## 1. The person sentence

> **Every request is a person on the island asking for help; every request teaches exactly one new thing;
> the child can tell before she starts which trick it needs; and when Olive is part of it, the request
> is honest about what Olive will get wrong.**

## 2. The coding requests (the seven tricks)

Each row is one entry in the request array (CG-002's schema): islander, band, trick, map, goal, palette,
reward. The reference solution is part of the entry and the engine gate runs it.

| # | Trick | Request (islander) | Goal | Reward |
|---|---|---|---|---|
| 1 | Steps in order | Sami: walk the path to the post box | robot on the post-box tile | cap |
| 1b | Steps in order | Mamie Rose: water the tulip by the door | one tulip watered | sticker 🌷 |
| 2 | Repeat | Mamie Rose: water my three tulips (the mockup's) | three watered; the fold offered | sunflower hat |
| 2b | Repeat | Sami: lay the path stones, four in a row | four `put` on the path | seeds |
| 3 | Repeat until | Biscuit: walk to the wall, then turn | `until wall` used; robot at the wall | sticker 🐾 |
| 4 | If | Biscuit: feed me only if my bowl is empty (two bowls, one full) | the empty bowl filled, the full one untouched | crown |
| 5 | When | Biscuit: when I meow, come to the bowl | a `when meow` handler armed; the meow fires twice | bell |
| 6 | Counting | Mamie Rose: collect four eggs, then stop | `count +1` and `count = 4` used | basket |
| 7 | A trick with a name | Mamie Rose: water both rows the same way | a named trick called twice | garden gnome |

Free play is always open with every trick the band has.

## 3. The Olive rungs (TPL-012 §2.6, measured on the 0.8B)

Green rungs build on what she does consistently; 🎓 rungs make her fail on purpose and the child fixes it
with a program. All twelve are in TPL-012 §2.6's table; the entries here add only the request framing:

| # | Islander says | Block | Outcome |
|---|---|---|---|
| 1 | Sami: "tell Mamie Rose thank you, twice" | `say` | two different lines |
| 2 | Mamie Rose: "name my three new tulips" | `ask · a list of 3` + the dial | labels on the tulips |
| 3 | Sami: "I wrote Pip's route in words" | `ask · blocks` | Olive proposes, the child runs |
| 4 🎓 | Sami: "avance de trois cases, puis arrose" | `ask · blocks` | one block; fix with `repeat 3` |
| 5 | Biscuit's letter: "what does Biscuit want?" | `ask · one of` → `if Olive says croquettes` | the branch goes to the bowl |
| 6 🎓 | "is the thing ahead a flower?" | `if Olive says yes` | mostly right; ask three times, count the yeses |
| 7 🎓 | Mamie Rose: "how many tulips do I have?" | `ask · a number` | 6, 7, 7; the program counts 4 |
| 8 🎓 | Olive's maths test (band 10–12) | `ask · a number` | 2+3 ✓, 14+9 ✗ every time |
| 9 🎓 | "make Olive answer in under 5 words" | a rule slot + a word-count checker | the sentence is ignored, the shape holds |
| 10 🎓 | Olive's tall tales (band 10–12, canned) | none | confident wrong answers, checked in a book |
| 11 | Sami: "translate the note for my cousin" | `ask · in English` | FR → EN works; EN → FR shown as weaker |
| 12 | "a poem for my tulip" | `ask · two lines` | a sticker, sometimes silly |

## 4. The extra moments to ring-fence (added 2026-09-27 at Richard's ask)

Each is a request or a Skills-page card; each names the lesson and whether the readout already covers
it or a probe must be added to the exam first. A moment ships only after its probe is green (or reliably
red, for a 🎓).

| # | Moment | Lesson | Model behaviour needed | Status |
|---|---|---|---|---|
| E1 | **Olive forgets.** Ask her the name she gave the tulip a minute ago | a model has no memory; the program's variable does | certain by design (no context is kept) | ship |
| E2 | **Olive can't see the garden.** "Which way is the tulip?" with nothing in the slot, then with the map's row in the slot | she knows only what you tell her; that is the prompt | probe: does a one-line map in the slot yield `gauche`? | add probe |
| E3 | **Explain my program.** Blocks → a sentence ("Pip goes forward twice, turns left, waters") | reading code; the round trip words → blocks → words is lossy | probe: reshape, expected green | add probe |
| E4 | **Olive narrates the run.** The trace → a sentence ("Pip watered the path and made a puddle") | reading a trace; debugging in words | probe: reshape, expected green | add probe |
| E5 | **Name my trick.** The child's named block gets a name suggested from its body | naming; the model as a label-maker | probe: expected green | add probe |
| E6 | **Rewrite it.** "Say it more politely / like a poem / shorter" on a given line | transformation vs invention | probe: expected green for polite/poem, red for "shorter" (a rule) | add probe |
| E7 | **Word → emoji** for stickers | reshaping into a symbol | probe: expected green | add probe |
| E8 🎓 | **Sort these words** | ordering is a rule; the program sorts | probe: expected red | add probe |
| E9 🎓 | **Olive's dictionary.** Define a garden word (canned list) | small models make things up about the world | probe: expected mixed, shown as such | add probe |
| E10 | **The letter generator.** Every request's spoken line is written by Olive from the request's data, so the island reads differently each play | flavour from data; the data is the truth (a must-contain check on the object) | probe: expected green with must-contain | add probe |
| E11 | **Slow blocks.** A loop with an Olive block inside shows a "thinking" badge per iteration | a call costs time; ask once, remember the answer | certain by design | ship |
| E12 🎓 | **Two Olives disagree.** Ask twice at "surprise me", compare | variability; when to trust a single answer | certain by design (F2 in the readout) | ship |
| E13 🎓 | **The fence.** (Grown-ups page only, not a child activity) Olive's exam shows the off-topic probe's answer | why the game never lets a child type freely to her | H1–H3 in the readout | ship as a Grown-ups card |

**Not a moment, by ruling:** Olive never suggests the next block and never fixes a program. The hint
table does that from the state, and the research (TPL-012 finding 5) says a model doing it harms.

## 5. Acceptance criteria

1. Every request in §2 has a reference solution that the engine gate runs to its goal, in both bands
   where the band allows it.
2. Every Olive rung in §3 and every shipped moment in §4 has its exam probe with an expected answer, and
   the contract test's readout matches the column the request was designed on (green stays green, 🎓
   stays red).
3. Every string is in the word table in EN and FR, and the FR copy is read by Richard before the kids
   see it (he tests in French).
4. Rewards are cosmetic, never bought, and each names the islander it came from.
5. No request carries a timer, a score, a streak or a "you missed".
6. §4's "add probe" rows are either promoted to §3 with a probe or dropped, and the README's board says
   which.

## 6. Traps

A documented example description is published; an inert parameter in a corpus example teaches a lie;
the "Out:" line can hold the defect (read the goal predicate, not the blurb).
