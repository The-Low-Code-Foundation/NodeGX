# OWN-030 — results (Opus)

The task: `../OWN-030-CODE-OR-NODEGX.md`. The code is `lanes.sh` (the series), `emit.mjs` (the emit lane), `code.mjs`
(code-guided and code-bare), `look.mjs` (the same Chrome checks and shots for every lane) and `gallery.mjs` (the
blind gallery). Runs are in `runs/<lane>-<brief>/`; the graph lane's runs are OWN-029 runs `G-<brief>`.

## 0. Frozen before the first run (2026-10-29)

- **Builder:** Gemma 4 E2B, `gemma4:e2b-it-qat`, digest `07ea59a47401`. **Reviewer:** Gemma 4 E4B, `gemma4:e4b-it-qat`,
  digest `ee6656371218`. Ollama 0.40.12. The same two models in every lane.
- **Graph lane = OWN-029 s3**, the default arm:
  - one copy call per section, the contradiction critic and the v4 outline judges;
  - `--accept constraint --org-on shape --ratchet peak`, 4 repair rounds;
  - `--decisions-from S0-<brief>`, so round 0 has the same structure as OWN-029 s2's K and W runs.
  The harness hash is in each ledger (`harness`). **FROZEN: `22989dd1`** (agent.mjs + lm.mjs + shape.mjs). The smoke run `own-029/runs/smoke-s3-jazz` (2 rounds) ran on it, and `runs/smoke/` holds every lane's tools run once on its page.
