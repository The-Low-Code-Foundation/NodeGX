# Next session — P109 session 47

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 46 (2026-10-11, on `cline-dev`, primary tree plus worktree `p109-wiredtitle`):** the board moved from
**40 to 41 of 52** (ISL-018 closed). ISL-037 reached 5 of 7 (both of its buildable rows are done). ISL-024's AC1 was read,
and its move now waits on one human decision. No rulings were asked.

## The board (re-derived from the task files' `**Status` lines, s46)

| task | state | what is left | blocked on |
|---|---|---|---|
| ISL-025 the island drops the workarounds | 🟡 | W4–W12, W14, W16, W17, W19, W20, W22 still `present` in `isl025Census.test.ts` | **check each row:** see "Do" 2 |
| ISL-024 a template lives in its own folder | 🟢 AC1 read | the `git mv` + import commits | **the `package-lock.json` decision** (below) |
| ISL-037 templates carry no warned shape | 🟢 5 / 7 | NIGHTBOOKHOME; ROWWRAP's 3 Nightbook rows | P78's untracked Nightbook pile |
| ISL-046 templates & kits | 🟢 7 / 9 | INSTALLER, TPL011UNREADID | the tablets; P78's Nightbook pile |
| ISL-043 export (8 bugs), ISL-035 (2) | ⬜ | all | P18 is live in `nodegx-export` |
| ISL-007 AC4, ISL-008 AC7, ISL-009 export, ISL-010 AC4, ISL-022 AC6 | 🟡/🟢 | one AC each | IW-010 (P108); P18; P18; Richard (llama.cpp); `dist/noodl-mcp.cjs` rebuild (Richard) |

## Do, in this order

1. **Re-read the board yourself** (`grep -m1 '^\*\*Status' ISL-0*.md`), and read each open task's AC table, not only
   its status line: 🔴 ISL-018's AC6 sat unbuilt for ten sessions because its status line named only AC7.
2. **ISL-025, row by row.** These rows still read `present`, but the task each waited on has since closed: **W4**
   (ISL-002), **W5** (ISL-003), **W6** (ISL-004), **W16** (ISL-014), **W17** (ISL-016/017), **W19** (ISL-019),
   **W20** (ISL-021). For each one, read ISL-025's §3 row (file:line and its "proof it is gone" column) and its §8.
   W7–W9 were handed to P108 IW-010 by ISL-005's ruling "Native nodes first", so check that before touching them.
   Build each removable row as s46 built W18: a control (the generator unchanged leaves `git status` empty), the
   removal, a byte-identical regen, an arm that shows the gate grades it, the census row flipped (and its old state red).
   Do it in a worktree (`scripts/devtools/make-worktree.sh <name> HEAD <abs-parent>`): now that `832c05ca2` links
   node-spec's `dist/`, generators run there.
3. **ISL-024** only if Richard has ruled on the lockfile. The move (§5 R3) is a `git mv` commit for the garden alone,
   then an import/config commit carrying the new workspace's lock entry, the `test:packages` scope and the `pr.yml`
   typecheck twin. AC1's table is in §8 s46.

## Human decisions owed

- 🔴 **The working copy's `package-lock.json`** is the stale file that removes `@nodegx/node-spec`'s entries (−51 lines
  against HEAD; mtime 2026-10-11 14:08). **It now blocks ISL-024:** the ruled package (`packages/nodegx-templates/`) is a
  workspace and needs lock entries in the same commit. Ask: "restore HEAD's lockfile, or is someone's install mid-way?"
- **The live demo's engine.** The training demo's publish recipe swaps in the live site's `noodl.deploy.js`. That
  engine must carry `edda6427b` before the demo is republished, or its tabs show the typed titles (measured: the same
  English words today, since the app ships one language).
- **`templates/nightbook/` is untracked** (P78). Four P109 rows wait on it.
- **`planning-demo` on nodegx.io** carries MOVEARROW's bug until it is republished (s45 regenerated it).
- **Still owed:** `P109-S36-STALEMCPDIST`, the `nodegx` bin rebuild, the viewer runtime build, s38/s39's list.

## What s46 built (commits)

- **WIREDTITLE `edda6427b`:** a Page's Title set by a wire names the browser tab. The Page node calls back on every
  Title; the Router names the tab from the page's current Title while that page is showing, with the typed one as the
  fallback. Driven first (red as filed). A 7-arm browser drive, `packages/noodl-mcp/tests/p109WiredPageTitle.test.ts`:
  HEAD's bundle 3 red, fixed 7/7, mutant A (no "still showing" guard) red in exactly its arm, mutant B (no callback) red
  in two. Built in a worktree with its own viewer folder, because a peer had the runtime open.
