# TPL-013 — Star Class

**Opened 2026-10-14**, at Richard's request:

> *"Can we start building the Rocket School clone for Sub Saharan African school children please?"*

**Star Class** is Rocket School (TPL-007) for school children in Sub-Saharan Africa, from Primary 1 to the end of junior
secondary (ages about 6 to 15), on a shared Android phone, in English or French. Its moon, aliens and everything
TPL-014 adds come with it.

**Status: 🟡 s1 built the edition; s2 SC-1 and SC-2; s3 the jump; s4 (2026-10-15) the jump's own card, SC-5 (skin tones,
both games) and SC-3 (JSS maths); s5 (2026-10-15) Number Hunt and Make Ten follow the rating, P1–P2 hunt from a picture, and
SC-4's first two banks (English, Basic Science). SC-4's other two (Verbal Reasoning, geography) are next.**
`templates/star-class/` is Rocket School with classes P1–JSS3 (a new player rated two below the class picked, moving up
after five right and down after three misses, with a big ⬆️ card when it goes up), nine picture questions for P1–P2, ten
JSS maths skills, darker faces by default and a ✋ skin row, naira and CFA francs, no typing and no French history, its own
name and save key. Written by `npm run template:star-class`, gated (edition 91/91), driven locally at 390 and 1024 px.
Not published, not committed.

**Where it sits.** BOARD §6.2 says a new idea is a parked page unless Richard gives it a slot; he asked for it by name,
so it is a task here beside TPL-007, not a phase (BOARD §5: no new template opens as a phase). It is also the third app
of [P120 §3](../phase-120-building-locally/README.md) ("a learning app for schoolchildren") for the builder in Nigeria
and Liberia. **P121's R1 applies:** nothing the builder wrote goes in this repo.

---

## 1. Decided

| asked | answered (Richard, 2026-10-14) |
|---|---|
| Start the clone? | *"Can we start building the Rocket School clone for Sub Saharan African school children please?"* |
| Which classes? | *"I only built CE2 to 6eme because of my kids' ages. For this app we should target the full school age range that'd be appropriate for using the app."* The research (§2.2) puts that at **P1 to JSS3**. |
| Keep typing? | *"We can dump typing practice for sure, but then double down on the variety of subjects available."* Done in s1b. |
| The moon? | *"We also need to add more to the alien thing, both for Rocket School and this new one."* → [TPL-014](TPL-014-THE-MOON-GROWS.md). After the picture: *"That's hot shit, the kids are going to go nuts."* |
| The name? | *"For the name, let's go with Star Class."* (Offered: Star Class, Moonbase School, Rocket School: Star Edition.) |
| Build it? | *"Write it up and let's get ready to build this sucker."* |
| The jump: automatic or offered? (2026-10-15, after s5) | *"Nope no choice"* — automatic, with the ⬆️ card (s4). §5.3 closed. |
| French for the banks? (2026-10-15) | *"That's ok leave them in EN for now"* — SC-4's banks stay English only. §5.4 closed for now. |
| ✋🏽 ✋🏾 ✋🏿 as the default faces? (2026-10-15) | *"Yep"* (SC-5's `skinDefault` stands). |
| Commit s1–s5? (2026-10-15) | *"Yep"* — committed by pathspec. |
| Start low? Stay in the class? (2026-10-15) | *"I think it's better to start low if that's what the research shows for this population, with the option to jump to a higher level if the kid is obviously getting every question right … the level should be more a starting yard stick which the system can adapt if the kid needs to go up or down a level?"* → s3. |

## 2. What the research says

Two briefings beside this file: [tpl-013-research-briefing.md](tpl-013-research-briefing.md) (curricula, learning
levels, devices, language, money; about 70 sources) and [tpl-013-subjects-briefing.md](tpl-013-subjects-briefing.md)
(subjects by stage, reading levels, open content; 43 sources). Every claim there is marked strong, ok or weak.

### 2.1 Children, classes and phones

1. **The class ladder fits Rocket School's maths.** Ghana's official 2019 curriculum (strong): numbers to 10 000 in B3,
   100 000 in B4, 1 000 000 in B5, 1 000 000 000 in B6; tables to 10×10 in B4; decimals from B4. France's CE2 → 6e
   is 10 000 → milliard. Nigeria's NERDC document could not be read (state schemes, weak); Liberia's syllabus was not
   found online.
2. **🔴 Most children are two or three years behind their class.** Nigeria 2021: 25% of 7–14 year olds have Grade 2–3
   numeracy (0.8% in Jigawa, 82% in Lagos). Kenya: about 30% of Class 3 can do a Class 2 division. PASEC 2019: about
   62% of Francophone children finish primary below "sufficient" in maths. **Place by ability: the class is a label and a
   first guess.** Teaching at the right level has the region's best evidence (Zambia TaRL +0.15 SD, +0.40 on the skills
   targeted; onebillion in Malawi d = 0.54 in maths over two years).
