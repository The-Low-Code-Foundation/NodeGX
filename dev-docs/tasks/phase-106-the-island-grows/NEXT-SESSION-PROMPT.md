# Phase 106 — next session

> ### 🟡 2026-09-29 (session 3 built) — IG-003 ✅, IG-004 🟡 (the island is one world), s2's leftovers done/scoped; SESSION 4 = IG-005 ∥ the s3 leftovers — START HERE
>
> **The board (re-derived from the task files, 2026-09-29):**
>
> | Task | Status (the task file is the artefact) |
> |---|---|
> | [IG-000 the mockup](IG-000-THE-MOCKUP.md) | 🟡 published: https://claude.ai/artifact/9pxL78hWRmogb4VAreDrDM — AC1 (tablet fps) and AC4 (his grade) are **Richard's**, still blank |
> | [IG-001 the fixes](IG-001-THE-FIXES.md) | ✅ s1 |
> | [IG-002 resources](IG-002-RESOURCES-AND-SPRITES.md) | ✅ s2; s3 §7: the fold nudge holds back a run seen twice that does not start the list; a dry tulip keeps its colour (ΔE red↔yellow 20.0 → 46.7, both kits) |
> | [IG-003 Drive · Teach · Play](IG-003-DRIVE-TEACH-PLAY.md) | ✅ s3 — AC1–6 driven; the `?` on a placed block; the challenge on `tulips-three` + `sami-thanks`; `ig3` FR lines = **Richard's** read |
> | [IG-004 the island as a world](IG-004-THE-ISLAND-AS-A-WORLD.md) | 🟡 s3 — AC1–5 driven; AC6 Mac 2D p95 16.7 ms at CPU ×4 (gate 50); AC6's tablet (3D) = **Richard's**; AC7's packaged upgrade drive over a v3 save NOT run (needs a packaged build) |
> | [IG-005 robots for the job](IG-005-ROBOTS-FOR-THE-JOB.md) | ⬜ — **next, lane B** (its dep 004 is in: `island.robots` rows `{id}`, `r1` first; a robot works one plot) |
> | [IG-006 Olive reads](IG-006-OLIVE-READS.md) | 🟡 — AC5 FR read = **Richard's**; s3: the tall-tales CPU probe 2/3 again (a sample); `go to [what Olive read]` SCOPED, not built — a **ruling** (below) |
> | [IG-007 Garden 3D](IG-007-GARDEN-3D.md) | 🟡 — AC5 = **Richard's** grade, AC3 = the tablet; s3: the deploy's unchecked kit wires are R21 (GAM-024), not a defect |
> | [IG-008 the kids' verdict](IG-008-THE-KIDS-VERDICT.md) | ⬜ (last) |
>
> - **What session 3 did (`f182a2d9e` → `11ec09771` on `cline-dev`):** Richard ruled **R9** at the start — IG-004 as written put
>   13+ plots of 8×6 on 24×16 (room for ~6); he chose *a bigger island, one plot per request* (not the recommended "six places").
>   Lane E built it at **46×22** (5×3 slots: 13 requests + free play + home). Three lanes in worktrees (B IG-003, E IG-004,
>   F leftovers) from `../OpenNoodl-worktrees/p106-COMMON-BRIEF-s3.md` with a §4 contract (the request fields' exact lines,
>   the bar's icon classes and the `rec → keys → play` win path, the thing kinds per lane, the save v4 owner, drive files per
>   lane, word-key prefixes `ig3`/`ig4`/`igF`). Merged in `../OpenNoodl-worktrees/p106-s3-merge`, then fast-forwarded.
>   Source conflicts were all unions (two appended describe blocks, two table tails, two sprite/builder tables in both kits).
>   **One cross-lane defect**: E's "Find my robots" wore the `predict` icon B deleted — it drew no icon; fixed with a `find`
>   icon and a gate (every `bg-i-*` class in the artefact has its rule). Also committed: s2's red/yellow drive clause that
>   the s2 handoff left uncommitted in primary (`e8f8533bf`).
> - **Readings on the MERGED tree (`11ec09771`, 2026-09-29 15:00–15:45):** garden specs **471** (cg002 156, cg003Template 113,
>   cg001 32, ig007 34, ig004Island 12, cg005 41, cg006 83; was 421), every file exit 0; `template:garden` exit 0, **0 drift** on
>   a second run; page drive **327/327** exit 0 (a first run logged 327 PASS then crashed in the `--mockup` side-step — `go is
>   not defined` in the P105 mockup page — so it was re-run without `--mockup`: exit 0); modes drive (`drive-ig003-modes.js`)
>   **90/90**; island drive (`drive-ig004-island.js --perf`) **65/65**, AC6 p95 **16.7 ms** (1199 frames, 23 moves, CPU ×4);
>   island `--mode 3d` **5/5**; Olive pages **22/22** 0 skip; Workshop `--mode 3d` **24/24**, `--mode nogl` **8/8**; 3D fixture
>   **18/18**; shell **91/91**. Shots looked at: the 2D island (Pip on the won tulips, "done · Pip works here", the pin icon),
>   the 3D island (whole island, bubbles), the Workshop challenge hit (tick + "You were right!"). All in
>   `../OpenNoodl-worktrees/p106-s3-merge-scratch/pages/`.
> - **Session 4 (lanes in worktrees; write `p106-COMMON-BRIEF-s4.md` from s3's, with a §4 contract BEFORE launch):**
>   1. **Lane B — IG-005 robots for the job:** Pip, Cobble, Pocket, Echo; a palette per robot (a new input to `PALETTE_SCRIPT`),
>      unlocked by islanders (rewards become robots + upgrades), My robots; `island.robots` gains looks (IG-004 §7.1 says how);
>      the padlock's reason becomes the robot line ("Cobble can lay stones — Sami lends him after the letter"). The mockup's
>      `09-robots.png` is the screen.
>   2. **Lane G (small) — s3's leftovers, each measured first:** (a) the 3D island's framing clips its bottom-right corner
>      and Pip is hard to find at 1368 (`shots-ig004-3d/ig004-3d-island-1368.png`) — fit the camera to the 46×22 island;
>      (b) the Drive pad sits over the plot's lower-right tiles in the Workshop (`shots-ig003/…-07-hit.png`); (c) in Drive
>      with a program on the bar the owl still says "Press Teach and show Pip…"; (d) a stale running ring after One step then
>      Start over (the Runner's `glowId` never cleared, since P105 — lane B found it); (e) the old `.bg-sea`/`.bg-pin` CSS left
>      unused by lane E; (f) the `--mockup` side-step of `drive-cg003-pages.js` calls `go()` before the page is ready. Do NOT
>      retune the look beyond (a)/(b) without Richard's grade.
>   The orchestrator merges in a merge worktree, **one cherry-pick at a time, reading `git diff --name-only --diff-filter=U`
>   after each** (see the trap below), regenerates, gates once, fast-forwards.
> - **Rulings for Richard (plain words, from the § that measured them):**
>   (R10) **`go to [what Olive read]`** (IG-006 §7 s3): Mamie's note is the only request that would offer it, and its goal
>   REQUIRES `if Olive read [red tulip]` — so a `go to` program could never win it. Options: add `go to` with a new request
>   built around it (≈¾ of a lane) / let Mamie's note accept either / drop `go to` for good (recommended: drop — the `if` is the
>   lesson). (R11) **The challenge while teaching** (IG-003 §7 deviation 4): while Teach is on, Pip already stands on the
>   answer, so the question is empty; today pressing Drive puts Pip back at the start and the islander asks from there.
>   Keep that / ask only after Drive.
> - **For Richard (human), still owed:** (1) IG-000: the mockup on the tablet (`s` = stats) → AC1 fps, and your grade;
>   (2) IG-007 AC5: `shots/ig007-s2/sbs-*.png` — and now the 46×22 island in `shots/ig004-s3/`; (3) the FR lines: IG-006 §7,
>   IG-003 §7 (`ig3…`), IG-004 §7 (`ig4…`); (4) a Windows build carrying `garden-3d-kit` for the tablet (IG-007 AC3 + IG-004
>   AC6's 3D half) — say when to push CG-008's workflow; (5) the primary checkout's ROOT `package.json` is still the stripped
>   Nightbook manifest (`git show HEAD:package.json > package.json` once nobody needs it); (6) P105 s4's owed items.
> - **Traps paid for this session:** 🔴 **a "resolve only the generated files" shell helper dropped real source hunks** — the
>   first E merge lost E's kit sprites and its five island glue rows; the generator caught it (`Logic/Find robots … no such
>   component`). Redone one pick at a time; the proof that the merge is the exact union: `git diff --numstat ig004-world HEAD`
>   equals `git diff --numstat <base> <B+F merge>` up to the one-line comma joins. Also: a second `git cherry-pick A B` after a
>   `--continue` had already applied them leaves an empty pick pending (`--quit`); `sed '\b'` does not work on macOS.
> - **End of session:** `/next` — this block rewritten, README §5 from the task FILES, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.

## Earlier

> ### 🟡 2026-09-29 (session 2 built) — IG-002 ✅, IG-006 🟡, IG-007 🟡
>
> Three lanes (IG-002 ∥ IG-006 ∥ IG-007 placement) in worktrees, `f784833b8` → `0a5f49077`: the shared vocabulary written into
> the brief before launch kept the 3D pinned-copy gate 29/29 at the merge; five cross-lane reds fixed (fill's card, `\bask:`,
> rocks outside path-stones, Mamie's rows drawing one colour — seen only in the screenshot —, the 3D can level). Merged: 421
> specs, page drive 327/327, Olive 22/22, shell 91/91, Workshop 3D 23/23 + nogl 8/8.


> ### 🟡 2026-09-29 (session 1 built) — IG-001 ✅, the 3D mockup published, `Garden 3D` built
>
> Three lanes (IG-001 ∥ IG-000 ∥ IG-007) in worktrees, `4020fd1c0` → `48d08c8df`: the ten fixes driven (specs 337→373, page
> drive 161→179, Olive page drive 17→22, shell 89→90); the mockup published; `library/modules/garden-3d-kit/` on `Garden`'s
> exact ports with three.js 0.158.0 vendored (r158 = the last UMD build). The merge of two green lanes read 18/20 on the 3D
> gate (thing kinds added in one lane, helpers copied in the other) — fixed in the merge commit.

> ### 📋 2026-09-28 (scoping, no build) — Richard ruled "go 3D and open world"; nine tasks scoped
>
> Richard played the packaged "Olive's Island" (P105 s4) and gave seven points and two global asks; each was measured
> against the source (README §1) and he ruled the same day. R1–R8 are taken as recommended (README §3). The board is
> IG-000–IG-008 (README §5). Session 1's plan (as run): IG-001 ∥ IG-000 ∥ IG-007 in worktrees; the P18 four-lane recipe.
