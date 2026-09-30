# Phase 108 — next session

> ### ⬜ SESSION 3 = IW-003 the missions as jobs (one lane per islander family) — START HERE
>
> **Read first:** [README.md](README.md) §0 (Richard's words), §3 (R1–R4 ruled, D1–D8, **R5 open**, "found in session 2"),
> §4, §6 (the board), §7 (the gates). Then [IW-003](IW-003-THE-MISSIONS-AS-JOBS.md) whole, and the session-2 Notes of
> [IW-002](IW-002-THE-JOB-MODEL.md) §6, [IW-004](IW-004-REAL-BLOCKS.md) §6 and [IW-005](IW-005-SEEK-AND-REGROW.md) §5 —
> they name every field, op, block type and deviation the missions are built from. Session 2's shared contract is
> `../OpenNoodl-worktrees/p108-COMMON-BRIEF-s2.md` §4 (the program format, the expression contract COND/VAL/REF/STATE,
> the new ops, `watch`/`picking`): session 3's brief copies §4 forward and adds the missions' vocabulary table BEFORE any
> lane starts (README §6 "Session 3").
>
> **Rulings already given (do not re-ask):** R1 scored play IN (shells; nothing earned is taken away); R2 wear and regrowth
> only while the game is open, things pause and never die; R3 real Blockly 12, customised Scratch-style; R4 the order is
> ours. The mockup look is graded ("perfect, exactly what I wanted", 2026-09-29).
>
> **Session 2 (2026-09-30) — merged on `cline-dev`.** Three lanes in worktrees + a merge worktree (`p108-s2-merge`),
> merged J → D → B, then `cline-dev` (P107 s1, no shared files).
> - **IW-004 🟡 (lane B):** the Workshop runs on real Blockly 12.3.1, vendored in `garden-kit` (`src/blocks.js`,
>   `garden-kit.Blocks` on Block List's ports + its own). **The program format did not change**: the engine program is
>   stored, saved (v4), taught, folded and run; Blockly JSON never leaves the node (a translator, gated byte-identical,
>   54/54). Zelos look, drag + tap-to-add, drag-to-drawer delete, `?` on drawer blocks only, brain size 12 (`BRAIN_SIZE`),
>   a chip picked by tapping the 2D or 3D world, a variable monitor, band-2 value blocks, EN/FR.
> - **IW-005 🟡 (lane J):** `go_nearest` (BFS by path, cached route, reservation), `go_to` a chip / `{ref:'read'}`,
>   `evalCond` over the whole expression contract, `set`/`change`/`run.vars`, `if` + `else` — engine and island tick only.
>   No request offers the new blocks yet (`BAND_PALETTE[2]` is sliced at `ask` so free play is unchanged).
> - **IW-002 🟡 (lane D + merge):** both kits draw every job thing (wall, meters, site stages, containers, the can on the
>   map and in hand, rock left/max, the hen's pen, the post box and letter), plus the `watch` and `picking` inputs; the page's
>   `Draw world` now hands the kits every job field (it stripped them — fixed at the merge, `5213ab8bf`).
> - **The join (merge):** `p108s2Join.test.ts` — conditions BUILT AS BLOCKLY BLOCKS win the eggs job on the engine; blocks
>   dragged fresh (no `extraState.src` memo) still win, and a child's edited field beats the memo.
>
> **Merged readings (`p108-s2-merge` after the `cline-dev` merge; every exit 0):** garden specs **665** across nine files
> (cg002Engine 226, cg003Template 141, cg005Olive 41, cg006Requests 83, ig004Island 23, cg001GardenKit 50, ig007Garden3d 43,
> iw004Blocks 54, p108s2Join 4) · `template:garden` exit 0, 0 drift · page drive **331/331** (`--mockup`) · IW-001 **38/38** ·
> IW-004 **19/19** + 3D **3/3** · modes **90/90** · island **65/65** (`--perf`, AC6 p95 16.8 ms at CPU ×4) + 3D **5/5** ·
> robots **60/60** + 3D **4/4** · Workshop 3D **24/24** + nogl **8/8** · Olive **22/22** · kit fixtures 2D **38/38**, 3D
> **25/25** · shell **91/91**. Screenshots looked at: the Workshop on Blockly at 1024 (see the look item below), the picking
> frame, both kits' job world.
>
> **Session 3 = IW-003:** every mission rebuilt on the job model (IW-003 §3) + the envelopes mission + the first build
> site; seeded layouts where a mission teaches `until`/count/seek, with a `repeat N` that loses on a seed; the palettes that
> offer `go_nearest`/`go_to`/value blocks; hints per rewritten goal (IW-003 §6); then the owed DRIVE clauses — IW-002 AC3 and
> AC5 (a job on a page and the island: finish, walk home, wear, go back) and IW-005 AC5 (seek seen in 2D and 3D) and IW-004
> AC4 on a page (the basket's number changes as the robot puts; `watch` rings it). Two corrections to IW-003's text, from
> session 2: reference programs stay ENGINE programs (§2.4 "written as Blockly JSON" is superseded — Blockly is a view);
> "teach again" for a stored program that no longer wins its rewritten mission is IW-003's to build (IW-004 AC8 found no
> format migration was needed, so nothing flags it yet).
>
> **Session 2 findings IW-003 must meet** (README §3 "found in session 2"): Olive's `read` cannot name a door yet (add
> places to the read rung's options + written answers for the envelopes); `go_nearest rock` finds a used-up rock; `sayNone`
> needs its per-kind words; a bowl with no `capacity` draws no meter; meter chips overlap on the 14 px island; **at 1024 ×
> 768 the Blockly drawer crowds the steps column and cuts off the program's right edge** (IW-004 §6 merge note) — fix the
> look before the missions are shot beside IW-000; the page drive's 390-en fold clauses went red once (not reproduced).
>
> **Open for Richard (not blocking session 3):** **R5** (README §3): the Workshop's run cap is 2000 ticks ≈ 14 min;
> recommended ~200 with Olive's "going round and round" line. The tablet: Blockly by touch on the PRODUCT now as well as
> the mockup (IW-000 AC5, IW-004 AC9: drag from the drawer / into a `repeat` / back to delete, 10 tries each). The
> children's first sitting (IW-009 §2). P106's R11, R12 still stand.
>
> **Traps paid for in session 2:** the Mac rebooted mid-session — a lane's worktree and commits survived; resume a
> subagent with SendMessage and a measured list. A background Bash run is killed at ~30 minutes: run long drive sets one
> drive per foreground call. A `sed` repointing a drive script at a worktree renamed the drive file in it too (`iw004-blocks`
> → the worktree's name). Blockly's highlight (an SVG glow filter) and reloading the workspace per Teach press each tripped
> Garden 3D's Too Slow under swiftshader — lane B replaced both; watch Frame Ms if the workspace grows.
>
> **Before any heavy job:** one heavy job on the box at a time; check `uptime` (< 6) and for a peer's suite first.
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory.
