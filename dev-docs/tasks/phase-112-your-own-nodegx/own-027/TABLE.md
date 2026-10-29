# OWN-027: the table across arms

**2026-10-28.** Same prompt for every run: *"Make me a puppy adoption landing page please, blue colour theme, modern
style."* Each run starts from a fresh project from `create_project`. Arm C is Opus by hand through the normal MCP
door. Every arm-T run is `harness.mjs`, an MCP stdio client against `bin/noodl-mcp.js` driven by a local model
through Ollama, with Opus not touching the page. Ledgers and screenshots are in `runs/<arm>/<run>/`. The questions,
verbatim, are in `questions.md`.

Richard widened the run during the session (2026-10-28):
- **E4B:** "I'd like to try E4B".
- **LFM3-1.7B:** "add Liquid LFM3-1.7B".
- **v2:** "it should be 'for the hero section, what bits are needed' … then split that into as many sub-calls as it
  takes … and then put them together".
- **A/B freedom:** "AB test stuff and go off the reservation".

## All runs

**Harness:** v1 asks the model to draw each section as a node tree; v2 asks it to pick bits from a list, then make
small decisions.
**Defaults:** script repairs.
**Val.:** validator errors / warnings.
**Max prompt:** the largest prompt in tokens (budget 600).
**Findings:** render_report warnings and observations.
**Phone ovf.:** elements wider than 390 px.

| Run | Model | Harness | Min | Calls | Rule-answered | Defaults | Val. | Max prompt | Unparsed | Nodes | Findings | Phone ovf. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **C** | Opus 5.5 | by hand | ~3 | 14 MCP calls | n/a | n/a | 0 / 1 (fixed) | n/a | n/a | 64 | 0 | no |
| r1 | E2B | v1 untuned | 2.4 | 73 | 27 | 3 | 0 / 1 | 543 | 0 | 39 | 4 | **yes** |
| r2 | E2B | v1 tuning 1 | 2.9 | 99 | 22 | 1 | 0 / 0 | 555 | 0 | 42 | 4 | **yes** |
| r3 | E2B | v1 tuning 2 | 2.8 | 98 | 55 | 1 | 0 / 2 | 582 | 0 | 49 | 5 | **yes** |
| e4b-r1 | E4B | v1 tuning 2 | 8.1 | 87 | 38 | 3 | 0 / 0 | 615 | 3 | 40 | 2 | no |
| t3-e2b | E2B | v1 tuning 3 | 5.2 | 85 | 47 | 9 | 0 / 1 | 600 | 0 | 41 | 0 | no |
| t3-e4b | E4B | v1 tuning 3 | 13.1 | 97 | 44 | 7 | 0 / 1 | 653 | 0 | 43 | 1 | no |
| t3-lfm3 | LFM3 1.7B | v1 tuning 3 | 3.5 | 58 | 28 | 12 | 0 / 0 | 762 | 0 | 23 | 3 | no |
| v2b-e2b | E2B | **v2** | 2.8 | 97 | 125 | **0** | 0 / 0 | 369 | 0 | 99 | 1 | no |
| v2b-e4b | E4B | v2 | 6.1 | 122 | 168 | 0 | 0 / 1 | 369 | 0 | 128 | 2 | no |
| v2b-lfm3 | LFM3 1.7B | v2 | 2.1 | 91 | 116 | 0 | 0 / 6 | 372 | 0 | 92 | 2 | no |
| ab-base | E2B | v2 + V10/V11 | 3.8 | 112 | 171 | 0 | 0 / 0 | 369 | 0 | 132 | 0 | no |
| ab-vote3 | E2B | + vote ×3 on decisions | 3.2 | 166 | 117 | 0 | 0 / 1 | 369 | 0 | 93 | 3 | no |
| ab-copye4b | E2B decides, E4B writes | + router | 4.7 | 87 | 121 | 0 | 0 / 0 | 369 | 0 | 96 | 1 | no |
| ab-listcopy | E2B | + a list's words in one call per bit | **1.9** | 82 | 155 | 0 | 0 / 0 | 369 | 0 | 108 | 1 | no |
| ab-listcopy-copye4b | E2B + E4B | + router + list copy | 3.3 | 77 | 113 | 0 | 0 / 0 | 369 | 0 | 85 | 0 | no |
| **ab-listrows** | **E2B** | + a list's words as rows (title + sentence per item), one call | **1.8** | **74** | 103 | 0 | 0 / 1 | 369 | 0 | 86 | 2 | no |
| ab-listrows-lfm3 | LFM3 1.7B | + list rows | 1.8 | 89 | 117 | 0 | 0 / 7 | 372 | 0 | 92 | 2 | no |
| **final-e2b** | **E2B** | **final: v2 + V9–V11 + list rows + display-name fix** | **1.8** | 86 | | 0 | 0 / 0 | 369 | 0 | 102 | 0 | no |
| final-e4b | E4B | final + R6b | 6.0 | 97 | | 0 | 0 / 0 | 369 | 0 | 127 | 4 | no |
| final-lfm3 | LFM3 1.7B | final | 1.7 | 93 | | 0 | 0 / 6 | 372 | 0 | 94 | 1 | no |
| **final-e2b-e4b** | **E2B decides, E4B writes** | final | **2.6** | 63 | | 0 | 0 / 0 | 369 | 0 | 65 | 0 | no |

