# Phase 108 — next session

> ### ⬜ SESSION 8 = what the children found (IW-009), or Richard's reads — START HERE
>
> **The build of phase 108 is done (session 7).** What is left is Richard's: the children's sitting on the Mac app
> (IW-009 §4–§5), the tablet, the FR lines, the look beside IW-000, the prices. **Do not start building before asking
> Richard whether the sitting has happened** — its notes (IW-009 §6, his words) are session 8's work list.
>
> **Read first:** [README.md](README.md) §3 (R1–R6 ruled; D1–D13 — **D12, D13 are session 7's**), §6 (the board);
> [IW-007](IW-007-BUILDING-AND-ANIMALS.md) §4 "Session 7"; [IW-009](IW-009-THE-KIDS-VERDICT.md).
>
> **Rulings already given (do not re-ask):** R1 scored play IN (nothing earned is taken away); R2 wear and regrowth only
> while the game is open, nothing dies; R3 real Blockly 12, customised; R4 the order is ours; R6 the island is 55 × 22;
> **R5 (s7): the Workshop's run cap is 400 ticks** (`RUN_CAP`); **more land: not in this phase** (later, after the
> children say whether they ran out of room); **the root `package.json` restored** (s7); **the sitting is on the Mac**,
> not a new Windows installer (s7: Richard chose "Mac app instead" — ask again before pushing `p105-garden-desktop`).
>
> **Session 7 (2026-10-01) — on `cline-dev`, from `a91b73247`, committed (this session's files only):**
> - **R5:** `RUN_CAP` = 400 — re-measured before asking: the longest winning run is 134 ticks (a part of the spa on her
>   land), so the session-1 recommendation of 200 would have cut the whole-spa run (194). A gate keeps the cap ≥ 2×.
> - **The spa's rest** (the shop promised it; nothing did): robots whose job is done walk to the FINISHED spa and rest
>   two rows in front of it, one tile out at each end (D13 — the row right under it hid the spa on the island: seen on
>   a screenshot, not by any check).
> - **A helper's drops earn** (its own lap, its own "+N 🐚" line); **a fed animal's present** (D12: clover +1, wool +2,
>   when a robot fills her bowl right up); **name pills never cover each other** (`pillSides`, both kits, lowest first).
> - **The touch path in 3D:** `drive-iw007-touch.js --mode 3d` (`touch-3d` in `drives/drive-all.sh`).
> - **The Mac app for IW-009:** `garden-desktop/shell/dist/mac-arm64/Olive's Island.app` (dev engine, local), the
>   packaged upgrade drive PASS 10/10 after its stale rename step was re-pointed to real keys (IW-009 §5).
> - Bugs filed: `p108-s7-sparest`, `-helperpay`, `-pills`, `-upgradedrive` (fixed), **`p108-s7-meters3d` (open, low)**: in the 3D Workshop
>   on her land the spa's two parts' meter chips overlap ("0/6" over "0/4").
>
> **Readings (2026-10-01):** specs **1059** in 22 files, exit 0 · shell 92/92 · generator 0, no drift · final tree, one
> deploy: page 331/331, touch 29/29, touch-3d 29/29, ws3d 24/24, stones-3d 14/14, animals-3d 4, animals `--perf` 6, kit3d 37 · the
> tree before the last kit edits, every other drive green (IW-007 §4 "Session 7" has each number).
>
> **Open for Richard (not blocking):** IW-009 (the sitting); the tablet (Blockly by touch, 16 px island tiles, the crew's
> frame time with Olive in flight); **the FR lines** of every lane (IW-003 §7, IW-006 §5, IW-007 §4 — s7 adds
> « 🍀 {a} t’a trouvé un trèfle +{n} 🐚 » · « 🧶 {a} te donne de la laine +{n} 🐚 »); the prices; D10–D13; sami-thanks'
> Predict; the self-filling can; at 1024 the drawer at the foot; Play 4 px below the first screen at 390 FR; P106's R11, R12.
>
> **Traps paid for in session 7:**
> - **A recommendation decays with the product.** R5's "200 leaves five times the longest run" was true in session 1
>   (41 ticks); by session 7 her land's jobs took 194. Re-measure the recommendation on today's longest case first.
> - **A green rule can still look wrong:** the rest tiles passed every row; the screenshot showed the two robots hiding
>   the spa (a robot is 56 px on a 16 px island tile). Look at the shot after any change to where things stand.
> - **A spec's geometry must be the kit's:** the pills rows first used a robot box the size of a tile and could not show
>   the stacked case; with the kit's real 56 px it could. Read sizes from the built kit (`sprite.minPx`).
> - **A software-GL drive red under load is not a verdict:** ws3d (Too Slow) and stones-3d (a sampler) went red with a
>   peer's Docker VM at 163% CPU; the same build alone was 24/24. Re-run the SAME build quiet before suspecting the change.
> - **`drive-all.sh` with every drive takes over 2 hours** — the background limit killed it before the last five. Split
>   the set (2D / 3D) or name the drives.
>
> **Before any heavy job:** one heavy job on the box at a time; check `uptime` (< 6), a peer's suite, and `df -h`.
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory, the worktrees removed.
