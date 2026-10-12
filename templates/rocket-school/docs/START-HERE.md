# Rocket School

Maths, French, English, history and typing practice for 8–12 year olds on the French school programmes, in an
English or French interface, built entirely out of NodeGX nodes. Press **Run**, make a player, and race the
computer to the planet.

There is no backend. Profiles and progress live in this browser (localStorage), and every
player has a **save code** to carry their progress to another computer.

## The first thing to change

Open **Data/Curriculum** and find the node labelled **"EDIT — the skills — this list IS the school"**.
It is a `Static Data` node holding a JSON array; one entry is one skill:

```json
{
  "id": "table-8", "level": "CE2", "strand": "calc",
  "generator": "table", "params": { "table": 8, "min": 1, "max": 10, "bothWays": true },
  "answer": "typed", "fluentMs": 3500, "diff": 0.6,
  "name": { "en": "8 times table", "fr": "Table de 8" },
  "strategy": { "en": "Times 8 is double, double, double.", "fr": "Fois 8, c’est doubler trois fois." },
  "teach": "tables"
}
```

Add an entry and every game can ask about it. 108 skills ship, for CE2, CM1, CM2
and 6e — 19 of them built to catch a misconception (230 million written as 200,300,000;
0.25 "bigger" than 0.7; 52 − 38 = 26). The explainer a wrong answer opens is one entry in
**Data/Teach cards** (26 ship), and every word of the interface is one row in **Data/Words**.

Beyond maths (54 skills) and typing (8), the school has French (22: conjugation,
the verb's modes, tenses and voices, word classes, homophones, plurals and feminines), English as the foreign language
(17: vocabulary both ways, numbers, be and have, question words, irregular past) and history
(7: the five periods, centuries, prehistory and Antiquity with their dates said as "around"). A fact skill is a
`generator: "list"` bank of `{ q, a, note }` items; the wrong buttons are the other items' answers, and a note is
said with the correction. Each skill carries a `subject` and a `topic`, which is what the chooser shows.

## Choosing what to practise, and your own lists

Before a race or a monster game the setup says what the player is practising ("Maths · everything (CE2)") and
**Change** opens the chooser: a subject, a topic in it, and the topic's skills as pills to tick. Nothing ticked
is the whole topic; "the tables of 5 and 8" is two ticks. The choice is kept on the profile, so a child whose class
has not reached fractions simply leaves them unticked. Under **My lists** are the player's own revision lists, made
on the **Lists** page by typing one line per question (`Neanderthals disappear = around -40 000`): what the teacher
gave, as it was given, so a test that uses the teacher's own dates is revised from the teacher's own dates. Each
item of a list is learned after two right answers in a row (📚 +2 ⭐), and a whole list learned pays 🏆 +25 ⭐.

## How the game works, in the graph

- **`Logic/*` are the named utilities.** `Pick next question`, `Grade answer`, `Encode save code`
  — each is a `Component Inputs` → one Function → `Component Outputs`. A page places them; no
  page grows its own anonymous Function.
- **The learner model is Elo.** `Grade answer` moves a rating up on a right answer (more when it
  was fast), down on a wrong one, doubles a skill’s review interval on a right answer and halves
  it on a miss. `Pick next question` serves a due review first, then a skill the player is
  predicted to get right about three times in four. Mastery climbs new → familiar → solid →
  mastered, and drops after two misses.
- **Speed never scores without accuracy.** A wrong answer moves nothing, however fast.
- **There is no clock node, and no game loop.** The rockets glide with `Animate To Value`; the
  countdown is one `Delay` and one `Animate To Value` (`Game/Countdown bar`).
- **Every decision is a `Condition`.** Right or wrong, whose turn, did a rocket land, is the
  race over — each one is a gate you can open and follow.

## A library module travels with this project

`noodl_modules/game-kit` draws the faces, the race track and the keyboard, and plays the
sounds. It is already here — nothing to install. **Do not delete it.** Faces are DiceBear
(MIT; three of the five styles are CC BY 4.0 artwork — see the kit’s README).
`noodl_modules/keyboard-shortcuts` turns the arrow keys into Make Ten Merge’s slides.

## What is here, and what is next

Profiles, Home, the **Rocket Race** (any subject or list, one player against the computer or two
taking turns, practice or timed challenge), **Make Ten Merge** (slide with the arrows or the
buttons; two tiles join only when they make 10, 20, 30…), **Number Hunt** (five grids of
numbers; tap the ones that make the target, and find every way), **Monster Gate** (three monsters
at your gate, three hearts: beat each one to the gate with right answers, or push it back into its
cave; every number of its rules is `MONSTER` in one script), the Hangar, and the **Lists** page. The Teach
cards page and Progress with the save code are the next pages; the parts they share are already in
`Game/` and `Logic/`.