**The final four ("best effort") are side by side, with arm C and r1, in the gallery page Richard has
(claude.ai artifact "Puppy page line-up", 2026-10-28).** The first final-e4b drew its card titles white on white:
harness rule R6 (light text on a dark band) did not stop at a light card. That was a harness defect, fixed as R6b, and
E4B was re-run. The first run is kept as `runs/T/final-e4b-whiteonwhite/`. Rule-answered counts are left blank for
the final runs; their ledgers hold them under `skipped`.

`r4` and `e4b-r2` died when Ollama was updated mid-run; their crash ledgers are kept as `runs/T/*-crashed-ollama-restart/`.
The `v2-*` runs wrote nothing (two harness defects, fixed as V9 and the page-skip rule); their ledgers are kept.

**grade-url (`own-023/grade-url.mjs`)** was run on C and on ab-copye4b, the best arm-T page by Opus's read. Both:
1 route, nothing scrolls sideways at 390 px, and the only console error is the dev server's `favicon.ico` 404, not the
app.

## What the table says

1. **Small models make decisions reliably, and drawing a structure was the weak point.** v1 asked the model to draw
   each section as a node tree. Three prompt tunings moved E2B from "a man's face everywhere" to "tidy but not
   designed", and needed 9 script repairs to get there. v2 asks only "which bits", then one decision per follow-up.
   It needs 0 repairs on all three models, its largest prompt is 369 tokens (v1's was 543–762), and the pages have
   a split hero, card grids, numbered steps and a CTA band.
2. **Voting on decisions doesn't help.** 15 of 39 decisions changed under a 3-way vote, and the page didn't improve:
   the decisions were already fine.
3. **The words are where size pays.** With E2B deciding and E4B writing, the page has the fewest copy slips of any
   arm-T run, for +0.9 min. Writing a list's words in one call (`--list-copy`) gets E2B alone most of the way there
   in 1.9 minutes. Steps then read in sequence, though a title and its sentence can still disagree. **`--list-rows`
   fixes that** (title + sentence per item, one call per list). It is the leanest run, at 1.8 min and 74 calls, and
   every step's title and sentence agree ("Meet Your Match / Browse our adorable pups…"). Its remaining slips: a
   section headline that doesn't know it heads a step list, and a placeholder that echoed the node's type id
   (`net.noodl.controls.textinput`) from the copy prompt. The prompt now uses the display name, but no run has
   used the fixed prompt yet.
4. **E4B follows prose that E2B ignores** ("a band always holds exactly one shell": 5/7 sections against 0/7). Under
   v2 that matters less, because the script holds the rule. E4B is 2–3× slower everywhere.
5. **LFM3 1.7B is the fastest** (2.1 min under v2) and decides structure as well as E2B, but its copy takes the brief
   literally ("Adopt our Blue Puppy Pals!", "a lively blue pup") and it picks six bits for every section.
6. **What no gate catches.** Five misses passed every gate: a band with no shell, five display headlines, an
   `imageGround` band spilling over the one above, a staging refusal labelled WARN, and one dog photo for a puppy
   page. All five are filed (below). The harness enforces four of them as script rules, which shows each gate is
   cheap.

## The credible checklist, side by side

**ab-copye4b** is E2B with E4B writing. **ab-listcopy** is E2B alone.

| Item | C (Opus) | v2b-e2b | ab-copye4b | ab-listcopy |
|---|---|---|---|---|
| The headline says what the page is for | ✅ | ✅ "Find Your Best Friend. Adopt a Puppy Today." | ✅ "Find Your Forever Best Friend" | ✅ "Find your perfect furry friend at Pawsitive Pals" |
| One palette, one type pairing | ✅ | ✅ | ✅ | ✅ |
| A sensible section order | ✅ | ✅ | ✅ | ✅ |
| A call to action that reads as one | ✅ | ✅ | ✅ | ✅ (one step button label truncated) |
| Nothing overflows at 390 px | ✅ | ✅ | ✅ | ✅ |
| No console errors | ✅ | ✅ | ✅ | ✅ |
| My name on it as a first draft? | ✅ | ⚠️ the same dog ×5, copy slips | ⚠️ the same dog ×8, otherwise yes | ⚠️ the same dog ×8, a title and sentence disagree |

**Richard's eye decides.** Opus's read: the gap between arm C and the best arm-T page is now the one-dog imagery and a
few copy slips, not structure. With a second and third dog in the starter imagery, ab-copye4b would be a page I'd
show as a first draft.

## Defects filed (`dev-docs/bugs/`)

| Id | What |
|---|---|
| P112-OWN027-ONEDOG | the starter imagery has one dog, so a puppy page repeats it (needs-ruling) |
| P112-OWN027-NOSHELLGATE | a band with no shell runs text to the window edge, and no gate says so |
| P112-OWN027-MANYHEADLINES | five display headlines pass every gate, though the vocabulary says one |
| P112-OWN027-GLYPHSAMPLE | a client picking from a list only gets the icons a–c (needs-ruling) |
| P112-OWN027-WARNBLOCKS | a staging refusal labels its only reason WARN |
| P112-OWN027-IMAGEGROUNDSPILL | an imageGround band with more than a headline spills over the band above |

## Partnerships (Richard: "an LFM3 Gemma 4 partnership would likely work well?", 2026-10-28)

**Router v2:** the second model writes EVERY free-text answer: the copy, the list rows, and the brief card's audience,
action and name. It does not write the section purposes, which stay with the decider in stage 1. All three runs met
the same MCP build (`dist` 2026-10-27 22:19).

| Run | Decides | Writes | Min | Calls (decider / writer) | Defaults | Val. | Nodes | Read |
|---|---|---|---|---|---|---|---|---|
| duo-lfm3-e4b | LFM3 | E4B | 3.1 | 46 / 34 | 0 | 0 / 3 | 71 | the "blue pup" copy is gone, the look isn't |
| duo-lfm3-e2b | LFM3 | E2B | 3.2 | 45 / 39 | 0 | 0 / 4 | 72 | the same |
| duo-e2b-e4b | E2B | E4B | 3.9 | 47 / 20 | 0 | 0 / 1 | 79 | the cleanest page of the day |

**What it says:** LFM3's striking look is its decisions, not its words. It makes 4–5 of 7 bands dark gradients
(Gemma: 1–2), uses about 6 bits a section (Gemma: about 4), and chose a serif body in all three runs. A writing
partner fixes the words it is handed. It cannot fix the decisions, and it can't fix words the decider wrote upstream:
"Pet Friendly Design … our modern design and blue hues" came from LFM3's own stage-1 section purpose. Next ideas:
route the stage-1 purposes to the writer too, and try a three-way split (Gemma picks the bits, LFM3 picks the grounds,
E4B writes).
