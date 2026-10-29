# OWN-032 — results

Builder `gemma4:e2b-it-qat` (07ea59a47401), reviewer `gemma4:e4b-it-qat` (ee6656371218), Ollama 0.40.12. The task is
[`../OWN-032-THE-WORKBENCH.md`](../OWN-032-THE-WORKBENCH.md).

## 1. Pre-registered (written 2026-10-29 11:25, before the vision probe asked any model and before any arm run)

1. **Unaided, the 2B model at node level does not reach the composition hero in 30 turns.** It gets the structure (a
   band, words beside a photo, the four parts) within 12 turns, then loops on spacing: it sets and re-sets gaps and
   paddings, or calls `done` early. Graded by the script checks at both widths and by Richard's look against the
   composition hero.
2. **Fact-question vision (E4B) separates "touching" and "at the edge"**: mean P(yes) with the fault present minus
   mean P(yes) with it absent is above 0.5. **It fails "lined up"**: separation under 0.2. My guesses for the rest:
   "photo cut off" separates (> 0.5), "button too wide" does not (< 0.3). **E2B separates none of them** above 0.3.
   Added at 11:35, still before any model was asked: a sixth question, "is any text hard to read" (contrast), with its
   own variant. My guess: it separates weakly (0.2–0.5).
3. **E2B reads the outline back**: asked which node holds the headline, the button, the photo, and which group holds
   the words, it names the right `#n` on at least 9 of 12 questions.

## 2. s0 — the probes

### 2a. A hero on its own, rendered (`bench.mjs`)

The bench project is a copy of the round-4 project of OWN-029's `G-puppy`, with its theme, tokens and imagery. Its
Home page holds one section instance, `/Sections/S1Hero`. A turn rewrites that component's `nodes.json` and reloads
the page in a Chrome that stays open.

- **Opening the bench: 3.7–4.7 s, once. A turn, both widths, shots and measures: 2.4–2.9 s** (27 renders). That is
  well under the 10 s budget.
- 🔴 `render-from-disk.js` builds its page once, at start: a reload after a write serves the FIRST project it read
  (9 variants gave 9 identical pictures). The bench answers the page request itself over CDP (`Fetch`) with the HTML
  that script prints (`--print-html`, ~140 ms). The shared tool was left as it is.
- The shot is cut at the bottom of what is drawn, not at the 900 px window, so the reviewer sees the hero and no band
  of empty white.

**The facts, measured from the DOM** (`bench.mjs` `FACTS`, the answer key): `touching` (two blocks of words, or words
and a button, under 4 px apart), `atEdge` (words within 8 px of the screen's side), `photoCut`, `buttonWide` (over
2.5 × its words), `unaligned` (no shared left edge within 4 px and no shared centre within 12 px). The 12 px is
measured: the box of a centred three-line headline sits 8 px off its button's centre, and nobody sees that.

On the OWN-030 hero as it shipped, `unaligned` is TRUE at both widths: centred words over a left-aligned form.

### 2b. Fact vision: ❌ it does not separate. The script's measures answer every fact.

`probe-vision.mjs`: 10 variants of the puppy hero, each with ONE fault switched on (`clean`, `cleanLeft`, `touching`,
`touchingLeft`, `atEdge`, `photoCut`, `buttonWide`, `unaligned`, `lowContrast`, `everything`). Each was rendered at
1280 and 390, giving 20 pictures with a DOM answer key, and asked 6 yes/no questions, one per fact, the picture
attached, at temperature 0, with P(yes) read from the one answer token. Asked 12:21–12:32, Ollama otherwise idle.

| question | E4B present | E4B absent | **E4B sep.** | E4B right | E2B sep. |
|---|---|---|---|---|---|
| touching | 0.068 (n 6) | 0.048 | **0.02** | 14/20 | 0.03 |
| text at the edge | 0.124 (n 2) | 0.083 | **0.04** | 18/20 | −0.04 |
| photo cut off | 0.583 (n 2) | 0.110 | **0.47** | 19/20 | 0.23 |
| button too wide | 0.899 (n 4) | 0.659 | **0.24** | 10/20 | 0.16 |
| hard to read (contrast) | 0.050 (n 2) | 0.043 | **0.01** | 18/20 | 0.01 |
| not lined up | 0.902 (n 2) | 0.861 | **0.04** | 2/20 | 0.00 |

"Right" counts P(yes) > 0.5 matching the key. On a rare fault, a model that always says no scores 18/20, so read the
separation column. E4B says no to touching, edge and contrast whatever the picture shows, and yes to "out of line"
and "too wide" whatever it shows.

