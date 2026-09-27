# Phase 105 — next session

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
