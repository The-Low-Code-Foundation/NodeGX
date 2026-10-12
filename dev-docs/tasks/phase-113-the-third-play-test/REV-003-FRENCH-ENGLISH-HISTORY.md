# REV-003 — French, English and history, from the French programmes

## 1. The person sentence

**The school is not only maths. A child revises French (conjugation, the verb, word classes, homophones, agreement),
English as the foreign language (words both ways, numbers, be and have, question words, the irregular past) and history
(the five periods, centuries, prehistory and Antiquity), from the programmes in force, in an English or French interface.**

Richard: *"We can start with Maths, English (as a foreign language), French (as a native language), and history … keep
the EN version as default (for the NodeGX template so international audiences can understand it), but make the content
100% French national curriculum."*

## 2. The research

[`rev-research-briefing.md`](rev-research-briefing.md), 2026-10-04, with URLs and an evidence tag per claim. What it
changed in the content:

- **Programmes in force 2026-27**: CE2 maths and French on the 2025 cycle 2 text; CE2 English and history still on the
  2015/2020 texts (the new ones reach CE2 in 2027-28); 6e maths and French on the 2025 cycle 3 text, 6e English on the
  2025 collège text, 6e history on the 2020 cycle 3 text (three themes).
- **Terminologie grammaticale 2020**: five modes (indicatif, subjonctif, impératif, infinitif, participe); the
  conditionnel is a **tense of the indicatif** ("a tradition still alive in school use" calls it a mode); the official
  wording is **voix pronominale** (textbooks: forme pronominale); eight word classes. Encoded: the answers use the official
  terms, and a `note` on each item says what the books say, so a child marked on either is told why.
- **6e verb list (2025)**: présent, imparfait, futur, passé simple, passé composé, plus-que-parfait, conditionnel présent,
  impératif présent, on être/avoir, the first and second groups and faire, aller, dire, venir, pouvoir, voir, vouloir,
  prendre. **The subjunctive, the passive and the pronominal voice are cycle 4.** They ship anyway, because the test asked
  them (README ruling 1); the chooser lets a child leave them unticked.
