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
| `w4-puppy-t15a` | w4, turn 15 | `move` / `remove` actions; "photo on the right" offers the next structural step | **E2B took every structural step offered**: added a Columns (t15), a words Group (16), moved the photo beside it (17), moved the headline in (19), removed five empty parts (28), and said **done** at turn 29 with one finding left. The photo is on the right at desktop and stacks on a phone. **Still not a hero:** two Texts both `text-xl` and both headlines ("Find Your Perfect Puppy" / "Find Your Forever Friend"), no line under the headline, the button and the second Text outside the words column. The checks were the hole: they named the headline by document ORDER, so after the move at t19 the size fix went to the other Text (t20); `text-xl` counted as big; "photo on the right" looked at the headline and the photo only. |
| `w5-puppy` | fresh, every switch + **`roles`** | roles (see `arm.mjs` header): the checks read what each part IS, not where it sits; headline ≥ display-md; the line smaller; line and button in the words column | The roles worked: headline `display-lg`, a real sentence under it, a Button. Then **9 turns of a harness loop**: the headline sat straight in the Columns (no Group), so "photo right" passed, "together" offered "add a Columns", and the empty-parts fix removed it the next turn. My bug, not the model's. |
| `w5-puppy-t16a` | w5, turn 16 | **`wrap`**: a word part straight in the Columns goes into a Group of its own; empty parts are not removed while a structure fix is open | wrap (t16), line and button moved into the words column (t20, t22), **done at turn 23**. Left: the button still said "Button" (placeholder words were a finding, not a fix), and `display-lg` broke the headline one word to a line on a desktop. |
| **`w6-puppy`** | fresh, every switch | placeholder words become a write fix; `bench.mjs` counts each text block's lines; a headline breaking onto 3+ lines on a desktop is a fix (smaller, never below display-md) | **Done at turn 24, every check clean, 2½ min.** "Find Your Perfect Puppy Today" at display-md on two lines, a sentence under it, "Adopt Now", the photo on the right; on a phone the words, the button, then the photo. Every structural and spacing step after turn 12 was a fix the model picked from the menu. Nits I see: the gap between the headline and the line is wider than between the line and the button; the line could be grey. **The AC4 candidate** (`runs/arm-w6-puppy/t23/`). |

## 6. AC4 and AC5 (s2, 2026-10-29 evening)

**The harness for both:** `arm.mjs` with every switch on (`runs/arm-w6-*/edit.json`: words at T 0, `missingFirst`,
`markMissing`, `namedGoal`, `legalOnly`, `fixMenu`, `goalLine`, `ownerNamed`, `shapeChecks`, `roles`). It was tuned on
puppy only (w1–w6), then run UNCHANGED on bakery, jazz and plumber. Each brief has its own bench, made from that brief's
kept OWN-029 G round (bakery r3, jazz r3, plumber r4), so its theme and tokens are the composition hero's.

| run | turns | done by the model | findings left |
|---|---|---|---|
| `w6-puppy` | 24 | yes | none |
| `w6-bakery` | 25 | yes | "Bake Now" contrast 3.19: the kit's white on the bakery primary (P112-OWN030-PRIMARYCONTRAST, already filed); buttons have no colour setting on the arm's menu |
| `w6-jazz` | 22 | yes | none |
| `w6-plumber` | 22 | yes | none |

All four reach every part and clean measures with no help. Every structural step after the parts exist is a fix the
model picked from the menu.

**The blind pairs:** `ac5.mjs w6` renders each brief's composition hero (the kept G round's `tree.json`, first section)
and the arm's last tree on the same bench (`runs/ac5-w6/<brief>/{composition,arm}/`). The page is
https://claude.ai/artifact/XoSSP3TPGwqbhnAhu7vcEP, with the `db` capability: `ac5/<brief>` holds `{pick: A|B|same, why, at}`,
and `ac4/puppy` holds `{pick: perfect|almost|no, why, at}`. The key is `runs/ac5-w6/blind-key.json` (seed 32). It
never goes on the page.

**Pre-registered before Richard ranks (Opus, having seen the pictures):** the composition hero wins at least 2 of 3,
so **AC5 fails as the task wrote it.** The arm's heroes are clean: the photo on the right, a display headline, a
sentence, a button, the right air. But they are plain. None of the composition's three richer moves is on the arm's
menu:
- a ground on the section (gradient or brand colour);
- the theme's display font for the headline (the arm's Text keeps the body font);
- an eyebrow line above the headline.

Jazz and plumber's composition heroes have no photo at all, so those two pairs also compare two different goals.
If this holds, the next step is to add those three moves as findings with fixes, then test on the two briefs not yet
used here (running, pottery), not on these three.

## 7. Richard's ruling on AC5, and the look the person asks for (s3, 2026-10-29 evening)

