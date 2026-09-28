# Phase 105 — next session

> ### 📋 2026-09-28 (CG s2) — THE GAME PLAYS END TO END IN THE BROWSER; THE MAC APP PACKAGES AND LOADS THE OWL — START HERE
>
> - **Done on `cline-dev` (10 commits, `5a6f0031a` → `14e852f50`):** CG-006 the requests (`5a6f0031a`) · CG-004 the
>   control launch + the packaging fix (`e90a93f3d`) · CG-005 Olive in the game (`859460589`) · the B/C reconciliation
>   (`af343f439`) · the model runs recorded (`10b86c28d`) · CG-003 + CG-007 the pages and the look (`bc9ea83db`
>   `93e11960d` `5025a00bd`, then the drive's fixes `1b4344cc5` `14e852f50`).
> - **Readings taken this session (2026-09-28, on the primary checkout, at the commit named):**
>   - `14e852f50`: `cg003Template` **47/47**; `npm run template:garden` exit 0, **0 drifted files**; the page drive
>     `drive-cg003-pages.js` **121/121, exit 0** (EN + FR, 1368×912 + 390×844, 0 console / 0 network errors,
>     screenshots looked at: CG-007 §7.1).
>   - `af343f439`: `cg005Olive` + `cg002Engine` + `cg006Requests` **212/212**; shell `node --test` **69/69**; lane C's
>     route drive **4/4**; the Olive contract test on the real model **19/20 on Metal and on CPU** (the red moves: P15
>     on Metal, P02 = the EN thank-you ruling on CPU), **AC7 dial ✅** both paths; lane B's §4 probes on the real model:
>     E3 E4 E5 E8 E9 E10 promoted, E2 E6 E7 dropped (CG-006 §7.1).
>   - `e90a93f3d`: `drive-upgrade.js` **PASS** (AC8 + AC9, the fresh-home control included, 150 requests all to
>     127.0.0.1); AC4 in Electron (no model: fallback in 0.8–1.6 ms); packaged `Bot Garden.app` loads the model on
>     Metal (EN 747 ms, FR 1106 ms) — CG-004 §7.2.
>   - CG-005's page clauses on the deployed template: **1 PASS, 4 SKIP** (their hooks are not on the pages yet).
> - **Where the last handoff was wrong:** "blocked by a LOCKED SCREEN" — the control launch hung with the screen
>   unlocked too. A `/usr/bin/sample` of the main thread showed AppKit's "reopen windows?" alert before `ready` (two
>   drive-ended launches of the shared dev bundle id); `drive-lib.js` now passes `-ApplePersistenceIgnoreState YES`.
>   Also: the primary checkout's `shell/node_modules` had lost 22 nested packages in its move from the worktree —
>   `npm ci` in `shell/` repaired it (380 packages, no lockfile change).
> - **Defects found and fixed this session:** the packaged owl could not load (`build.files` excluded
>   `node-llama-cpp/llama/**`, which holds runtime JSON) · `exam.js` graded every recorded probe `pass = met`, so rung 9
>   would have been offered · the eggs goal was met without reading `count = 4` · a row field `fill` (a Noodl Object
>   name) · the win card top-aligned · FR on an empty Profiles jumped to the island · at 390 px the bar made the page
>   506 px wide and every tap landed at 0.77× its target.
>
> **Session 3, in order** (one orchestrator; lanes only if two of these run at once without sharing files):
> 1. **Ask Richard the rulings first** (plain words, from the section that measured each; the list is below). Several
>    are one edit each once he answers.
> 2. **CG-005's page hooks** (CG-005 §7.1, CG-003 §7.2): a second `Ask Olive` for the voiced hint, the "Use them / No
>    thanks" card on `Step.proposal`, the `Olive slots` refusal beside the picker, the owl's thinking / resting tags,
>    requests carrying `rungs`; repoint `drive-cg005-olive.js` from `[data-owl-row]` to `.bg-owl-say`. Done when the
>    page clauses read 5/5 PASS (`DEPLOY=<deploy dir> zsh drives/drive-olive.sh pages`; the deploy dir is what
>    `zsh drives/drive-pages.sh` builds — set `OUT=` to a scratch dir for both; `drives/` holds this session's wrappers).
> 3. **CG-006:** flip `MOMENTS` decisions in `cg006Probes.ts` from `awaiting-probe` to the measured ones, promote
>    E3 E4 E5 E8 E9 E10 into §3 as rungs with templates in `olive-templates.json`; the shell's 7 voiced-hint lines
>    duplicate CG-002's hint lines (drift hazard) — one source.
> 4. **CG-007:** the four look items in §7.1 (the request's own blurb, the owl glyph on Ask Olive, filled progress dots,
>    the two robots told apart by name/colour), a design pass on the bare Profiles page, the kit's `icon.png`.
> 5. **CG-004 → CG-008:** `build-app.js --project templates/bot-garden` (it still uses `templates/todo-list`), then the
>    upgrade drive's two `STEP-NEEDS-CG-003` clauses (a profile kept across 0.0.1 → 0.0.2) now that the pages exist, and
>    the drive's no-model branch (skip the exam wait when `model` is `none`). Then CG-008: the Windows installer on the
>    runner and the tablet.
>
> **Rulings awaited from Richard** (none blocks items 2–5):
> - README §2 **D1–D3**: the name ("Bot Garden", Olive, Pip), one island per family, the first three requests.
> - **The fold tie-break** (CG-002 §7): `F F F F` folds to `repeat 2 {F F}` (the mockup's rule), not `repeat 4 {F}`.
> - **Rung 9's rule** (CG-006 §7.1): G1 "no letter e" fails 3/3 on both paths as the lesson needs; G2 "never mention
>   water" is obeyed 3/3. The evidence points at G1.
> - **The EN thank-you must-contain** (CG-006 §7.1): A (a wider word list) met 2/3, B (none for EN) met 3/3.
> - **Olive in band 7–9?** (CG-006 §7 finding 5): no band-1 palette has `say`/`ask`/`if`, so the rungs framed for 7–9
>   cannot be reached there.
> - **Contrast** (CG-007 §7 AC6): the mockup's white labels on its fills are 2.05–3.67:1 (below 4.5). Restyle or accept.
> - **The island** is the kit's tile world with a water border, not the mockup's sea with pins (CG-007 §7).
> - **The French copy** (CG-006 AC3): he reads it before the kids see it.
>
> - **Traps paid for this session** (details in the task files and memory): `sample` the main thread before theorising
>   about a GUI launch that never draws (`/usr/bin/sample`, the Homebrew one is broken) · this shell carries
>   `ELECTRON_RUN_AS_NODE=1`: `env -u` it for any packaged binary · `pgrep -f <abs path>` matches the backend (same
>   binary) and misses a relative launch · a hung Electron main ignores SIGTERM and its CDP port hangs `curl` (`-m 2`) ·
>   zsh splits `$(…)` on spaces: `git reset -- $(git diff --name-only …)` over `Page head/` left 178 index entries stale
>   · the primary `package.json` carries another session's unstaged edit on the `template:*` lines — lane A was
>   committed through a temporary index (`GIT_INDEX_FILE`, `commit-tree`, `update-ref` with the old value) and the
>   working tree kept that edit · mobile Chrome shrinks a page wider than the viewport, so "no horizontal scroll" can
>   pass while every tap lands at the wrong place — assert `innerWidth`.
> - **Known reds that are not ours:** as in s1 (`noodl-mcp` whole-suite 8 suites red at the base; `library:check` 80/81
>   on the untracked `nightbook-kit`). Not re-measured this session.
> - **Worktrees left:** `OpenNoodl-worktrees/{cg003-pages,cg006-requests,cg005-olive}` — every commit is on `cline-dev`
>   (lane A's as rewritten hashes); remove them with `git worktree remove` when convenient. The common brief for lanes
>   is `../OpenNoodl-worktrees/p105-COMMON-BRIEF-s2.md`.
> - **End of session:** `/next` — this block rewritten, README §4 from the task files, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.
