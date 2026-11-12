# OWN-027: the next session

Read `../OWN-027-THE-QUESTION-TREE.md` (status line), `TABLE.md`, then `runs/T/ab-listrows/` (the leanest run) and
`runs/T/ab-copye4b/` (the best copy). Check `git status` and peers before any Ollama + Chrome drive: it is the one
heavy job on the box.

## Where it stands (2026-10-28, s1, Opus)

- **Arm C (Opus by hand):** credible in ~3 min. Its one miss is the same dog photo four times.
- **Arm T v1 (the model draws each section as a node tree):** three prompt tunings took E2B from "a man's face
  everywhere" to "tidy, not designed", with 9 script repairs. It is done; don't tune it further.
- **Arm T v2 (Richard's ruling):** "for the hero section, what bits are needed", picked from a list, then one
  decision per sub-call (centred or left; photo beside, above or below; how many items; which bits per item; grid
  or one column; the first item's look), one copy call per text, and the script makes one node per bit and
  assembles. **0 repairs on E2B, E4B and LFM3; prompts ≤372 tokens; E2B 1.8–3.8 min.** The rules are V1–V11 in
  `questions.md`.
- **A/B on v2 (E2B deciding):**
  - vote ×3 on decisions: no better;
  - E4B writing the words (`--copy-model`): best copy, +0.9 min;
  - a list's words in one call (`--list-copy`): steps in sequence;
  - title + sentence as rows (`--list-rows`): title and sentence agree, 1.8 min / 74 calls, the leanest run.
- **Models:** E4B follows prose E2B ignores but is 2–3× slower. LFM3 1.7B is the fastest and decides as well as
  E2B, but its copy is literal ("a lively blue pup").

## Next, in order

1. **Done in s1:** the final harness (v2 + list rows + the display-name fix + R6b) ran on E2B, E4B, LFM3 and
   E2B+E4B (`runs/T/final-*`); all four are in Richard's gallery page beside arm C. The bugs are scoped as
   **OWN-028** (`../OWN-028-THE-GATES-A-SMALL-MODEL-FOUND.md`), which is its own session.
2. **Give the section's own headline the list's shape:** in ab-listrows a "how it works" headline read "Step 1: Fill
   out our adoption form", because its copy call doesn't know a list of steps follows. Idea: the bits answer goes
   into the headline's role ("the headline of a section that then lists 3 steps").
3. **Show Richard** `runs/C/shots/` beside `runs/T/ab-listrows/shots/` and `runs/T/ab-copye4b/shots/`. His eye
   decides credible (§6).
4. **Arm B** (bare Gemma 4 E2B in Cline over the MCP): §7.8 says run it if T lands. T is close (Opus's read: the
   gap is the one-dog imagery and copy slips), so ask Richard.
5. **Ideas not tried yet:**
   - vision as a fact gate. Gemma 4 E2B told dogs from faces correctly on two screenshots, but called both
     credible, so it can check facts, not judge taste;
   - LFM3 deciding with E4B writing;
   - a "photo budget" (at most two photo bits a page; testimonial portraits from `avatar-*.webp`).

## Rulings waiting on Richard

- `P112-OWN027-ONEDOG`: more dogs in the starter imagery, or say "one photo per subject".
- `P112-OWN027-GLYPHSAMPLE`: give the 36 sample glyphs by use, not alphabetically.

## The product fixes the run argues for (open bugs)

These help every model, Cline and Vibe included:
- `P112-OWN027-NOSHELLGATE`
- `P112-OWN027-MANYHEADLINES`
- `P112-OWN027-IMAGEGROUNDSPILL`
- `P112-OWN027-WARNBLOCKS`

The harness enforces four of them as script rules, which shows each gate is cheap.

## Harness facts worth keeping

- **Ollama's `format` schema constrains the output but is never shown to the model.** An enum's options must be in
  the words, or a small model picks blind (r1: a man's face for a puppy page).
- **E4B pretty-prints JSON:** give structured answers room (`num_predict` 900, H1).
- **Ollama 0.40.11 can't pull `lfm3`.** It needs 0.40.12+ (Richard updated it mid-session, which killed r4 /
  e4b-r2).