**Richard, after seeing the pairs (he did not use the page's buttons):** *"I like the new style in all of the
templates. It's much cleaner and I think it's shippable, but you could argue it's a bit too clean … I wouldn't say the
old attempts were 'bad' or 'worse', they're different. … the originals would be someone who wants a stylish modern
look, and the new ones would be really the minimalist, clean look. … a further win. … It would be good if we could be
sure the model is responding to the prompt."*

So AC5 is reframed, not failed. The prediction in §6 was half right: the composition heroes look richer for the three
moves named there. But Richard reads the two as two LOOKS, both shippable, not as better and worse. The new
criterion: **the look follows the request.**

**His defect, "the button at the bottom looks like the hero has no inner padding":** it was the BENCH. `HEIGHT`
cropped each picture at the last painted element, and the arm's sections have no ground, so their bottom padding
(space-24 on w6-puppy) was cut off. A composition hero paints a ground, so its padding survived. Now any element with
bottom padding counts too. w6-puppy desktop went from 467 to 563 px, an even 96 px above and below. `runs/ac5-w6/*`
were re-shot. The facts the arm read each turn were DOM measures, so no turn's findings change.

### 7a. Does E2B hear the look? (`probe-look.mjs`, `lookq.mjs`)

One closed question, E2B at temperature 0, asked with the two looks in both orders, taking the mean. Bar, written
before the run: ≥ 14 of 16 requests that name a look.

- **16 / 16.** Minimal requests: P(stylish) 0.00 every time. Stylish requests: 0.91–1.00. Order moved it by at most
  0.14, on "dark and elegant".
- **No look named:**
  - "family bakery in Lyon, warm colours" → stylish, 0.99;
  - "puppy … blue colour theme, modern style" → stylish, 0.86;
  - "a page for my jazz night" → stylish, 0.88;
  - "plumbing business" → minimal, 0.39;
  - "running club" → minimal, 0.31;
  - **"a website for my bakery" → 0.56, and it flips with the order (0.73 / 0.40).**

  That last case is the one to ask about. In the product, between 0.3 and 0.7 means "ask the person which look". The
  three stylish ones match what OWN-029's composition gave those briefs.

### 7b. The stylish look in the arm (`--style stylish`, roles on)

Read param by param from G-plumber r4's hero:
- a dark brand ground on the section;
- white words;
- a bold headline;
- a small line above the headline in small capitals (text-xs, uppercase, widest tracking);
- a white pill button.

Each is a finding whose fix offers only the value the look asks for (`only`). "Small line above the headline" is a third
Text role, `eyebrow`. A structure step moves it into the words column above the headline, and a move can now take
`before`.

| run | change | what happened |
|---|---|---|
| `w7s-puppy` | stylish | Every look fix taken (ground at t2, white, bold, small capitals, moved above the headline), but **no Button in 40 turns.** "Which kind?" gave Group 0.50–0.59 and Button 0.03–0.05: the goal line ("all on a dark brand-colour ground") seems to invite a box. |
| **`w8s-puppy`** | the first missing part is its own fix: "add a button (a Button) inside n00: the goal still lacks it" (roles only) | **Done at turn 34, every check clean.** Every part was added by turn 10. A dark brand gradient, "YOUR JOURNEY STARTS HERE" in small capitals, a bold white display-md headline, a white sentence, a white pill "Adopt Now", the photo on the right; on a phone it stacks. Nit: the words column's one gap (huge) holds the small line as far from the headline as the line from the button. |

**What the model still decides:** with roles + fixMenu, every step in w8s was a fix from the menu. E2B picks which
finding to fix next, picks the value where more than one is offered (sizes, gaps, padding), and writes every word. The
script holds the look. That is OWN-029's thesis ("the taste lives in the system") made literal. The probe in 7a is
where the person's words reach the system.

### 7c. The whole chain: request words → E2B picks the look → the arm builds it (`--style auto --request …`)

Six requests none of the probes had seen, one calm and one bold for each untuned brief. Harness: w6's switches +
`style: auto`.

| run | request (abridged) | heard (P stylish) | turns | end |
|---|---|---|---|---|
| w9m/w10m-bakery | "simple, calm … lots of white space" | minimal (0.00) | 40 → **21** | w9: looped on "gap huge" for 15 turns; w10: ended, only the kit's contrast left |
| w9s/w10s-bakery | "bold and stylish … make it stand out" | stylish (1.00) | 40 → **32** | as above (white on amber 3.16–3.19, P112-OWN030-PRIMARYCONTRAST, noted on the bug) |
| w9m/w10m-jazz | "clean, quiet page … 14 November" | minimal (0.00) | 25 → 21 | clean |
| w9s/w10s-jazz | "dark, moody and glamorous" | stylish (0.99) | 35 → 40 | clean, but 7 free "add a Columns / Group" turns while fixes were on the menu |
| w9m/w10m-plumber | "plain, uncluttered" | minimal (0.00) | 24 → 23 | clean |
| w9s/w10s-plumber | "cool and confident, with strong colours" | stylish (1.00) | 29 → **32** | w9: **said done with "photo on the right" open** (the small line under the button, the photo on a 2nd row); w10: clean |

**6 of 6 heard right, 6 of 6 built in the look they heard.** Page: https://claude.ai/artifact/2M1WenHSVPsUE21P3N1NcB,
with the two puppy heroes too.

What changed between w9 and w10 (`endGate`, `roles`): "done" leaves the menu while any finding has a fix, and the run
ends itself once every part is there and nothing left has a fix. With roles, the order finding is a fix too (move the
line straight under the headline).

**Next, seen in these runs:**
- The generic "add" is still on the menu once every part exists. w10s-jazz spent 7 turns adding Columns and Groups
  that the empty-parts fix then removed. Offer "add" only while the goal lacks a part.
- A long headline at the display-md floor still breaks onto 4 lines (w10m-bakery: "Maison Levain: Artisanal baking
  from our family kitchen."). Offer a write fix: "make the headline shorter".
- Spacing rhythm in the stylish words column: the small line sits as far from the headline as the line from the
  button.
- An undecided request (0.3–0.7) should ask the person. Not built yet.
- **Both looks as product:** fold `lookq` + the look's fixes into OWN-031 `build_app`. That is the other session's lane,
  so ask first.

## 8. s4 — the next experiments (2026-10-29, late)

Each one runs alone on Ollama (E2B, words at T 0), against a control, behind a switch that is off by default.

### 8a. "Add" only while a part is missing (`addWhileMissing`)

**The change:** under `endGate`, the generic "add a part" leaves the move menu once the findings open with `goalMet`.
Structural fixes that add (the Columns, the words column) stay, because they are fixes, not the generic move.

**The control:** the six w10 runs, with the same requests, benches and edit (`runs/arm-w10s-jazz/edit.json`). To check
that T 0 replays exactly, w10s-jazz is re-run unchanged as `w11c-jazz`. Free (non-fix) moves after `goalMet` in w10:
- bakery-m 0, jazz-m 0, plumber-m 1 (an add);
- bakery-s 0, **jazz-s 7 (all adds)**, plumber-s 1 (a write).

**Pre-registered (before any w11 run):**
- turns fall on jazz-s (40 → under 34) and on plumber-m;
- no run gains turns by more than 2;
- the end findings of no run grow, and every run still ends by `endGate` with every part there.

The other three runs change only in the menu text after `goalMet`, so their picks may drift; the test is that they do
not get worse.

**The control holds:** `w11c-jazz` (w10s-jazz re-run unchanged) took the same 40 actions, and no option's odds moved
(max drift 0.0000). At T 0 a w10 ledger is an exact control, and a w11 run that parts from it parts because of the
switch.

**Result (`w11*`, `node compare.mjs w10 w11`):**

| run | turns | free moves | free after `goalMet` | where it parts | the end |
|---|---|---|---|---|---|
| m-bakery | 21 → **24** | 1 → 3 | none → 2 generic "set" | t18 | same measures (the kit's contrast); words column gap huge → small |
| s-bakery | 32 → 32 | 1 → 1 | none → none | never | the same tree |
| m-jazz | 21 → 21 | 1 → 1 | none → none | t10, two fixes swap order | same measures; the section's side padding 48 → 32 px, gap 16 → 48 px |
| **s-jazz** | **40 → 32** | **8 → 1** | 7 adds → none | t14 | the same tree; the sentence under the headline reworded |
| m-plumber | 23 → 21 | 2 → 1 | 1 add → none | t8 | `unchanged` left → nothing left |
| s-plumber | 32 → 32 | 2 → 1 | 1 write → none | t26: the same write, taken as the placeholder fix | the same tree |

Totals: turns 169 → 162, free moves 15 → 8.

**Against the pre-registration:**
- ✅ turns fall on jazz-s (40 → 32) and on plumber-m (23 → 21);
- ❌ **m-bakery gains 3 turns, against a bar of 2.** At t18 the w10 menu had the move fix at 0.35, "add" at 0.27 and
  "set" at 0.26. Without "add", "set" took 0.47 and the fix 0.30. The model then nudged the headline's size twice by
  hand (display-lg, back to display-md) before taking the fix;
- ✅ no run's end findings grow, and every run ends by `endGate` with every part there.

**Kept, with the miss named:** taking "add" away moves its odds onto the next generic move, not onto the fix. The
candidate that follows: under `endGate`, once `goalMet`, the menu is the fixes plus undo, with no generic "set" or
"write" while any fix is on it. It was not run here, because it is not on the s4 list.

**A bench defect found on the way (P112-OWN032-BLANKSHOT):** w11m-jazz's last desktop shot was taken before the page
drew. It is 120 px tall, with `blank: true`, no words and no findings, and `endGate` ended the run on it. Across
every arm run, 11 of 1003 shots have one width blank while the other has words, mostly late in a run (five at t21).
It did not reproduce in 50 idle shots of the same tree.

The fix is the `blankRetry` switch: the bench measures a blank page again, up to 3 times, and a shot still blank with
words in the tree cannot end a run. From 8b on, every run has it on. The w10 and w11 runs were measured without it on
both sides.

### 8b. A headline too long for its column (`shortHeadline`)

**The change:** with roles, a headline at display-md (the smallest headline size) that still breaks onto 3 or more
lines on a desktop gets a write fix: "make the headline n01 shorter (8 words, it breaks onto 4 lines on a desktop)".
The rewrite prompt adds: "write it again in at most max(3, ⌊2n/k⌋) words", which is 4 for bakery and 5 for jazz.

**The control:** the w11 runs. w12 = w11's edit + `shortHeadline` + `blankRetry` (`runs/w12.edit.json`). Where a w12
run parts from w11 before the new finding first appears, the cause is the retry, and the facts' `retries` show it.

**Pre-registered (before any w12 run):**
- the fix appears on m-bakery and m-jazz only (their w11 headlines are 8 words on 4 and 3 lines);
- both rewrites keep the name ("Maison Levain", "The Blue Room") in the headline;
- both end with the headline on at most 2 lines;
- neither run grows by more than 3 turns;
- the other four runs end on the same tree as w11.

**Result (`w12*`, `node compare.mjs w11 w12`):**

| run | turns | the finding | the rewrite | the end |
|---|---|---|---|---|
| **m-bakery** | 24 → 25 | t21 (8 words, 4 lines) | t22: **"Maison Levain: Artisanal baking."** 4 words, **2 lines** | same measures (the kit's contrast) |
| **m-jazz** | 21 → 22 | t18 (8 words, 3 lines) | t19: **"The Blue Room: Jazz Evening"** 5 words, **2 lines** | clean |
| s-bakery, s-jazz, m-plumber, s-plumber | unchanged | never | — | the same tree as w11 |

**Against the pre-registration:** ✅ on every line. The fix appears on the two runs only, both rewrites keep the
name, both headlines end on 2 lines, each run grows by 1 turn, and the other four end on w11's tree.

**What the name test did not catch:** the jazz rewrite dropped "on 14 November", and the date is now nowhere in
that hero. The request named it. The trap is wider than the name: a shortened headline can drop any fact the request
gave. A candidate for later: the rewrite prompt says "keep the name and any date", or a check that every name and
date in the request is somewhere in the hero's words. Not run here.

**The retry, seen working in an arm run:** w12m-bakery t13's desktop shot read blank and, one retry later, read 21
words. No w12 shot stayed blank with words in the tree.

**A correction to the guard, before 8c:** look.mjs's `blank` means fewer than 5 words on the page, not "nothing
drew". So early turns with a three-word placeholder tripped the retry (3 × 700 ms each) and the `blank` mark. Neither
changed a finding, because a retry re-measures a page that has already settled. The retry and the guard now ask for
`words === 0`, which picks out exactly the same 11 shots of 1003 as "one width blank while the other has words".

### 8c. Spacing rhythm in the stylish words column — pictures made, waiting on Richard's eye

`rhythm.mjs` renders w8s-puppy's last tree on the puppy bench, as the arm left it and with three candidates applied
by hand. No arm code changes until Richard picks one. Gaps measured between the word blocks, desktop and phone alike:

| variant | small line → headline | headline → line | line → button |
|---|---|---|---|
| `before` (the arm's one "huge" gap) | 48 px | 48 | 48 |
| `together`: the small line and the headline in a Group of their own, gap small | **8** | 48 | 48 |
| `pairs`: the column gap small, then margins on the line and the button | **8** | 24 | 40 |
| `medium`: the composition hero's rhythm (G-plumber r4), one medium gap and 8 px more before the button | 16 | 16 | 24 |

Pictures: `runs/rhythm-w8s-puppy/<variant>/{desktop,phone}.png`.

### 8d. Ask when the request doesn't say (`probe-look.mjs --set plain`)

Twenty requests that name no look, written into `probe-look.mjs` (`PLAIN`) before any model saw them: five trades,
five shops, five clubs and five events. The same question as §7a, E2B at T 0, in both option orders.

**Pre-registered:** fewer than a third (at most 6 of 20) land in the band, a mean P(stylish) between 0.3 and 0.7.
Also counted: on how many the two orders pick different looks, and whether those are the ones in the band.

**Result (`runs/probe-look-gemma4_e2b-it-qat-q1-plain.json`):** ❌ **17 of 20 land in the band, against at most 6.**

- **Out of the band:** the village choir 0.11, the rowing club 0.21, the craft beer festival 0.703.
- **In it:** everything else, 0.34–0.70. The bookshop is 0.35; the cheese shop, the wedding, the pottery weekend and
  the under-12s football team are 0.62–0.70.
- **The two orders pick different looks on 9 of 20, and all 9 are in the band.** Order moves P(stylish) by 0.16 on
  average, up to 0.41. The look listed second draws the odds.

**What this says:** the question does not measure which way a plain request leans. It separates "the person named
a look" from "the person did not":

| band (ask inside it) | plain requests asked | requests that name a look asked (§7a's 16) |
|---|---|---|
| 0.3–0.7 (the handoff's) | 17 / 20 | 0 / 16 |
| 0.2–0.8 | 19 / 20 | 0 / 16 |
| 0.1–0.9 | 20 / 20 | 0 / 16 |

Every request that names a look sits at ≤ 0.001 or ≥ 0.91. §7a's requests with a look-ish word ("modern style",
"warm colours") sit at 0.86–0.99, and "a page for my jazz night" at 0.88.

**Built anyway, behind a switch:** `askBand` (`edit.askBand: [lo, hi]` or `--ask-band lo,hi`, with `--style auto`).
Inside the band the arm stops before turn 1, ledgers `{ ask: 'clean or bold?' }`, and builds nothing. Checked:
- "A website for my bakery." (0.565) asks (`arm-w13ask-bakery`);
- w10s-bakery's bold request (1.00) builds stylish (`arm-w13go-bakery`, 1 turn).

**For Richard (a product call, not the script's):** with a plain request the person gets a question nearly every
time, whatever band is picked. The choices are to ask whenever the request names no look, which is honest because
E2B's lean on a plain request is near a coin and flips with the option order, or to build a default look and offer
the other one after.

### 8e. A third look? Not run

The handoff gated this on 1–4 landing. They did not all land:
- 8c waits on Richard's eye;
- 8d failed its pre-registration.

So no probe was run. The method is ready if Richard wants it (`lookq.mjs`'s `LOOKS` + probe-look's both-orders loop,
8 requests per look). 8d bears on it: E2B separates looks that are NAMED sharply, so a third named look may well
separate. A plain request will not lean toward it.

### 8f. Held-out briefs: running and pottery (`w14*`)

**Benches:**
- `own-032-bench-running` from `own-029-G-running-r4`;
- `own-032-bench-pottery` from `own-029-G-pottery-r1`, OWN-029's kept round. The handoff said r2, but r1 and r2 tie
  at 0.034 and every other bench was made from the kept round.

**Goals:**
- the names come from OWN-029's cards: "Park Runners" and "Potter Portfolio";
- the library has no runner photo (OWN-029 found the same), so running's photo is `ground-forest-fog.webp`, a stand-in;
- the four requests, one calm and one bold per brief, are in `run-set.sh` and the ledgers.

**The final harness (`runs/w14.edit.json`):** w12 (8a's `addWhileMissing`, 8b's `shortHeadline`, `blankRetry`) +
`askBand [0.3, 0.7]`. No rhythm change: 8c waits on Richard.

**Pre-registered (before any w14 run):**
- `lookq` hears all 4 right, and none asks;
- every run ends by `endGate` with every part there, inside 40 turns;
- the only finding left is the kit's contrast, and only where the theme's primary is green or warm
  (P112-OWN030-PRIMARYCONTRAST): running's green primary may fail with white words, as bakery's amber did.

**Result (`w14*`):**

| run | heard (P stylish) | turns | free moves | left at the end |
|---|---|---|---|---|
| m-running | minimal (0.001) | 23 | 1 | "Run Now" contrast 3.30: white on the green primary (the kit) |
| s-running | stylish (1.00) | 35 | 2 | 3.30 × 3: the small line (on the gradient's bright green), the sentence (cautious, see below), the white pill's green words |
| m-pottery | minimal (0.00) | 23 | 1 | nothing |
| s-pottery | stylish (0.997) | 32 | 1 | nothing |

**Against the pre-registration:** ✅ on every line. All 4 heard right and none asked; all ended by `endGate`, every
part there, in 23–35 turns; the only finding left is the kit's, on the green brief.

The bench reads a gradient by its worst colour stop. So s-running's sentence, which sits over the dark end, measures
3.30 cautiously, while the small line really sits on the bright green. Added to P112-OWN030-PRIMARYCONTRAST: two of
six briefs (bakery and running, in both looks) now end with only that open.

**Words to look at, not measured:** pottery's buttons say "Create" and "Create Now". running's photo is a misty
forest, a stand-in (no runner photo in the library).

### Richard's rulings on 8c and 8d (2026-10-29, late)

- **8c, the words column rhythm:** *"Medium looks best overall, pairs second, the others weirdly spaced."* → the
  stylish look learns `medium`: one 16 px gap in the words column and 8 px more before the button (8g).
- **8d, a request that names no look:** **ask the person.** E2B puts every request that names a look at ≤ 0.001 or
  ≥ 0.91, so the final harness's band becomes **0.1–0.9**. On the 36 requests measured, that asks 20 of 20 plain ones
  and 0 of 16 that name a look. The edge, to watch: §7a's "puppy … modern style" (0.86) and "a page for my jazz
  night" (0.88) would also ask, while "family bakery in Lyon, warm colours" (0.99) would not.

### 8g. The stylish rhythm in the arm (`rhythm`), the final harness

**The change (stylish only):** once the headline is in a words column, two findings, each with a fix that offers one
value:
- the words column's gap is medium (16 px);
- the button has "space above: small" (8 px), a Button setting that exists only with this switch.

`runs/w15.edit.json` = w14 + `rhythm` + `askBand [0.1, 0.9]` (8d's ruling).

**The control:** the five stylish runs of the final harness without it: w12s-bakery, w12s-jazz, w12s-plumber,
w14s-running, w14s-pottery.

**Pre-registered (before any w15 run):**
- all five end with the words column at 16 / 16 / 24 px (small line → headline → line → button) on a desktop;
- no run grows by more than 3 turns;
- no run ends with a finding its control did not have.

**Result (`w15s-*`):** ✅ on every line.

| run | turns (control → w15) | words column (desktop) | left at the end |
|---|---|---|---|
| s-bakery | 32 → 33 | 48/48/48 → **16/16/24** | the same 3 kit contrasts |
| s-jazz | 32 → 33 | → **16/16/24** | nothing |
| s-plumber | 32 → 33 | → **16/16/24** | nothing |
| s-running | 35 → 36 | → **16/16/24** | the same 3 kit contrasts |
| s-pottery | 32 → 33 | → **16/16/24** | nothing |

Each run parts from its control late (t30–t32), once the words column exists. It takes the gap fix there and the
button fix as its last step, so each costs one turn. The model takes both fixes every time, since each offers only
one value.

**Seen, not graded:** s-running's headline "RUN. EXPLORE. CONNECT." leaves out "Park Runners" in both w14 and w15. The
small line says "Saturday Morning Running Club", so the club's name is nowhere in that hero. This is the same family
as 8b's lost date: a check that every name and date in the request appears somewhere in the hero would catch both.

### 8h. Where s4 leaves the arm

The final harness is `runs/w15.edit.json`. Every switch is off by default, so every earlier run replays.
- **minimal:** w12 for bakery, jazz and plumber, and w14 for running and pottery. Clean except the kit's
  white-on-amber and white-on-green.
- **stylish:** w15 for all five briefs. Clean except the same kit contrasts, with the words-column spacing Richard
  picked.
- **a request that names no look:** asks "clean or bold?" (band 0.1–0.9).

The page is updated (same URL): https://claude.ai/artifact/2M1WenHSVPsUE21P3N1NcB.

## 9. s5 — fixes only, the request's facts, the minimal rhythm, a third look (2026-10-29)

Each one runs alone on Ollama (E2B, words at T 0), against a control, behind a switch that is off by default.

### 9a. Only fixes once every part is there (`fixesOnly`)

**The change:** under `endGate`, once the findings open with `goalMet` and while any fix is on the menu, the move menu
is the fixes plus "undo": no generic "set" or "write" (8a's `addWhileMissing` already took "add" off). This is 8a's
miss: with "add" gone, its odds moved onto the generic "set", not onto the fix.

**The control:** the final harness's runs, ten requests: w12m-bakery, w12m-jazz, w12m-plumber, w14m-running,
w14m-pottery, and w15s-* for the five stylish ones. The test is `runs/w16.edit.json` = w15 + `fixesOnly`. On the
minimal runs, w15's only difference from w12/w14 is the Button's "space above" setting, which appears only in a
generic "set" on a Button; none of the five minimal controls made one, so they replay exactly up to `goalMet`.

Free moves after `goalMet` in the controls: m-bakery 2 (t18, t20: the headline's size by hand, display-lg then back
to display-md), s-running 1 (t14: a gap by hand), the other eight 0.

**Pre-registered (before any w16 run):**
- free (non-fix) moves after `goalMet` are 0 in all ten runs, "undo" included;
- no run gains turns against its control;
- m-bakery falls by at least 2 turns (25 → ≤ 23), s-running by at least 1 (36 → ≤ 35);
- no run's end findings grow, and every run still ends by `endGate`.

The other eight change only in the menu text after `goalMet` (the "set" and "write" lines go), so their picks may
drift; the test there is that they do not get worse.

**The control holds where the prompts match:** `drift.mjs <control> <test>` compares the odds on every call asked the
very same prompt. That is 8 to 30 calls per pair, and the drift is 0.0000 on all ten.

**Result (`w16*`, `node compare.mjs w12|w14|w15 w16 <run>`):** ✅ on every line.

| run | turns | free after `goalMet` | where it parts | the end |
|---|---|---|---|---|
| **m-bakery** | **25 → 22** | t18, t20 "set" → none | t18: the move fix, where the control nudged the size | the same measures (the kit's contrast); the words column's gap small → huge, and "Artisanal Baking" capitalised |
| m-jazz | 22 → 22 | none → none | never | the same tree |
| m-plumber | 21 → 21 | none → none | never | the same tree |
| m-running | 23 → 23 | none → none | never | the same tree |
| m-pottery | 23 → **22** | none → none | t10 | clean; the section's padding top and bottom 32 → 96 px, sides 48 → 24 px, and reworded words ("Create Your Piece") |
| s-bakery | 33 → 33 | none → none | t16 | the same 3 kit contrasts; the small line capitalised |
| s-jazz | 33 → 33 | none → none | never | the same tree |
| s-plumber | 33 → 33 | none → none | t22: two fixes swap order | the same tree |
| **s-running** | **36 → 35** | t14 "set" → none | t14 | the same 3 kit contrasts; the line reworded |
| s-pottery | 33 → 33 | none → none | t19 | clean; three parts reworded ("Artisan Pottery", "Create") |

Totals: turns 282 → 277, free moves after `goalMet` 3 → 0. "Undo" stayed on the menu and was never taken.

**Against the pre-registration:**
- ✅ free moves after `goalMet` are 0 in all ten;
- ✅ no run gains turns;
- ✅ m-bakery falls by 3, s-running by 1;
- ✅ no run's end findings grow, and all ten end by `endGate`.

**Not graded:** where a run parts, the words it writes after that differ. The write prompt carries YOUR LAST STEPS,
which have changed. Two runs also end with different spacing that the script measures as clean: m-bakery's words
column at 48 px, and m-pottery's section padding. Richard judges looks; these are pictures to show him, not results.

**Kept:** `fixesOnly` joins the final harness, `runs/w16.edit.json`.

### 9b. The request's facts stay in the hero (`factsKept`)

**What the controls show (read from the ledgers before any change):** the handoff named two losses, and there are
four, plus one that healed by chance:
- **the date "14 November" is in neither jazz hero:** m-jazz's 8b rewrite dropped it, and s-jazz never wrote it;
- **the name is missing at the end of two:** s-running ("RUN. EXPLORE. CONNECT.") and **m-plumber** ("Expert Plumbing
  Services": "Dupont" is nowhere, from t3 to the end);
- m-pottery's headline lacked "Potter Portfolio" from t3 to t19, and got it back only because 8b's shorten fix
  happened to rewrite it.

**The change:** with roles, once the part that should carry a fact holds written words (not the placeholder), a fact
of the request that is nowhere in the hero's words is a finding with a write fix on that part:
- the brief's name goes on the headline;
- a date in the request (a day and a month, either order) goes on the line under the headline.

The write prompt adds `It must say "<fact>".` With this switch on, 8b's shorten fix also says "It must say
"<name>"", so a shorter headline cannot drop the name. A date counts as there when the hero's words hold the same day
and month in any form ("14 November", "November 14th").

**The control:** the 9a runs (w16, the final harness then); the test is w17 = w16 + `factsKept`, on all ten requests.

**Pre-registered (before any w17 run):**
- the finding appears on m-jazz and s-jazz (the date), m-plumber and s-running (the name), and on m-pottery while its
  headline lacks the name; on no other run;
- all ten end with the brief's name, and the jazz two with "14 November", somewhere in the hero's words;
- no run grows by more than 3 turns, and none hits the 40-turn cap;
- no run's end findings grow, and the five runs without the finding end on the same tree as their control.

**Checked before the runs:** w16m-jazz and w16m-plumber, replayed under the w17 rules (`--replay … --upto 99`, no model
call). The finding appears where expected: jazz from t19, once the shortened headline has dropped the date; plumber
from t3, once the headline is written without "Dupont".

**Result (`w17*`, `node compare.mjs w16 w17 …`):** every hero ends with its facts, and no run grows by more than 1
turn. The odds drift is 0.0000 on every call asked the same prompt (`drift.mjs`).

| run | turns | `factLost` | what was written | the headline at the end |
|---|---|---|---|---|
| m-bakery | 22 → 22 | never | t19, the shorten fix: "Maison Levain" | "Maison Levain: Artisanal Baking" → **"Maison Levain"** |
| **m-jazz** | 22 → **23** | t19 (the date) | t19 shorten → "The Blue Room"; t20 the line: "Join us for a sophisticated jazz evening **on 14 November**." | "The Blue Room" |
| **m-plumber** | 21 → 21 | t3–t11 (the name) | t12: **"Dupont Plumbing"** | "Expert Plumbing Services" → "Dupont Plumbing" |
| m-running | 23 → **22** | never | t19 shorten → "Park Runners" (the control first wrote the same 7 words again) | "Run with Park Runners" → "Park Runners" |
| **m-pottery** | 22 → **21** | t3–t11 (the name) | t12: "Potter Portfolio" (the control got it only at t20, through the shorten fix) | the same |
| s-bakery, s-plumber, s-pottery | unchanged | never | — | the same tree |
| **s-jazz** | 33 → **34** | t21–t22 (the date) | t23 the line: "Experience the magic of jazz **on 14 November**." | the same |
| **s-running** | 35 → 35 | **never** | t32, the shorten fix: **"Park Runners"** | "RUN. EXPLORE. CONNECT." → "Park Runners" |

**Against the pre-registration:**
- ✅ / ❌ **the finding appears on m-jazz, s-jazz, m-plumber and m-pottery, and on no other run, but not on
  s-running.** Its headline "RUN. EXPLORE. CONNECT. PARK RUNNERS." (t5) held the name until the shorten fix. With this
  switch, that fix says `It must say "Park Runners"`, so the rewrite kept it, and the finding never had to fire;
- ✅ all ten end with the brief's name in the hero's words, and both jazz heroes with "14 November";
- ✅ no run grows by more than 1 turn, and none hits the cap;
- ✅ no run's end findings grow;
- ❌ **the runs without the finding did not all end on their control's tree:** m-bakery and m-running changed. The
  switch changes the shorten fix's prompt too, and I predicted only for the new finding. Both changes are in that one
  rewrite; m-running is a turn shorter.

**Seen, for Richard's eye:** with `It must say "<name>"`, all four shorten rewrites became the name alone: "Maison
Levain", "The Blue Room", "Park Runners" twice. In the stylish look that is the composition hero's own shape (the name
as the headline). In the minimal look it gives up a headline that says something ("Maison Levain: Artisanal Baking").
Whether a headline that is only the name is right is a words question, not the script's.

**Kept:** `factsKept` joins the final harness, `runs/w17.edit.json`.

### 9c. The minimal rhythm: pictures made, waiting on Richard's eye

`rhythm.mjs w17m-jazz jazz` renders the final harness's minimal jazz hero as the arm left it, and with the same three
candidates as 8c. I used w17m-jazz rather than the handoff's w12m-jazz because its words are the ones the harness gives
now ("The Blue Room", and the line carries the date). A minimal hero has no small line, so `together` puts the headline
and the line in a Group of their own. No arm code changes until Richard picks.

| variant | headline → line | line → button |
|---|---|---|
| `before` (the arm's "huge" gap) | 48 px | 48 |
| `together` (headline and line in a Group, gap small) | 8 | 48 |
| `pairs` | 24 | 40 |
| `medium` (Richard's pick for the stylish look) | 16 | 24 |

Desktop and phone measure the same. Pictures: `runs/rhythm-w17m-jazz/<variant>/{desktop,phone}.png`.

**For Richard (with 9b's "the name alone" question):** https://claude.ai/artifact/P7umD3HEoDJrTiv1Q3KQqh.

**Seen in the pictures, not measured:** the words column is top-aligned beside a 320 px photo. The closer the spacing,
the more empty space shows under the button. A candidate fix: centre the words column beside the photo. Not run.

### 9d. A third look? (`probe-look3.mjs`, probe only)

**The method:** "minimal / stylish / warm and friendly" ("warm and friendly: a soft light colour ground, rounded
shapes, a welcoming headline"), asked of E2B at T 0 in all 6 orders of the three looks. A request's answer is the look
with the highest mean P across the six orders. 8 requests per look: §7a's 8 minimal and 8 stylish, and 8 warm ones
written into `probe-look3.mjs` before any model was asked.

A slip to record: while I was checking that the file loaded, the probe ran its first two rows (two §7a minimal
requests, both answered minimal) beside an arm run, then died on a closed pipe. w16m-bakery, which ran at the same
time, shows no odds drift on the 16 calls whose prompts match its control (`drift.mjs`), so the overlap did not touch
it. The probe is run in full, alone, below.

**Pre-registered (before the full probe runs):**
- the bar for "E2B separates a third look": at least 7 of 8 right for each of the three looks;
- my prediction: it does not clear the bar, and the confusions are between warm and minimal (both are light pages),
  not with stylish.

**Result (`runs/probe-look3-gemma4_e2b-it-qat.json`):** ✅ **E2B separates all three: 24 of 24 right, 8 of 8 per look,
with no confusion in any direction.** My prediction (warm and minimal would blur) was wrong.

| look | right | the same pick in all 6 orders | its mean P, lowest to highest |
|---|---|---|---|
| minimal | 8 / 8 | 5 / 8 | 0.82–1.00; the rest goes to warm (≤ 0.18), never to stylish |
| stylish | 8 / 8 | 7 / 8 | 0.68–0.99; the trampoline park ("punchy colours") gives warm 0.31 |
| warm | 8 / 8 | 8 / 8 | 1.00 on all eight |

The first-listed look draws a mean P of 0.32, against 0.33 for no order effect at all, so with three looks the order
barely moves the answer. The nearest blurs are minimal → warm (the bakery 0.18, the pottery 0.16, the yoga studio 0.14)
and stylish → warm (the festival 0.20, the trampoline park 0.31). Stylish and minimal never blur into each other.

**What it does not show:**
- **Most of the warm requests use the look's own words.** Seven of eight say "warm", "friendly" or "welcoming", and the
  look is described as "warm and friendly … a welcoming headline". Only the food bank ("A gentle, kind page") shares
  none of its words, and it still scores 1.00. A stricter test would be warm requests written without those words.
- **Plain requests were not asked against three looks.** With two, 8d found they sit near a coin toss. With three, the
  "ask" question would offer three choices.
- **The arm cannot build a warm look yet.** What "warm and friendly" looks like (the ground, the corners, the headline)
  is a design question for Richard before any arm code. The stylish look was read param by param from a hero he had
  already seen (OWN-029 G-plumber r4); warm has no such hero.

## 10. s5b — Richard's answers on the calm look (2026-10-29, late)

**Richard, on the page (https://claude.ai/artifact/P7umD3HEoDJrTiv1Q3KQqh):**
1. **The calm spacing:** *"I dunno, I'm shit at this design styling stuff, I haven't got the eye for it."* He left it
   to me. I took **medium (16/24 px)**, the rhythm he picked for the bold look, so the two looks space their words
   alike (10b).
2. **A headline that is only the name:** *"I think saying a bit more is nice."* (10a)
3. **What "warm and friendly" looks like:** *"like if you look up yoga landing pages or buddhist stuff … very pastel
   soft light colours, everything rounded, round soft fonts or calligraphy."* (10c)

### 10a. The name and a bit more (`nameAndMore`)

**The change:** with `factsKept`, the shorten fix asked `It must say "<name>"`, and E2B wrote the name alone 4 of 4
times. With `nameAndMore`, it asks for the name and, with it, a few words about what the place is, never the name
alone. The word limit becomes at least the name's words + 2.

**The control:** w17. The switch changes only the shorten fix's write prompt, which appears only where that fix
fires: m-bakery (t18), m-jazz (t18), m-running (t18) and s-running (t30–31). The other six replay w17 exactly, so the
test is w18 (`runs/w18.edit.json` = w17 + `nameAndMore`) on those four.

**Pre-registered (before any w18 run):**
- all four end with a headline that holds the name and at least one more word;
- each ends at most 2 lines on a desktop, and no run hits the cap;
- no run grows by more than 2 turns, and no run's end findings grow;
- both jazz heroes still say "14 November" somewhere (m-jazz is the one run here).

**Result (`w18*`, `node compare.mjs w17 w18 …`):** ❌ **2 of 4 runs are what Richard asked for. Both running runs fall
into a T 0 loop.**

| run | turns | the shorten rewrite | the end |
|---|---|---|---|
| m-bakery | 22 → 22 | t19: **"Maison Levain: Family Bakery"** (4 words, 2 lines) | the same measures |
| m-jazz | 23 → 23 | t19: **"The Blue Room: Live Jazz"** (5 words, 2 lines); the line keeps "on 14 November" | clean |
| **m-running** | 22 → **40 (the cap)** | t19–t40: **"Park Runners: Saturday Morning Runs"**, word for word, 22 times. Asked for at most 4 words, it wrote 5, which still breaks onto 3 lines | capped, with the shorten, order and "together" fixes still open |
| s-running | 35 → **38** | t32–t34: "Park Runners: Saturday Morning Club" three times, then "Park Runners: Saturday Club" (4 words, 2 lines) | the same 3 kit contrasts |

**Against the pre-registration:**
- ✅ all four headlines hold the name and more;
- ❌ m-running ends on 3 lines, at the cap;
- ❌ s-running grows by 3 turns, against a bar of 2;
- ✅ m-jazz keeps "14 November".

**The defect:** a write fix whose answer is too long is offered again with the very same prompt, and at T 0 the same
prompt gets the same words. It is the menu loop of §5 again, in the words. Before, "It must say <name>" asked for so
little that the first rewrite always fit. The cure that worked for the menu should work here: the next prompt must
differ. That is 10a′.

### 10a′. A rewrite that comes back too long is told so (`writeRepeat`)

**The change:** when the shorten fix is offered again for a headline it has already rewritten, the write prompt adds:
`Your last try, "<words>", is still too long (k lines): use fewer words than that.` The first rewrite's prompt is
unchanged, so every run replays w18 up to its second shorten.

**The control:** w18 on the same four. w19 = w18 + `writeRepeat`.

**Pre-registered (before any w19 run):**
- m-bakery and m-jazz replay w18 exactly: their first rewrite fit, so the new line never appears;
- m-running and s-running take at most one repeat each, and end with the name and more on at most 2 lines;
- against w17, no run grows by more than 2 turns, and no run hits the cap.

**Result (`w19*`):** ✅ on every line.

| run | turns (w17 → w18 → w19) | the headline at the end |
|---|---|---|
| m-bakery | 22 → 22 → 22 (replays w18, 0.0000 drift) | **"Maison Levain: Family Bakery"**, 2 lines |
| m-jazz | 23 → 23 → 23 (replays w18) | **"The Blue Room: Live Jazz"**, 2 lines; the line keeps "on 14 November" |
| m-running | 22 → 40 → **23** | t19 "Park Runners: Saturday Morning Runs" (3 lines), t20 **"Park Runners: Saturday Runs"**, 2 lines |
| s-running | 35 → 38 → **36** | t32 "Park Runners: Saturday Morning Club", t33 **"Park Runners: Saturday Club"**, 2 lines |

The other six requests never reach a shorten fix, so their prompts are the same as w17's and they replay it.

**Kept:** `nameAndMore` and `writeRepeat` join the final harness, `runs/w19.edit.json`. A shortened headline now
says the name and a few words about the place, as Richard asked.

### 10b. The calm look's rhythm (`rhythmCalm`)

**The change:** Richard left the pick to me, so the calm look's words column takes the bold look's rhythm. That is
the same two `only` fixes as 8g: the column's gap is medium (16 px), and the button has 8 px more above it.

**The control:** the five calm runs of the final harness: w19m-bakery, w19m-jazz, w19m-running, and w17m-plumber and
w17m-pottery (which w19 replays exactly). The test is w20 = w19 + `rhythmCalm`.

**Pre-registered (before any w20 run):** as 8g found on the stylish five:
- all five end with 16 px from the headline to the line and 24 px from the line to the button, on a desktop;
- no run grows by more than 3 turns;
- no run ends with a finding its control did not have.

### 10c. What a warm look could be: pictures made, waiting on Richard's eye

**What NodeGX already ships for it** (checked before drawing anything):
- **Two theme presets close to his words:** Soft ("Gentle colors and soft shapes for a calming aesthetic": pale
  lavender `--muted` #f5f3ff, 12–20 px corners, DM Sans) and Playful (Nunito, a rounded face, 16–24 px corners). The
  bakery bench is already on Soft, and puppy and running are on Playful.
- **Fonts, bundled for offline use:** Fredoka (`library/modules/bot-garden-fonts`, Olive's Island's rounded title
  face) and Caveat (a handwriting face in the nightbook kit). A Text takes them as `fontFamily: "Fredoka"`, as the
  templates do (37 and 3 uses).
- **The arm's vocabulary has no font setting.** A warm look needs one, plus a soft-ground option and a bigger corner
  for the photo.

**The pictures (`warm.mjs`, on `-warm` copies of the benches, so no arm run is touched):** the shared treatment is a
12 % wash of the brand colour (`color-mix`), a 40 px photo corner, a pill button in Fredoka, and the medium rhythm.
- bakery (w19m-bakery): `calm` (as built), `rounded` (Fredoka headline), `handwritten` (Caveat headline), `both`
  (Fredoka headline, a small Caveat line above it, in the request's words: "our family bakery in Lyon");
- pottery (w17m-pottery): `calm`, `both`, `softGround`.

**Seen while making them:**
- **A wash of a colourless brand is grey.** Pottery's primary is near-black, so the 12 % wash is a flat grey, not
  warm. `softGround` uses the Soft preset's own pastel instead. A warm look has to bring its own pastel when the
  brand has no colour.
- **Contrast:** the bakery's white-on-amber button is 3.19 in every variant (the kit's, P112-OWN030-PRIMARYCONTRAST).
  On the lavender, pottery's grey line reads 4.41, just under 4.5.
- The small handwritten line's words are mine, taken from each request; the model did not write them.

**For Richard:** https://claude.ai/artifact/P7umD3HEoDJrTiv1Q3KQqh (same link, round two).

**Result (`w20m-*`):** ✅ on every line. As in 8g, each run parts late (t18–t19), takes both fixes, and costs one turn.

| run | turns (control → w20) | words column (desktop): headline → line → button | left at the end |
|---|---|---|---|
| m-bakery | 22 → 23 | 48/48 → **16/24** | the same kit contrast |
| m-jazz | 23 → 24 | → **16/24** | nothing |
| m-plumber | 21 → 22 | → **16/24** | nothing |
| m-running | 23 → 24 | → **16/24** | the same kit contrast |
| m-pottery | 21 → 22 | → **16/24** | nothing |

**Kept:** `rhythmCalm` joins the final harness, `runs/w20.edit.json`. Both looks now space their words alike.
