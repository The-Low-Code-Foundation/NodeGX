# Phase 106 — next session

> ### 🟡 2026-09-29 (session 4 built) — IG-005 ✅, s3's six leftovers ✅; SESSION 5 = the owed reads + IG-004 AC7's packaged drive + the lend chain played — START HERE
>
> **The board (re-derived from the task files, 2026-09-29):**
>
> | Task | Status (the task file is the artefact) |
> |---|---|
> | [IG-000 the mockup](IG-000-THE-MOCKUP.md) | 🟡 published: https://claude.ai/artifact/9pxL78hWRmogb4VAreDrDM — AC1 (tablet fps) and AC4 (his grade) are **Richard's** |
> | [IG-001 the fixes](IG-001-THE-FIXES.md) | ✅ s1 |
> | [IG-002 resources](IG-002-RESOURCES-AND-SPRITES.md) | ✅ s2 (+ s3 §7) |
> | [IG-003 Drive · Teach · Play](IG-003-DRIVE-TEACH-PLAY.md) | ✅ s3; s4 §8 (lane G): the pad BESIDE the world (a phone keeps the corner overlay), Drive's owl line `hintDriveReady`, the ring off when a run stops (`Logic/Glow`), the `--mockup` side-step a clause |
> | [IG-004 the island as a world](IG-004-THE-ISLAND-AS-A-WORLD.md) | 🟡 AC1–5 driven; AC6 Mac 2D p95 16.7 ms; s4 §8: the 3D island framed whole (`frameRect`), names over bubbles, the dead sea removed. Still owed: **AC7's packaged upgrade drive over a v3 save** (needs `dist:mac`), AC6's 3D half = the tablet |
> | [IG-005 robots for the job](IG-005-ROBOTS-FOR-THE-JOB.md) | ✅ s4 (lane B), AC1–6 driven — 11 deviations in §7.5 (Cobble lent by the post-box walk, not the letter; a lend comes WITH the reward; palettes widened so every request stays winnable; AC3 as six pours; save stays v4 with optional row fields) |
> | [IG-006 Olive reads](IG-006-OLIVE-READS.md) | 🟡 AC5 FR read = **Richard's**; `go to` = R10 |
> | [IG-007 Garden 3D](IG-007-GARDEN-3D.md) | 🟡 AC5 = **Richard's** grade, AC3 = the tablet |
> | [IG-008 the kids' verdict](IG-008-THE-KIDS-VERDICT.md) | ⬜ (last) |
>
> - **What session 4 did (`7ed9f065e` → `5a68392a6` on `cline-dev`, 11 commits):** two lanes in worktrees from
>   `../OpenNoodl-worktrees/p106-COMMON-BRIEF-s4.md` (§4 contract: lane regions, the robot row `accessory` field,
>   `ig5`/`igG` word prefixes, save-shape-first). Lane B (agent) built IG-005; lane G (the orchestrator) did s3's
>   (a)–(f). Merged in `../OpenNoodl-worktrees/p106-s4-merge` one cherry-pick at a time: ONE source conflict (the
>   `GLUE_SCRIPTS` tail, a union), the rest generated files (regenerated). **Union proof:** `git diff --numstat
>   ig005-robots <merge>` = `git diff --numstat 7ed9f065e p106-s4-leftovers` on every non-generated path — identical.
>   Kits rebuilt + regenerated after the last pick: 0 drift. No cross-lane red this time.
> - **Readings on the MERGED tree (`5a68392a6` minus the board commit; 2026-09-29 18:20–19:02), every exit 0:** garden
>   specs **502** (cg002 167, cg003Template 124, cg001 34, ig007 38, ig004Island 15, cg005 41, cg006 83; s3 471); page
>   drive **with `--mockup` 328/328** (generate/assemble/deploy 0, 0 drift; the mockup clause and the D8 clause pass);
>   modes **90/90**; island `--perf` **65/65**, AC6 p95 **16.7 ms** (1199 frames, 23 moves, CPU ×4); island `--mode 3d`
>   **5/5**; robots (`drive-ig005-robots.js`) **60/60**, `--mode 3d` **4/4**; Workshop `--mode 3d` **24/24**, `--mode nogl`
>   **8/8**; Olive pages **22/22** 0 skip; 3D fixture **18/18**; shell **91/91**. Shots looked at: Cobble's Workshop (hod,
>   pick/put keys, pad beside), the 3D Workshop with the pad beside, the island with Pip and Cobble on their plots, My
>   robots, the robot padlock line, the 3D island whole. Logs: `../OpenNoodl-worktrees/p106-s4-merge-scratch/`.
> - **Where the old handoff was wrong / refined:** (c) the owl line was `hintStart` (voiced; IG-003 AC5 pins it for
>   Teach) — fixed with a Drive-only key, not a reword. (f) did NOT reproduce standalone (`go` defined at once); the
>   render-blocking Google font is the inferred cause; the fix makes it a clause either way. (e) `Logic/Island pins` is
>   NOT dead (Island world reads it) — only its two class fields, `PIN_PLACES` and the CSS were.
> - **Session 5, in order (build first — `build-the-tasks-do-not-farm-the-defects`):**
>   1. **IG-004 AC7 — the packaged upgrade drive over a v3 save** (P105 CG-004's drive; now v4 with robot rows).
>      Needs `dist:mac`: ONE heavy job, alone on the box, nothing else of yours running.
>   2. **The lend chain PLAYED, not written into the store:** a drive that wins post-box → Cobble, bowl → Pocket,
>      mamie-note → Echo through the UI (IG-005 §7.6: today Pocket/Echo arrive by a store write); boots/basket+ driven.
>   3. If a lone Teach-pad press is dropped again (lane B saw it twice in eight runs; the merged gates did not),
>      measure it — it is a candidate product defect (a press lost), not only a flake.
>   4. R10/R11 once ruled; then IG-008 when Richard says the kids can play.
> - **Rulings for Richard (plain words):** (R10) `go to [what Olive read]` — only Mamie's note would offer it and its
>   goal REQUIRES `if Olive read [red tulip]`, so a `go to` program could never win it: build a request around it (≈¾
>   lane) / let the note accept either / **drop it (recommended)**. (R11) while Teach is on, Pip already stands on the
>   answer, so today pressing Drive puts Pip back and the islander asks from there: keep / ask only after Drive.
>   **(R12, new, a look grade)** the Workshop pad now sits BESIDE the world: at 1024 × 768 the world is 352 px (8 × 44 px
>   tiles) where it was ~548 px under the pad; at 1368 it keeps 640; a phone keeps the overlay (IG-003 §8). Keep /
>   overlay back at tablet widths.
> - **For Richard (human), still owed:** (1) IG-000 on the tablet (`s` = stats) → AC1 fps, and your grade; (2) IG-007
>   AC5 `shots/ig007-s2/sbs-*.png`, the island `shots/ig004-s3/`, and now My robots vs the mockup's `09-robots.png`
>   (`shots/ig005-s4/`); (3) the FR lines: IG-006 §7, IG-003 §7 (`ig3…`), IG-004 §7 (`ig4…`), IG-005 §7 (`ig5…`, « Poche »,
>   « Écho »), IG-003 §8 (`hintDriveReady`); (4) a Windows build carrying `garden-3d-kit` for the tablet — say when to
>   push CG-008's workflow; (5) the primary checkout's ROOT `package.json` is still the stripped Nightbook manifest;
>   (6) P105 s4's owed items.
> - **Traps paid for this session:** a `check; git merge --ff-only` chain joined by `;` ran the fast-forward after the
>   check itself failed (a wrong path) — git's own untracked-overwrite refusal was the only guard; join a gate and its
>   action with `&&`. A new flex layout at a basis tuned for 1368 wrapped the pad OFF the first screen at 1024 × 768 —
>   shoot the widths in between (a scratch copy of `drive-ig003-modes.js` with other VIEWPORTS did it in 4 min).
> - **End of session:** `/next` — this block rewritten, README §5 from the task FILES, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.

## Earlier

> ### 🟡 2026-09-29 (session 3 built) — IG-003 ✅, IG-004 🟡, s2's leftovers
>
> R9 ruled (a bigger island, one plot per request → 46×22). Three lanes (IG-003 ∥ IG-004 ∥ leftovers), `f182a2d9e` →
> `11ec09771`: one cross-lane defect (Find my robots wore a deleted icon; now a gate). 🔴 A "generated-only" conflict
> helper dropped real source hunks — merges go one pick at a time since. Merged: 471 specs, pages 327/327, modes 90/90,
> island 65/65 (+3D 5/5), Olive 22/22, Workshop 3D 24/24 + 8/8, fixture 18/18, shell 91/91.


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
