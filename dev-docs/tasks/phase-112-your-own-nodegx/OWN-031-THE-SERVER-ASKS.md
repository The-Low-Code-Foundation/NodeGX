# OWN-031 — The server asks

**Opened 2026-10-28** (OWN-029 s2, Opus, from `own-029/NEXT-SESSION-PROMPT.md` step 5: *"move the loop into the MCP …
so a person with Gemma in Cline gets the harness without running it. Scope it as its own task file first."*).
**Status: ⬜ scoped 2026-10-28, not started. The three rulings in §7 were decided 2026-10-29 (Richard handed them over); step 1, the probe, is next once OWN-030 has run.**
**🟡 2026-10-29 ~11:40 — TAKEN by the Goose session (Opus, d57192da).** Richard, after the Goose measurements (own-030/goose/FINDINGS.md): *"Yep absolutely"* to a `build_app` tool where the SERVER asks Ollama directly, one call from the chat. That reverses ruling 2 below for hosts that already run Ollama: per turn in Goose, E4B carries 15–25k tokens at 3–13 tok/s, so 25 round trips is 30+ min, against 2–4 min direct, and only direct keeps logprobs. Goose advertises no `sampling`. First target: a counter app (an interactive branch the tree lacks), drawn in Studio in the Goose chat. Do not start this task in another session without asking. **s1 result (same day):** `build_app` built (`noodl-mcp/src/tools/buildApp.ts`, uncommitted), with a counter branch only. In Goose, E4B made one call and got a working counter in Studio in the chat (`own-030/goose/FINDINGS.md` rows 8–12). Next: landing pages through the same door (port OWN-029's tree), then more interactive kinds.
**s2 result (2026-10-29 afternoon, same lane after a `/clear`):** pages through `build_app`.
- **The port:** OWN-029's round 0 (harness 22989dd1) is in `noodl-mcp/src/guided/` (`door.ts` is lm.mjs; `page.ts` holds
  the question tree, the assembly and the staging). It has the same signatures, so a recorded run replays. `build_app`'s kind
  question now offers counter, page or other.
- **AC3 ✅ (the paired gate):** `tests/own031GuidedPage.test.ts` replays the six frozen G-runs' round-0 answers
  (`tests/fixtures/own031/`). Card, sections, bits and every node's params equal `r0/tree.json`, and each page applies
  with nothing left out. Mutation check: flipping the zigzag turns the three briefs with photos red.
- **New in the port, the photo scout's pre-filter:** one text question picks up to 3 photo subjects, then the two
  vision gates run on those files only. Bakery: 15 of 32 looked at, and it kept the same two photos the lab's full
  scan kept. Ollama takes `.webp` as it is, so the lab's `sips` conversion is not needed.
- **Live, E4B (`gemma4-e4b-32k`), bakery, through stdio (`own-031/probe.mjs`):** one call, 266 s, 57 asks and 17
  photo judgements. The biggest prompt was 413 tokens. It applied, with 1 render warning (low-contrast date line in the
  footer). Shots: `own-031/runs/projects/family-bakery-lyon/.previews/shots/`. The ledger of each build is written beside
  the project (`.previews/build-app.json`).
- **What round 0 gets wrong (step 3's job):** two photos repeated across five bands and the hero cards; three dark
  photo bands in a row; a "schedule or line-up" section on a bakery.
- **Not yet:** the review loop (step 3), the other five briefs live, and a run in Goose by Richard. Goose's bundle
  `dist/noodl-mcp-goose.cjs` was rebuilt at 14:2x, and Goose picks it up when it restarts the extension.
- **Progress:** `build_app` sends `notifications/progress` when the call carries a progress token (a page takes
  minutes). Whether Goose sends one, and its tool timeout, are not measured yet.
**s2b (same day): step 3, the review loop, is ported.** It is in `src/guided/review.ts`: describe, S1–S14, V, R, J,
M, C, P and Q, keep-or-undo (`constraint`, organisation read on the outline without words, `peak` ratchet), and repair.
- **The paired gate** (`tests/own031GuidedReview.test.ts`, fixtures `tests/fixtures/own031-review/*.json.gz`, 68 KB)
  replays all rounds of the six G-runs. Each judgement is found by its exact words, which hold the section's whole
  description, and the replay fails if anything the run recorded is left unasked. Every round's per-line defects,
  organisation, issues and weights, keep or undo, and chosen fixes equal the lab's. Render findings are rebuilt from
  the recorded `R|` issues. Mutation checks: S11's weight 1.5 → 1.6 turns the four briefs with S11 issues red, and
  "light band" → "pale band" turns all six red.
- **In `build_app`:** `NODEGX_BUILD_ROUNDS` repair rounds after round 0 (default 2; the lab ran 4). Round k builds into
  `Sections vk+1/` and deletes the round before it. When the kept round is not the one on disk, or sits in a vN folder,
  it is rebuilt under `Sections/` from the cache, with no model calls. The result carries `review`: each round's
  issues, defects per line, organisation and keep or undo, the kept round, and the issues left.
- **Ruling 2, noted in review.ts:** `organised`/`shape` decide whether a round is kept, as in the lab. The ruling's
  reason (no logprobs through MCP) does not apply to a model on the server's own machine.
- **Live, bakery, E4B, 2 repair rounds, render on (15:24, once OWN-032 had left Ollama idle):** one call, 483 s,
  169 questions. Defects per line 0.781 → 0.465 → 0.289, both repair rounds kept, organised (shape) 0.89 → 0.84. The
  kept round was rebuilt under `Sections/` with no model calls. The hero cards no longer repeat a photo, the repeated
  lines are reworded, and "schedule or line-up" now reads as opening hours. Left: a low-contrast date line in the
  footer, a single-column grid, three dark bands in a row, and "in the heart" said four times.
- 🐛 **P112-OWN031-BGPHOTOREPEAT:** S1 never counts a band's background photo, so two photos fill five bands and no
  round sees it. Inherited from the lab, so fixing it is a deliberate fork from the paired gate.
- The empty `Sections vN` folders a round leaves behind are now removed after the final write.
**Model:** Opus. The client model in every test is a local Gemma, the same one OWN-029 used as builder.

## 1. The person sentence

> **Someone with Gemma 4 E2B in Cline says "make me a page for my bakery". The NodeGX server asks the model one small
> question at a time, builds the page from the answers, looks at it, and asks again about only what is wrong. The
> person never runs a script, and the page is as good as OWN-029's.**

## 2. Why

- **OWN-027 and OWN-029 showed that the taste lives in the system.** A 2B model makes good decisions when it is asked
  small questions with the options in the words. It fails when it has to draw a tree or write a page.
- **Today that system is a script** (`own-029/agent.mjs`) that only we can run. A person with a small model in Cline
  meets the ordinary MCP surface, which is a big-model surface: `create_plan`, staged node graphs, ports.
- **OWN-027 arm B** gave the small model that surface. **This task is arm B turned around:** the server holds the
  questions, the state and the assembly, and the client's model only answers.

## 3. What is known (measured or read, 2026-10-28)

| Fact | Where |
|---|---|
| A stateful multi-call tool already exists: `create_plan` keeps a `Map<id, ServerPlan>` per server process, with no TTL and nothing on disk. It ends at apply, at discard, or when the process exits. | `noodl-mcp/src/tools/planTools.ts:153-188`, `:753`, `:1151` |
| A server-side builder can drive the REAL tools in-process, with their validation, through `disclosure.handleFor(name).handler(args, extra)`. This is how `call_tool` works. | `src/tools/disclosure.ts:136`, `:687` |
| `render_report` exports `runRenderReport(projectDir, opts)`. | `src/render.ts:442` |
| The resident tool surface is at 8,273 of 8,280 tokens. A new tool **must** join a deferred group, which costs 0 resident tokens. | `tests/toolDisclosure.test.ts:83`; `src/toolGroups.ts:442` |
| Nothing in the server uses MCP sampling (`createMessage`) or elicitation. The SDK is 1.29.0. | `src/` grep; `package.json` |
| `create_project` is a single call: the client holds the scoping conversation and passes the result. No back-and-forth happens inside the server today. | `src/tools/createProject.ts:659` |
| OWN-029 round 0 takes **60–130 builder answers** a page. Each repair round re-asks 5–20. | `own-029/RESULTS.md` §2 |
| Ollama logprobs give each answer a confidence. **A client model through MCP gives none.** The flips (to "the model's second choice") and the one-token reviewer depend on them. | `own-029/lm.mjs` |

## 4. The shape (a proposal for the rulings in §7)

**One tool, `guided_build`, in a deferred group** (say `build`, revealed by `find_tools({group:"build"})` or named in
the bootstrap instructions):

```
guided_build({ request })                       → { session, question }
guided_build({ session, answer })               → { question } | { done, project, render, issuesLeft }
guided_build({ session, answers: [...] })       → batch form (below)
```

- **A question is self-contained:** the options are in its words (OWN-027's rule: the schema is invisible to the
  model), there is a short brief line, and it asks for an answer format of one word or one short JSON object. It
  never carries the history.
- **The server holds everything else:** the card, the answers cache, the replay and invalidation (`lm.mjs`'s door),
  the assembly into a node tree, staging, applying, rendering, the script critics S1–S14, and the render findings.
- **Batching is the main risk control.** If 100 round trips each append about 300 tokens, a small model's context
  fills up (Cline keeps every tool call). The server therefore sends every question that does not depend on another
  in one batch: all of a section's looks, or every section's words once its bits are known. The target is ≤ 25
  round trips for round 0. **Measure this first (AC2).**
- **Without logprobs:**
  - the reviewer's yes/no questions go to the same client model, as plain answers;
  - flips are dropped, and a defect re-asks with a hint instead;
  - the accept rule stays as it is (OWN-029 s2: per line, with organisation as a constraint).
- **Sampling is a later, optional fast path.** If a client advertises `sampling`, the server asks through
  `createMessage` and the whole build is one tool call. Which clients advertise it (Cline, Claude Desktop, Claude
  Code) is a probe, not an assumption.

## 5. Build order

1. **Probe (no product code):** OWN-027's `mcp.mjs` client acts as "Cline". Ollama answers each question the server
   would ask, with the conversation history growing the way Cline's does. Measure round trips and context tokens for
   round 0 at batch sizes 1, a section, and a stage. This decides AC2 before any TypeScript is written.
2. **Port round 0 into `noodl-mcp/src/guided/`:**
   - the vocabulary of questions (section kinds, bits, item bits, looks offered by section kind, fields), from
     `agent.mjs`;
   - assembly into node trees, plus a list's items as one component;
   - staging through the in-process tool handles.
   **Paired gate:** replay one OWN-029 run's answers through the port. The staged graphs must equal `agent.mjs`'s for
   the same answers.
3. **The review loop:** describe, the script critics, render findings, the client model as reviewer, repair by
   re-ask, and accept.
4. **A stranger round:** Gemma E2B in Cline, a real client, on the six briefs. Richard looks at the pages.

## 6. Acceptance criteria

- [ ] **AC1 — the door exists without cost:** `guided_build` is in a deferred group, and `toolDisclosure.test.ts`
  stays green at ≤ 8,280 resident tokens.
- [ ] **AC2 — it fits a small model's context:** round 0 of the six briefs takes ≤ 25 round trips, and the client
  conversation stays ≤ 16K tokens (Gemma E2B in Cline, measured in step 1 and again in step 4).
- [ ] **AC3 — paired equivalence:** the same answers give the same staged graphs as `own-029/agent.mjs` (step 2's
  gate).
- [ ] **AC4 — quality holds without logprobs:** over six briefs, the kept pages' defects per line are no worse than
  OWN-029 s2's kept pages + 25%, and "organised" is no lower by more than 0.1.
- [ ] **AC5 — a real client:** Gemma E2B in Cline builds the bakery page end to end, and Richard calls it a credible
  first draft.

## 7. Rulings that wait on Richard

1. **Turn by turn first, or sampling first?** The proposal is turn by turn, because every client can do it. Sampling
   is a fast path once we know who supports it.
2. **The reviewer in guided mode:** the client's own model (no confidence, possibly lenient: E2B said yes to nearly
   everything in OWN-029's probes), the script critics only, or a reviewer model the server runs itself (needs Ollama
   on the server's machine, which breaks "nothing to run").
3. **Whose questions are they?** Is the vocabulary of questions (bits, looks offered by section kind) product
   surface that ships, or experiment code to be rewritten? Porting it makes it product.

**Decided 2026-10-29** (Richard, after OWN-029 s2: *"you decide for the things to build questions"*; decided by Opus,
OWN-029 s3):
1. **Turn by turn first.** Every MCP client can do it. Sampling is a later fast path, after a probe of which clients
   advertise it (Cline, Claude Desktop, Claude Code), never assumed.
2. **The reviewer is the script critics plus the client's own model; no server-side model.** "Nothing to run" is the
   point of the task. The script critics (S1–S14), the validator and the render findings always run on the server.
   The reviewer's yes/no questions go to the client model as plain answers. Because they come without logprobs and
   E2B said yes to nearly everything in OWN-029's probes, they may trigger a repair but never decide whether a round
   is kept. The accept rule uses the script's defects per line only. AC4 measures whether that holds; if it does not,
   the next step is to ask each yes/no question twice, in opposite polarity, and act only when the two answers agree.
3. **The questions are product.** "The taste lives in the system" is the thesis, so the vocabulary of questions ports
   into `noodl-mcp/src/guided/` as shipped surface. It sits in a deferred group and is labelled experimental in its
   description, so it can change between releases without a migration.

## 8. Links

- OWN-027 (arm B: the small model on the plain surface), OWN-029 (the loop this ports), OWN-030 (code or NodeGX;
  its graph lane freezes OWN-029's harness).
- `[[the-graph-as-text-is-the-reading-surface]]`: what the critics' "describe" step already does, in words.
