# Next session — P109 session 38

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 37 (2026-10-09, on `cline-dev`):** built in worktree `p109-isl049` (branch `p109-isl052`), landed by compare-and-swap.
Board: **30 of 52 closed** (ISL-052 new and ✅).

- **ISL-052 ✅ 7 of 7** ([task](ISL-052-A-SCROLLING-GROUP-LAYS-OUT-AS-IT-DOES-WITHOUT-THE-SCROLL.md)) — P107's C152, C153 and
  P109-S37-ISCROLLALIGN (`0859bbbde`: with Native platform scroll off the inner box takes the gap and the alignment, the Group
  clips); then **ruled by Richard** — *inside a scrolling Group the room is the visible window, unless the content is longer,
  and then the content wins* — and built (`afac7de50`): C154, P109-S37-FILLCAP (a long "fill the rest" ran under the footer),
  ISCROLLPERCENT (with it off, a % was of the children added up), CENTRECUT (a centred long list lost its top). Every child of
  the native and off twins in four fixtures lands in the same place; the layout check 8 / 8; control and one planted variant
  per piece red.
- **The viewer build** (P116-ONT-007-viewerbuild, `06ec2d4e7`): three Map iterations in P116's migration executor, refused at
  ES5 — and a production webpack with errors writes no bundle. P116's next commit repeated it in `targetGoes.ts:226`; **P116
  (opennoodl-5d) has the fix in its tree and said it lands within the hour** (22:50).

## Do, in this order

