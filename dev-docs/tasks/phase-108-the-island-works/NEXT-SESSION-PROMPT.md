# Phase 108 — next session

> ### ⬜ SESSION 5 = IW-007 building and animals (+ IW-006's owed items and the packaged v4 drive) — START HERE
>
> **Read first:** [README.md](README.md) §0 (Richard's words), §3 (R1–R4, R6 ruled; D1–D9; **R5 open**), §4.3–§4.4, §6
> (the board), §7 (the gates). Then [IW-007](IW-007-BUILDING-AND-ANIMALS.md) whole, [IW-006](IW-006-SHELLS-AND-THE-SHOP.md)
> §5 (lanes E and H, and **"Session 4 merge"**: the merged readings, what the merge decided, what is owed), and
> [IW-008](IW-008-THE-CREW-AND-MORE-LAND.md) §5 (lane C: the crew, its robot-row fields, assign by the plot card).
> **There is no common brief on disk any more:** `../OpenNoodl-worktrees/p108-COMMON-BRIEF-s*.md` went with the folder
> (below). Write session 5's brief **in the repo** (`dev-docs/tasks/phase-108-the-island-works/BRIEF-s5.md`) BEFORE any
> lane starts: where lanes work, the CPU rule, the gates (the table in IW-006 §5 "Session 4 merge"), the shared vocabulary
> (blueprint ids, materials, build stages, animal kinds, the bowl, the save fields), the method, the final message.
>
> **Rulings already given (do not re-ask):** R1 scored play IN (shells; nothing earned is taken away); R2 wear and regrowth
> only while the game is open; R3 real Blockly 12, customised; R4 the order is ours; R6 the island is 55 × 22 — (46, 15) on
> Biscuit's row is the meadow kept for IW-007. D9: every robot has hands and walks to things.
>
> **Session 4 (2026-09-30 → 10-01) — merged, fast-forwarded onto `cline-dev`.** A base (`81a1e7ba2`: save v5, the shop's
> catalogue, `buyItem`), then lanes C ∥ H ∥ E ∥ L, merged C → H → E (`a0a532c88`), L (`1ed916d65`), `cline-dev`.
> - **E (earning, IW-006 AC1/2/5):** shells for the steps a run fills, the bonus at the finish line (the island pays the
>   bonus's share per refill — the whole bonus each refill was +324 🐚 / 10 min); the win card's "+N 🐚"; the island's live
>   job in the save — a won plot starts done after a restart (IW-002 AC3 now holds across a restart); v4 → v5 on a page.
> - **H (the shop, IW-006 AC3/4):** "🐚 N · Shop" on the Island page, five tabs (Build and Animals say "later"), the
>   purchase card (have · costs · left after / "N more shells"), copies named, brains 16 / 20 in the Workshop, upgrades
>   sold (no longer gifts), helpers (rain, self-filling can, wheelbarrow) for one job each.
> - **C (the crew, IW-008 AC1–5):** copies sent to plots by touch on the plot card, a program copied (a refusal names the
>   block or the brain), a second robot on a plot with reservation across the crew, cap 12 at p95 16.7 ms (CPU ×4).
> - **L (IW-003's seven look items):** the widest program whole at 1024/1368/390 (the drawer moves to the foot at 1024 when
>   it must), "read the envelope", `go to nearest` starts on what the job seeks, the phone's pad under the world (one row
>   that scrolls), "3 of 4" on the eggs, the full green #058149 (4.95:1), one Sami.
>
> **Merged readings (`p108-s4m` at `b4aeeeef1` + the stones drive fix, 2026-10-01; every exit 0):** specs **930** (16
> files, IW-006 §5) · shell 92/92 · `template:garden` 0 drift · page drive **331/331** · look 143 · earn 15 · shop 60 ·
> crew 39 + `--perf` 5 · modes 90 · IW-001 38 · IW-004 19 + 3D 3 · island `--perf` 69 + 3D 5 · robots 60 + 3D 4 · Workshop
> 3D 24 + nogl 8 · Olive 22 · Mamie 34 + 7 + 3 + 6 · stones 32 + 3D 14 · post 17 + 3D 10 · Biscuit 24 · kits 44 / 30.
> **The whole drive set is one command now:** `R=<tree> X=<out> zsh dev-docs/tasks/phase-108-the-island-works/drives/drive-all.sh`
> (background it; it writes `<X>/summary.txt` and ends with DONE; ~90 min).
>
> **Session 5:**
> 1. **A base first** (as s3 and s4): the blueprint catalogue in the shop's Build tab (the spa, the refuge, a bridge?),
>    materials as things (stones exist; planks from a tree source; carrots from a patch Pip waters), a `site` with a meter
>    per material and 3–5 stages (Sami's bench is the one built so far — reuse it), the free land (the meadow at (46, 15);
>    free play's plot), the animal kinds and the bowl (a container that empties on wear), the save fields — and the gate
>    spec with rows by lane, BEFORE lanes start.
> 2. **IW-007 lanes**, e.g. B (a blueprint bought, placed as a ghost on free land, built by two robots with two materials,
>    each stage in 2D and 3D) ∥ A (the refuge unlocks Animals; a rabbit; a feeding job taught and pinned; the bowl empties
>    on wear and the robot refills it; nothing dies, R2) ∥ O (IW-006's owed items, below, and AC5's packaged upgrade drive
>    over a real v4 app, P105 CG-004's).
> 3. **IW-006 owed** (IW-006 §5 "Session 4 merge"): My robots' upgrade slot still says "Empty slot · Bigger can · from
>    Mamie Rose" — upgrades are sold now, a child waits for a gift that never comes (`ROBOT_CARDS_SCRIPT`, `ig5UpEmpty`);
>    prices are the base's guesses — retune from lane E's earnings table; "now in the shop" under the win card's thanks;
>    sending a crew robot from My robots.
>
> **Open for Richard (not blocking session 5):** **R5** (the Workshop's run cap: 2000 ticks ≈ 14 min; recommended ~200 with
> Olive's "going round and round" line). **More land** beyond 55 × 22 (IW-008). **The FR lines** of every lane (IW-003 §7,
> IW-006 §5, IW-008 §5) and the missions' look beside IW-000. **sami-thanks' Predict** (with home = start, a finished job
> always ends at home — keep, reword, or move the challenge?). **The self-filling can:** does "never needs the pond" change a
> program's path, or only its can? **At 1024** the drawer moves to the workspace's foot for a long program — or a narrower
> side drawer? **At 390** Play sits 4 px below the first screen on the French eggs. The tablet: Blockly by touch (IW-000 AC5,
> IW-004 AC9), the crew's frame time with Olive in flight (IW-008 AC4). The children's first sitting (IW-009). P106's R11, R12.
>
> **Traps paid for in session 4:**
> - **The disk filled mid-merge** (143 MB of 460 GB) and `../OpenNoodl-worktrees` was deleted to free it. Commits survived
>   on the lane branches; a lane's uncommitted notes and every scratch script did not — they were rebuilt from the subagent
>   transcripts (`~/.claude/projects/<slug>/<session>/subagents/agent-*.jsonl`). So: **lanes commit their notes before their
>   last drive run**; **at the end of the session `git worktree remove` every merged lane and delete its `*-scratch`**; the
>   brief and the runners live in the repo.
> - **A sampler slower than what it samples:** Garden 3D's bubble lasts 1.1 s; the stones drive sampled every 1.8 s+ in 3D.
>   Lane L's unrelated per-draw work moved the phase and stones 3D went red at the join (13/14, twice; 14/14 on each side
>   alone). `drive-iw003-stones.js` now records every bubble with a MutationObserver. The post drive reads Olive's bubble
>   (3.2 s) from samples too — fine today, same shape.
> - From s3, still true: two lanes appending at one spot conflict — take both sides, then diff each merged file against
>   each lane; run every spec file after EACH lane merge; background the page drive and poll a file.
>
> **Before any heavy job:** one heavy job on the box at a time; check `uptime` (< 6), a peer's suite, and `df -h` (the drive
> runner skips a drive under 2 GB free).
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory, the worktrees removed.
