# Next session — P109 session 36

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 35 (2026-10-09, on `cline-dev`):** built in worktree `p109-isl049` (branch `p109-isl050`), landed by compare-and-swap.
Board: **28 of 51 closed** (ISL-051 took in two rows and stays ✅).

- **ISL-051 ✅ 9 of 9** — `024e2ee55`: **C150** an Expression reading `Arrays.x` re-runs when the array changes (the subscription is to
  `Collection.get`, not a record named like it); **C151** the Noodl API lands after the names the function was compiled with
  (`compiledWith`; the never-shortened argument array gone); **P109-S35-PARAMARRAYS** (found by C150's fix) an input set as an
  expression reads `Arrays.x` as the array too (`createNoodlContext`). Expression spec **v5**: two scenarios renamed, one added.

## Do, in this order

1. **C120, C126 (ISL-048's last two) — wait for P107's word.** Settled s35: P107 extends the world (`world.ts` is the format,
   stranger-guarded) — `history.back()` and `replaceState` with their `popstate`, on both targets; item 5 of P107's s70 handoff
   (`c2fdb3bf7`). P107 will say when it lands; then build C120 ("A Pop steps the browser's history back") and C126 ("Reset goes to
   the start page") as ruled. Do not touch world.ts. Until then, go to 2.
2. ISL-018 AC5 (an agent round, then the editor's clean-up log), ISL-012 AC3 (a full server render with hydration).
3. **Track G** waits on Richard's order.

## What s35 learned

- **One subscription served two readers.** `subscribeToChanges` is called by the Expression node AND by every input set as an
  expression (`node.ts` :366), which read `Arrays` through different APIs. Grep a shared function's callers before moving it.
- **An import can carry a global patch.** A top-level `require('./collection')` in the evaluator turned the viewer's p82 Dropdown test
  red: loading `collection.ts` installs `on`/`off`/`get` on `Array.prototype`, and every node loads the evaluator. Required lazily.
- **A scenario can claim a change its data never makes.** `set [a, b, a]` over `[a, b]` dedupes to no change — "the list replaced" was
  heard by neither version. Read the trace's values, not the scenario's name.
- **A fix can blind a mutant the defect made visible.** With the stale argument array gone, the quiet-frame swap only showed on a text
  over a name outside the swapped patch's `compiledWith` (`[a, b]`). To pick the killing scenario, log the swapped patch: a temporary
  `appendFileSync` in `src/runner/mutants.ts`'s `swap-branch` case behind an env var, restored from a copy after (`git diff --quiet`).

## Gate readings taken s35 (2026-10-09, worktree at `7ee55891e` + the fix)

- Expression v5 on the runtime: 43/43 + 200/200 at 13, 20732, 20735, 7, 20734, 20733, 20729; 10,000 at 20735, 0 divergences.
  Interpreter mutants 178/178 at 13 and 20732. Control (HEAD's two runtime files): red on exactly the C150 and C151 scenarios.
- Evaluator tests 44/44 (3 new, red on HEAD's file); spec package 966/966 (no `stranger`, no `zz-`); viewer 1,837/1,837;
  runtime suite at baseline — day-seed 20735 survivors on Circle, Radio Button, Range, Text Input (P107's; Options was killed
  `af99f545f`), graph.test's load-timed scenario (96/96 alone); runtime tsc 0, spec tsc 0; spec-ledger holds 125/147.
- `bugs.js check`: 1 problem, a peer's file name (`p78-tpl008pj-nested-signal-…`).

## Decisions for Richard (not yours)

- **New (s35):** an Expression reading one item of an array — `Arrays.cart.get(0).qty` — re-runs when an item is added or removed,
  but not when that item's own `qty` changes (the array does not pass on its items' changes). Should it? Recommended: yes, as a Repeater
  row hears its own record — but it means listening to every item of every array an Expression reads.
- Carried: the garden library entries at 1.0.0 (bump with publishing?); C143's Refresh half (recommended: leave it); Track G's order;
  the layout of an unlabelled control in a real browser; `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`,
  `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden
  kits at the origin.

## Handed over (owed by another phase)

- **P107 (opennoodl-a1):** told of Expression v5 (`024e2ee55`); extends the world's history (back, replace) for C120/C126 — their s70 item 5, they will say when it lands. Theirs: the day-seed
  survivors, the Video rows C96–C100.
- **P18 (export):** whether the export's Expression hands `Arrays.x` as the array and re-runs on it (read, not run); the two kit
  bootstraps' `requires` / `getModule`; the Visual Function's reserved-signal wrapper (C149); s33's list (reserved Expression names, the
  size merge, throw of nothing, Children Count at a mount).
- **Release notes, add (s35):** an Expression that reads an Array updates when the array changes; an Expression beside an input its
  text no longer reads still reads Variables and Objects; an input set as an expression can read `Arrays`. (s34's four still owed.)

## Worktrees

`p109-isl049` (branch `p109-isl050`) holds nothing unlanded; its untracked probes (`zz-s31-*`, `zz-s32-*`, `zz-s33-c114`) — never
commit them; the full runtime suite runs them too (`zz-s32-rtrace` fails there — discount it). The older ones (`p109-isl048`,
`p109-drag`, `p109-c127`, `p109-s31-land`, `p109-c77`, `p109-c101`, `p109-s30-*`, `p109-isl031-drag`, `p109-s12`) are spent; remove with
`git worktree remove` when convenient.

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
