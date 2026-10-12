# Phase 113 — the third play test: choose what to practise

**Richard, 2026-10-04**, on Rocket School (TPL-007):

> "my 8 year old who's in CE2 does the maths games and since she's at the beginning of the year, there's some concepts
> she hasn't covered yet like fractions etc. So she gets frustrated when those questions come up and they're not really
> fair."
>
> "My 11 year old has French and history tests on Monday. She's trying to revise 'the study of the verb' which is
> basically just a huge list of different ways a verb can be in French, subjunctive, passive voice, pronominal voice,
> etc. For the history part, she needs to learn important dates from prehistory like when Neanderthals were around and
> when they discovered fire etc."
>
> "one extra menu in the game start bit, but it needs to be an easy to use one, where the user can choose a theme and
> specific subject, or group of subjects, to practise. For example if my youngest wants to just learn multiplication,
> and just the tables of 5 and 8, she can do that through some sort of maybe multi step easy to customise menu."
>
> "the dates this teacher has given are a bit dubious and I think she's reading from an out of date textbook, so
> including a 'prehistory quiz' in our game will probably make her fail the test after she's learning the updated dates
> with us."
>
> "We can start with Maths, English (as a foreign language), French (as a native language), and history … keep the EN
> version as default … but make the content 100% French national curriculum."
>
> "We might need more points and prizes too, because this shit is boring AF … give them as much of a way to distract
> themselves from the horror of rote memorisation as possible."

The two children are the players named in `kids-ellie-saoirse` (memory); their names stay out of this public repo.

## The tasks

| task | the person sentence | state (session 1, 2026-10-04) |
|---|---|---|
| [REV-001 — choose what to practise](REV-001-CHOOSE-WHAT-TO-PRACTISE.md) | Before a race or a monster game, a child picks a subject, a topic, and ticks the skills — "the tables of 5 and 8" — and the game asks nothing else. A topic the class has not reached stays unticked. | built · gated · driven (3 cells; Monster Gate EN + FR, session 2) · Richard's replay owed |
| [REV-002 — my revision lists](REV-002-MY-REVISION-LISTS.md) | What the teacher gave, typed one line per question, becomes a list every game asks, with the teacher's own answers. | built · gated · driven (race, Monster Gate, Edit/Delete, both ways) · Richard's replay owed |
| [REV-003 — French, English, history](REV-003-FRENCH-ENGLISH-HISTORY.md) | The school has more than maths: conjugation, the verb's modes/tenses/voices, word classes, homophones, agreement; English vocabulary and grammar; periods, centuries, prehistory and Antiquity. Content from the French programmes, interface EN or FR. | built (46 skills, 500 items, 10 cards) · gated · the content needs a French teacher's eye |
| [REV-004 — what learning pays](REV-004-WHAT-LEARNING-PAYS.md) | Learning an item of a list pays, and learning the whole list pays more, so rote memorisation has a score. More prizes are owed. | stars built · gated · driven · the prizes are REV-005 (ruling 4) |
| [REV-005 — the moon](REV-005-THE-MOON.md) | The stars adopt little aliens on a moon, and buy them food and things to wear: they hop when fed, grow, and never get worse. | built (session 3) · gated · driven (EN laptop + FR phone, 8/8 each) · the kids' verdict owed |

Research: [`rev-research-briefing.md`](rev-research-briefing.md) — the programmes in force in 2026-27, the Terminologie
grammaticale 2020, the 6e verb list, prehistory dates (scholarly ranges against textbook figures), with URLs.

## What this phase is, and is not

It is the third play test of Rocket School (after P87 and P95): the template as Richard's two children meet it in
October, start of year. It is **not** a new template. Everything is built in `packages/noodl-mcp/tests/tpl007*.ts`
(the new file is `tpl007Subjects.ts`) and regenerated into `templates/rocket-school/` by `npm run template:rocket`.

The design doctrine the engine kept: **one mechanism for shipped facts and a person's own.** A French grammar skill, a
history skill and the teacher's typed list are all `generator: 'list'` banks served by one function (`listQ`), graded
by one grader, learned item by item in one model, paid by one star rule. The chooser sits over the same model (a focus
is a list of skill ids on the profile), so a list the child made is one more subject in it.