**Prediction 2 is wrong where it mattered.** "Touching" and "at the edge" were meant to separate (> 0.5) and are at
0.02 and 0.04. "Lined up" fails, as predicted. "Photo cut off" comes closest (0.47) and still misses the 0.5 bar.
E2B separates nothing, as predicted.

**Cropped to the words** (`--crop`: the words and the button with 40 px round them, from the screen's left edge), E4B:
touching 0.005, edge 0.13, too wide 0.21, contrast 0.006, lined up 0.04. Cropping does not rescue it.

**Why, probably:** a whole picture plus its question costs the model **148–339 prompt tokens**, and a crop 105–150, so
the image gets roughly 70–100 tokens whatever its size. Gemma 4 takes a vision budget of 70 / 140 / 280 / 560 / 1120
tokens per image (Google's Gemma vision docs; vLLM's default is 280). These counts fit the 70 budget. A 4 px gap or a
0 px margin cannot survive that. I found no documented way to set the budget in Ollama. **Open lead:** the same probe
at budget 560 or 1120, through llama.cpp or vLLM, or once Ollama exposes the setting. This is cheap to re-ask:
`node probe-vision.mjs ask <model>` reads the same 20 pictures.

**Consequence for the arm (§3b):** every fact the builder is told comes from the script's measure, in words, and
the timeline says the source is the script (`--look script`, the default). `--look both` still asks the reviewer and
records its answer beside the measure, for when the budget can be raised.

### 2c. The outline read back: ✅ 11/12

`probe-outline.mjs`: the G-puppy hero as `outline.mjs` writes it (20 nodes, form included), 12 "which node…"
questions, the answer an enum of `#0…#19`, E2B at temperature 0, **~0.35 s a question** (815–827 tokens).
- Right: the headline, the main button, the photo, the words group, the band, the columns, the padded container, the
  email label, the form's button, the sub-line, the button row.
- Wrong: "which node sets the space between the headline and the line under it?" It answered `#6` (the sub-line) for
  `#3` (its parent group, which holds the gap).

Prediction 3 holds. The miss is telling, though: the model locates PARTS, but not which node OWNS a space. That is
the skill §4's arm needed and never showed.

## 3. The viewer on G-puppy's hero (3a)

`node server.mjs`, then open `http://127.0.0.1:8732/?t=runs/view-G-puppy-s0`. Built by `timeline-own029.mjs G-puppy`
from the two ledgers (`S0-puppy` asked the decisions, `G-puppy` replayed them) and the round trees. There was no new
logging.

What it shows about today's harness:
- **The hero is decided by 15 builder answers**: 4 for the card, 1 for the sections, then for the hero its parts,
  alignment, photo placement, form fields, 4 looks and the words. **None of them is a gap, a padding or a width.**
  Those come with the kit's compositions.
- **The reviewer never saw a picture of the hero.** It saw 32 stock photos (one `photo.fit` question each; the dog won
  at 0.98 and the next best was 0.15). Its only look at the hero was `s0.sound`, the section read in words (0.927, the
  same in all 5 rounds).
- **No repair touched the hero in rounds 1–4.** Every finding was elsewhere: repeated photos, second forms, repeated
  words. The hero tree is the same from round 1 to round 4.

## 4. The arm, first runs (3b), puppy, `--look script`

`arm.mjs`, E2B. Each turn is a move menu (1 add · 2 set · 3 write · 4 undo · 5 done), then one or two closed
follow-ups (kind → inside; node → setting → value; node → words). An illegal pick is refused and shown back as a
finding. Every turn is rendered on the bench at both widths (~2.5 s) and measured, and the findings are written in
words into the next prompt. Model time is 2–9 s a turn; a whole 30-turn run takes 3–4 minutes.

| run | what changed | turns | parts at the end | what happened |
|---|---|---|---|---|
| `w1-puppy` | — | 30 | 29 | A Group as the section, Columns, a headline it wrote itself, then **"add a Group inside n4" 23 times in a row** (turns 7–29). A photo on turn 30. No button, no line under the headline, **no setting ever changed**. |
| `w2-puppy` | fork of w1 at turn 7 (turns 1–6 replayed, not asked); two new findings: **empty parts** ("n05, n06 … are empty: they show nothing") and **no visible change** (both pictures identical to the turn before) | 30 | 12 | A photo on turn 10, a button on turn 13. Then **12 refused "add inside n1"** and 5 rewrites of the headline. Still no setting changed. |
| `w3-puppy` | the same fork, with **fixed-width names** (`n01`, not `n1`) | 30 | 22 | The refusals are gone, and the empty-Group loop is back: 17 of its 24 asked turns added a Group. A photo on turn 23. No button, no setting changed. |

What the odds show (`ledger.json`, every call's distribution):
- **"Change a setting" is never the model's pick.** In w2 and w3 (w1 has no odds; see the reader below), P(move = 2)
  stays at 0.03–0.13 on all 48 asked turns, while "add" is up to 0.87. No run set a single setting. Told "the headline is 0 px from the left edge" for 25 turns, it never reaches for padding.
- **The names bug (w2):** with `n1`, `n10` and `n11` the grammar decides between them a token after the model's
  choice. Their odds read as an exact three-way tie (0.206 each), and the twelve refused "inside n1" were probably
  meant for the empty `n10` and `n11`. Fixed in w3 with fixed-width names.
- **The odds reader (w1):** E2B opens the answer as three tokens (`":` ` ` `"`), and the reader copied from `lm.mjs`
  needed them in one or two. Every move's odds came back empty in w1. Fixed in `arm.mjs`, filed as
  `P112-OWN032-ODDSREADER` (`lm.mjs` still has it).

```
the tokens of one move answer (E2B, w1 turn 12), with the top alternatives at each:
"{\""   "1":0.624 "3":0.148 "The":0.086
"pick"  "action":0.614 "step":0.096
"\":"   "\":":0.994
" "     " ":0.832 " \"":0.165
"\""    "1":0.732 "3":0.178 "2":0.050
"1"     "1":0.693 "3":0.189 "2":0.048 "4":0.034 "5":0.026
```

**Prediction 1** (does not reach the composition hero in 30 turns): **holds**, by a long way. Its detail is wrong: it
does not get the structure in 12 turns and then loop on spacing. It loops on ADDING (empty Groups, or refused adds)
and never touches spacing at all. w2's better run was probably not the new rule's doing: w3, with the same rules, fell
straight back into the loop. The headline is rewritten at temperature 0.7, and every later prompt differs with it.

**Not done yet (§3c):**
- Surgery runs from the command line (`--replay <run> --upto k`, `--override k=<action>`, `--hint k=<text>`,
  `--edit file.json`), and the ledger marks replayed turns (`replayed: true`, no model call).
- The viewer shows each run, but not two forks side by side, and it cannot start a fork from a step. Both are the
  next session's first job, so that Richard can poke at the model from the page.

Pictures are not committed (as in OWN-029/030): the `t<k>/*.png` and `s0-vision/*/*.png` files stay on disk, and every
ledger, timeline and facts file is committed.

## 5. Surgery from the page (3c, s2)

**Built 2026-10-29 s2.** Open a run in the viewer (`node server.mjs`, `?t=runs/arm-<run>`). Every builder call has a
button, **"Edit and re-run from here"**, that opens a form with:
- the call's prompt, editable;
- its answer, which can be overridden with any of its options, or with fixed words on a `write.text`;
- a note added to every prompt of that turn;
- for the whole run from there on: words at temperature 0, the `emptyParts` / `unchanged` findings, the s2 switches
  (below), the menu's question and the goal line;
- what you are trying, saved with the fork.

`POST /api/fork` turns the form into the arm's flags:
- turns 1..k−1 replay (`--replay --upto k`);
- **the calls of turn k before the edited one keep their answers**, so the edit is the only thing that moves (new
  `--force k.<key>=<answer>`);
- an edited prompt goes in verbatim (new `--prompt k.<key>=<file>`);
- a whole-run edit stacks on the parent's, so a chain of forks keeps every earlier edit.

The edit is saved beside the fork as `surgery.json`, holding the step, the old and new prompt, the old and new answer,
and the note. The fork is named `<parent>-t<k><letter>`. One run at a time. The server **refuses while another model
is loaded in Ollama** (the 16 GB trap), with a "Run it anyway" button.

The top of every arm run's page shows **the run, its ancestors, its siblings and its children side by side**, each with
its last desktop and phone picture, its turn and part count, and what its edit changed. A fork's page opens with a
banner: the parent, the step, the change, and a line diff of the prompt.

Checked:
- The page at 1280 and 390: 89 edit buttons on `w3-puppy`, 3 fork cards, nothing scrolls sideways.
- The route's three refusals: a call the turn does not have, an answer not on the menu, Ollama busy.
- A fully forced smoke fork from the command line (`w3-puppy` at turn 7, every call of turn 7 forced, `--turns 7`):
  turns 1–6 replayed and turn 7 was forced, with no model asked; the hint reached every prompt of turn 7. The run was
  deleted afterwards.

Two fixes on the way:
- The arm unloads only the models it actually asked (a `keep_alive: 0` sent for a model that is not loaded can load
  it first, beside a peer's).
- The "placeholder words" finding now uses the fixed-width names (`n05`, not `n5`).

Richard found the prompts too many to sift ("can you try to do it instead?"), so Opus ran the pokes. Method: read the
odds to find the call where the loop lives, probe that call alone on its recorded prompts with one change at a time
(the unchanged prompt is the control and must give back the recorded odds), then fork with the winner.

### 5a. The empty-Group loop lives in "which kind?", not in the move

In w2/w3 the move "add" was reasonable (the goal said a line, a button and a photo were missing). The loop is the
next call: **"Which kind?" gives Group 0.45–0.94** while the kinds the goal lacks get 0.01–0.37. Group is listed first,
and every Group added becomes a "your last steps" line that invites the next.

`probe-kind.mjs`, the 38 asked `add.kind` calls of w2 + w3 with a part missing, E2B at temperature 0:

| change to the prompt | P(a missing kind) | P(Group) | picks a missing kind |
|---|---|---|---|
| none (control; max drift from recorded 0.003) | 0.25 | 0.66 | 5/38 |
| missing kinds listed first, Group last | 0.55 | 0.35 | 21/38 |
| missing kinds marked "— still missing" | 0.34 | 0.58 | 9/38 |
| the goal names each part's kind ("a photo (an Image)") | 0.39 | 0.54 | 8/38 |
| last steps hidden | 0.18 | 0.77 | 2/38 |
| all four | 0.77 | 0.20 | 32/38 |
| **first three, last steps kept** | **0.85** | **0.10** | **37/38** |

Order is the biggest single lever, so this is largely position bias. Hiding the last steps HURTS on its own.

### 5b. The move never sets: a fix menu does

Once every part was there (t8a, turns 14–30), P("change one setting") stayed at 0.04–0.08. `probe-move.mjs`, those 17
move calls:

| change | P(set or a fix) | picks it |
|---|---|---|
| none (control; drift 0.006) | 0.06 | 0/17 |
| the finding names the owner ("n00 (the whole section) has padding left and right: none") | 0.06 | 0/17 |
| "Every part of the goal is there" | 0.07 | 0/17 |
| "change one setting" first on the menu | 0.12 | 0/17 |
| the "n03, n08 are empty" line dropped | 0.08 | 0/17 |
| owner + goal line + set first | 0.34 | 4/17 |
| …and the empty line dropped | 0.76 | 17/17 |
| **each traced finding its own move ("give n00 padding left and right (words are at the edge…)")** | **0.92** | **17/17** |

### 5c. The forks

Rules are switches in `--edit` (`arm.mjs` header); all default off, so w1–w3 replay unchanged. Words at temperature 0
from t7a on.

| fork | from, step | the change | what it did |
|---|---|---|---|
| `w3-puppy-t7a` | w3, turn 7 | `missingFirst`, `markMissing`, `namedGoal`; words at T 0 | A Button at turn 7 (w3 added a Group). Then **23 refused "add inside n01"** (a full Columns): at T 0 a refused step leaves the prompt as it was, so the same answer comes back. |
| `…-t8a` | t7a, turn 8 | `legalOnly`: "inside which part?" lists only parts that can take one | No refusals. **Every part by turn 13.** Then empty Groups/Columns and headline rewrites; P(set) 0.04–0.08, no setting changed. |
| `…-t14a` | t8a, turn 14 | `fixMenu`, `goalLine`, `ownerNamed`, `emptyParts` off | A fix picked on every turn, but the value was **"none" 16 times** (P 1.00): "none" listed first, and equal to the "(not set)" it already was. |
| `…-t14a-t14a` | t14a, turn 14 | a fix offers only values that change something, and says what it fixes | padding left/right `large` (turn 14), gap `huge` (15): **the measures went clean** and it said **done** at turn 30. The picture is not a hero: a body-size headline at the top edge, the line under it after the photo, the photo below the words. Nothing measured those. |
| `w4-puppy` | fresh, every switch | + `shapeChecks`: headline size, space above/below, order, photo on the right (from the tree) | Four fixes taken by turn 12 (padding, gap, headline `text-xl`, padding top/bottom `huge`). Then 15 turns of adding Columns: the right idea for "photo not on the right", but **no action could move a part**. |
| `w4-puppy-t15a` | w4, turn 15 | `move` / `remove` actions; "photo on the right" offers the next structural step | (waiting on Ollama) |
