# OWN-029 — The small agent

**Opened 2026-10-28** (Richard, after OWN-027/028: *"what we're aiming for is something that's essentially agentic, that
can review its own work and do better, taking advantage of the small step and lots of script principle. Help the model
out as much as we can, but give it freedom to not just be a landing page creating machine … go nuts and play, it's a
sandbox."*).
**Status: ✅ s2 done (2026-10-29, Opus): the s1 winners became the defaults; the accept rule was A/B tested in 24 paired runs (the constraint wins on organisation and stays the default); S13, S14 and the two-gate photo scout were added (`own-029/RESULTS.md` §7). s3 is next (`own-029/NEXT-SESSION-PROMPT.md`): the ratchet, an organisation judge without words, then freeze for OWN-030. The MCP step is scoped as `OWN-031-THE-SERVER-ASKS.md`.** s1 (2026-10-28) ran arms A, A2, R, V, L, R4, Q and P. Code `own-029/agent.mjs` + `own-029/lm.mjs`; runs in `own-029/runs/<run>/`
(`ledger.json`, `summary.json`, `r<k>/shots/`). Results in `own-029/RESULTS.md`.
**Model:** Opus writes and runs the harness. Builder: Gemma 4 E2B. Reviewer: Gemma 4 E4B.

## 1. The person sentence

> **A 2B model on a laptop builds a page, looks at what it built, says what is wrong with it, fixes only that, and
> keeps the fix only if the page got better — for a bakery, a running club or a jazz night, not only a puppy page.**

## 2. What OWN-027 left open

- 30 runs, ONE prompt: the harness may be a puppy-page compiler.
- One pass: decide → build → render → stop. Nothing looked at the render and acted on it.
- Every enum answer was sampled and kept; nothing knew which decisions the model was unsure of.

## 3. Probes before building (s1, measured, scripts in the session scratchpad)

| Probe | Result |
|---|---|
| Ollama 0.40.12 `logprobs` + `top_logprobs` on `/api/chat` | ✅ works, **also under a `format` schema**: at the answer token the distribution over the enum is there ("centred" 0.835 / "left" 0.090). One call gives the answer AND its confidence. |
| Gemma vision, pairwise "A or B" on two page screenshots | ❌ **pure position bias**: E2B and E4B answer the SECOND picture every time, in both orders, whole pages and section crops alike. Unusable. |
| Gemma vision, absolute 1–5 score on a section crop (EV over the digit logprobs) | E2B noise (rated r1's man-face hero above final-e2b's). E4B weakly directional (steps 2.07 vs 3.41). A crop is ~130 image tokens: too little to see. |
| Gemma vision, facts on a whole page | directional ("a human face?" r1 0.91 yes, final-e2b 0.22). |
| **Text critic**: the section described in words, one yes/no token, P(yes) | **E4B separates every pair** — headline-fits 0.31 vs 1.00; truncated button 0.09 vs 0.96; "blue pup" copy 0.18 vs 0.99; pizza testimonial on a puppy page 0.01 vs 0.99. E2B weak (0.53 vs 0.89 on fits, misses the button and the colour). LFM3 noisy. |
| E4B "which line is weakest" (letters, one token) | picked the truncated button out of three lines. |

**So:** the reviewer reads WORDS, not pictures. The script turns the render into words; a slightly bigger model answers
yes/no in one token. Small builder, slightly bigger reviewer.

## 4. The design (`own-029/agent.mjs`)

- **Every answer goes through one door** (`lm.mjs`): a cache keyed by a stable signature (section kind + occurrence +
  role), so a repair round REPLAYS every answer except the ones a reviewer invalidated; a reviewer's hint is appended
  to the one question being re-asked; a decision can be FORCED to the model's own second choice (from its logprobs).
- **The script reads what the request already says** (a colour said as a colour, a tone word, the kind) and asks the
  model only the rest. "The Blue Room" is a name, not a colour (the jazz brief is the trap).
- **Freedom beyond landing pages:** 14 section kinds (menu or prices, schedule or line-up, location and hours, sign-up
  or contact form, team …), new bits (form → field questions, date and place, price), item bits (price, time), 0–3
  photos or none ("a wrong photo is worse than no photo"), avatars for testimonial people, a zigzag for photo-beside
  sections.
- **Critics, all cheap:**
  - script over the graph: S1 a photo repeated in a list or 3+ times on the page; S2 words about the styling;
    S3 words naming a builder part; S4 a list headline that reads as item 1; S5 a repeated line; S6 a long button;
    S7 a middle section that is only a headline; S8 three dark bands in a row; V the validator refused a section;
  - render findings mapped back to the section whose words they quote;
  - J the reviewer reads each section in words: "does every line read like something a real organisation would
    publish?" and, for a list, "does the headline cover the whole section?"; when no, "which line is weakest?";
  - P the reviewer reads the page outline: "is something missing?" → which kind; "is a section extra?" → which.
- **Repairs:** reword (one line, with the reason), reask (a section's bits or a list's item bits, with the reason),
  flip (the decision the model was least sure of, to its own second choice), add or drop a section.
- **Accept or revert:** a round is kept only if its weighted issue score beats the best so far; otherwise the best
  round's answers are restored and those fixes are marked tried.

## 5. Briefs

`puppy` (the OWN-027 prompt) · `bakery` · `running` (a sign-up page) · `jazz` (an event; "The Blue Room") · `pottery`
(a portfolio) · `plumber` (a call-back form).

## 6. Results

See `own-029/RESULTS.md`. In one line each:
- the review loop improves every first build (defects per line 0.60 → 0.17);
- the model's decisions beat random on the outline judges (organised 0.66 against 0.50), which the defect count cannot see;
- one copy call per section beats one per line on the same structure (word issues −26%, 72% fewer copy calls);
- learned rules answer 4–7 questions a page.

Results page: https://claude.ai/artifact/W9Qd87RsCHuXqTej2XZuMM
