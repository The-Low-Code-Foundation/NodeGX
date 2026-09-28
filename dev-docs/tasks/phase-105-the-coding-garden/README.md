# Phase 105 — The coding garden: teach a robot, then tidy the lesson into a loop

**Scoped:** 2026-09-27, from [TPL-012](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md) (the
scoping, the research, the mockup, the model readout). **Status: 📋 session 3 done 2026-09-28 — Richard ruled R5–R15 (the game is now "Olive's Island", one island per kid, the sea with pins, Olive lessons 10–12 only, the real save backed up); CG-001–CG-005 🟢, CG-006 🟡 (FR read), CG-007 🟡 (Richard's look), CG-008 🟡 prepared. Page drive 148/148, Olive page drive 16/16, the packaged Mac app's upgrade drive PASS 10/10. Start with [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).** **Prefix: `CG`.**

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

Defaults taken in scoping, **all answered by Richard on 2026-09-28** (below):

| # | Default | Alternative |
|---|---|---|
| D1 | ~~Working name **"Bot Garden"**~~; the owl is **Olive**, the robot's default name **Pip** | → R11 |
| D2 | ~~**One island per family**~~, one robot per profile; a sibling's robot is visible on the island | → R12 |
| D3 | First three requests: tulips (repeat), Biscuit's bowl (if), Sami's letter (say), as in the mockup | → R13 (kept) |

Rulings taken 2026-09-28 (session 3), each asked in plain words; the question is carried with the answer:

| # | The question as asked | Richard's answer | Where it lands |
|---|---|---|---|
| R5 | Pip was driven forward 4 times: offer `repeat 4 × forward` or the mockup's `repeat 2 × (forward, forward)`? | **repeat 4 × forward** — the higher count on a tie | CG-002 (`83888c07d`) |
| R6 | Olive's "she breaks your rule" lesson: "never use the letter e" (broken 3/3 EN+FR, Metal+CPU) or "never mention water" (kept 3/3)? | **no letter e** | CG-006 rung 9 |
| R7 | Sami's English thank-you: check for a thank-you word (a wider list met 2/3) or no word check in EN (3/3)? | **no word check in English**; FR keeps "merci" | CG-006 / the rung table |
| R8 | Band 7–9's palette has no say/ask/if, so none of Olive's lessons are reachable there: Olive lessons 10–12 only, or add an "ask Olive" block for 7–9? | **Olive lessons 10–12 only**; 7–9 keeps the owl's hints | CG-006 / CG-005 |
| R9 | White labels on the mockup's fills read 2.05–3.67:1 (floor 4.5): darker fills with white text, dark text on the current fills, or keep? | **darker fills, white text** | CG-007 |
| R10 | Keep the Island as the game's tile world, or build the mockup's sea with pins? | **build the mockup's sea with pins** | CG-007 / CG-003 |
| R11 | Keep "Bot Garden", Olive, Pip? then: which name? | *"Bot Garden is weird, Olive is ok, Pip is ok but let the kids rename maybe?"* → **"Olive's Island" / "L'île d'Olive"**; Pip is the default robot name and the kids rename it (built in s2: My robot + the new-player form) | every surface a person sees; internal slugs (`bot-garden`, `garden-desktop`, `garden-kit`) stay |
| R12 | One island per family where siblings' robots are visible? | *"One island per kid I think, no cloud stuff."* → **each profile has its own island progress; a sibling's robot is not on your island; nothing leaves the computer** | CG-002 save model, CG-003 |
| R13 | First three requests tulips / Biscuit's bowl / Sami's letter? | **keep the lessons** | — |

| R14 | The nightly "backups" folder copies the backend's database, but the islands live in the app's browser storage: back up the real save, or drop the folder? | **back up the real save** (the family's save, what the save code holds), restorable by a parent; on this computer only | CG-004 / CG-008 |
| R15 | Darker fills made the control blocks brown-orange `#A86501` (the brightest orange where white text passes): OK, or bright orange with dark text? | **brown-orange is fine** | CG-007 |

Still with Richard: **the French copy read** (CG-006 AC3) — he reads the FR lines before the kids see them.

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
| [CG-002 — the engine](CG-002-THE-ENGINE.md) | interpreter, fold, hint table, save model, word table, request schema — Function scripts with a gate in both languages | — | B | 🟢 s3: the fold offers the higher count (R5), save model v3 = one island per kid (R12), rungs 13–18 hinted; 116/116 |
| [CG-003 — the pages](CG-003-THE-PAGES.md) | Profiles, Island, Workshop, My robot, Skills, Grown-ups through the plan door; driven at 1368×912 and 390×844 | 001, 002 | A+B | 🟢 s3: the sea with pins, one island per kid, the name, the hooks' components; gate 79/79, page drive 148/148 (EN+FR, 1368 + 390) |
| [CG-004 — the shell and the model](CG-004-THE-SHELL-AND-THE-MODEL.md) | the Nightbook shell forked; node-llama-cpp in the main process; `POST /__garden/olive` on the relay; the GGUF fetched at build; Olive's exam | — | C | 🟢 Mac s3: "Olive's Island" (saves pinned), built from the real template, the real save backed up + a Restore menu (R14); packaged upgrade drive PASS 10/10 with the model, PASS without; shell 89/89. Windows = CG-008 |
| [CG-005 — Olive in the game](CG-005-OLIVE-IN-THE-GAME.md) | the `ask Olive` block family, the thinking state, written fallbacks, rungs gated by the exam, a stub Olive for drives | 002, 004 | B+C | 🟢 s3: page hooks driven 16/16 (0 skip); a voiced hint must stay the hint (`unfaithful`, from 3/6 real voicings that were not); the kit keeps a picked option whole (15 options were never sent); contract 31/31 CPU, 30/31 Metal (P21 variance) |
| [CG-006 — the requests](CG-006-THE-REQUESTS.md) | the content: seven coding tricks as requests, twelve Olive rungs, the extra ring-fenced moments, islanders, rewards, FR/EN copy | 002 (005 for the Olive rungs) | B | 🟡 s3: R6/R7/R8 built, rungs 13–18 promoted (E3 E4 E5 E8 E9 E10), one source for voiced hints; real model 6/7 offered on each path (rung 9 withheld on Metal, rung 14 on CPU); FR copy awaits Richard |
| [CG-007 — the look](CG-007-THE-LOOK.md) | the mockup's look in one stylesheet, bundled fonts, the robot and sprites, rendered beside the artboards | 003 | A | 🟡 s3: every text ≥ 4.5:1 measured live (R9), the sea with pins (R10), look items, Profiles, the phone map fixed; screenshots looked at — awaits Richard's own look |
| [CG-008 — the installer and the tablet](CG-008-THE-INSTALLER-AND-THE-TABLET.md) | the NSIS installer on the Windows runner, the installed app driven, the exam and the timings on the tablet | 003, 005, 007 | C | 🟡 s3 prepared: the Windows workflow builds `templates/bot-garden`, installs `OlivesIsland-Setup`, drives it — not pushed; the app has no icon yet |
| [CG-009 — the kids' verdict](CG-009-THE-KIDS-VERDICT.md) | the two children play; their words the same day; what changes | 008 | — | ⬜ |

## 5. Order and lanes

**Session 1 runs three lanes in worktrees** (`scripts/devtools/make-worktree.sh`, the P18 four-lane
recipe): **A** CG-001, **B** CG-002, **C** CG-004. They share no files. The orchestrator cherry-picks,
runs the gates once on the merged tree, and writes the handoff.
**Session 2:** CG-003 + CG-007 (lane A), CG-005 (lane B+C), CG-006 (lane B).
**Session 3 (done):** Richard's rulings first; lanes CONTENT, LOOK, DESKTOP at once, then HOOKS and BACKUP; the orchestrator merged, regenerated and drove.
**Session 4:** CG-008 on the Windows runner and the tablet, Richard's look + FR read, then CG-009.

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
