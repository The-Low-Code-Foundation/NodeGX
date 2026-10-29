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

_After the series._

## 3. Per lane

_After the series._

## 4. Richard's ranking (blind), then the lanes revealed

_After the gallery._

## 5. The predictions, graded

_After the ranking._

## 6. Does NodeGX help a small model build a page, and what does it cost?

_After the ranking._
