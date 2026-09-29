# Phase 108 — next session

> ### ⬜ SESSION 2 = IW-004 (lane B) ∥ IW-005 (lane J) ∥ IW-002's drawing (lane D) — START HERE
>
> **Read first:** [README.md](README.md) §0 (Richard's words), §1 (the readings, file:line), §3 (R1–R4 ruled, D1–D8,
> **R5 open**), §6 (the board). Then the §6/§7 "Session 1" blocks of IW-000, IW-001, IW-002.
>
> **Rulings already given (do not re-ask):** R1 scored play is IN (shells; nothing earned is ever taken away);
> R2 wear and regrowth only while the game is open, things pause and never die; R3 real Blockly 12, customised
> Scratch-style for kids; R4 the order is ours (§6). **The mockup is graded:** Richard, 2026-09-29, on
> https://claude.ai/artifact/FQwh2xGNTKXxau4wtiMuX3 — *"the improvements in the artifact are perfect, exactly what I
> wanted"*. IW-004 builds THAT design (`dev-docs/tasks/phase-78-the-templates/tpl-012-mockups/island-jobs.html`;
> the block type names it inherits are in IW-000 §7).
>
> **Session 1 (2026-09-29/30) — merged on `cline-dev` (regeneration `2e50fc3aa`, then this handoff).** Three lanes in worktrees + a merge worktree
> (`p108-s1-merge`), brief `../OpenNoodl-worktrees/p108-COMMON-BRIEF-s1.md`. Its §4.2 job vocabulary held: the merge
> was the exact source union (numstat-proved); only generated files conflicted, then regenerated.
> - **IW-001 ✅** (lane A): Stop in Play's place, the run cap in the Runner, the first drawer tap places + opens the
>   card, `?` on the drawer, a tap selects never deletes, drawer and program in two boxes, the pad = the drawer's
>   actions, `cardsSeen` on the profile (save stays v4; row 15 written only when non-empty).
> - **IW-002 🟡** (lane J): the engine half — tile `L`, targets with `have/need`, sites by stage, containers, the can
>   as a thing, sources that refill, `job` + a BFS walk home + `job_done`, `WEAR` on the island tick only, `w.seed` +
>   mulberry32, `Start world`'s `seed` port. The island tick's new loop applies only to a request with a `job` (none
>   yet — IW-003). IW-002 §6 has the WEAR numbers and seven deviations.
> - **IW-000 🟡** (lane M): published, drive 61/61; the tablet reading and the children still owed.
>
> **Merged readings:** garden specs **551** (cg002 199, cg003Template 134, cg005 41, cg006 83, ig004Island 21,
> cg001 35, ig007 38; each exit 0) · `template:garden` exit 0 · page drive **331/331** (`--mockup`) ·
> IW-001 drive **38/38** · modes **90/90** · island **65/65** (AC6 p95 16.8 ms at CPU ×4) + 3D **5/5** · robots
> **60/60** + 3D **4/4** · Workshop 3D **24/24** + nogl **8/8** · Olive page **22/22** · shell **91/91** — every exit 0.
>
> **Session 2, three lanes (same recipe; write the shared contract into a NEW brief before launching):**
> 1. **Lane B — IW-004 real blocks on the kit:** `garden-kit.Blocks` on `BlockList`'s ports, Blockly 12.3.1 vendored
>    as three.js was, the mockup's customisations, thing + state conditions picked on the island, the Blockly ↔
>    engine translator, brain size. IW-001's `?`-on-drawer, tap-adds, Stop and pad carry over; its F5/F6 layout goes.
> 2. **Lane J — IW-005 seek and regrow in the engine:** `go to nearest` with reservation, `if here/ahead has`,
>    `go to [what Olive read]`, on IW-002's vocabulary (brief s1 §4.2).
> 3. **Lane D — IW-002's drawing in both kits:** the `L` wall, meters, the can level, site stages, the basket count,
>    the hen, the droop — reading `JOB_VOCABULARY` from `cg002Content.ts`; the pinned-copy gate green; screenshots looked at.
>
> **Open for Richard:** **R5** (README §3): the page's run cap is 2000 ticks ≈ 14 min; recommended ~200. The mockup
> on the tablet (IW-000 AC5: drag from the drawer / into a `repeat` / back to delete, 10 tries each) and the
> children's first sitting (IW-009 §2). P106's R11, R12 and IG-004 AC7 still stand (AC7 becomes IW-006's v4→v5 drive).
>
> **Traps paid for in session 1:** a `For Each` fed twice while it rebuilds keeps BOTH row sets (README §3, "found in
> session 1"; runtime-owned) — a repeater lane B or D feeds quickly needs lane A's settle latch until it is fixed.
> The live meters are NOT in the save (v4 = program + robot): after a restart a job plot starts from its request's
> start until IW-006's v5. The Workshop 3D drive can fail once when Garden 3D falls back to 2D ("Too Slow" under
> software GL) — rerun before believing a red.
>
> **Before any heavy job:** one heavy job on the box at a time; check for a peer's suite first.
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory.
