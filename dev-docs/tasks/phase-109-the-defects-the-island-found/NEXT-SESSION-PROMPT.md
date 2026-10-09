# Next session — P109 session 37

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 36 (2026-10-09, on `cline-dev`):** ISL-018 built in the primary tree; ISL-048 built in worktree `p109-isl049` (branch
`p109-isl050`), landed by compare-and-swap. Board: **29 of 51 closed** (ISL-048 ✅).

- **ISL-048 ✅ 29 of 29** — `08d62276b`, as ruled, on P107's session history (`b7950a3b9`): **C120** a Pop steps the browser's
  history back over the entry its push made, and counts that Back as its own; a Replace overwrites the entry; on any `popstate` a
  stack whose address names its top does nothing. **C126** a Reset press or a Components edit builds the Start Page and writes its
  address. Page Stack spec **v18** (13 renamed, 5 read-backs moved to the person's Back and Forward, 4 added). Task §13.
- **ISL-018 AC5 met** — `c5be13465`. Claude Code over the stdio door in a format-4 copy of landing-pages; the editor's clean-up 0
  writes, its control 2 written and logged; the rows drawn in the preview. Rounds 1–4 graded nothing of the door (agents build
  value-driven graphs, or answer the box themselves); round 5 did. Found and fixed: the door ticked boxes and said nothing
  (**P109-S36-PINUNREPORTED**, now `ticked: { boxes, why }` on create, update and apply_plan). Found: **P109-S36-STALEMCPDIST** (high,
  open) — the dev editor's `.mcp.json` runs the checkout's `dist/noodl-mcp.cjs`, built 2026-10-02, without the pin. Rebuilt at
  `08d62276b` (below); the lasting fix (the server says when it is older than its `src`) is not built.

## Do, in this order

1. **P107-C152 and C153 (new, from P107 s70, `071acfc7e`)** — a Group with Enable Scroll on and Native platform scroll off: the gap
   is dropped (`renderIScroll`'s inner wrapper copies flexDirection and flexWrap, not rowGap / columnGap), and nothing clips (`render`
   sets overflow only for Clip Content or the native path). Both medium. No task holds them yet: scope them (ISL-038 is the Group's
   closed task; a new ISL-052, or reopen it — say which). Regressions are pinned in `packages/nodegx-node-spec/tests/layout-check.test.ts`;
   after a fix, re-record with `node scripts/node-spec/layout-measure.js --record packages/nodegx-node-spec/layout-fixtures --only scroll-iscroll`
   (one headless Chrome), then flip the pinned assertion.
2. ISL-012 AC3 (a full server render with hydration). ISL-018's only remaining AC is AC7 on the DBT demo, its owner's.
3. P109-S36-STALEMCPDIST's lasting fix, if Richard wants it now (about ISL-014's size).
4. **Track G** waits on Richard's order.

## What s36 learned

- **An agent round grades a door only where the agent leaves the field the door fills.** Four rounds of natural requests gave 0 → 0:
  the agent built value-driven graphs, or answered the box itself (it read the door's own guidance). Read the agent's tool call
  (`runOnChange` sent or not) before calling a 0 a pass, and keep a control that writes.
- **A `popstate` reaches every listener on the page,** and the world hands each its own event object: a shared "ours" mark cannot
  be told apart there, and a microtask clear fails in a browser (microtasks run between listeners). Count per listener, and keep
  what the address already shows.
- **A ruling can blind other rows' scenarios.** Under C126 a Reset no longer reads the address, so five scenarios that used it to read
  a written URL back (C121–C124) would have stopped grading them while staying green. Moved to the person's Back and Forward.
- **`npm run build` in a worktree writes the primary's `dist/`** (four of its files are symlinks), and builds `cloud-bundle.cjs` from
  the worktree's `bundleEntry.js` — without the primary's uncommitted P78 D84 lines. It was rebuilt from the primary at once.

## Gate readings taken s36 (2026-10-09)

- Page Stack v18 on the runtime at 13, 20732, 20735, 7: 162/162, 200/200, 0 divergences; mutants 846/847 (868/869 at 20735), 0
  survivors, the one an equivalent. Interpreter mutants 846/847 at 13 and 20732, 0 unreached. Control (HEAD's runtime file): red on
  exactly 16. Router, RouterNavigate, PageStackNavigate, …NavigateBack, …NavigateToPath conform at 13. Viewer 1,837/1,837; spec
  package 1,780/1,783 before the page-model fix, page model 42/42 after (`WORLD_KINDS` lacked `popstate`, red on `cline-dev` since
  `b7950a3b9`). Re-run after the rebase onto `68b4a766b`: Page Stack at 13 the same.
- `noodl-mcp` suite at `d53e5f283` + the change: 3,812 / 3,830, 18 red in 13 suites, exit 1 — **the same 18 by name with HEAD's five
  files** (a pair). `isl018DoorPins` 6/6; two reverted arms red on exactly their rows. `noodl-mcp` tsc: 10 errors, all in other
  phases' test files.
- `bugs.js check`: 5 problems, none P109's.
- `dist/` rebuilt 19:35: `noodl-mcp.cjs` from the clean worktree (pin present); `cloud-bundle.cjs` from the primary (D84 kept;
  smoke: a load that logs `[NDA-017]` sends it to stderr, stdout is JSON).

## Decisions for Richard (not yours)

- Carried from s35: an Expression reading `Arrays.cart.get(0).qty` does not re-run when that item's `qty` changes (recommended: yes,
  as a Repeater row hears its own record).
- Carried: the garden library entries at 1.0.0; C143's Refresh half; Track G's order; the layout of an unlabelled control in a real
  browser; `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`,
  ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.
- New, recorded not asked: a person's Back or Forward to an entry whose address names the page on top now keeps the stack (ISL-048
  §13). A browser reaches it only through two entries with one address.

## Handed over (owed by another phase)

- **P107 (opennoodl-49):** told C120/C126 landed and that `popstate` was sorted into `WORLD_KINDS`. Theirs: the day-seed survivors,
  the Video rows C96–C100, and the frame a landed back is heard in if the two targets ever disagree (they asked to be told).
- **P78 / TPL-011:** `packages/noodl-mcp/src/cloud/bundleEntry.js`'s D84 lines are still uncommitted (since 2026-09-26) and the
  shipped `cloud-bundle.cjs` depends on them.
- **P18 (export):** carried from s35 (Arrays in the export's Expression; the kit bootstraps; the Visual Function's reserved signal;
  s33's list).
- **Release notes, add (s36):** a Component Stack's Pop steps the browser's history back, and a Replace no longer adds an entry; a
  Reset goes to the start page; the agent's door says when it ticked a "run on value change" box. (s34's four and s35's three still
  owed.)

## Worktrees

`p109-isl049` (branch `p109-isl050`) is at `08d62276b`, nothing unlanded; its untracked probes (`zz-s31-*`, `zz-s32-*`, `zz-s33-c114`)
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
