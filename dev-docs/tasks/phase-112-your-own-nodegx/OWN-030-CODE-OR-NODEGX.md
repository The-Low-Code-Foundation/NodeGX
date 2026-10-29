# OWN-030 — Code or NodeGX

**Opened 2026-10-28** (Richard, after OWN-029 s1: *"it'd be worth adding a third lane to the experiments where we
compare the small models building using our harness in pure code vs being forced to use NodeGX, just out of
curiosity"*; then *"yes to OWN 030 and the code lanes, love it"*).
**Status: ⬜ scoped 2026-10-28.** Code goes in `own-030/`, runs in `own-030/runs/<lane>-<brief>/`, and results in
`own-030/RESULTS.md`.
**Model:** Opus writes and runs the harness (never Fable). The builder and reviewer are the same local models in every
lane, frozen at the start (§5).

## 1. The person sentence

> **The same 2B model and the same six briefs, built four ways (through NodeGX, through the same questions written
> out as plain HTML, by the model writing HTML section by section, and by the model writing the whole page in one
> go), shown side by side with the labels hidden. Richard picks the better page, and we learn whether NodeGX is
> helping the small model or just along for the ride.**

## 2. What is known, and what is not

- **The big models have been measured:** OWN-026 test 1 (DeepSeek V4.1 Flash) scored code 21, harness 20 and NodeGX
  16 → 18 over FIX-01/02. Mistral Large 4 (`own-026/MISTRAL-PLAN.md` §6) scored harness 84/95, NodeGX 78/95 and
  code 43/95 over build–c04.
- **The small models have only been measured through NodeGX.** OWN-027 v2 and OWN-029 always build a graph:
  `create_plan` → `stage_plan_operation` → `apply_plan` → `render_report` (`own-029/agent.mjs` `buildOnce`).
- **The small model never sees NodeGX.** It picks bits from a list, makes one decision per question and writes the
  words. The script turns those answers into a node tree (`built[].nodes`: type, role, params set to `var(--token)`
  values from `get_style_vocabulary`) and stages it. "Forced to use NodeGX" therefore means *the script* is forced.
  The four lanes below separate what each layer contributes.

## 3. The four lanes

| Lane | What the model does | What the script does | What it isolates |
|---|---|---|---|
| **graph** | OWN-029's best arm, as frozen at the start | builds the node tree, stages and applies it, renders with `render_report`, critiques and repairs | today's result |
| **emit** | the same answers, replayed from graph's answer cache, so the decisions and words are identical | transpiles the same `built[].nodes` tree to one HTML file mechanically (Group → flex `div`, Columns → grid, Text → its tag by look, Button, Image …), with the project's resolved token sheet inlined as CSS custom properties. No validator, no `render_report` | NodeGX's runtime, validator and render findings, with the choices held equal. Whatever is left is the question tree plus the style vocabulary. |
| **code-guided** | the same stage 0 card and stage 1 outline (same questions), then **writes each section's HTML itself**, one call per section, given the card, the section's purpose and the list of token names | inlines the same token sheet, concatenates the sections, renders in Chrome, and runs the same critics and repair loop (a re-ask means "rewrite this section, because …") | the harness, minus the part where the script builds |
| **code-bare** | one prompt: "Write a complete landing page for: `<request>`. One HTML file, CSS inline." | renders it once; no loop | the baseline: a small model asked to code |

Rules that keep it fair:
- **Same builder model, same reviewer model, same Ollama version and same briefs in every lane.** The builder for
  code-guided and code-bare is the same model as graph's (E2B, unless §5 freezes another). A separate E4B-codes arm
  is optional (§7).
- **emit is a mechanical transpile, not a designer.** It must not add taste the graph lane does not have (no extra
  shadows, spacing or hover). It writes what the params say. Do not use the P18 code exporter: it is paused, and it
  would be NodeGX again.
- **The critics read words.** J and P (OWN-029 §4) work in every lane with a loop. For the HTML lanes the words come
  from the DOM: text per `<section>` in reading order, with roles inferred from the tag (h1/h2 → headline,
  button/a → button, p → paragraph). The graph-only critics (V validator refusal, S1–S8 over the graph) stay
  graph-only, and the table says so.
- **The cross-lane verdict is never the defect score.** OWN-029's random control proved the score is valid only
  between rounds of one page.

## 4. What is measured

Per run (`summary.json`, then `RESULTS.md` tables):
- **Cost:** wall minutes, builder calls, reviewer calls, prompt and output tokens, and rounds kept.
- **Broken:** a blank render, HTML that renders nothing in a section, a section the validator refused (graph), or
  invented URLs or images that 404.
- **Objective checks, the same Chrome script in every lane** (desktop 1280 and phone 390): horizontal overflow at
  phone width, text under 12 px, low-contrast text (the LOOKBLIND threshold, b21fac654), clipped text, and images that
  failed to load. Graph also gets its `render_report` findings, listed separately.
- **Richard's eye (the verdict):** a blind gallery per brief, built on `own-029/gallery.mjs`. Four desktop and phone
  shots, lane labels hidden, order shuffled per brief (the seed recorded). Richard ranks 1–4 per brief, and the lanes
  are revealed in `RESULTS.md` afterwards.
- **Secondary judge:** E4B's outline judge ("is this page well organised …"), labelled weak (random 0.52 vs kept 0.67
  in OWN-029).
