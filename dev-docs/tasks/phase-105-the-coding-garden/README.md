# Phase 105 — The coding garden: teach a robot, then tidy the lesson into a loop

**Scoped:** 2026-09-27, from [TPL-012](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md) (the
scoping, the research, the mockup, the model readout). **Status: 📋 session 2 done 2026-09-28 — CG-001 🟢, CG-002 🟢, CG-003 🟢 (driven 121/121), CG-004 🟢 on the Mac, CG-005 🟡, CG-006 🟡, CG-007 🟡; the whole loop plays in the browser, EN and FR, desktop and phone. Start with [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).** **Prefix: `CG`.**

> *"I'd like to scope out a new template app for my kids … learn 'Scratch' … like 'Autonauts' … a kind
> of 'LLM call' step … a safe and fully offline LLM."* — Richard, 2026-09-27

> *"We might want to just take that model so every kid has the same experience … hammer down 'what the
> model can and can't do' and just reverse engineer the LLM part of the game from there."* — the same day

> *"Please scope it up into end to end dev tasks so we can get started in a new session and build this
> thing as an Electron app with an on board LLM. If you think of other uses for the LLM, other teaching
> moments that we can ringfence, stick them in."* — the same day

## 1. The person sentences

> **A child of eight opens the garden on the family tablet, is asked for help by an islander, drives a
> small robot by hand, watches her own steps appear as blocks, and lets the game fold the repetition
> into a loop. When the robot waters a rock the puddle is the error message. Nothing is timed, scored
> or streaked; the reward is a hat.**

> **A child of eleven asks the helper owl for things in a fixed set of blocks, sees exactly what a small
> offline model can do (reshape, translate, pick) and cannot do (count, judge, obey a rule, stay inside a
> fence), and fixes the owl's failures with a program. Nothing she types ever reaches the model as a
> free prompt, and nothing leaves the house.**

> **A grown-up installs one file, sees where the owl runs and what she may say, and never creates an
> account.**

## 2. What is decided

Rulings taken from Richard's words on 2026-09-27:

| # | Ruling | Where it came from |
|---|---|---|
| R1 | **A separate template**, not a Rocket School game type; reuses `game-kit` and the Nightbook desktop shell | "build this thing as an Electron app" after TPL-012 §0 |
| R2 | **Electron with the model on board**; no Ollama; the model is a sidecar in the main process | "as an Electron app with an on board LLM" |
| R3 | **One model for every child: Qwen3.5-0.8B Q4_K_M** (532 MB, Apache 2.0). The Mac only makes it faster | "take that model so every kid has the same experience" |
| R4 | **The LLM part is reverse-engineered from the readout**: green activities on what the model does consistently, 🎓 activities on what it fails consistently | "reverse engineer the LLM part of the game from there" |

Defaults taken in scoping, to be confirmed or overturned (say so in the task files when he does):

| # | Default | Alternative |
|---|---|---|
| D1 | Working name **"Bot Garden"**; the owl is **Olive**, the robot's default name **Pip** | Richard names it |
| D2 | **One island per family, one robot per profile**; either robot may take any request; a sibling's robot is visible on the island | one island per profile |
| D3 | First three requests: tulips (repeat), Biscuit's bowl (if), Sami's letter (say), as in the mockup | anything from the kids' own world |

## 3. What it is, in one screen

The mockup is the spec: https://claude.ai/artifact/Bu4ZBYvh1PenHzAtLQTCJq (copy in
`../phase-78-the-templates/tpl-012-mockups/bot-garden.html`). Six screens: Island, Workshop, My robot,
Skills, Grown-ups, plus Profiles. Two bands, 7–9 and 10–12, set per profile. EN by default, FR one tap
away. The seven coding tricks and the twelve Olive rungs are in TPL-012 §2.3 and §2.6; the extra
ring-fenced moments this phase adds are in [CG-006](CG-006-THE-REQUESTS.md) §4. The research is in
`../phase-78-the-templates/tpl-012-research-briefing.md`; the model readout and the exam script are in
`../phase-78-the-templates/tpl-012-olive-exam/`.