- **DBTPAGETITLES `e215a0452`:** 🔴 the tab was already translated. Each page relayed its title Translation through a
  JavaScript `Noodl.SEO.setTitle` node, the template's own workaround for WIREDTITLE. The eleven relays became wires.
  The census reads `{}` (was 11). A four-arm browser reading on the demo with four titles marked `[fr] `: relays and
  wires read the same on the fixed bundle, and wires on the old bundle fall back to the typed English.
- **ISL-018 AC6 `38957238e`:** the garden and members-area generators drop the raw settle, which wrote 0 of 187 and 0
  of 108. Byte-identical. Members graded by switching the door's ticking off (57 `true`s lost in 18 files). Garden
  graded by AC6's mutant (one deleted `false` comes back `true`). ISL-025 W18 → `removed`. **ISL-018 closed.**
- **`832c05ca2`:** `make-worktree.sh` links `nodegx-node-spec/dist` and `nodegx-canvas-look/dist` (no generator could
  run in a worktree).
- **Filed:** `P109-S46-SITETITLERELAY` (the site builder carries the same relay, and `assertSeoSplit` forbids the
  wire; the site builder's phase), `P109-S46-MERGECAST` (🔴 `catalog:merge` refuses P107's new `array→optionslist`
  cast since `813657773`, so the PR gate's `catalog:merge:check` cannot pass; s46's Router enrichment line lands at the
  next good merge). Told to nobody yet: P107 should see MERGECAST.

## Gate readings (2026-10-11, s46)

- Worktree `p109-wiredtitle` (HEAD `25b6f66cf` + the fix, later `e51bb99b4`): viewer jest **1845/1845**, viewer tsc
  clean, runtime conformance `NSP_ONLY=Router,RouterNavigate` green, runtime `graph.test.ts` 96/96,
  `p109WiredPageTitle` 7/7 (HEAD bundle in primary: 3 red), `tpl001Template` 82/82, `cg003Template` 150/150,
  `isl025Census` 25/25, `def038SettledTemplates` 29/29.
- Primary: `typedWordNotTranslated` 16/16; DBT `check-strings.py`, `check-demo.mjs`, `check-learner-page.mjs` pass;
  `catalog:generate --check` green; `catalog:merge` red (MERGECAST, not this session's).
- Not run: the editor's `test:ci` / `test:main` (no editor source changed; one editor spec file did, and it ran).

## What s46 learned

- **A drive's `navigate` is a page load.** `withRenderedPage`'s `navigate` is a CDP navigation: everything rebuilds, no
  page is ever kept, nothing is ever "left". An arm about leaving a page has to move inside the app
  (`Noodl.Navigation.navigateToPath`). The first version passed with the guard deleted.
- **When the fallback equals the value, the reading grades nothing.** The training app's English titles equal their
  typed fallbacks, so four arms read the same whether the wire worked or not. Mark the words in a scratch copy (`[fr] `)
  so the two paths read differently.
- **Before building a template fix, open the workaround the template already carries.** DBTPAGETITLES' title was
  wrong for nine sessions: the relays were the template's answer to the very defect found under it.
- **A status line is not the AC list.** ISL-018 named one owed AC; the table held two.
- A peer's open edit in a package you need to build means a worktree. `make-worktree.sh` links the viewer folder to
  primary's, so replace the link with a real copy before building into it.

## Recipes

- **Commit through a temporary index**, then `git reset -q -- <paths>`. 🔴 In zsh, pass paths as an array
  (`P=(a b); git add -- "${P[@]}"`). A `$PATHS` string is one argument, and the first try this session committed
  nothing.
- **Build the viewer into a worktree only:** `OUT_PATH=<wt>/packages/noodl-editor/src/external npx webpack --config
  webpack-configs/webpack.viewer.prod.js` from `<wt>/packages/noodl-viewer-react`, after replacing the viewer symlink
  with a copy. `render-report.js` in that worktree then renders with it.
- **Runtime conformance for one node:** `NSP_ONLY=<Type>,<Type> npx jest test/node-spec/conformance.test.ts` (seconds).
  `-t` does not narrow it: the run took 25 minutes and was stopped.

## Worktrees

`p109-wiredtitle` (branch `p109-wiredtitle`, at `e51bb99b4`, holds a real viewer folder and node-spec/canvas-look
`dist` links): reusable for ISL-025, or remove it with `git worktree remove`. `p109-isl049` is unchanged.