- **Prehistory**: scholarly ranges against textbook figures (fire 400 000 BP vs 400/450/500 000; sapiens 300 000 vs
  200 000; Neanderthal 400 000–40 000 vs 350 000–35 000; Néolithique Near East ~12 000 vs the programme's "-10 000"). Encoded
  as "around", with the range and the disagreement in the note, and only ever beside answers an order of magnitude apart.
- **CE2 maths progression**: the 2025 text fixes a few "au plus tard en période N" points and leaves the rest to the
  teacher; two published progressions start fractions in P1 and in P3. The chooser (REV-001) is the honest answer.

## 3. What was built (session 1) — `tpl007Subjects.ts`

| subject | skills | topics | how |
|---|---|---|---|
| French | 22 (CE2 4 · CM1 5 · CM2 3 · 6e 10) | conjugation · verb-study · word-classes · homophones · agreement | 10 conjugation skills **generated** from 20 verb tables (`conjugateQ`: every form written out for the irregular verbs; the wrong buttons are the same tense's other persons; the correction is the whole paradigm, compact); 12 list banks |
| English | 17 (CE2 6 · CM1 2 · CM2 1 · 6e 8) | en-vocab · en-numbers · en-grammar | 11 vocabulary banks asked **both ways** (FR → EN and EN → FR); numbers in English words generated (`numberWordEnQ`, the existing speller); be/have, question words, irregular past, irregular plurals as banks |
| History | 7 (CE2 2 · CM1 1 · 6e 4) | time · prehistory · antiquity · france-landmarks | the five periods; centuries **generated** (`centuryQ`, with the 1515 → XVe trap on the buttons); prehistory dates and words; Antiquity dates and words; landmark dates of France |

500 list items in all, every one in both languages (French grammar material stays French under an English interface; its
instruction is translated). 10 new Teach cards (conjugation, verb-study, word-classes, homophones, agreement,
english-words, english-be, periods, prehistory, antiquity), each three fading steps and an example in both languages.

The list engine (`listQ`): an item not yet learned is asked more often (weight 1.2 unseen, 1 seen, 0.35 learned), the
item just asked waits a turn, the wrong buttons come from the OTHER items' answers (a list of four or more) or the item's
own `opts`, cut to the answer plus three; the pad offers the accents the list's answers use; the eyebrow says "Which
mode? · 12/20 ✓".

## 4. Gates (engine, "P113 REV-003")

- Every list skill asks its own items 60× in EN and FR: at most four buttons, the answer among them, every button from
  the list; `itemKey` set and `itemCount` right; the eyebrow's "0/n ✓".
- A list asked both ways is asked both ways with each direction's instruction; the item just asked waits a turn; an
  unlearned item is asked more.
- Conjugation: fifteen exact forms a French test marks (`nous sommes`, `j’irai`, `ils sont allés`, `nous mangions`,
  `que j’aie`, `qu’il finisse`, `(tu) va`, `ils chantèrent`, `il fut`, `vous prendriez`, `nous étions venus`…), the elision
  before a vowel, "au présent" / "à l’imparfait"; every conjugation skill 60× in both languages with four distinct
  buttons, typed with the accents on the pad, graded right as typed.
- Numbers in English (forty-seven / forty seven both right) and centuries (1515 → XVIe, 1500 → XVe, 2024 → XXIe, the trap
  on the buttons).
- The RKT-003 stage budget still holds over every skill: the longest correction (EN 183, FR 189 characters, the drive's
  worst case) was met by shortening five notes and writing compound-tense paradigms compactly.
- RKT-004's "works its own numbers" and RKT-005's numeric-pad clauses are now scoped to `subject === 'maths'`; the new
  subjects have their own clauses above.

## 5. Acceptance criteria

| AC | clause | state |
|---|---|---|
| AC1 | Every French, English and history skill generates soundly 60× in both languages, with its card | ✅ gate |
| AC2 | The conjugation tables are right (the 20 verbs, 9 tenses) | ✅ 15 exact forms gated; 🟡 the rest read by me, not by a French teacher |
| AC3 | Official terminology, with the textbook term in the note | ✅ |
| AC4 | Dates as "around", distractors an order of magnitude apart, the disagreement in the note | ✅ (ruling 2: "Sure try it for now") |
| AC5 | The interface stays EN by default; content is the French school's | ✅ |
| AC6 | A French teacher (or Richard) reads the banks and the paradigms | ⬜ |
| AC7 | The eldest's verdict after her test | ⬜ |

## 6. Ruling 1 (Richard, 2026-10-04) — the 5e verb material, identify-only

*"Put in the choices but maybe a simple watered down 'just identify them' version for 5e."*

Built in session 3:

- **`beyond: '5e'`** on a skill (`tpl007Curriculum.ts` `Skill`): the picker never serves it as part of "everything"
  (`PICK_QUESTION_SCRIPT` skips it in the unfocused loop and in the fallback); a tick still asks it, whatever the class;
  the chooser labels it with that class ("Repérer le subjonctif · 5e") instead of the child's own.
- **"Spot the subjonctif"** (`fr-verb-subj`, 6e, beyond 5e): "Subjonctif or indicatif?", fourteen items, each subjonctif
  beside an indicatif of the same verb (*qu'il vienne / il vient*, *bien qu'il pleuve / il pleut*), so the « que » and the
  ending are what tell. Two buttons: a spot-it question, not a coin toss over items.
- **"Active, passive, pronominal"** (`fr-verb-voice`) keeps its bank (it was already identify-only) and is now beyond 5e.
- **"Which mode?" and "Which tense?"** lost their seven subjonctif items, so they hold only the 6e programme; "Which mode?"
  no longer mentions the subjonctif in its strategy.
- **The typed subjonctif** (`fr-conj-subjonctif`) is gone. French still has 22 skills (one out, one in).
- Gate (engine, REV-001 block): the two 5e skills are lists answered by buttons; no programme bank asks the subjonctif;
  300 draws of "everything" at 6e never serve a 5e skill and a focus serves only it, with its two buttons; the chooser tags
  both "· 5e"; **sabotage arm**: without the picker's skip, "everything" serves one. Artefact: `Data/Curriculum` ships
  `beyond` on exactly the two.
- 🟡 Not driven in a browser (the chooser's label and the picker are gated with the shipped curriculum).

Rulings 2 and 3: kept as built (*"Sure try it for now"*; *"Dunno"*).

## 7. Open

- Ruling 1 was read as above. The game's classes stop at 6e, so "a version for 5e" has no class to live in; if Richard
  meant a fuller 5e version for a 5e child, that is a new level (`LEVELS`), not a field.

- Content is authored from my own knowledge of French grammar and the briefing's sources; it has not been read by a
  French teacher. The homophone sentences and the word-class sentences are the likeliest places for a slip.
- No CE2 "questionner le monde / histoire" beyond the periods and ten landmark dates: the 2015 text is thin, the 2026 text
  does not reach CE2 until 2027-28.
- English irregular past is beyond what the briefing reports for 6e (present simple/continuous, modals); kept, low level.