- **Smoke findings:** emit renders the graph lane's page almost pixel for pixel (desktop 3554 px tall in both, the same words and the same checks; `checks.json` carries the URL it read, which proves the emit look read the file). The first HTML-lane shots grew the window to the page height; `look.mjs` now captures past a 900 px window for a file, and keeps the resize for the NodeGX viewer, whose root is fixed.
- **Kit:** `cline-dev`, with the MCP `dist` built after the IMAGEGROUNDNOTOP fix (the ledgers stamp `build`).
- **Briefs:** puppy, bakery, running, jazz, pottery, plumber (OWN-029's six, word for word). One seed (7).
- **emit** transpiles the graph lane's KEPT round (`r<best>/tree.json`), so its decisions and words are the graph
  lane's final ones.
- **code-guided** reuses the graph lane's round-0 card and sections (the same answers to the same questions). It
  writes each section itself, then gets the word critics and the reviewer, with up to 4 rewrite rounds. The
  graph-only critics are not available to it: the validator, and S1, S7, S8, S10, S12, S13 and S14, which read the
  graph's structure.
- **code-bare:** one prompt, no loop.

## 1. Predictions (pre-registered 2026-10-29, before any run)

The s0 guesses from the task file, made specific enough to grade:

1. **code-bare is the worst lane on phone and on structure.** Over the six briefs, it has the most phone-width
   overflow and the most broken runs. Richard ranks it last on at least 4 of 6 briefs.
2. **emit lands close to graph on the look.** Richard ranks emit and graph next to each other (adjacent ranks) on at
   least 4 of 6 briefs. Their objective checks differ by no more than one finding per page.
3. **code-guided breaks more often than graph** (unpaired tags, a section with no words, an invented image) on at
   least 2 of 6 briefs, but its words are no worse: its reviewer "sounds real" mean is within 0.1 of graph's.
4. **graph wins the editability probe** (Richard: a different hero colour, and two sections swapped) in fewer minutes
   than the best HTML lane.
5. Added at the freeze: **code-guided costs more output tokens than graph** (it writes markup, the graph lane writes
   only words and one-word answers), and it is slower in wall minutes.

## 2. Per run

The series ran 2026-10-29 08:45–10:15 (`runs/lanes.log`), 48 steps, every one exit 0. `node analyse.mjs` makes these
tables from the ledgers and `look/checks.json`. Graph's cost includes S0's round-0 decision calls it replayed; guided's
includes the card and section calls it reused; emit costs nothing beyond graph.

| brief | lane | min | builder calls | reviewer | tokens in / out | kept round | defects/line | reviewer "sounds real" | broken | blank | phone overflow px | small text | low contrast (d/p) | clipped | broken images |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| puppy | graph | 17.2 | 142 | 76 | 32157 / 6418 | 4 | 0.32 | 0.97 | 0 | 0 | 295 | 0 | 0 / 0 | 0 | 0 |
| puppy | emit | 0 | 0 | 0 | 0 / 0 | — | — | — | — | 0 | 0 | 0 | 0 / 0 | 0 | 0 |
| puppy | guided | 8.1 | 20 | 21 | 13924 / 12937 | 0 | 0.33 | 0.75 | 0 | 0 | 10 | 0 | 2 / 2 | 0 | 10 |
| puppy | bare | 2.2 | 1 | 0 | 39 / 3962 | — | — | — | 0 | 0 | 0 | 0 | 2 / 2 | 0 | 0 |
| bakery | graph | 4.7 | 102 | 79 | 22091 / 3496 | 3 | 0 | 0.98 | 0 | 0 | 0 | 0 | 9 / 9 | 0 | 0 |
| bakery | emit | 0 | 0 | 0 | 0 / 0 | — | — | — | — | 0 | 0 | 0 | 9 / 9 | 0 | 0 |
| bakery | guided | 4.2 | 16 | 18 | 9839 / 6231 | 2 | 0 | 0.98 | 0 | 0 | 0 | 0 | 6 / 6 | 0 | 9 |
| bakery | bare | 1.6 | 1 | 0 | 51 / 2897 | — | — | — | 0 | 0 | 445 | 0 | 1 / 1 | 0 | 0 |
| running | graph | 6.1 | 97 | 94 | 21492 / 4972 | 4 | 0.48 | 0.54 | 0 | 0 | 0 | 0 | 13 / 13 | 0 | 0 |
| running | emit | 0 | 0 | 0 | 0 / 0 | — | — | — | — | 0 | 0 | 0 | 13 / 13 | 0 | 0 |
| running | guided | 5.3 | 19 | 18 | 11979 / 8309 | 1 | 0.19 | 0.67 | 0 | 0 | 0 | 0 | 8 / 8 | 0 | 0 |
| running | bare | 1.2 | 1 | 0 | 43 / 2205 | — | — | — | 0 | 0 | 0 | 0 | 11 / 11 | 0 | 0 |
| jazz | graph | 6 | 114 | 101 | 25817 / 4831 | 3 | 0.36 | 0.97 | 0 | 0 | 0 | 0 | 1 / 1 | 0 | 0 |
| jazz | emit | 0 | 0 | 0 | 0 / 0 | — | — | — | — | 0 | 0 | 0 | 1 / 1 | 0 | 0 |
| jazz | guided | 7.6 | 23 | 21 | 15848 / 11420 | 1 | 0.38 | 0.76 | 0 | 0 | 0 | 0 | 5 / 5 | 0 | 0 |
| jazz | bare | 1.8 | 1 | 0 | 55 / 3201 | — | — | — | 0 | 0 | 0 | 0 | 1 / 1 | 0 | 0 |
| pottery | graph | 3.1 | 69 | 51 | 14123 / 2744 | 1 | 0.03 | 0.98 | 0 | 0 | 0 | 0 | 1 / 1 | 0 | 0 |
| pottery | emit | 0 | 0 | 0 | 0 / 0 | — | — | — | — | 0 | 0 | 0 | 1 / 1 | 0 | 0 |
| pottery | guided | 6.2 | 17 | 18 | 11711 / 9302 | 2 | 0.16 | 0.92 | 0 | 0 | 10 | 0 | 0 / 0 | 0 | 8 |
| pottery | bare | 1.9 | 1 | 0 | 45 / 3241 | — | — | — | 0 | 0 | 37 | 0 | 3 / 3 | 0 | 0 |
| plumber | graph | 4.1 | 72 | 75 | 13338 / 2532 | 4 | 0.11 | 0.98 | 0 | 0 | 402 | 0 | 0 / 0 | 0 | 0 |
| plumber | emit | 0 | 0 | 0 | 0 / 0 | — | — | — | — | 0 | 0 | 0 | 0 / 0 | 0 | 0 |
| plumber | guided | 5.2 | 17 | 18 | 10035 / 8293 | 2 | 0.1 | 0.82 | 0 | 0 | 35 | 0 | 0 / 0 | 0 | 0 |
| plumber | bare | 1.1 | 1 | 0 | 45 / 2069 | — | — | — | 0 | 0 | 0 | 0 | 0 / 0 | 0 | 0 |

## 3. Per lane

| lane | min | builder calls | tokens out | "sounds real" | runs broken | runs with phone overflow | runs with low contrast | runs with broken images |
|---|---|---|---|---|---|---|---|---|
| graph | 5.3 | 100 | 4164 | 0.97 | 0 | 2 | 4 | 0 |
| emit | 0 | 0 | 0 | — | 0 | 0 | 4 | 0 |
| guided | 5.8 | 18 | 8806 | 0.79 | 0 | 3 | 4 | 3 |
| bare | 1.7 | 1 | 3049 | — | 0 | 2 | 5 | 0 |

What the numbers say, and what they cannot see:

- **No lane broke the way prediction 3 feared.** No unpaired tags, no blank page, no section without words in any
  lane. code-guided's breakage is quieter:
  - **broken images** on 3 of 6: it wrote `noddl_modules/` for `noodl_modules/` (puppy, bakery, pottery);
  - **placeholders** left in the words ("[Insert Start Time Here]", jazz);
  - **a squeezed column** (jazz: the line-up runs one or two words to a line down the middle of the page).
  The look checks see the images and **miss the other two**: no check reads a column's width against its words, and
  no check reads brackets. The reviewer half-sees them: guided's "sounds real" median is 0.79 against graph's 0.97.
- **emit is not a faithful copy of the runtime on one point.** The graph lane overflows the phone on puppy (295 px)
  and plumber (402 px); emit, from the same tree, does not. The overflow is a sentence in a `badge` pill: the runtime's
  content-sized Text never wraps, emit's `width:auto` does. Filed as `P112-OWN030-PILLSENTENCE` (kit). For the
  comparison, emit is the more forgiving of the two on this one shape.
- **The low-contrast counts are the kit's, not the lanes'.** Graph and emit share the token sheet and match exactly
  (running 13/13, bakery 9/9). The harness sets `--primary` to the 600 of the hue; green-600 and amber-600 are 3.30 and
  3.19 against white. Nothing in the kit checks the pair. Filed as `P112-OWN030-PRIMARYCONTRAST` (kit). guided inherits
  the same sheet, so it shows the same pattern; bare chose its own colours and fails on running (11) the same way.
- **Cost.** graph: median 100 builder calls and 4,164 output tokens, 5.3 min. guided: 18 calls but 8,806 output tokens
  (it writes markup), 5.8 min. bare: one call, ~3,000 tokens, under 2 min. Prediction 5 holds on tokens (6/6 briefs)
  and on minutes only for the median (guided slower on 3 of 6).
- **What the eye sees first (Opus, before the ranking, not a grade).** bare is far better than predicted: on jazz it
  is a coherent dark page with prices and a line-up. That is what the blind ranking is for.

**OWN-029 s3 in these runs (the graph lane is s3's validation).** S13's exclude repair fired on bakery (the gallery and
the call to action both repeated the feature cards' items); bakery reached 0 defects/line at round 3. S14from/S14list
never fired: no page said "from $X" against a list. The shape-judge floor let running keep rounds 3 and 4 with the
words judge's "organised" at 0.15 (shape 0.915): the floor reads the outline, as designed. **The peak ratchet never
bound:** every revert in the six runs was on defects per line (e.g. puppy r2/r3 at 0.54/0.51 against 0.43), and every
kept round's shape was within 0.1 of the peak (the closest: jazz r3, 0.837 against 0.902, and bakery r1, 0.815 against
0.896). It is a guard that this series did not test.

## 4. Richard's ranking (blind), then the lanes revealed

The gallery: https://claude.ai/artifact/GrLH8ZBCXAHCkBaEtgC9Wy (seed 30, key in `runs/blind-key.json`; ranks in the
page's db as `rankings/<brief>`). Richard ranked three briefs and stopped: "I can already guess at what I'm seeing". The
order was the same on all three, so three is enough for the order (not for a rate).

| brief | graph | emit | code-bare | code-guided |
|---|---|---|---|---|
| puppy | 2 | 1 | 3 | 4 |
| bakery | 1 | 2 | 3 | 4 |
| running | 1 | 2 | 3 | 4 |

His words, blind (from the db, `why`, and in chat after):
- graph and emit: "two in each that are identical. Either that's a bug, or…" — "I can't see a difference" (bakery). On
  puppy he split them: "D fucked up the responsive mobile version, it's a squeezed desktop view, vs the other NodeGX one
  where the responsive looked good". D was graph; the squeeze is `P112-OWN030-PILLSENTENCE` (one 685 px pill makes the
  phone lay the whole page out wide), which emit does not reproduce.
- code-bare: "a nice clean one but that looks like an early Geocities template from the early 2000s"; "the cleanest in
  terms of styling, spacing etc but it missed the initial prompt of a 'modern' looking site, this looks like an early
  Wordpress template" (puppy); "very clean and well styled and spaced, but too simple to satisfy the prompt" (bakery);
  "laughably simple" (running).
- code-guided: "mostly just a shitty mess"; "A is shit" (bakery); "D is a mess" (running).
- His guess at the key was half right: he took the mess for the one-shot. It was the guided lane, the harness with the
  model writing the markup.

The form cut "why" at 300 characters (`gallery.mjs`, `.slice(0, 300)`); the puppy note was cut there and he gave the rest
in chat.

## 5. The predictions, graded

1. **code-bare worst: WRONG.** It was third on 3/3. code-guided was last on 3/3. Its phone overflow (2/6) equals graph's.
2. **emit adjacent to graph: RIGHT,** 3/3, and their checks differ only by the pill overflow (graph's runtime).
3. **code-guided breaks more, words no worse: HALF.** It broke quietly (broken images 3/6, placeholders, a squeezed
   column); its reviewer "sounds real" median is 0.79 against graph's 0.97, outside the 0.1.
4. **graph wins the editability probe: NOT RUN.** Richard moved on to OWN-032.
5. **code-guided costs more output tokens: RIGHT** (6/6, median 8,806 against 4,164); slower in minutes only at the
   median (3/6).

## 6. Does NodeGX help a small model build a page, and what does it cost?

Yes, and the lanes say where the help is. The harness made the small model better **only while the model did not write
markup**. Give the same model the same questions and the same critics, but let it write each section's HTML (guided),
and it does worse than one unguided prompt (bare): last on every brief, at twice graph's output tokens. With the same
answers turned into HTML by a script (emit), the page is as good as graph's. So the quality is in the answers plus the
kit's compositions, and the model's job is to choose, not to lay out. NodeGX is the medium that makes "choose" possible:
its compositions and tokens are the vocabulary the questions are asked in. What the runtime adds on top is the editable
app (prediction 4, untested) and, today, one defect emit does not have (the pill).

The cost: about 100 small calls and 5 minutes on a laptop per page, against one call and 2 minutes for a page that is
tidy, dated and thin.

Richard's reading (2026-10-29): "building harnesses and using script and restricting output from small models can get
output that's near the output of a frontier Chinese model at maybe 100B parameters, at 2B". **This series did not run a
large model, so it cannot grade that claim.** The lane that would: the same six briefs one-shot by a ~100B open model
(GLM / Qwen / Mistral Large), into the same gallery.

Next: OWN-032 (`../OWN-032-THE-WORKBENCH.md`), Richard's: one hero, built step by step, every prompt and every look
visible and editable.
