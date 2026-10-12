# REV-001 — Choose what to practise

## 1. The person sentence

**Before a race or a monster game, a child chooses a subject, a topic in it, and ticks the skills they want — "the
tables of 5 and 8" — and the game asks nothing else. The choice is kept on their profile. A topic the class has not
reached yet is simply left unticked, so the start of the year is fair.**

## 2. What was there (2026-10-04, before)

- The setup offered **Maths or Typing**, one or two players, practice or challenge. `Logic/Pick next question` served
  every skill at the profile's level and below (`tpl007Scripts.ts`, the candidates loop), so a CE2 child met fractions
  (`frac-unit` is CE2 in the programme) whatever her class had covered.
- `mode: custom` and the question-set scripts existed (TPL-007 ruling 3) but **no page used them**.

## 3. What was built (session 1)

| piece | where |
|---|---|
| Every skill carries `subject` and `topic`; `TOPICS` (27) and `TOPIC_OF` file the 62 maths/typing skills; `withTopics` refuses a skill with no topic | `tpl007Subjects.ts`, `tpl007Curriculum.ts` |
| The picker takes `focus` (skill ids; none = everything the level allows), `customSetId`, `customSetBoth`; `mode` is a subject (`maths`, `typing`, `french`, `english`, `history`, `mixed`, `custom`) | `PICK_QUESTION_SCRIPT` |
| `Logic/Resolve focus`: the saved focus → the picker's mode, skill ids, list items, and one line ("Maths · 5 times table, 8 times table" / "Maths · tout (CE2)") | `FOCUS_SCRIPT` |
| `Logic/Focus choices`: the three rows (subjects with anything at this level + My lists; the subject's topics with a ✓count; the topic's skills with ticks and a class tag when not the child's) | `FOCUS_CHOICES_SCRIPT` |
| `Logic/Toggle id`: toggle / all / none / set / clear on a list of ids, one placement per action | `TOGGLE_ID_SCRIPT` |
| `Game/Focus picker`: two Choice rows, a wrapping row of tick-pills (For Each over `Game/Choice`), All / Clear, Practise this / Cancel, Make or edit a list; the draft in three Variables marked "shared on purpose" | `tpl007Components.ts` |
| `Race/Setup` and `Monster/Setup`: the **Maths or typing row is gone**; a "Practising · <line>" row with **Change** opens the chooser in the card; the setup resolves the focus and writes the save through the store (Header's shape). `mode`, `focus`, `customSet*` go to the game | `RACE_SETUP`, `MONSTER_SETUP`, `focusWires` |
| The profile keeps `focus: { subject, skills }` (`Update settings` writes, `Active profile` reads; default maths, everything) | `UPDATE_SETTINGS_SCRIPT`, `ACTIVE_PROFILE_SCRIPT` |
| `Game/Choice row` gained `mounted` (the door refused the wire to a port it lacked) | |
| 14 interface words, EN and FR | `WORDS` |

The race page is at **32 nodes of 32** (the setup owns the resolving, or it would be 34).

## 4. Gates

- Engine (`tpl007Engine.test.ts`, "P113 REV-001"): every skill has a subject and a topic that exists and belongs to the
  same subject; a focus serves ONLY the ticked skills over 80 picks (a 6e skill ticked for a CE2 child is served; untouched,
  it never is); a subject mode serves that subject at the level and below; `Resolve focus` lines in both languages, the
  list and the deleted-list fallback; `Focus choices` for CE2 (conjugation, word classes, homophones, agreement — no
  verb study) and 6e; `Toggle id`; the profile round-trip.
- Artefact (`tpl007Template.test.ts`, "P113"): both setups host the chooser and no "Maths or typing" row; the focus reaches
  the round's picker and the grader from both pages; the setup's one mode output is the focus it resolved; the chooser's
  wires (Open loads the draft, a tap toggles, All/Clear act on the topic's ids, Practise this publishes `saveSubject`);
  every draft Variable carries the comment, read from the artefact's `metadata.comment`.

## 5. Driven (`scripts/devtools/drive-p113-focus.js --arm focus`)

EN 1366×768 and FR 390×844, a CE2 player, **7/7 each**: `line0` "Maths · everything (CE2)" · `picker` · `skills` ·
`saved` (the store holds `{ maths, [table-5, table-8] }` and the line says the two tables) · `only58` (six questions,
every stored `lastSkill` ∈ {table-5, table-8}) · `kept` after a reload · `quiet` (0 console errors). Shots in the session
scratchpad (`p113-focus-*`).

**Session 2 (2026-10-04), `--arm monster`**, EN 1366×768 and FR 390×844, a CE2 player, **7/7 each**: `line0M` (Monster
Gate's own setup says "Maths · everything (CE2)") · `savedM` (its Change → Times tables → 5 and 8 → Practise this stores
`{ maths, [table-5, table-8] }`) · `only58M` (six monster questions, every stored `lastSkill` ∈ {table-5, table-8}) ·
`shared` (the race's setup then says the two tables: the focus is the player's, not the game's) · `lineListM` /
`fromListM` (REV-002 AC2) · `quiet`. The monster game ends by itself after six right answers (three monsters, two hits
each), so six is the whole game, not a sample of it.

## 6. Acceptance criteria

| AC | clause | state |
|---|---|---|
| AC1 | A skill chosen in the chooser is the only thing asked, whatever its level | ✅ gate + driven |
| AC2 | The chooser offers nothing above the child's class | ✅ gate |
| AC3 | The choice survives a reload and a change of page | ✅ driven (`kept`) |
| AC4 | The setup says what is being practised, in the child's language | ✅ driven EN + FR |
| AC5 | A Monster Gate game obeys the same focus | ✅ gate + driven EN + FR (`--arm monster`, session 2) |
| AC6 | Richard's replay, and the youngest's verdict | ⬜ |

## 7. Open

- The topics for maths are the programme's headings, grouped by me ("Comparing and rounding", "Equals and order of
  operations"). Richard may want them in the order a CE2 teacher's progression runs.
- "Nothing ticked means everything in this topic" — the hint says so; the saved focus of an empty tick list is "everything
  at this level", not "this topic". A topic-only focus (tick none, mean the topic) is a one-line change in `FOCUS_SCRIPT`
  if wanted.