1. **Check P116's `targetGoes.ts` landed** (`git show cline-dev:packages/nodegx-backend-contract/src/targetGoes.ts | grep -c
   "\[\.\.\.counts"` → 0) and the viewer builds clean (`npx webpack --config webpack-configs/webpack.viewer.prod.js` in
   noodl-viewer-react: "compiled successfully", exit 0, the bundle's mtime new). Until then 5 viewer suites do not run and the PR
   gate `ci:build:viewer` is red. If it has not landed, ask P116 once; do not edit their open file.
2. ISL-012 AC3 (a full server render with hydration). ISL-018's only remaining AC is AC7 on the DBT demo, its owner's.
3. P109-S36-STALEMCPDIST's lasting fix, if Richard wants it now (about ISL-014's size).
4. **Track G** waits on Richard's order.

## What s37 learned

- **A ruling asked over abstract boxes is not asked.** Richard twice: "I still don't understand". What landed: a page of three
  real screens (a checkout, onboarding slides, an inbox), the working phone beside today's, each opened in the state that shows
  the fault (https://claude.ai/artifact/VG6KyQgitumwDgycJbXJW1). Measure every caption on the runtime first.
- **A box-position check cannot see how far a scroller scrolls.** A Fixed % of the inner box put the slides in the right places
  inside a box one window wide that better-scroll could not move past: green on every box. `layout-measure.js` now records a
  Group's inner box as `inner`.
- **A production webpack with errors writes nothing**, and the last bundle stays on disk: a measurement after "compiled with N
  errors" measures the old code. Twice in s37 (once from a planted variant left built). Read the bundle's mtime.
- **The worktree's `packages/noodl-editor/src/external/viewer` was a symlink into the primary** — and the viewer build has
  `clean: true`. Replaced with a real copy in `p109-isl049` before building; do the same in any new worktree.

## Gate readings taken s37 (2026-10-09)

- Layout check 8 / 8 at `afac7de50` (206 boxes match; KNOWN: 2 FLOOR, 30 ROOM — the ROOM rows left KNOWN with P107's `fd6385beb`; 8 / 8 there too). Control (HEAD's `layout.ts`, `Group.tsx`,
  `react-component-node.ts`): red on the rule's test and KNOWN. Planted: no min-content, Fixed % of the inner box, no window-high
  inner box, no `safe` — each red.
- Viewer 1,837 / 1,837 with P116's pending `targetGoes.ts` line applied locally (without it, 5 suites fail to run: TS2802).
  Viewer tsc: no errors in the three files. Backend contract `migration.test.ts` 20 / 20, tsc clean.
- `bugs.js check`: none of P109's.

## Decisions for Richard (not yours)

- Carried from s35: an Expression reading `Arrays.cart.get(0).qty` does not re-run when that item's `qty` changes (recommended: yes,
  as a Repeater row hears its own record).
- Carried: the garden library entries at 1.0.0; C143's Refresh half; Track G's order; the layout of an unlabelled control in a real
  browser; `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`,
  ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.
- New, recorded not asked: a person's Back or Forward to an entry whose address names the page on top now keeps the stack (ISL-048
  §13). A browser reaches it only through two entries with one address.

## Handed over (owed by another phase)

- **P107 (opennoodl-49), told s37:** ISL-052 landed as ruled. They fixed P109-S37-SCROLLROOM the same evening (`fd6385beb`: the
  model reads a scroll as the window unless the content is longer; the 30 ROOM boxes out of KNOWN).

- **P107 (opennoodl-49):** told C120/C126 landed and that `popstate` was sorted into `WORLD_KINDS`. Theirs: the day-seed survivors,
  the Video rows C96–C100, and the frame a landed back is heard in if the two targets ever disagree (they asked to be told).
- **P78 / TPL-011:** `packages/noodl-mcp/src/cloud/bundleEntry.js`'s D84 lines are still uncommitted (since 2026-09-26) and the
  shipped `cloud-bundle.cjs` depends on them.
- **P18 (export):** carried from s35 (Arrays in the export's Expression; the kit bootstraps; the Visual Function's reserved signal;
  s33's list).
- **P18 (export):** the scroll rule (ISL-052 §2) — an exported scrolling Group lays out as the runtime now does, or as the
  model does; theirs to decide when P107's model moves.
- **Release notes, add (s37):** a scrolling Group with Native platform scroll off keeps its gap and alignment and hides what lies
  outside it; inside any scrolling Group a "fill the rest" section grows with its content, a Fixed % is of the visible window
  (one slide per screen works), and a centred list too long to fit starts at the top.
- **Release notes, add (s36):** a Component Stack's Pop steps the browser's history back, and a Replace no longer adds an entry; a
  Reset goes to the start page; the agent's door says when it ticked a "run on value change" box. (s34's four and s35's three still
  owed.)

## Worktrees

`p109-isl049` (branch `p109-isl052`) is at the s37 docs commit, nothing unlanded; its viewer folder is a real copy now (not the
symlink), so a build there stays there; its untracked probes (`zz-s31-*`, `zz-s32-*`, `zz-s33-c114`)
— never commit them. 🔴 Its `packages/noodl-mcp/dist/` files are symlinks into the primary: do not `npm run build` there without
meaning to replace the primary's. The older worktrees are spent; remove with `git worktree remove` when convenient.

## Recipes

- **Land:** commit in the worktree; `git rebase cline-dev` there if it moved; in the primary tree, in ONE command:
  `merge-base --is-ancestor`, `git status --porcelain` each path the diff lists (abort on any), `git update-ref refs/heads/cline-dev
  <new> <old>`, `git checkout HEAD -- <each path>`. In zsh put the paths in an ARRAY (`P=(a b)`; `$P`) — a string does not split.
- **Grade one spec on the runtime:** `NSP_ONLY="<type>" NSP_SEED=<n> npx jest test/node-spec/conformance.test.ts` (noodl-runtime),
  then read the log's `scenarios: n / n` line — the test itself reports in 3 ms. Interpreter mutants: `TYPES="<type>" SEED=13,20732
  npx jest tests/zz-s31-mut.test.ts`. Every scenario's trace: `TYPES=… OUT=<file> npx jest tests/zz-s31-alltrace.test.ts`.
- **A control:** copy the fixed file aside, `git show HEAD:<file> > <file>`, run, copy back, `cmp`.
- **An agent over the stdio door:** `claude -p "<request>" --model claude-sonnet-5-5 --mcp-config <json> --strict-mcp-config
  --allowedTools "mcp__door" --output-format stream-json --verbose`, run from the project folder (the s36 scripts are in that
  session's scratchpad only). Build the door to a scratch name beside `dist/` if `dist/` is stale.
- **Editor drive without touching Richard's profile:** `NOODL_USER_DATA_DIR=<scratch>` with `firstRunLegal.json` copied in and a
  one-entry `recently_opened_project.json`; `cdp click "[data-test=launcher-project-card]"`; to open another, rewrite the entry and
  `cdp reload`; the preview is `--target=viewer`; `npm run dev:stop` after.
