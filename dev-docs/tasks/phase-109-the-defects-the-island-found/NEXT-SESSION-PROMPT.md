# Next session — P109 session 35

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 34 (2026-10-09, on `cline-dev`):** built in worktree `p109-isl049` (branch `p109-isl050`), landed by compare-and-swap.
Board: **28 of 51 closed**.

- **ISL-048 at 27 of 29** — C139 `c22c9aceb`: a Component Stack input **Keep Pages When Unmounted** (`keepPagesWhenUnmounted`,
  default off); a remount keeps the pages unless, while off, its Components were written, its Name moved key, or (Use Routes)
  the address moved. Page Stack **v17**. Use Routes decided, not asked: the address is the stack's, so a moved address resets.
- **ISL-013 ✅** — slice 2 `676395627`: garden-3d-kit `requires` garden-kit and reads its world helpers and job table through
  `Noodl.getModule` (22 byte-identical copies and the `__noodl_modules` walk gone); a refused kit is pushed onto
  `__noodl_module_failures`, so Settings → Kits names it. AC1 (five arms) and AC4 (3D and 2D) driven on deployed pages, AC3 in the
  editor, AC6 census 34/38 identical (the rest the two adopting kits).
- **ISL-051 ✅ 6 of 6** — took in P107's C149 and fixed it, `dde400937`: a Visual Function whose blocks send a reserved signal
  fails the run (Error kept, no Success, no Done). Visual Function **v2**.
- `63eebbc9b`: the workshop drive's Grown-ups clause expected the pre-P108-s9 line (`guRend3dLine`; the page shows `guRend3dKept`).

## Do, in this order

0. **New from P107 s68 (R16), both with a proposed fix — take them into ISL-051 (the Expression family):**
   [P107-C150](../../bugs/p107-c150-an-expression-reading-an-array-never-re-runs-when-the-array-changes.md) (medium: an Expression
   reading `Arrays.x` never re-runs when the array changes — `expression-evaluator.ts` `subscribeToChanges` listens to a Model of
   that name) and [P107-C151](../../bugs/p107-c151-an-expression-hands-the-noodl-api-to-the-wrong-parameter.md) (low: a stray input
   hands the Noodl API to the wrong parameter, so Variables reads nothing). Expression spec **v4** pins today's behaviour
   (`f4a244785`); the fix moves it to **v5** with the named scenario. ISL-051 reopens to 6 of 8 when taken in.
