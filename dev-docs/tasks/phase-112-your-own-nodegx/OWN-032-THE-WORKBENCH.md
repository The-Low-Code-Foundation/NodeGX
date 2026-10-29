# OWN-032 — The workbench: one hero, step by step, with the model's brain open

**Opened 2026-10-29** (Opus, end of OWN-030, at Richard's ask). **Status: ⬜ scoped, not started.**
**Model:** Opus runs the session. The builder is Gemma 4 E2B and the reviewer Gemma 4 E4B, the same digests as
OWN-030 §0 (`07ea59a47401`, `ee6656371218`), Ollama 0.40.12.

## 1. The person sentence

Richard, 2026-10-29:

> I want to see step by step one run end to end with the harness, each input and each output to the model, what the
> script does, etc. to create one part of one of the websites, like the hero section for example. I want to see how the
> model is presented the choices and how it reacts. I feel like what it's doing is a bit like a human who's learning
> NodeGX: I want a hero section, so I'll add a group. I need to put two groups inside that group, horizontally arranged
> with internal padding in the parent group, left group will contain hero text, right group hero image. […] have a look
> and see how the spacing is, oh no they're stuck together I need to add inter spacing to the parent group, that's
> better, oh no in responsive mode the text is stuck to the left and right of the screen, I'll add left and right
> spacing, that's better, etc.
>
> That sounds like a turn by turn discourse the small model could be having with itself, interspersed with E4B image
> recognition taking screenshots of the 'workbench' view of the individual element it's creating and reflecting on
> changes. […] Can we make like a timeline viewer thing where I can see that discourse and each screenshot taken by the
> model that it reviews, with the ability to modify and inject stuff into the prompt to see what difference it makes? Or
> the script? A way that I can like tweak and poke at the model's brain like a surgeon, trying to get it to produce like
> one perfectly styled and aligned hero section, to prove that at a small scale it can be done, to then go on and prove
> that multiple small scale successes can be stitched into a large successful page?

The test of done: **Richard opens a timeline of one hero being built, reads every prompt and answer and sees every
picture the model saw, edits one step, re-runs from there, and ends with a hero he calls perfectly styled and aligned
at desktop and phone, built by the 2B model.**

## 2. Where this starts (what OWN-027/029/030 established)

| Fact | Where |
|---|---|
| In today's harness **the model never places a node.** It answers small questions (card, sections, the look of each section, the words) with the options listed in the prompt; the script builds each section from the kit's compositions. That is why it works: OWN-030's guided lane, where the model wrote the markup itself, came last on 3/3 briefs. | `own-029/agent.mjs`; `own-030/RESULTS.md` §4–§6 |
| Richard's picture (add a group, set its padding, look, fix the spacing) is **a different arm: the model at node level.** OWN-027 v1 gave a small model the whole MCP surface and it failed. This task sits in between: node-level actions, but **one action per turn from a short closed menu**, with the script owning validity. | `own-027/` v1 results |
| Every model call is already in the ledger: `calls[]` holds `key, sig, section, user` (the full prompt), `answer`, `tokensIn/Out`, `ms`; `judgements[]` the reviewer's. **A viewer over existing runs needs no new logging.** | `own-029/runs/G-*/ledger.json` |
| `lm.mjs` caches answers by prompt and replays them (`--decisions-from`), so **re-running from step k after an edit is free up to k.** | `own-029/lm.mjs` (`ask`, the replay cache) |
| `lm.judge(key, user, tag, images)` already sends pictures to the reviewer. | `own-029/lm.mjs:128` |
| 🔴 **E4B cannot judge taste from a picture**: in a pairwise A/B it picks the second picture every time, both orders; a 1–5 score of a crop is noise for E2B and weakly directional for E4B. **It can answer a fact about a picture**: "does this photo show a dog" 0.98, cat 0.01. So the look step must be **one yes/no fact question per check** ("are the headline and the line under it touching?"), never "is this good?". | `own-029/RESULTS.md` §1; `own-027/NEXT-SESSION-PROMPT.md` |
| A script can measure the same facts from the rendered page (gaps, edge distance, overflow, contrast, text size): `own-030/look.mjs` `CHECKS`. These are the ground truth the vision answers are graded against. | `own-030/look.mjs` |
| **The Workbench** is the editor's view of one component mounted on its own, on sample values (`views/VisualCanvas/`, `ComponentBench`). It is the right name for "the view of the element alone". The headless route may be simpler: a page holding only the hero, rendered with `withRenderedPage` from `scripts/devtools/render-report.js` at 1280 and 390. Choose in s0. | memory `two-surfaces-are-called-the-bench` |
| Known kit defects a hero can hit: `P112-OWN030-PILLSENTENCE` (a long pill makes the phone draw the whole page wide), `P112-OWN030-PRIMARYCONTRAST` (green/amber 600 under white fails). Fix or avoid them before judging the model. | `dev-docs/bugs/` |

## 3. What to build

### 3a. The timeline viewer (read only, first, on a run that already exists)

A local page that shows one section's build as a vertical timeline. For each step:
- **who acted:** builder, reviewer or script;
- **the full prompt** as the model got it, with the options and, where Ollama gave them, the probability of each
  option (logprobs);
- **the answer;**
- **what the script did with it:** nodes made or changed, params set, the composition used;
- **the critics' findings and the repair chosen;**
- **the picture**, desktop and phone, of the section after the step, and any picture the reviewer was shown, with
  its question and its yes-probability.

Do this first on the hero of `G-puppy` (OWN-030), so Richard sees today's discourse, which is question and answer,
not building, before anything new is built. Per-round section shots need a re-render of each `r<k>/tree.json`
(`own-030/emit.mjs` or the project at that round).

### 3b. The workbench arm (new): the model builds one hero, one action at a time

- **The goal is given in words**, from the card, e.g. "a hero for Puppy Haven: headline, one line under it, a button,
  a photo on the right".
- **Each turn the builder sees:**
  - the goal;
  - the current tree as an outline (the `shape.mjs` style: kind, role and the params that matter, no ids);
  - the last look's findings, in words;
  - **a menu of at most ~8 actions**, numbered, with the options spelt out.
- **It answers with one action**, through the format schema, as `lm.mjs` does now.
- **The menu:**
  - `add <Group|Text|Image|Button> inside <node>`;
  - `set <param> of <node> to <option>`, where params and options are closed lists of tokens: direction, gap,
    padding (sides), align, text size, sizeMode, maxWidth, colour token;
  - `write the text of <node>`, the only free words;
  - `undo`;
  - `done`.

  The script rejects nothing silently: an illegal pick is shown back as a finding.
- **After each action the script renders the hero alone** at 1280 and 390, measures the facts, and asks the reviewer
  **one fact question per check** with the picture (e.g. "Is any text touching the left or right edge of the
  phone screen?"). The findings go into the next turn's prompt.
- **A turn cap** (start at 30), then stop.
- **The bar:** the hero the composition path makes for the same card (`imageGround` / the split hero) is the target
  look. The question is whether the model can get there by itself, and in how many turns.

### 3c. Surgery: edit and re-run from any step

- On any step, Richard can:
  - **edit the prompt text** (the menu wording, an injected hint, the findings' wording);
  - **edit a script rule** (a check's threshold, the menu's options);
  - **override the answer** ("what if it had picked padding-24 here").

  Then he re-runs from that step. Steps before it replay from the cache; the run forks.
- **Forks sit side by side on the timeline** as branches, with their end pictures, so "what difference it makes" is
  one look.
- **Every edit is saved with the fork** (the diff and the step it applies at), so an intervention that works can
  become a harness change with its evidence.

### 3d. Where it runs

A small **local** web app in `own-032/`: a node server beside the page, because it drives Ollama and Chrome and an
artifact page cannot reach either. A finished run can be exported as a static timeline (HTML plus the pictures) and
published as an artifact for sharing. That is a copy, not the tool.

## 4. Build order

1. **s0 probes**, before any UI:
   - **Fact vision.** Take 6–10 hero renders where the script's measure knows the answer. Ask E4B (and E2B) the fact
     questions with the picture: touching texts, text at the screen edge, a photo cut off, the button wider than its
     words, two things not lined up. **Report the separation, as OWN-029 §1 did.** Any question that does not
     separate is answered by the script's measure in words instead, and the timeline says which source answered.
   - **Render one hero alone,** at both widths, and time it. A turn needs to stay under ~10 s, or 30 turns stops
     being something Richard can watch.
   - **The tree outline:** E2B reads it back correctly, e.g. "which node holds the headline?".
2. **3a, the viewer on `G-puppy`'s hero.** Show Richard. He may change what the timeline shows before anything else
   is built.
3. **3b, the arm,** one goal (puppy), one seed. Run it, show the timeline.
4. **3c, surgery.** Richard pokes; Opus records each fork and what it changed.
5. **AC5 run:** the best version of the harness (prompt plus script, after the surgery) on three heroes it was not
   tuned on (bakery, jazz, plumber).
6. Only if 5 holds: **stitching** goes into its own task file (OWN-033), not this one.

## 5. Pre-register before step 3 (write them into `own-032/RESULTS.md` §1 before the first arm run)

Two guesses to make specific:
- **Unaided, the 2B model at node level does not reach the composition hero in 30 turns.** It gets the structure
  but loops on spacing.
- **Fact-question vision separates "touching" and "at the edge"** (yes-probability gap above 0.5) **and fails "lined
  up".**

## 6. Acceptance criteria

1. **The viewer** shows every model call of a run in order, with:
   - the full prompt, options and probabilities, and the answer;
   - what the script did;
   - every picture the reviewer saw, with its question and answer.

   Richard reads one run end to end in it.
2. **The arm** builds a hero turn by turn with a closed menu; every turn's two pictures are in the timeline.
3. **Surgery:** an edit at step k re-runs from k, with steps before k replayed, not re-asked (the ledger shows
   replays), and the fork shows beside the original.
4. **One hero, built by E2B, that Richard calls "perfectly styled and aligned" at desktop and phone.** Its script
   checks are clean: no overflow, no text at an edge, no touching texts, contrast passing.
5. **The same harness, unchanged, on three other heroes:** Richard ranks each against its composition hero (blind,
   the OWN-030 gallery pattern). The claim "it can be done at a small scale" holds if at least 2 of 3 are as good or
   better.
6. Every kit defect met is filed in `dev-docs/bugs/` (`kit:`), and the vision probe's results are in `RESULTS.md`
   whether they pass or not.

## 7. Out of scope

- Stitching heroes into pages: OWN-033, after AC5.
- Moving any of this into the MCP: OWN-031.
- A large-model comparison lane: Richard's reading that this is "near … a frontier Chinese model at maybe 100B, at
  2B" was not measured by OWN-030. It is worth a lane of its own (six briefs one-shot by a ~100B open model into the
  OWN-030 gallery), but not here.

## 8. Box discipline

One heavy job: Ollama plus one Chrome. Unload the models when stopping (`keep_alive: 0`, as `own-030/lanes.sh` does).
Chrome needs the sandbox off from Claude's shell. The OWN-030 traps apply: `look.mjs` captures an HTML file past the
window and resizes the window for the NodeGX viewer; zsh does not word-split `${@:-a b c}`.

## 9. Links

`own-029/` (the harness, `lm.mjs`, `shape.mjs`), `own-030/` (`look.mjs`, `emit.mjs`, the gallery pattern,
`RESULTS.md` §4–§6), OWN-031 (the server asks), the memory note `own-030-code-or-nodegx`.