- **One editability probe (one brief, Richard):** "make the hero a different colour and swap two sections". Do it in
  Studio for graph, and in a text editor for the best HTML lane, and record the minutes. This is the "with a little
  Studio tweaking, usable" claim, measured once.

## 5. Freeze before the first run

- Read `own-029/RESULTS.md` and `own-029/NEXT-SESSION-PROMPT.md`. Graph is OWN-029's best arm at that date (A, V or L).
  Name it and its flags in `RESULTS.md` §0.
- Record the Ollama version, the model digests (`ollama list`), the kit commit and the six briefs (puppy, bakery,
  running, jazz, pottery, plumber).
- **Pre-register predictions** in `RESULTS.md` §1, dated, before any run. The s0 guesses: code-bare is worst on phone
  and structure; emit lands close to graph on the look; code-guided breaks more often than graph (invented markup,
  unclosed tags) but its copy is no worse; graph wins the editability probe.

## 6. Acceptance criteria

1. Four lanes × six briefs, one seed, run one after another under the frozen models. Every run has a `ledger.json`,
   a `summary.json` and shots at both widths.
2. `RESULTS.md` has the per-run table (§4) and one row per lane: medians of minutes, calls, tokens, broken runs and
   each objective check.
3. The blind gallery is published (an artifact, with the nodegx.io link), Richard's ranking is recorded, then the
   lanes are revealed.
4. The predictions in §1 are graded against the results, each one right or wrong, in the words of the measurement.
5. A paragraph that answers "does NodeGX help a small model build a page, and what does it cost?", quoting the
   numbers, not the impression.
6. Every defect a lane turns up in the kit is filed in `dev-docs/bugs/` (`kit:` where it names a package), one file per bug,
   checked with `node scripts/bugs.js`.

## 7. Optional, if time is left

- **E4B as the coder** in code-guided and code-bare (a 4B writes HTML better than a 2B). This answers "does the code
  lane just need a bigger model?".
- **LFM3-1.7B** across all four lanes (the fastest in OWN-027).
- **emit-raw:** emit without the token sheet (plain CSS defaults). This isolates the style vocabulary from the
  question tree.

## 8. Out of scope

- The `guided_build` door (the server asks the questions and the client's model answers them): that is OWN-029 next
  step 5, and the Goose test belongs with it.
- Big models: covered by OWN-026.
- Multi-page apps, backends and anything that is not one page.

## 9. Box discipline

Ollama plus Chrome is the one heavy job. Before the first run, check `git status`, `ps` and whether OWN-029's
series is still running (`own-029/runs/` mtimes). If it is, wait for it. Run lanes one after another (a
`series.sh` like OWN-029's), and unload each model with `keep_alive: 0` between lanes.
