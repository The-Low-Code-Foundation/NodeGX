# Next session — P109 session 34

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 33 (2026-10-09, on `cline-dev`):** every row built in worktree `p109-isl049` (branch `p109-isl050`), graded on the runtime at
seeds 13 and 20732 with the interpreter's mutants at both, each spec's interpreter trace diffed across the fix, and a control (the
previous commit's file) red on exactly the scenarios it moved; landed by compare-and-swap.
**ISL-050 ✅** C132 `11fef09c6` (a number on a size port that holds none is read in its default unit; Columns **v3**).
**ISL-051 ✅ (5 of 5)** — took in P107's C146–C148 the same day: C145 `5ee9edda4` (the Expression's reserved names, ruled "Block the
three names"; Expression **v3**; lexer ×3, catalogs regenerated), C147 `cb7ea0fab` (a Function's `throw null`), C148 `cf6b4b8f8` (the
Script's four catches), C146 `2d765dac2` (a Function's Error cleared to blank text; Function **v2**).
**ISL-048 at 26 of 29** — C114 `4e2d846d5` (Children Count in the frame a stack mounts; Page Stack **v16**), plus RouterNavigate **v3**
`491e8af72` (C118's debt, below). Board: **27 of 51 closed**.

## Do, in this order

1. **ISL-048's C139** (ruled "Keep them only when an option is ticked"). A new Component Stack input beside Use Routes: name it in the
   house style (Keep When Leaving is the Page node's; a candidate is **Keep Pages When Unmounted**, port `keepPagesWhenUnmounted`,
   default off), describe it (what it keeps, that Mounted off still removes the element, Off: back to the start component). The remount's
   reset comes from `_registerPageStack` → `NavigationHandler.registerPageStack` → `reset()` (navigation-stack.tsx :196-216); with the
   option on, a mount that finds the stack still holding its pages keeps them. Page Stack spec **v17**; both catalogs regenerated in the
   worktree (`scripts/node-catalog/generate.js`, `merge.js`, `scripts/cloud-node-library/generate.js`, then each `--check`); the
   noodl-mcp suite (baseline: 3,692 / 3,706, the same 11 every time). Decide Use Routes with the option on (the address may have moved
   while unmounted) — read it, and ask Richard only if both answers are defensible.
2. C120, C126 still wait on P107's world (history back, an entry replaced). Then ISL-013 slice 2, ISL-018 AC5, ISL-012 AC3.
   **Track G** waits on Richard's order.

## What s33 learned

- **A fix to a shared handler moves every spec that plays it.** C118 (s30) re-graded the Router and never RouterNavigate, which reaches
  the same handler through the world (`world.ts` `router.resolve`): red at every seed for three sessions. After any fix, grade the specs
  that share its handler, not only the node's own.
- **Older tests pin a defect as behaviour.** C132's ruling reversed fb-019 rows 5–6 and GAM-015's no-default row; C146's reversed
  isl-005 and fun-007's `undefined` clear. Restate them to the ruling, each red on the pre-fix code — never delete.
- **A new runtime export reaches the viewer through generated declarations.** `@noodl/runtime/src/utils` types from
  `noodl-runtime/dist-types` (a worktree symlinks the primary's), and ts-jest type-checks viewer files the runtime target loads: a new
  export failed every Script scenario with an EMPTY message (a TSError) until the declarations were rebuilt — in every checkout. Keep
  the runtime's exported surface unchanged, or rebuild the primary's types after landing. To check one in a worktree: emit to the
  scratchpad (`tsc -p tsconfig.types.json --outDir …`), point the worktree's link there, type-check, restore the link.
- **A probe that fails with an empty message has caught a non-Error** — wrap `runConformance` in the probe and print what it catches.
- **React runs mount effects as the target's `act` exits — after the drain.** Work a mount starts lands outside any update: a direct
  send is in the frame, a `scheduleAfterInputsHaveUpdated` waits a frame. `OutputProperty.sendValue` does not dedupe, so pulling a queued
  send forward needs a "changed since" flag (C114).
- **A bug file can name one read where the catch has two** (C147: the editor warning's `e.stack`). The runtime target HAS an editor
  connection — the warning arms are graded.
- **Day-seed mutant survivors are interpreter-side** and cannot come from a runtime change; one at seed 20735 on RouterNavigate was
  pinned with a scenario. Text Input, Options, Range, Radio Button, Circle survivors at 20735 / 20732 are P107's (told).

## Gate readings taken s33 (2026-10-09)

- Every registry spec (105) on the runtime at 13 and 20732 with C132 in: the only reds were RouterNavigate (fixed, v3) and a Text Input
  mutant at 20732 — both identical on the pre-fix runtime.
- Batch heads: spec package 955 / 955 (without `stranger.test.ts`), viewer 1,837 / 1,837, runtime suite green but for graph.test's one
  load-timed scenario ("[C1 C11] a wire made after the first frame…": 94 / 94 alone), runtime / viewer / spec tsc 0, catalogs `--check`
  clean, noodl-mcp 3,692 / 3,706 (CMP-001 AC2, CMP-004 ×4, D54, DEF-038, FLD-013, TPL-007, CN-004, AAQ-011), function-contract +
  script-contract 43 / 43.
- Export expression/jsfun tests 1,095 / 1,100: date-family (3) and navigate-to-path (2) fail identically with the old lexer — P18's.
- `bugs.js check`: the same 5 problems, none P109's s33.

## Decisions for Richard (not yours)

- **C143's Refresh half** (carried): a row fading out moves to the bottom when the list is refreshed. Recommended: leave it.
- Carried: **Track G's order** (ISL-039 data-loss blockers, ISL-040 security holes, or ISL-013 slice 2 first); the layout of an
  unlabelled control in a real browser; `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`,
  `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.

## Handed over (owed by another phase)

- **P107 (opennoodl-a1):** told of every version and landing above, and of the `script-contract.test.ts` plant re-anchored. Theirs: the
  day-seed survivors (Text Input 20732, and the 20735 class), the Video rows C96–C100, C120 / C126's world.
- **P18 (export):** none of s33's fixes checked on the exported app — the export's `expression-ports.ts` now reserves `run`,
  `expression`, `evaluateAtLoad` (byte-identical copy; an exported `run + 1` reads a global and throws — it never worked); the size
  merge (C132) in the export's runtime twin, if any; the Function's and Script's throw of nothing; Children Count at a stack's mount. The
  5 failing export tests above. Plus s32's, s31's and s30's lists.
- **Release notes, add (s33):** a number wired into a size that has none yet (a Columns' Medium Below) is read in pixels; an Expression
  that reads `run`, `expression` or `evaluateAtLoad` says the name is reserved instead of failing; a Function or Script whose code throws
  null keeps working and says so; a Function's Error clears once it works again; a Component Stack turned back on counts its pages at once.

## Worktrees

`p109-isl049` (branch `p109-isl050`, at `4e2d846d5`) holds nothing unlanded; its untracked probes are `zz-s31-alltrace`, `zz-s31-mut`,
`zz-s32-killer` (spec) and `zz-s31-probe` (now prints what it catches), `zz-s32-rtrace`, `zz-s33-c114` (runtime) — never commit them.
s31's and s30's (`p109-isl048`, `p109-drag`, `p109-c127`, `p109-s31-land`, `p109-c77`, `p109-c101`, `p109-s30-*`, `p109-isl031-drag`,
`p109-s12`) are spent. Remove with `git worktree remove` when convenient.

## Recipes

- **Land:** commit in the worktree; in the primary tree, in ONE command: `merge-base --is-ancestor <cline-dev> <new>` (else rebase the
  worktree first), `git status --porcelain` each path `git diff --name-only old new` lists (abort on any), `git update-ref
  refs/heads/cline-dev <new> <old>`, `git checkout HEAD -- <each path>`. Then the docs commit by pathspec (`dev-docs/bugs/README.md` is a
  peer's open edit — leave it).
- **Trace diff across a fix:** `TYPES='<type>' OUT=<file> npx jest tests/zz-s31-alltrace.test.ts` before and after.
- **A control:** copy the fixed file aside, `git show HEAD:<file> > <file>`, run the probe, copy back, `cmp`. One control per row: when
  rows share a file, commit them separately so each control reverts only its own hunks.
- **Hop-count sweep:** `sed -i '' '<line>s/hops = N/hops = N±1/'` on a copy of the spec, run the probe, restore.
- **The registry on the runtime takes ~25 min a seed** (Text 4 min, Group 4, Circle 2): run it in the background with a long timeout,
  or grade with `NSP_ONLY` and the specs a change can reach.