3. **The device is a shared, low-end Android phone in Chrome** (Tecno, Infinix, itel; 2–4 GB; 720p). Data costs
   $0.39/GB in Nigeria and $2.50/GB in Liberia. **Budget: first load about 1 MB, then offline, several children on one
   phone.** Measured on nodegx.io's Rocket School (production engine, same kit): 761 KB transferred, plus the project
   bundle (175 KB compressed, measured locally) ≈ **0.94 MB**. It has **no service worker, so no offline play today**.
4. **Language:** English in Nigeria (since November 2025) and Liberia; mother tongue to Grade 3 in Ghana and Kenya;
   bilingual in Senegal. Hausa and Swahili number words are regular base ten; Yoruba counts in twenties with subtraction.
5. **Money and contexts:** whole naira ₦50–₦5 000; cedi and pesewas; L$ (and US$) in Liberia; shillings in Kenya;
   CFA 500–10 000. Avoid pork, alcohol, betting, poverty framing, safari clichés and textbook gender roles.

### 2.2 Subjects and the age range

1. **Range: P1 to JSS3** (Ghana B9, Kenya Grade 9, Francophone 3e). Every target system ends basic education with a
   national exam (BECE, KJSEA, LJHSCE, BEPC); after it, senior secondary splits into electives.
2. **🔴 P1–P2 cannot read the questions.** At the end of P2, 51% of Ghanaian pupils could not read one English word
   (2015), 79% in Hausa in Bauchi and Sokoto, 35% in Liberia (2017), 30% in Kenya's Class 2 English (2012), all strong.
   99% of the Ghanaian children could name numbers. **P1–P2 is numerals and pictures only**: count the objects, which has
   more, match the numeral, the missing number, the odd one out. Text banks start at P3.