## 4. The board

| Task | What | Depends on | Lane | Status |
|---|---|---|---|---|
| [CG-001 — the kit](CG-001-THE-KIT.md) | `garden-kit`: `Block List` (the program editor) and `Garden` (the tile world), React nodes, touch and pen | — | A | 🟢 s1: gate 20/20, drive 28/28, AC9 p95 29.9 ms Mac ×4 |
| [CG-002 — the engine](CG-002-THE-ENGINE.md) | interpreter, fold, hint table, save model, word table, request schema — Function scripts with a gate in both languages | — | B | 🟢 s1 gate; s2: 105/105 with CG-006's requests, run by `template:garden` before it writes |
| [CG-003 — the pages](CG-003-THE-PAGES.md) | Profiles, Island, Workshop, My robot, Skills, Grown-ups through the plan door; driven at 1368×912 and 390×844 | 001, 002 | A+B | 🟢 s2: gate 47/47, generator 0 drift, page drive 121/121 (EN+FR, 1368 + 390), screenshots looked at |
| [CG-004 — the shell and the model](CG-004-THE-SHELL-AND-THE-MODEL.md) | the Nightbook shell forked; node-llama-cpp in the main process; `POST /__garden/olive` on the relay; the GGUF fetched at build; Olive's exam | — | C | 🟢 Mac s2: upgrade drive PASS incl. the control launch (the s1 "locked screen" was an AppKit prompt), AC4 in Electron, packaged `Bot Garden.app` loads on Metal after a packaging fix; Windows = CG-008 |
| [CG-005 — Olive in the game](CG-005-OLIVE-IN-THE-GAME.md) | the `ask Olive` block family, the thinking state, written fallbacks, rungs gated by the exam, a stub Olive for drives | 002, 004 | B+C | 🟡 s2: 25/25, 12/12 arms, route drive 4/4, AC7 dial on the real model ✅; page clauses 1 PASS 4 SKIP (hooks owed by the pages) |
| [CG-006 — the requests](CG-006-THE-REQUESTS.md) | the content: seven coding tricks as requests, twelve Olive rungs, the extra ring-fenced moments, islanders, rewards, FR/EN copy | 002 (005 for the Olive rungs) | B | 🟡 s2: 82/82 (+105 engine), 10 requests, 12 rungs framed; §4 probes on the real model: 6 promoted, 3 dropped; FR copy awaits Richard |
| [CG-007 — the look](CG-007-THE-LOOK.md) | the mockup's look in one stylesheet, bundled fonts, the robot and sprites, rendered beside the artboards | 003 | A | 🟡 s2: tokens, Fredoka offline, AC2/3/4/5/7 measured; side-by-side written (§7.1); AC6 contrast is Richard's ruling |
| [CG-008 — the installer and the tablet](CG-008-THE-INSTALLER-AND-THE-TABLET.md) | the NSIS installer on the Windows runner, the installed app driven, the exam and the timings on the tablet | 003, 005, 007 | C | ⬜ |
| [CG-009 — the kids' verdict](CG-009-THE-KIDS-VERDICT.md) | the two children play; their words the same day; what changes | 008 | — | ⬜ |

## 5. Order and lanes

**Session 1 runs three lanes in worktrees** (`scripts/devtools/make-worktree.sh`, the P18 four-lane
recipe): **A** CG-001, **B** CG-002, **C** CG-004. They share no files. The orchestrator cherry-picks,
runs the gates once on the merged tree, and writes the handoff.
**Session 2:** CG-003 + CG-007 (lane A), CG-005 (lane B+C), CG-006 (lane B).
**Session 3:** CG-008, then Richard, then CG-009.

Every session ends with `/next` (the handoff and the memory) — the standing rule.

## 6. Gates every task owes

- **The kit** is driven in a **two-module project** (D41), never beside the 33-module library; its gate
  runs on the BUILT file in a bare `vm` (`tpl007GameKit.test.ts` is the precedent).
- **The engine** gate generates every request and every hint in BOTH languages and in both bands.
- **The template** goes through `create_plan → stage_plan_operation → apply_plan` with every interface
  declared, is regenerated byte-identical by its generator (`npm run template:garden`), and passes the
  three phase-85 floors (`measure-interfaces.py`).
- **The pages** are driven headless on the shipped `nodegx-deploy.cjs` output with the production engine
  at 1368×912 and 390×844, EN and FR, 0 console errors, and **the screenshots are looked at**.
- **The look** is rendered beside the mockup's artboards before a slice is reported. A working
  wireframe is not the mockup: Richard grades the look against the mockup, not against the ACs.
- **The shell** has unit tests (Nightbook's 23/23 is the precedent) and the Windows CI workflow installs
  the built installer and drives the installed app.
- **Olive** has a contract test: the exam battery run against the shell's route with the real model
  (CPU in CI, so correctness only), and a **stub Olive** for every page drive, so a drive never waits on
  a model.
- A new node type owes the catalog: after adding nodes, check the kit catalog and
  `packages/noodl-types/src/node-catalog.json` (the `inNodePicker` trap from FED-003).

## 7. Traps already paid for by the other templates

Read before the first hour; each cost a session once.

- **D53** a kit React node as a component's ROOT draws nothing when placed: put a Group root under it.
- **D57** a `Variable` is global by NAME: two placements of one component share it. Repeaters need an
  `id` per row.
- **D49** any `States` node carrying a colour gets `useTransitions: false` or it publishes nothing.
- **D54/D55** an `Expression` makes every identifier a port and never evaluates with an undelivered input.
- **Backticks** inside any comment of a template-literal script or stylesheet end the generated file
  early; the error names something else two files away. Use none.
- A Group writes `position` as an INLINE style: every positioning property of an overlay needs
  `!important`, and an overlay on a page that scrolls is `fixed`, not `absolute` (P95 R6).
- `CONTENT_SIZED_TEXTS` renders `white-space: pre`; a line that grew spills off both ends.
- The generator's exit code is read BEFORE any drive is believed (an aborted edit script measures the
  old artefact and reads exactly like the run before).
- An instrument fault reads exactly like a product defect: do the instrument's own arithmetic before
  believing a lone red.
- The desktop shell: an EMPTY `cloudservices.endpoint` means NO backend; bake the loopback origin. A
  packaged backend installs its policy only into a folder with none, so v2 over v1 keeps v1's rules
  (`shell/policy.js` adopts the shipped policy). A drive that starts from a fresh home cannot see an
  upgrade defect: seed the old version's leavings.
- **Qwen3.5 through node-llama-cpp:** the built-in `Qwen` wrapper leaks `</think>` and drops the JSON
  brace; the Jinja wrapper returns ""; raw ChatML with `SpecialTokensText` and the empty think block
  prefilled works, and a grammar then holds every time (briefing §C2).
- The kids' names, ages, school years and the tablet's spec stay in the UNTRACKED notes. This repo is
  public.

## 8. Product gaps this phase surfaces (file as defects when met)

- No runtime block-program component exists; Blockly lives in the editor only. CG-001 builds the first.
- The cloud `Model Request` node's `openai-compatible` provider is `not_implemented` (P96 FED-003). This
  phase goes round it through the shell's loopback route; the gap stays open for anyone else.
- No tile-world node; TPL-005's `For Each` grid is the pattern and CG-001 measures whether it is fast
  enough on the tablet before replacing it with a kit node.
- The Nightbook shell hardcodes its name in `main.js` and `package.json`; CG-004 parameterises it so a
  third template does not fork it again.

## 9. Out of scope

Blockly or Scratch compatibility; a text language; multiplayer over the network; a model the child chats
with; any hint written by the model (the hint table is rule-based, TPL-012 finding 5); the PWA build for
friends' devices (after v1); anything timed, streaked or scored; the kids' names anywhere in this repo.