1. C120, C126 (ISL-048's last two) still wait on P107's world (history back, an entry replaced) — ask P107 if it has moved.
2. ISL-018 AC5 (an agent round, then the editor's clean-up log), ISL-012 AC3 (a full server render with hydration).
3. **Track G** waits on Richard's order.

## What s34 learned

- **A deployed drive grades the deploy ENGINE's build date, not the source.** `nodegx deploy` runs
  `noodl-preview/dist/nodegx-deploy.cjs` and copies `noodl-editor/src/external/deploy/index.js` — both gitignored. They were
  older than ISL-013 slice 1, so kits loaded alphabetically and `Noodl.getModule` did not exist on the page, while every loader
  spec was green. Before any deployed drive after a change to `@nodegx/module-inject` or `static/deploy`: `npx webpack --config
  webpack-configs/webpack.deploy.dev.js --no-watch` (noodl-viewer-react) and `node build.mjs` (noodl-preview). Recorded on
  P109-S5-STALEDEPLOYCLI (ISL-034). Slice 1's deployed drive was never run — that is why nobody saw it for two days.
- **A test that says it "will fail loudly the day someone fixes it" is a test to restate, not delete** (C149: the lifecycle
  suite's SEPARATE PRE-EXISTING DEFECT row). Restate it to the fix, red on the pre-fix file.
- **A contract plant anchors on source text.** When the fix rewrites the anchored line, the plant throws "must contain …
  exactly once" — re-anchor it on the new check, and show it red.
- **A census of copies first** (ISL-013): all 22 copied definitions were byte-identical, which is what made the swap a pure
  identity, provable by `toBe`, not by comparing answers on a list of inputs.
- **A drive's red can be the drive.** The one workshop red was a clause stale since P108 s9; read the `saw:` line before the code.
- **Stopping only your own run:** a peer may already be doing the step (P107 rewrote the stranger hash for `world.ts` in
  `af99f545f`); kill by the jest's cwd (your worktree), never by name.

## Gate readings taken s34 (2026-10-09)

- Page Stack v17: 158/158 on the runtime at 13 and 20732; mutants 0 survivors (771/772). Logic Builder v2: 15/15 + 200/200 at
  13, 20732, 20735; mutants 0 (118/118, 103/103).
- Spec package 963/963 (no `stranger.test.ts`), viewer 1,837/1,837, runtime suite at baseline (graph.test's load-timed scenario;
  day-seed 20735 survivors on Circle, Options, Radio Button, Range, Text Input — every scenario and sequence passing, P107's),
  noodl-mcp 3,692/3,706 (the same 11), module-inject 41/41, kit-catalog 81/81, scaffold 76/76, SSR kit 27/27, cloud kit 21/21.
- `bugs.js check`: 6 problems — the same 5 plus P107's untracked C150 (theirs).

## Decisions for Richard (not yours)

- **New (s34):** the garden library entries stay at 1.0.0 though garden-3d-kit now refuses to load without Garden Kit (its card
  and README say so). Bump with publishing them?
- Carried: C143's Refresh half (recommended: leave it); Track G's order; the layout of an unlabelled control in a real browser;
  `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`, ISL-010 AC4
  and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.

## Handed over (owed by another phase)

- **P107 (opennoodl-a1):** told of Page Stack v17 and Logic Builder v2 (and the re-anchored plant). Theirs: the day-seed
  survivors, the Video rows C96–C100, C120 / C126's world, C150 (filed s68, untracked when s34 ended).
- **P18 (export):** the export's two kit bootstraps (`parse/kitSource.ts`, `emit/kits.ts`) still have no `requires` order and no
  `getModule` — so garden-3d-kit, which now throws without `getModule('garden-kit')`, would not load in an exported app (read, not run); the Visual Function's reserved-signal wrapper (C149) if the
  export carries one; plus s33's list (reserved Expression names, the size merge, throw of nothing, Children Count at a mount).
- **Release notes, add (s34):** a Component Stack can keep its pages while Mounted is off (Keep Pages When Unmounted); a kit can
  read another kit by naming it in `requires` (the garden 3D kit now needs Garden Kit); Settings → Kits names a kit that was not
  loaded because a kit it needs is missing; a Visual Function that sends a signal named like its own reports a failure, not a
  failure and a success.

## Worktrees

`p109-isl049` (branch `p109-isl050`, at `dde400937`) holds nothing unlanded; its untracked probes (`zz-s31-*`, `zz-s32-*`,
`zz-s33-c114`) — never commit them. The older ones (`p109-isl048`, `p109-drag`, `p109-c127`, `p109-s31-land`, `p109-c77`,
`p109-c101`, `p109-s30-*`, `p109-isl031-drag`, `p109-s12`) are spent; remove with `git worktree remove` when convenient.

## Recipes

- **Land:** commit in the worktree; `git rebase cline-dev` there if it moved; in the primary tree, in ONE command:
  `merge-base --is-ancestor`, `git status --porcelain` each path the diff lists (abort on any), `git update-ref refs/heads/cline-dev
  <new> <old>`, `git checkout HEAD -- <each path>`. Docs by pathspec (`dev-docs/bugs/README.md` is a peer's open edit).
- **Grade one spec on the runtime:** `NSP_ONLY="<type>" NSP_SEED=<n> npx jest test/node-spec/conformance.test.ts`
  (noodl-runtime); interpreter mutants: `TYPES="<type>" SEED=13,20732 npx jest tests/zz-s31-mut.test.ts` (spec package).
- **A control:** copy the fixed file aside, `git show HEAD:<file> > <file>`, run the probe (`PROBE_NODES`, `PROBE_MATCH`), copy
  back, `cmp`. When HEAD lacks a new input the control is red for that reason alone — use behavioural mutants of the fixed file.
- **Deployed drives (ISL-013):** rebuild the engine first (above); `drive-ig007-3d.js assemble` → `nodegx deploy … 
  --allow-development-engine` → the drive; the template via `drive-cg003-pages.js assemble`, then `drive-ig007-workshop.js
  --mode 3d|nogl`. The scratch AC1 drive is in the s34 scratchpad only.
- **Editor drive without touching Richard's profile:** `NOODL_USER_DATA_DIR=<scratch>` with `firstRunLegal.json` copied in and a
  one-entry `recently_opened_project.json`; `cdp click "[data-test=launcher-project-card]"`; `npm run dev:stop` after.