3. **The first eight banks, in order:** English (spelling, vocabulary, grammar); Basic Science with health; Verbal
   Reasoning (Nigeria's Common Entrance), with Quantitative Reasoning as a maths generator; Africa and world geography;
   a Nigeria pack (Nigerian History, Social and Citizenship Studies); a Liberia Social Studies pack; African history
   (kingdoms and people); digital literacy. Written once for everyone: science, geography, English, the reasonings,
   computing, African history. Per country: civics, national history, religion, local languages.
4. **Traps a bank must not set:** dates for the Ghana Empire; the Queen of Sheba; "Mansa Musa, richest ever"; "Liberia
   was never colonised"; 54 or 55 countries. Independence dates checked against a primary source before they ship.
5. **Licences:** African Storybook and StoryWeaver (CC BY 4.0), Wikidata (CC0), Natural Earth (public domain) are safe.
   Siyavula's unbranded books are CC BY; its branded ones cannot be adapted. Copying Wikipedia text makes a bank
   share-alike. Curricula and past papers give topics only; items are written fresh. Ship a Credits screen.

## 3. How it is made

Rocket School is ~16 000 lines of generator, and almost none of it is French. Star Class is an **edition**:
`packages/noodl-mcp/tests/tpl013Edition.ts` takes the components TPL-007 authors, changes the counted French part (class
names, money, subjects, nodes that served a dropped subject, the name and the save key), and the same plan door writes
them. Every replacement is counted and a miscount throws (TPL-007 §11 trap 1); `frenchLeftIn` is the census of what
must be gone. Rocket School's own artefact is unchanged by any of it (regenerated and diffed: 0 lines), and an engine
or moon change reaches both games on the next regeneration.

**The rule for what goes where:** a change every child benefits from (the moon, faces, the engine taking N classes) is
made in Rocket School's generator; a change only Star Class wants (its classes, its banks, its money) is edition data.

## 4. The build, in slices

Each slice ends gated, regenerated, driven at 390 px and 1024 px, and its row in §6 filled. Order is the order to build.

| # | slice | what a child gets | where | acceptance |
|---|---|---|---|---|
| SC-1 | **Nine classes** | P1, P2, P3 … P6, JSS1, JSS2, JSS3 in the new-player form; a new player starts two classes below the one picked and the Elo climbs from there | Rocket School's engine reads its class tables (`LEVELS`, `LEVEL_BASE`, Number Hunt's and Make Ten's per-class tables, the `'CE2'` defaults) from one data object; Rocket School keeps its four; the edition passes nine | Rocket School's artefact byte-identical; every engine gate green on nine classes; a P1 player's first race asks only P1 skills; Hunt and Merge draw from every class's table |
| SC-2 | **P1–P2: numbers and pictures** | count the objects, which has more, match the numeral, the missing number, the odd one out; tap to answer; nothing to read but numerals | new generators drawing objects as emoji (no art to ship); an icon-only instruction line | every P1–P2 question answerable without reading a word (gate: prompts contain only digits, symbols and emoji); 60× per generator, the answer always among the options |
| SC-3 ✅ s4 | **Maths for JSS** | negative numbers, simple equations, ratio, indices, area and volume | new generators in the edition's data | each pinned to a named JSS programme topic; traps tagged as in TPL-007 |
| SC-4 🟡 s5: 1–2 of 4 | **Banks 1–4** | English; Basic Science with health; Verbal Reasoning (+ Quantitative Reasoning generator); Africa and world geography | `generator: "list"` banks, P3–JSS3 | items written fresh; every fact item carries a source note; none of §2.2.4's traps; a second reader checks each bank before it ships |
| SC-5 ✅ s4 | **Faces in the children's skin tones** (both games) | a "your skin" row when making a player and in the hangar | the kit's `Avatar` already takes DiceBear options | every look offers at least five skin tones; the chosen tone survives reload and the save code |
| SC-6 | **Offline and light** | opens once on data, then plays with none; installs to the home screen | P119 SRK-005's service worker and manifest, when they land | first load ≤ 1 MB measured on a throttled 3G profile; plays in airplane mode after one visit |
| SC-7 | **Country packs** | Nigeria and Liberia packs (history, civics); money per country | edition data; a country on the profile if §5.1 rules so | each pack checked by someone from that country before it ships |
| SC-8 | **Shipped** | `nodegx.io/templates/star-class/`, then the builder's copy | `ops/deploy.sh`, as Rocket School | drive green on the public URL; Richard's look; the builder's |

**The moon** (TPL-014) arrives through Rocket School's generator and needs no Star Class slice; SC-2's younger
children are why its instructions are icon-led.

## 5. Still to ask

1. **Whose money and civics.** One Star Class with a country on each player (naira, cedis, L$, shillings, CFA; that
   country's civics pack), or one copy per country? Recommendation: a country on the player, because siblings share a
   phone and families cross borders. Ask with SC-7.
2. **Spoken prompts.** The research ranks audio high for children who read slowly, and the phone's own voice is free but
   uneven. Ask after SC-2 is driven on a real Android phone.
3. ✅ **Ruled 2026-10-15: automatic, no choice.** **The jump: automatic or offered?** (raised by Richard trying s3, 2026-10-15). Built automatic, and it is announced only
   by "· ⬆️ P2" at the end of the small speed line, which he never noticed; he expected a banner *offering* to move up or
   down. Recommendation: keep it automatic (a six-year-old should not have to choose), but give it its own moment, a
   big ⬆️ P2 card over the verdict, and keep the drop silent. His call. **s4 built the recommendation** (the card, automatic);
   "offered" would be a different build, so it is still worth asking him after he has seen the card.
4. ✅ **Ruled 2026-10-15: banks in English for now.** **Is French worth it?** Richard, 2026-10-15: *"Is French really necessary? … what does the research actually say and is
   it worth it? Any other languages?"* The research (briefing §5): the first users, Nigeria and Liberia, teach in English
   only (Nigeria since November 2025). French serves Francophone West Africa (PASEC's 14 countries, Senegal bilingual), not
   the first users. The research ranks spoken prompts above translation. Local-language number words are an add-on for home:
   Hausa and Swahili first (regular base 10), then Yoruba (base 20 with subtraction, needs its own generator), Twi, Igbo,
   Wolof. The interface French costs nothing (Rocket School's). The real cost is that every new bank (SC-4) needs French
   too. Recommendation: keep the French interface, write SC-4's banks in English only, and drop Star Class's French-language
   subject bank unless a Francophone user appears. His call. **s5 wrote banks 1–2 in English only**, as recommended; a ruling
   the other way means translating 245 items.

## 6. Built

### s5 (2026-10-15) — the hunt follows the rating and asks P1–P2 a picture; SC-4's English and Basic Science

| | |
|---|---|
| **Number Hunt and Make Ten play at the rating's class** | Until now both used the class picked, while the race used the rating (a P5 pick plays at P3; a child who has climbed plays above). Edition data: `Logic/New hunt` gains a `model` input that only Run reads (`runOnChange-in-model: false`, or a save mid-hunt would deal a new grid), `Hunt/Play` wires the player's model to it, and its script takes `LEVELS[playIndex(rating ‖ startRating(class))]`, the race's own rule. The next grid keeps the class the hunt began in. Make Ten already received the model; its pool's class line is patched the same way. New `Graft` field: `params` (merged into a node the component has; refused for one it lacks). |
| **P1–P2 hunt from a picture** | "Pick 2 numbers that add up to 14" is now `❓ + ❓ = 14` for P1–P2 (`❓ − ❓ = 5`, three ❓ for add3): numerals and symbols, no letters, in either language (edition `hunt.pictures`). P3 and up keep the sentence. The hint line under the grid ("There are 3 ways. Tap 2 numbers.") and the progress line are still words — the next small step for non-readers. |
| **SC-4, banks 1–2** | `tpl013Banks.ts`: **English** (10 skills, P3–JSS1: three spelling lists of 12 sentences with real misspellings, opposites, same meaning, in/on/at, punctuation and apostrophes, word classes, tenses, subject–verb agreement) and **Basic Science with health** (11 skills, P3–JSS1: living things, plant parts, staying healthy, animal groups, organs, food classes, solids/liquids/gases, changes of state, Earth and sky, simple machines and magnets, cells and blood). 245 items, written fresh, English only (§5.4's recommendation), British spelling, West African names and things. **Every science item names a source** (`src` → `BANK_SOURCES`: the briefing's curriculum topics, WHO fact sheets for health). New edition fields: `subjects` (the chooser's list: Maths, 🔤 English, 🔬 Science, French) and `moveTopics` (Rocket School's French↔English word lists are filed under French as "French words": for a child schooled in English they are French vocabulary). |
| **Second reader** | An independent agent read every item against the briefing: 9 of 21 skills "ships", 12 "ships with fixes", none "does not ship". All fixes made: prepositions now carry their own buttons with every other right one left out ("cut ___ two": in is right too; "wait ___ the gate": by); "beans *mostly* give us proteins" is false, so the food items say "rich in"; "which part grows into a new plant" had stem and root as right answers too (cassava, sweet potato); "is an…" gave away "inclined plane"; wheel and axle added (Nigerian books teach six machines); a tense item where "went" was also right; the mosquito-breeding source widened. 🔴 It also said, rightly, that a curriculum-topic source (`bsc-*`) names where a fact is taught, not a document a reader can check it in; the WHO ones are checkable. That is the bar for now; a human teacher's read is still owed before SC-8 ships it. |
| **🔴 Found** | (1) Rocket School's English list is French ↔ English, so in Star Class "English" mixed school English with French vocabulary under a 🇬🇧 flag — refiled (above). (2) The picker keys an item by its first 48 characters, and an item with no buttons of its own is offered the other items' answers: both are gated (no shared key in a skill; no answer that is also a question word in that bank). |
| **Readings** | Gates (uncommitted tree on `cline-dev`): `tpl007Engine` + `tpl007GameKit` + `tpl007Template` + `tpl013Edition` **583/583**; `typecheck:mcp` 0. Rocket School regenerated **byte-identical** (336 files) after each change. Local deploy: 3173 wires, 0 broken. Drives: `drive-tpl013-hunt.js` (new) **17/17** at 390 and 1024 px (a P5 player new: a sentence; rated at P1: `❓ + ❓ = 18`, one line, solved by tapping 9 and 9 → ✅; Make Ten single numbers at P1's rating, 12 and 65 at P5's; rated at P5: a sentence again). `drive-tpl013-classes.js --subject Science --level P3 --expect P3` **15/15** at both widths (every question from P3's three science banks); `--subject English --level JSS1 --rating 2290` 15/15 at 390 (JSS1 spelling and agreement first, then P6/P5 as it misses). |

### s1 (2026-10-14) — the edition

| | |
|---|---|
| **The edition** | `tpl013Edition.ts`. `AFRICA_EDITION` holds the choices: id and save key `star-class`, name Star Class, classes CE2→P3, CM1→P4, CM2→P5, 6e→P6 (`beyond` 5e→JS1), drop `history` and `typing`, remove the player menu's Keyboard row (`removeNodes`, five wires go with it), money ₦ in English and FCFA in French at ×100. |
| **What it changed** | Measured over Rocket School's 101 components: 284 class names (the curriculum, 20 engine scripts, the new-player form), 21 euros (the proportion question, its worked line, its Teach card), 7 French-history strings, 9 names and save keys. After: 0 of each. The tagline no longer says typing. |
| **The money question** | Read off the script: *"2 exercise books cost ₦1,600. How much do 9 exercise books cost?"* → 7200, worked *"Find one first: ₦1,600 ÷ 2 = ₦800 each, then 9 × ₦800 = ₦7,200."*; *"5 cahiers coûtent 1 500 FCFA. Combien coûtent 9 cahiers ?"* → 2700. |
| **The generator** | `scripts/generate-star-class-template.ts` → `npm run template:star-class`; refuses to write if anything French is left. `tpl007Template.ts` gained three optional arguments (project name, the plan's request, the folder id and START-HERE writer); with none passed it writes what it wrote before. |
| **The gate** | `tpl013Edition.test.ts` 9/9: nothing French left, with a control that sees CM1 in Rocket School's own components; Rocket School's components not mutated; every skill in P3–P6, only history and typing dropped; the money question 20× in naira, answers multiples of 100, and in FCFA; the keyboard row gone with its five wires; a miscounted replacement throws; the checked-in folder equals a fresh build. DEF-038 green for the new folder. |
| **The drive** | Deployed locally (`nodegx-deploy.cjs … --allow-development-engine`, scratchpad only) and driven with `drive-tpl007-rocket.js`: 13/17, 0 console errors, 0 network errors, **the same 13/17 as Rocket School**, so the four reds are the drive's: [P78-TPL013-STALEDRIVE](../../bugs/p78-tpl013-staledrive-the-rocket-drive-fails-four-clauses-and-one-passes-without-checking.md). Its "CM1 is the chosen class" clause never checks the class. |
| **Readings** | `template:rocket` after the generator change: 0 lines of diff over `templates/rocket-school/`. Faces: DiceBear picks the skin tone from the seed, so about half come out light (SC-5). |

### s2 (2026-10-15) — SC-1, nine classes

| | |
|---|---|
| **How** | Edition data, not a Rocket School change: `AFRICA_EDITION` gained `classes` (P1 … P6, JSS1, JSS2, JSS3), `startBelow: 2` and `hunt` (Number Hunt's kinds and biggest squares, one row per class). `classesInScript` swaps the five tables every script carries (`LEVELS`, `LEVEL_BASE`, `HUNT_KINDS`, `HUNT_LEVEL_KINDS`, `MERGE_POOL_GROUPS`), each counted, and adds three helpers beside `levelIndex`. The new-player form's class row is the ladder. |
| **The ladder's numbers** | Elo bases keep Rocket School's step: 300, 550, **800, 1050, 1300, 1550** (P3–P6 = CE2–6e exactly, or it throws), 1800, 2050, 2300. Make Ten: single numbers to P3, teens from P4, fives from P5. Number Hunt: P1 adds two squares to 9 (sums to 18), P2 adds two or three and takes away within 20, P3–P6 are Rocket School's rows, JSS1–3 keep P6's until SC-3. Rocket School's 5e skills (two French verb skills) are JSS1's own now, no longer "beyond". |
| **Placed by ability** | §2.1.2 in code: `startRating` rates a new player two classes below the one picked (a P5 starts at P3's 850). `playIndex` asks from the highest class up to the one picked whose base the rating has reached, so the race climbs as they answer and never above their class. The grader starts from the same rating, or the first answer would put them back at P5. `nearestClass`: a class with nothing to ask in a subject borrows the nearest one that has something, below before above (it was "every skill of the subject"). |
| **The gate** | `tpl013Edition.test.ts` **28/28** (19 new): the form's nine classes; every one of the 17 scripts carrying the tables carries the ladder and none Rocket's four; P3–P6 keep their bases; Hunt per class 40× (1–3 ways, no square over the class's biggest); Make Ten per class; a new P5 is asked only P3 (control: rated at P5 → P4 + P5; rated 5000 at P4 → P3 + P4, never P5); P1 → P3 and JSS3 → P6's maths (the borrow); the grader's first answer stays within P3's 850 + K. `tpl007Engine` + `tpl007Template` + edition **419/419**; `typecheck:mcp` 0. |
| **Rocket School** | `npm run template:rocket` → **byte-identical**: 336 files, shasum before and after. |
| **The drive** | `scripts/devtools/drive-tpl013-classes.js` (new), local deploy, **12/12 at 390 px and 12/12 at 1024 px**: nine classes in order, each inside the window and pressable, no sideways scroll (at 390 they wrap onto three lines); a P5 player made through the form, read back off the store as P5; 8 race questions, each named by its skill on screen, **all P3**; the kept rating under 1 000 (it started at 850, not 1 350); 0 console and 0 network errors. |
| **🔴 Not met yet** | SC-1's "a P1 player's first race asks only P1 skills": there were no P1 skills until SC-2 (met there, below). Number Hunt and Make Ten draw from the class **picked**, not the class the rating has reached, so a new P5 gets P5's grids. Hunt's instruction is words, which P1–P2 cannot read. |

### s2 (2026-10-15) — SC-2, P1 and P2: numbers and pictures

| | |
|---|---|
| **What a child gets** | Nine skills in `tpl013Young.ts`. **P1:** count to 10 (🔢 10), the odd one out by kind (🔍: three fruits and a goat), the bigger pile (⚖️ 10), the pile that matches a numeral (🎯 10), the missing number to 20 (❓ 20). **P2:** count to 20 in fives (🔢 20), the bigger pile to 20 (⚖️ 20), the odd one out by number (🔍 🔢), the missing number to 100 in 1s, 2s, 5s and 10s (❓ 100). All tapped, all `maths`, filed under a new first maths topic, Counting. The things are emoji (🥭 🍌 🍊 🥚 🐐 🐔 🐟 ⚽ ⭐ 🌽 ✏️ 🦋; no pork, alcohol or betting). |
| **Nothing to read** | The skill's line, the prompt, the options, the worked line and the strategy hold only digits, symbols and emoji, in both languages. A pile answer is the pile itself, so a miss says "The answer was 🐔🐔🐔🐔." and not a letter. Piles are drawn in fives with a space between (13 = 5 + 5 + 3, and a phone wraps between groups). |
| **How** | Edition data again: `addSkills`, `addTopics`, `addGenerators` (code beside `generate`, five cases in its switch, both counted). Rocket School's picker has none of it. |
| **🔴 Found driving it, and fixed** | (1) **The piles on the answer buttons were too small to count**: 8 bananas at the button's 20 px touched each other on a 390 px phone. Star Class's `Game/Option button` gets one Function node (`obSize`, through a new `addNodes` step, the mirror of `removeNodes`): a label with no digit and no letter is drawn at `--text-3xl`. Measured in the browser: **pictures 30 px, numbers 20 px**. (2) **The missing number could be guessed without counting**: its distractors were neighbours already in the row (14 ? 16 17 18 offered 16, 17, 14), so the answer was "the one not on screen". Distractors now come from outside the row (one before, one after, ±10, the digits swapped). (3) The plan door refused my first wiring of `obSize` (a Function's ports are `in-label` / `out-size`), and said so. |
| **The gate** | `tpl013Edition.test.ts` **48/48** (20 new): the nine skills and their generators in the picker (control: Rocket's has none); each skill 60× in both languages with no letter on any line (control: a P6 question has one), unique options and the answer among them; count (graphemes = answer, groups ≤ 5), more, match, missing (one step, in range, no distractor in the row), odd one out (by kind and by number) checked by what is drawn; a new P1 and a new P3 are asked only P1 (control: rated at P2 → P1 + P2); the option size on piles, numbers, fractions and words, on Star Class only; no node id added that another component uses (Rocket's own `mtIn` twice is the only one, and the door writes it as `mtIn-2`). With `tpl007Engine` + `tpl007Template`: **439/439**. `typecheck:mcp` 0. |
| **Rocket School** | Regenerated **byte-identical** again (336 files). |
| **The drive** | `drive-tpl013-classes.js --level P1 --expect P1`: **14/14 at 390 and 1024 px**. 10 questions, all P1, each named on screen by its icon; picture answers 30 px, number answers 20 px. `--level P5 --expect P2,P3`: **13/13 at both**. The first question is P2 or P3, none is ever above P3, and the race steps DOWN to P1 as the drive misses on purpose (placement by ability, seen working). 0 console and network errors. |
| **For Richard's look** | A new **P3** child starts on P1's counting (two classes below), and by the Elo arithmetic (worked by hand, not measured) climbing back to P3 takes about 30 right answers, 2–3 races. `startBelow` is one number if that is too slow. The verdict banner's words ("Fast and correct!", "The answer was …") are still words; that is §5.2's spoken-prompt question. Not seen on a real Android phone: 🥭 needs Emoji 11 (Android 9). |
| **Still open** | Number Hunt's instruction is words ("Pick 2 numbers that add up to 14"), and Hunt and Make Ten use the class picked, not the rating's. |

### s3 (2026-10-15) — the class is a starting yard stick

| | |
|---|---|
| **Richard's ruling** | Start low, and let the system move the child up or down; the class picked is a yard stick, not a ceiling (§1). |
| **What changed** | Edition data `jump: { up: 5, down: 3 }`. **Five right in a row** lift the race one class from where the run began, even above the class picked, and the banner adds **⬆️ P2**. **Three misses in a row** drop it one class, silently (no ⬇️ for a child to see). The count is kept across races (`model.place`), restarts on a broken run, and ignores player two's turns. The Elo rating still moves both ways in between, now with no cap at the class picked. The ends hold: no jump above JSS3 or below P1. |
| **🔴 Found and fixed** | (1) A drop counted from the class the rating had ALREADY slid into, so three misses could drop two classes; the run now remembers its starting class. (2) **A jump changed the number but not the questions**: at a rating on P2's base the picker's 3-in-4 target is P1's skills, so after ⬆️ P2 the drive saw three P1 questions. The class bands now sit `PLAY_AT = 190` above each base (400·log10 3, the rating where a class's own skills are right 3 times in 4); the start, the jump and the class shown all use it. Gated: right after a jump, P2 is asked more than P1 (80 picks). |
| **Readings** | `tpl013Edition` **57/57**, with `tpl007Engine` + `tpl007Template` **448/448**; `typecheck:mcp` 0; Rocket School **byte-identical**. Drive: `--level P1 --right` (answers worked out from the pictures, races restarted when won) **15/15** at 390 and 1024 px: ⬆️ P2 on the 5th answer, the next five from P1–P2 with P2 among them. P1 answering wrong **14/14**, P5 **13/13**, both widths. |
| **Served for Richard** | A copy of the deploy at `http://127.0.0.1:8640/` (scratchpad `try/`, `drive-deployed.js --hold`), with a list of things to try; torn down at the session's end. |
| **Richard tried it** | *"Everything worked, and I think I saw the questions getting easier when I got them wrong in a row, and more difficult when I got them right, but … I was never presented the banner that offered me to move up or down. I once saw '2 right in a row' … on the next right answer it went away."* The "right in a row" line is Rocket School's **turbo meter**, not the jump. The jump fired, but is only "· ⬆️ P2" in the small speed line (seen in the drive's 390 px shot of verdict 5). → §5.3. He also asked for **skin tones, darker by default** (SC-5, not built) and whether **French** is worth it (§5.4). |

### s4 (2026-10-15) — the jump has its own moment; SC-5, skin tones; SC-3, maths for JSS

| | |
|---|---|
| **The jump card** | Richard never saw the jump (s3). Edition data again: the grader publishes `jumpTo` (the class it went up to, else `''`) out of `Logic/Grade answer`, `Race/Round` hands it to the banner, and `Game/Feedback banner` gets a card as its **first** child: an orange pill, ⬆️ and the class at `--text-4xl` (bigger than the headline's 3xl), popping in with Rocket School's own `rkt-result` / `rkt-result-glyph` animations (none under reduced motion). Mounted only when `jumpTo` is set, so a drop stays silent. The "· ⬆️ P2" left the speed line. New edition step: an `addNodes` entry is now a `Graft` with `ports` (grow a Component Inputs/Outputs node and the component's port list) and `place` (put a visual node in a parent's children at an index), each refused when it names a node the component lacks. |
| **SC-5, skin tones (both games)** | Five tones (`SKIN_TONES` in `tpl007Scripts.ts`: `f2d3b1 e0ac80 c68642 8d5524 5c3317`), each shown as the matching ✋🏻 ✋🏼 ✋🏽 ✋🏾 ✋🏿 so choosing needs no reading. Rendered on all three kept looks first: eyes and mouth read on the darkest. The pick is `wear.skin`, so the **save code carries it with no format change** (`wearOf` keeps it; a code from before restores with none). A **skin row** on the new-player form (under the face styles; the face redraws at once), in **Edit player** (filled with theirs, Save keeps a new one) and in the **hangar** under the preview (a tap writes the store; the preview, the bar, the rocket and every shelf tile follow). With none picked, `wearOptions` gives DiceBear `SKIN_DEFAULT`: **empty in Rocket School** (DiceBear's own range, so its faces are unchanged) and **✋🏽 ✋🏾 ✋🏿 in Star Class** (edition `skinDefault`, swapped in every script that carries the skin lines, counted). |
| **SC-3, maths for JSS** | `tpl013Jss.ts`: ten skills, three or four per class, each **pinned in `JSS_SOURCES`** to a topic of NERDC's 2013 junior secondary maths, read through Pearson's *New General Mathematics* teacher's guides (JSS1 and JSS3 curriculum-matching charts; the NERDC PDF itself is still unread). **JSS2's three are weak**: no JSS2 guide was found, so they are the topics the JSS3 guide's review of "Books 1 and 2" covers that Book 1's chart does not. JSS1: directed numbers ±, two-step equations, area (rectangle, triangle), volume of a cuboid. JSS2: directed numbers ×÷, laws of indices, sharing in a ratio. JSS3: equations with fractions, direct and inverse proportion, area of a circle (π = 22/7). **Every one a trap** (TPL-007's sense): the wrong buttons are the misconception's answers (the sign flipped, the ½ forgotten, the powers multiplied, half each, the difference added, the circumference). All tapped: the answer pad has no minus key. Both languages written (short prompts; §5.4 is about SC-4's text banks). JSS1–JSS3 no longer borrow P6's maths. |
| **🔴 Found and fixed** | (1) **Rocket School's `proportion` question was silently replaced.** The first draft named a generator `proportion` and a function `proportionQ`, both already Rocket's: a second `case` never runs and a second `function` replaces the first everywhere, so P6's money question came out as mangoes in bags. Caught by the s1 naira gate; renamed (`jssProportion`), and a new gate counts every `function` and `case` in the picker (none twice, with a control that sees a doubled case). (2) **P78-TPL013-MISSINGTHREE** (filed, fixed): SC-2's `0 ? 10 15 20` offered three answers, not four (996 in 200 000 draws; it reddened a full run once). Topped up off the row; gated, red with the fix removed. (3) At 390 px "radius 21 / cm" and "π = / 22/7" broke across lines: the JSS prompts keep a number with its unit (no-break spaces), gated. (4) Two of my drive clauses were wrong, not the game: DiceBear's own pixel-art palette includes `8d5524` (✋🏾's hex), so "Rocket School forces none of the five" failed on a seed that landed on it; and a new JSS3 player is asked from the class below as well (P6 + JSS1), as s2 recorded for P5 (P2 + P3). |
| **Readings** | Gates, uncommitted tree on `cline-dev` at `bd0d1681d`: `tpl007Engine` + `tpl007GameKit` + `tpl007Template` + `tpl013Edition` **543/543**; `def038SettledTemplates` all green but `templates/nightbook` (known, not ours); `typecheck:mcp` 0. Rocket School regenerated byte-identical after the jump card and after SC-3 (336 files); SC-5 changes it on purpose (its drift gate named 44 files: the skin lines in every script that keeps a face, the form, the bar, the Profiles page, the hangar and the word). Local deploys: 3171 and 3169 wires checked, 0 broken. Drives: `drive-tpl013-classes.js --level P1 --right` **17/17** at 390 and 1024 (the ⬆️ P2 card on the 5th verdict and on none before, 36 px against the headline's 30, above it, inside the window, on top; the speed line no longer carries it); P5 answering wrong **14/14** at both (no card on any verdict, a drop included); `--level JSS3 --rating 2560` **14/14** at both (JSS1–JSS3 questions, the units kept with their numbers); `drive-tpl013-skin.js` (new) **22/22** at 390 and 1024 for **both games**: five ✋ in order and pressable, Star Class's face before a pick in its darker tones (and Rocket School's in DiceBear's own), ✋🏿 drawn at once, kept through a reload, the hangar's ✋🏻 on the store and on the face and through a reload, Edit player filled with theirs and saving a new one. |
| **For Richard's look** | The ⬆️ card (automatic; §5.3 still his). The skin row, and whether ✋🏽 ✋🏾 ✋🏿 is the right default range (one line: `skinDefault`). The JSS questions; the indices answers' superscripts are small on the buttons (readable, not big). Not yet: Number Hunt's word instruction for P1–P2, and Hunt and Make Ten using the class picked, not the rating's (item 4 of the handoff). |