## Richard's rulings (2026-10-04, his words, then what was built)

1. **The verb study** — *"Put in the choices but maybe a simple watered down 'just identify them' version for 5e."*
   Read as: the cycle-4 (5e) material stays in the chooser as choices, never in "everything", and asks the child only to
   SPOT it. Built (session 3): `beyond: '5e'` on a skill keeps it out of "everything" and tags it "· 5e" in the chooser; the
   subjonctif left "Which mode?" and "Which tense?" for a new "Spot the subjonctif" (subjonctif or indicatif?, fourteen
   pairs); "Active, passive, pronominal" (already identify-only) is marked 5e; the typed subjonctif conjugation is gone.
   🟡 The game's classes stop at 6e, so there is no 5e level to give a fuller version to. If "for 5e" meant something
   else, the mark is one field per skill. REV-003 §7.
2. **Dates as "around"** — *"Sure try it for now."* Kept as built.
3. **Conjugation typed by default** — *"Dunno."* Kept as built (typed; buttons on a profile set to "Answers: buttons"); the
   kids' replay is what will say.
4. **The prizes** — *"For the something new, something more concrete like adopting little aliens on a moon in the game and
   buying food and accessories for them."* Built (session 3): [REV-005](REV-005-THE-MOON.md).
5. **The save code carries the lists** — *"yep."* Built (session 3): save code v4 carries every list (by id, so the
   learning kept under `set:<id>` still names it), the chosen focus, and the moon. REV-002 §6.

## Richard's rulings owed (none taken for granted)

All five answered on 2026-10-04 (above). Still owed: the kids' verdicts, in their words, on the chooser, the lists, the
French/history banks and the moon. And two small judgements made in session 3 that are his to overrule (REV-005 §6): a
food tap feeds at once with no "Buy it?" card (a meal is 3–8 ⭐ and its price is on the tile), and the first alien is free.

## Rulings as they were asked (2026-10-04, session 1)

1. **The 6e verb study goes past the 2025 programme.** The subjunctive, the passive and the pronominal voice are cycle 4
   in the text; they are shipped because the test asked them. Keep, or move them behind a tick?
2. **Dates are said as "around" and the wrong buttons are far apart.** A child who learned the teacher's -500 000 for fire
   still picks -400 000 over -300 000 / -45 000 / -10 000. Is that the right compromise, or should the shipped history be
   period and order questions only, with dates left to the child's own list?
3. **Conjugation is typed by default** (the production a test marks); a profile on "Answers: buttons" gets buttons. Right?
4. **More prizes.** The stars for learning are built. New shelf items need either a kit decal (a pattern the kit draws)
   or a theme paint token; which, and how many? See REV-004 §4.
5. **The kids' verdict**, in their words, on the chooser, the lists and the French/history banks.

## Product findings (NodeGX, not the template)

A standing section, per [[a-template-push-files-its-product-findings-as-it-goes]]. This session filed **no new bug**.
What was met:

- The plan door caught every wrong wire before a build: a wire to `mounted` on a component with no such input (the Choice
  row; fixed by giving it one), and an inert `height` on a text area without `sizeMode: explicit`. Both messages said the
  fix. ✅ The door is doing its job.
- The door's `variable-in-repeated-component` warning on the chooser's draft is silenced by a node comment containing
  "shared on purpose" (GAM-005 R6, documented in `diagnostics.ts`). The door **keeps** that comment in the artefact under
  `metadata.comment` (measured: `Game/Focus picker/nodes.json`), so a gate can read what shipped.
- The deploy still reports one phantom drop on Hunt (`hpRows.itemOutputSignal-tapped → hpTap.run cannot work … published
  as it is`): GAM-024's D52 class (a nested repeater's dynamic signal port). Known; the Hunt drives pass. Not re-filed.
- A repeated row cannot translate itself: the words a row shows must travel in the row's data (the Hangar tile's
  pattern; now `Logic/List question sets` emits them). Inherent to rows-as-data; recorded, not filed.
