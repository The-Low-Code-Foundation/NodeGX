# REV-002 — My revision lists

## 1. The person sentence

**What the teacher gave, typed as it was given — one line per question, "Neanderthals disappear = around -40 000" —
becomes a list every game asks, with the teacher's own answers, so a test is revised from the test's own material.**

Richard: *"the dates this teacher has given are a bit dubious … including a 'prehistory quiz' in our game will probably
make her fail the test after she's learning the updated dates with us."* The way out is her own list.

## 2. What was built (session 1)

| piece | where |
|---|---|
| `Logic/Parse question set` reads **plain text**: one line per question, split on the first of a tab, ` = `, ` → `, ` -> `, ` : `, ` - `, then a bare `=` or `:` (an `=` splits at its LAST occurrence: "2 + 2 = ? = 4"); a line with no separator is counted in `skipped`. JSON still works | `PARSE_SET_SCRIPT` |
| A set keeps `both` (ask both ways); `Logic/List question sets` emits each row's words and count line (a repeated row cannot translate), `chosenText`, `chosenBoth` | `UPSERT_SET_SCRIPT`, `LIST_SETS_SCRIPT` |
| A list is served by the **same list engine as the shipped banks** (`listQ`) under its own skill id `set:<id>`, so each list has its own learned items, its own due date and its own stars. A list of fewer than four items with no buttons of its own is typed (two buttons would be a coin toss) | `PICK_QUESTION_SCRIPT` |
| `Pages/Lists` (29 nodes): the lists as rows (`Lists/Set row`: name, count, Edit, Delete-asks-first), New list, and `Lists/Editor` (name, a text area, the live "4 questions" count, both ways / one way, Save shown only when a line parsed, Cancel). Drafts in Variables (RKT-006: a Text Input mounts from Start Value) | `tpl007Components.ts` |
| The chooser's **My lists** step shows the sets as topics, says "No list yet" with **Make or edit a list** to the page; the saved focus is `set:<id>` | REV-001 |
| 17 interface words, EN and FR | `WORDS` |

## 3. Gates

- Engine ("P113 REV-002"): the plain-text parser (six separators, a skipped line, the last `=`); JSON unchanged; a saved
  list keeps `both` and lists back its text; a focus on it serves it both ways under `set:<id>`; the normaliser forgives
  a hyphen for a space, a curly apostrophe and a final full stop, and nothing else (`etais` ≠ `étais`).
- Artefact ("P113"): the page is registered and ≤ 32 nodes; the editor's box is a `textArea` with `sizeMode: explicit`;
  Save is mounted by `valid`; typing is kept and Fill writes the draft in order, then tells the boxes; the Fill function
  runs only on its signal; New and Edit write the id before Fill; Save and Delete reach the store; a row's first Delete tap
  reaches `asking` and never the output.

## 4. Driven (`drive-p113-focus.js --arm lists`)

EN 1366×768, a 6e player, **8/8**: `noLists` · `listsPage` · `count` ("4 questions" read live from the typed lines) ·
`row` (the store holds the list, four items) · `lineList` ("My list · History Monday", the focus `set:<id>`) · `fromList`
(eight questions, every one from the list, every `lastSkill` = `set:<id>`) · `learned` (the model counts learned items;
stars grew beyond the eight right answers — the result card read "right answers +8 · landed +5 · new level +20 ·
learned +6") · `quiet`.

The eighth right answer lands the rocket (RACE_STEP), which is why the drive asks eight, not twelve.

## 5. Acceptance criteria

| AC | clause | state |
|---|---|---|
| AC1 | A parent can type or paste a list without knowing JSON | ✅ gate + driven |
| AC2 | The list is asked in the race and in Monster Gate, and only the list | ✅ race driven; 🟡 monster: wires gated, not driven |
| AC3 | Each item of the list is learned and paid on its own, and the whole list pays once | ✅ gate + driven (REV-004) |
| AC4 | A list can be asked both ways (vocabulary) | ✅ gate; 🟡 not driven |
| AC5 | Edit and Delete work, and Delete asks first | ✅ gate; 🟡 not driven |
| AC6 | Richard's replay with the eldest's real test list | ⬜ |

## 6. Open

- The editor has no explicit buttons per item (`opts`): a list item gets the OTHER items' answers as its wrong buttons
  (four items or more), or is typed. A `question = answer | wrong | wrong` syntax would be a small parser change if wanted.
- Lists live in the browser's store like profiles; the save code (`Encode save code`) does not carry them yet.
- The lists page is reached from the chooser's My lists step and by URL (`/lists`); Home is at 32 nodes, so it has no card
  there, and the player menu's Header would cost every page a node.
