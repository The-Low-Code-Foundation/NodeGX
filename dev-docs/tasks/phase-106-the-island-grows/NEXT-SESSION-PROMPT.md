# Phase 106 — next session

> ### 🟡 2026-09-29 (session 2 built) — IG-002 ✅, IG-006 🟡, IG-007 🟡 (placed + the fallback); SESSION 3 = IG-003 ∥ IG-004 (+ the s2 leftovers) — START HERE
>
> **The board (re-derived from the task files, 2026-09-29):**
>
> | Task | Status (the task file is the artefact) |
> |---|---|
> | [IG-000 the mockup](IG-000-THE-MOCKUP.md) | 🟡 published: https://claude.ai/artifact/9pxL78hWRmogb4VAreDrDM — AC1 (tablet fps) and AC4 (his grade) are **Richard's**, still blank |
> | [IG-001 the fixes](IG-001-THE-FIXES.md) | ✅ s1 |
> | [IG-002 resources](IG-002-RESOURCES-AND-SPRITES.md) | ✅ s2 — fill/the can, stones mined, the load drawn, tulips + path-stones as fetch-and-return (§7) |
> | [IG-003 Drive · Teach · Play](IG-003-DRIVE-TEACH-PLAY.md) | ⬜ — **next, lane B** |
> | [IG-004 the island as a world](IG-004-THE-ISLAND-AS-A-WORLD.md) | ⬜ — **next, lane E** (its deps 002 + 007 are in) |
> | [IG-005 robots for the job](IG-005-ROBOTS-FOR-THE-JOB.md) | ⬜ (session 4) |
> | [IG-006 Olive reads](IG-006-OLIVE-READS.md) | 🟡 s2 — AC1–4, 6, 7 driven; AC5 FR read = **Richard's** (the list is in §7); AC8 CPU exam 2 of 3; `go to [what Olive read]` not built |
> | [IG-007 Garden 3D](IG-007-GARDEN-3D.md) | 🟡 s2 — AC1 (Mac, software GL), AC2, AC4, AC6's module/picker/template driven; AC5 = **Richard's** grade (`shots/ig007-s2/sbs-*.png`), AC3 = the tablet (needs a Windows build carrying `garden-3d-kit`) |
> | [IG-008 the kids' verdict](IG-008-THE-KIDS-VERDICT.md) | ⬜ (last) |
>
> - **What session 2 did (`f784833b8` → `b5ccf224a` on `cline-dev`, three lanes in worktrees + the orchestrator's merge):**
>   the P18 recipe with one change that worked — the **shared vocabulary written into the common brief before launch**
>   (`../OpenNoodl-worktrees/p106-COMMON-BRIEF-s2.md` §4: `rock{left}`, `sign`/`note{text}`, the exact `parseRobots` lines
>   `can`/`canMax`/`carry`): the 3D pinned-copy gate read 29/29 at the merge (s1: 18/20). The merge still produced five
>   cross-lane reds, all fixed in `c2582979c`, `d445ec639`, `1a823b4b5`, `12bfbd9ea`: `fill` had no card (IG-006's "every block
>   has a card"); IG-006's `ask:` scan matched `setMask:function` in the vendored three.min.js (→ `\bask:`); IG-002's "no rocks
>   outside path-stones" met IG-006's `rock-flower`; **Mamie's red and yellow rows drew identically** (Draw world dropped the
>   tulip's `color`; the 3D kit read `colour`) — found only in the SCREENSHOT, now `tulipYellow` + a drive clause; IG-007's
>   Workshop drive hard-coded the old tulips, and re-pointed at the new ones it found a **real 3D defect** (a Robots write
>   that changed only the can/load/look never redrew the robot) — fixed with a gate clause. `make-worktree.sh` now links the
>   five garden build outputs (`33f6c4cb4`).
> - **Readings on the MERGED tree (primary, `cline-dev`, 2026-09-29 11:10–12:15):** garden specs **421** (cg001 27, cg002 137,
>   cg003Template 103, cg005 41, cg006 83, ig007 30; was 373) on `b5ccf224a`, every file exit 0; both kits rebuild
>   byte-identical; the generator exit 0 and **0 drift** on a second run; page drive **327/327**, 0 console / 0 network errors
>   (was 179) and Olive route **5/5**, Olive pages **22/22** 0 skip, shell **91/91**, the 3D fixture drive **18/18** — all on
>   `d445ec639` (after it only the 3D kit and its own drive changed; the 2D drives run the 2D node: no WebGL2 in that Chrome);
>   Workshop 3D drive **23/23** (`--mode 3d`, swiftshader: engine and 3D node agree on tile, facing, wet tulips and the can at
>   all 27 presses, win, Predict, the slow-swap) and **8/8** (`--mode nogl`) on `b5ccf224a`. Real model (lane C's worktree,
>   10:40–10:51): `read` 6/6, 5/6, 5/6 Metal and 5/6 ×3 CPU; `is it a…?` 17–18/18 on every run; the contract PASS 3/3 Metal,
>   2/3 CPU (P18, the tall-tales lesson: she kept the fence 2 of 3). Frame Ms under software GL 17–28 ms p95 — a readout, not AC3.
> - **Session 3 (lanes in worktrees; `make-worktree.sh` links everything now; write a `p106-COMMON-BRIEF-s3.md` from s2's,
>   with a §4 contract for what B and E share — the request field `plot`, the save v4 shape, the bar's states — BEFORE launch):**
>   1. **Lane B — IG-003:** Drive (move, nothing recorded, every allowed action on the pad) · Teach · Play on the bar; Predict
>      cut and re-entered as an islander challenge (R4, R5). Workshop bar + pad + Record step.
>   2. **Lane E — IG-004:** the island as one world (24×16, plots from requests, save v4, pinned programs, the island tick,
>      the Island page on `Garden 3D` with the 2D fallback). The mockup has the screens: `tpl-012-mockups/island-3d/01-island.png`,
>      `03-island-find-robots-stats.png`, `13-island-two-robots.png`. Island page + save model + tick.
>   3. **Lane F (small) — the s2 leftovers, each measured first:** (a) the fold nudge offers `turn right, forward` ×2 inside
>      the tulips dance before the nine-block body repeats (seen in `shots/ig007-s2` / the 3D drive's shot 03) — a child who folds
>      it first changes the shape the reference expects; (b) dry red vs dry yellow tulips read mauve vs tan at
>      `saturate(.3)` — Mamie's note asks the child to tell them apart BEFORE watering; (c) IG-006 `go to [what Olive read]`
>      (needs path-finding: scope it or cut it); (d) the `?` on the placed block itself (IG-006 deviation 2, a kit `onHelp`);
>      (e) the tall-tales probe on CPU (re-run 3×; a sample, not a verdict); (f) the deploy tool's wire checker publishes all
>      five kit node types unchecked (IG-007 §7). Do NOT retune the look without Richard's grade.
>   The orchestrator merges (cherry-pick per lane, generated trees REGENERATED, never hand-merged) and expects cross-lane reds
>   in coverage clauses, artefact scans and drives that name another lane's request — budget for them.
> - **For Richard (human):** (1) IG-000: the mockup on the tablet (`s` = the stats line) → AC1's p95/fps, and your grade
>   (AC4); (2) IG-007 AC5: look at `shots/ig007-s2/sbs-ws.png`, `sbs-robot.png`, `sbs-island.png`, `sbs-vocab.png` (node beside
>   mockup) and say what is wrong — also whether the pond at the island's edge reads as water or as sea; (3) IG-006 AC5: read
>   the French card and lesson lines listed in IG-006 §7 before the kids see them; (4) the tablet reading for IG-007 AC3 needs a
>   Windows build that carries `garden-3d-kit` (CG-008's workflow — say when to push it); (5) the primary checkout's ROOT
>   `package.json` is still the stripped Nightbook manifest from 2026-09-28 19:14 (every root `npm run` dead; restore with
>   `git show HEAD:package.json > package.json` once nobody needs it — s2 ran the generator as
>   `npx ts-node -T -P ./scripts/tsconfig.json ./scripts/generate-garden-template.ts`); (6) the P105 s4 items stay owed:
>   the Windows run-5 logs, the tablet's Olive timings, the FR read of IG-001's lines.
> - **Traps paid for this session:** a rate limit stopped lane D mid-job — `SendMessage` resumed it with context (measure the
>   worktree first); zsh split a template path with a space inside `$(…)`, the checkout failed, and a `;` chain let
>   `cherry-pick --continue` COMMIT conflict markers (caught by `git grep -l '^<<<<<<< ' HEAD`, fixed by regenerate + amend) —
>   to resolve a generated tree: run the generator, grep for markers = 0, then `git add`; a drive clause that compares ENGINE
>   state passed while the rows looked identical — look at the screenshot.
> - **End of session:** `/next` — this block rewritten, README §5 from the task FILES, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.

## Earlier

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
