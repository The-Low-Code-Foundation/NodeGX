# Phase 106 — next session

> ### 🟡 2026-09-29 (session 1 built) — IG-001 ✅, THE 3D MOCKUP IS PUBLISHED, `Garden 3D` EXISTS; SESSION 2 = IG-002 ∥ IG-006 ∥ IG-007's PLACEMENT — START HERE
>
> **The board (re-derived from the task files, 2026-09-29):**
>
> | Task | Status (the task file is the artefact) |
> |---|---|
> | [IG-000 the mockup](IG-000-THE-MOCKUP.md) | 🟡 built, published: https://claude.ai/artifact/9pxL78hWRmogb4VAreDrDM — AC1 (tablet fps, Edge) and AC4 (his grade) are **Richard's**, blank lines in §7 |
> | [IG-001 the fixes](IG-001-THE-FIXES.md) | ✅ 11/11 ACs, driven (§7) |
> | [IG-002 resources](IG-002-RESOURCES-AND-SPRITES.md) | ⬜ — **next, lane A** |
> | [IG-003 Drive · Teach · Play](IG-003-DRIVE-TEACH-PLAY.md) | ⬜ (session 3, lane B) |
> | [IG-004 the island as a world](IG-004-THE-ISLAND-AS-A-WORLD.md) | ⬜ (session 3, after 002 + 007) |
> | [IG-005 robots for the job](IG-005-ROBOTS-FOR-THE-JOB.md) | ⬜ (session 4) |
> | [IG-006 Olive reads](IG-006-OLIVE-READS.md) | ⬜ — **next, lane C** (D6/D7 it needed are in) |
> | [IG-007 Garden 3D](IG-007-GARDEN-3D.md) | 🟡 module, node, gate 20/20, Mac drive 17/17 (§7); **AC1 placement, AC4 fallback, AC5 side-by-side, AC3 tablet open — next, lane D** |
> | [IG-008 the kids' verdict](IG-008-THE-KIDS-VERDICT.md) | ⬜ (last) |
>
> - **Session 2 (three lanes in worktrees, `scripts/devtools/make-worktree.sh`, a common brief as
>   `../OpenNoodl-worktrees/p106-COMMON-BRIEF-s1.md` — reuse it, bump the date and the readings):**
>   1. **Lane A — IG-002:** `fill`/the can, stones from rocks, the load drawn; tulips and path-stones rewritten as
>      fetch-and-return. Owns `cg002Content.ts`. The pad already takes `allowed` and has a `fill` row waiting for the block type
>      (IG-001 §7 deviation 7). Both renderers read one vocabulary: the 3D kit's `THING_BUILDERS` has `stone`/`postbox`/…
>      as one-or-two-primitive entries (merge commit `48d08c8df`), `rock{left}` sizes and the can level are still hooks.
>   2. **Lane C — IG-006:** the three blocks, the cards, five lessons, the exam re-cut. The stub Olive takes scripted
>      answers per rung now (`shell/olive-stub.js` `answers`, `delayFor`; IG-001 §7). Shares nothing with A but the word table.
>   3. **Lane D — IG-007 AC1/AC4/AC5:** place `Garden 3D` under `Garden`'s wires in the Workshop behind a `renderer` States
>      node (`useTransitions:false`), the rule-based fallback (`Supported` false, or `Frame Ms` p95 > 50 ms for 3 s after
>      Ready, only while visible), the Grown-ups line + switch, the template's `noodl_modules/` carrying the kit; then the
>      side-by-side against `tpl-012-mockups/island-3d/*.png` — the mockup's robot has a visor, antenna, hat, accessory and
>      a can; the node's is plainer (`shots/ig007-s1/`). Camera tilt: 35° from straight down in the node, "a 35° camera" in
>      the mockup — flip after the side-by-side. This lane edits `cg003Components.ts` (A does not this session).
>   The orchestrator merges (cherry-pick per lane), runs the merged gates ONCE, and **expects a merge-created red**: s1's
>   merge read 18/20 on the 3D gate because both lanes were green alone (A added tile/thing kinds, D had copied the
>   helpers) — the pinned-copy gate is there for exactly that; fix in the merge commit.
> - **For Richard (human):** (1) open the mockup on the tablet, press `s`, write the p95/fps into IG-000 §7 AC1 and grade
>   the look (AC4) — IG-007's look and R2's tablet gate both wait on it; (2) the primary checkout's ROOT `package.json`
>   was overwritten at 19:14 on 2026-09-28 with a stripped Nightbook shell manifest (not by any OpenNoodl session that
>   answered; every root `npm run` is dead until `git show HEAD:package.json > package.json` — the classifier refused the
>   restore; s1 ran the generator through `npx ts-node -T -P ./scripts/tsconfig.json ./scripts/generate-garden-template.ts`);
>   (3) the P105 s4 items stay owed: the Windows run-5 logs, the tablet's Olive timings, the FR read (now incl. IG-001's
>   new lines `hintPerfect`, `hintFree`, `sOliveSaysYes/No`).
> - **Readings on the MERGED tree (primary, `cline-dev` `48d08c8df` + this docs commit, 2026-09-29 07:30–07:50):**
>   garden specs **373** (cg001 22, cg002 122, cg003Template 92, cg005 34, cg006 83, ig007 20; was 337 + 0);
>   `generate-garden-template` exit 0, **0 drift** (twice); page drive **179/179** exit 0, 0 console errors (was 161);
>   Olive page drive **22/22**, 0 skip (was 17); shell **90/90** (was 89). Lane readings in each task file's §7.
> - **Traps paid for this session:** a rate limit killed all three lanes mid-turn — resume each with its agent id (context
>   intact) after measuring its worktree; `echo ======` is zsh's `=cmd` expansion (quote it); three gitignored build
>   outputs a garden lane needs that `make-worktree.sh` does not link: `packages/noodl-mcp/dist` (the kit extractor),
>   `packages/nodegx-export/dist`, `packages/nodegx-core/dist` — symlink them read-only from primary (add to the script);
>   three.js r158 is the last UMD `three.min.js` (r160 removed it) — pin exactly `0.158.0` or vendor the module build.
> - **End of session:** `/next` — this block rewritten, README §5 from the task FILES, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.

## Earlier

> ### 📋 2026-09-28 (scoping, no build) — Richard ruled "go 3D and open world"; nine tasks scoped
>
> Richard played the packaged "Olive's Island" (P105 s4) and gave seven points and two global asks; each was measured
> against the source (README §1) and he ruled the same day. R1–R8 are taken as recommended (README §3). The board is
> IG-000–IG-008 (README §5). Session 1's plan (as run): IG-001 ∥ IG-000 ∥ IG-007 in worktrees; the P18 four-lane recipe.
