# Phase 105 — next session

> ### 📋 2026-09-27 (CG s1) — THREE LANES BUILT AND MERGED; ONE ELECTRON DRIVE WAITS FOR AN UNLOCKED SCREEN — START HERE
>
> - **Done on `cline-dev`:** `a9a852d7b` the scoping docs · `f7d3ab33f` + `17bd143dd` CG-001 the kit (gate 20/20, drive
>   28/28, screenshots looked at, AC9 p95 29.9 ms at CPU ×4 on the Mac) · `ff837b44b` CG-002 the engine (97/97, 12/12
>   arms) · `129775882` the drive fixture's Router pages · `b3578ba67` CG-004 the shell + owl (59/59 shell tests, exam
>   19/20 on the real model, contract test Metal and CPU) · the commit after it: the drive fixes and this handoff.
> - **Read first:** [README.md](README.md) §4 (the board), then §7 of [CG-001](CG-001-THE-KIT.md) (§7.1 the first drive's
>   findings, §7.2 the re-drive), [CG-002](CG-002-THE-ENGINE.md) §7 (the contract words, residuals 1–5),
>   [CG-004](CG-004-THE-SHELL-AND-THE-MODEL.md) §7 + §7.1 (the numbers, the five content findings, the locked-screen blocker).
> - **First job (10 min, needs Richard's screen UNLOCKED):** `ioreg -n Root -d1 -a | grep -A1 CGSSessionScreenIsLocked`
>   must read `<false/>`; then `node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/drive-upgrade.js` (AC8 +
>   AC9 verdict: launches 1–2 already measured green; launch 3 is the fresh-home control), then the no-model run and
>   `npm run dist:mac` — the steps are in CG-004 §7.1. A GUI Electron app never reaches `ready` on a locked screen; headless
>   Chrome does not care. Prerequisites already on the primary checkout: `garden-desktop/shell/node_modules` (untracked,
>   819 MB, moved from the lane's worktree) and `shell/build-output/{app,model,backend,policy}` from the last run.
> - **Session 2 = three lanes in worktrees** (README §5): **A** CG-003 the pages + CG-007 the look, **B** CG-006 the
>   requests, **B+C** CG-005 Olive in the game. Same recipe as s1: `scripts/devtools/make-worktree.sh` per lane, a common
>   brief outside the repo (`../OpenNoodl-worktrees/p105-COMMON-BRIEF-s1.md` is the model), lanes prepare drives, the
>   orchestrator cherry-picks and drives. CG-003 owes the `template:garden` generator + the `cg002Engine` pre-step hook and
>   `Logic/*` generation from `FUNCTION_SCRIPTS` (CG-002 §7); CG-005 §4 names `shell/olive/rungs.json` — it is
>   `shell/olive-templates.json`.
> - **Rulings awaited from Richard** (ask in plain words, from the § that measured): README §2 D1–D3 (the name, one island
>   per family, the first three requests); CG-002 residual 2 — the mockup's fold tie-break (`F F F F` → `repeat 2 {F F}`,
>   not `repeat 4 {F}`): keep or change; CG-004 §7 findings 1 and 5 — rung 9 ("under 5 words") does NOT fail on this
>   model (6/6 obeyed): pick another rule she fails (G1 no letter e / G2 never mention water), and the EN thank-you
>   must-contain refuses her English (2/2): widen or drop it.
> - **Traps paid for this session** (each cost 10–40 min; all in the task files): a Router with no `pages` routes to
>   nothing and the page logs `[router/no-pages]` (copy the replay fixture's shape) · the runtime seeds a React kit node's
>   root with an inline `display:block` from `defaultCss`, beating the stylesheet's `grid` (force it in the merged style)
>   · a rotated sprite's `getBoundingClientRect().width` is its HEIGHT (read the smaller side) · a drive's policy fixture
>   must be a LEGAL policy (unknown top-level key = backend FATAL) · a launcher exits before its Electron app; wait for
>   the binary's processes to be gone · **a locked macOS screen = no Electron `ready`; screenshot + `ioreg` before
>   blaming the code**.
> - **Known reds that are not ours:** `noodl-mcp` whole suite on the merged tree = 8 failed / 132 passed suites, 14 tests
>   (`nodeIdAllocation cn004 cmp004Parts cmp004RoundTrip cmp001InterfaceDoctrine def038SettledTemplates
>   d54ThemePresetIdentity fld013ExportReach`): the same 8 are red in a clean worktree at the base without the kit; both
>   new suites pass. `library:check` = 80/81, the one FAIL is the UNTRACKED `library/modules/nightbook-kit` (no
>   `library.json`), older than this phase.
> - **The primary checkout carries ~80 uncommitted files of other sessions** (P18 export tests, TPL-010, a deleted
>   `templates/planner-demo`): never `git stash`, never `git checkout --`, pathspec commits only.
> - **End of session:** `/next` — the handoff block on top of this file, README §4 from the task files, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.


> ### 📋 2026-09-27 (CG s0) — SCOPED, NOTHING BUILT — START HERE
>
> - **Richard:** *"Please scope it up into end to end dev tasks so we can get started in a new session and
>   build this thing as an Electron app with an on board LLM."*
> - **Read first, in this order:** [README.md](README.md) §2 (what is decided), §4 (the board), §6–§7 (the
>   gates and the traps); then [TPL-012](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md) §2 (the
>   product) and §2.6 (the Olive ladder); then open the mockup
>   (`../phase-78-the-templates/tpl-012-mockups/bot-garden.html`, or https://claude.ai/artifact/Bu4ZBYvh1PenHzAtLQTCJq)
>   and PLAY the Workshop once. The model readout is
>   `../phase-78-the-templates/tpl-012-research-briefing.md` §C2.
> - **Session 1 = three lanes in worktrees** (README §5): **A** [CG-001 the kit](CG-001-THE-KIT.md),
>   **B** [CG-002 the engine](CG-002-THE-ENGINE.md), **C** [CG-004 the shell and the model](CG-004-THE-SHELL-AND-THE-MODEL.md).
>   They share no files. Follow the P18 four-lane recipe: `scripts/devtools/make-worktree.sh` per lane, a
>   common brief outside the repo, the CPU rule (one heavy job on the box; single specs free), cherry-pick
>   onto `cline-dev`, gates once on the merged tree, drives repointed at the primary checkout. A lane that
>   backgrounds its own run ends its turn: tell it to poll its exit file.
> - **Before any drive:** `git status` and `stat` the files you will touch; a peer may be on the same
>   checkout. Never `git stash`, never `git checkout --` on a shared file, never `pkill -f vitest`.
> - **The three defaults awaiting Richard** (README §2 D1–D3: the name, one island per family, the first
>   three requests) do not block session 1: the kit, the engine and the shell are the same under every
>   answer. Ask for the rulings in plain words at the end, from the section that measured the question.
> - **The model file is NOT in the repo.** CG-004 fetches `unsloth/Qwen3.5-0.8B-GGUF` Q4_K_M by pinned
>   URL and sha256 at build time. On this Mac a copy already sits at
>   `~/.ollama/models/blobs/sha256-bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517` and
>   the working harness is `../phase-78-the-templates/tpl-012-olive-exam/battery.mjs` (node-llama-cpp
>   3.21.1, raw ChatML, `SpecialTokensText`, the empty think block prefilled). Ollama cannot load it.
> - **End of session:** `/next` — the handoff block on top of this file, the board in README §4 updated
>   from the task files, the memory written. Names, ages and the tablet spec stay out of the repo.
