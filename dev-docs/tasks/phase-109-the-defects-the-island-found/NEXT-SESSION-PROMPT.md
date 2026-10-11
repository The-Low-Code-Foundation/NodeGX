# Next session — P109 session 45

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 44 (2026-10-11, on `cline-dev`, primary tree):** the board went from 38 to **40 of 52 closed**. ISL-044
closed (6 of 6), and so did ISL-045 (4 fixed; VARIDS dug as ruled and closed as not reproducible). ISL-046 went from 4
to 5 of 9. Every row was re-measured at HEAD
first. Every fix was red on the old code in exactly its arm, and green after.

## The board (re-derived from the task files' `**Status` lines, s44)

| task | state | what is left | blocked on |
|---|---|---|---|
| ISL-046 templates & kits | 🟢 5 / 9 | SECONDVISIT (buildable); MOVEARROW, INSTALLER, TPL011UNREADID | MOVEARROW a ruling (asked s42, s43; not re-asked s44); INSTALLER the tablets; TPL011UNREADID P78's untracked Nightbook pile |
| ISL-043 export | ⬜ 8 bugs (2 high) | all | P18 is live in `nodegx-export` |
| ISL-007, 008, 009, 010, 018, 022, 024, 025, 035, 037 | 🟡/🟢/⬜ | as in s40's list | outside this phase |

## Do, in this order

1. **Re-read the board yourself** (`grep -m1 '^\*\*Status' ISL-0*.md`). Do not copy the table above.
2. **ISL-046 SECONDVISIT** (low): read the 3D engine on the second visit to the Workshop before choosing a fix
   (s43's notes in its bug file). The touch drive takes about 10 minutes on a quiet box.
3. **MOVEARROW**: asked twice with no answer. Ask once more only if Richard is around, in plain words, with s43's
   wording.

## Human decisions owed

- **MOVEARROW (asked s42 and s43).** Planning is set aside. Opening a project in it adds a "→ " to the project's
  stored next move every time. Fix the shelved planner now (half a day), or close the bug until Planning comes back?
- 🔴 **The working copy's `package-lock.json`** is still the stale 2026-09-24 file that removes `@nodegx/node-spec`'s
  entries. s44 left it alone.
- **`templates/nightbook/` is untracked** (P78's pile). Its Date picker copy and its two Group wraps (INSTANCEROOT's
  workaround, no longer needed) change the next time its generator runs.
- **Still owed:** `P109-S36-STALEMCPDIST`, the `nodegx` bin rebuild, and s38/s39's list. Add to it: **the viewer
  runtime build** (`npm run build:editor:_viewer`). BUILTINBOUNDARY reaches a running app only through it, and s44
  did not rebuild it (shared, gitignored).

## What s44 built (commits)

- **ISL-046 ROUTINEREFUSAL `9cb99b205`:** a refusal is said only while the record it was about is open. There were
  three commands, not one (routine dates, Add time, task deadline). `command()` gains `refusalAbout`: the guard
  publishes each verdict as a new object `{about, error}`, and `SAY_REFUSAL_SCRIPT` says it. A mutant that compares
  verdicts by value turns exactly the "said again" arm red.
- **ISL-045 DROPDOWNEMPTYRESET `d08eada79`:** Dropdown v7. Spec only: `domSelected: null` means the element selects
  nothing, which HTML treats differently from the hidden option being selected. Stranger round 4's engine was given
  the same rule, marked not the stranger's line.
- **ISL-045 INSTANCEROOT `dad3a9c33`:** isolated to the deploy's export. The project is never registered there, so a
  component's instance root is unresolved, and with no `visualRoots` recorded it shipped `roots: []`. Now an
  unresolved root that names a project component answers from that component. All 13 templates deploy byte-identical
  under both engines. `dist/nodegx-deploy.cjs` was rebuilt with `--deploy-only`; its inputs carry no peer files.
- **ISL-044 LISTDEFAULTTYPE `e6a124176`:** an output's Type select starts on Any, in both the Function and the
  Script node, and the spec twins follow. ISL-044 is closed.
- **ISL-045 MOUNTED `64ceb2746`:** an info `gate-starts-shown`, and Mounted's description. Re-ruled once the warning
  was counted at 409 template fires.
- **ISL-045 BUILTINBOUNDARY `42699d261`:** every node's element is drawn inside a boundary (`node/render-failed`).
  Cost measured first: about 2–4 ms on the largest template first page.
- **ISL-045 VARIDS:** dug as ruled. Nightbook's s3/s4 For Each is gone (never committed), and `Collection.set` and
  `Model.create` at `d57a11668` write nothing into the caller's objects. Closed `wontfix`, ruled "close it, with the
  readings".
- **Docs:** `735bf18a7` (re-measures of MOUNTED and VARIDS, as drives), plus the commit lines and this handoff.

## Gate readings (2026-10-11)

- `isl046-d81-routine-dates-drive` 7/7, red on HEAD in 2 arms. `isl045-instanceroot-drive` 12/12, red on the pre-fix
  engine in 1 arm.
- noodl-mcp TPL-008 specs 103/103. `def038` + editorSuite 32/34: the 2 reds are Nightbook and the training demo, as in
  s43.
- Dropdown on the runtime 63/63, mutants 653/658 as before. Stranger round 4 63/63. Golden check holds. Catalog and
  docs checks clean.
- noodl-preview 63/63 (GAM-014 5/5). Viewer 1845/1845. Editor `tsc` 0. `typecheck:mcp` 0.
- **Editor `test:ci`: 3011 specs, 1 failure** (SUB-006's port-suggestion order, the floor P112 recorded before s44).
- **Editor `test:main`: 6 suites red, none attributed to s44.** CHR-007 (`keepPagesWhenUnmounted`'s class),
  DEF-007/HLS-003 (`noodl-mcp` `ProjectStore.ts` not registered), EL-009 (renders through the built viewer bundle;
  the same red with the boundary line removed), HLT-013 (library docs), VFN-011 (drift gate), exp-013 (the live
  ledger's contents).

## What s44 learned

- **Count a warning's reach before building it.** The ruled warning would have fired 409 times on our own templates.
  Asked again with the number, Richard chose a note. A ruling made on "unmeasured" wording is owed a re-ask once the
  number exists.
- **A deploy's export never registers its project.** Any check that resolves a type there sees `UnknownNodeType` for
  every component instance. Probe a patched copy of the engine placed beside the original (it resolves the runtime
  relative to itself), and delete it after.
- **A stranger's frozen engine follows the spec's text**, so a spec correction makes it stale in exactly the corrected
  scenario. Give it the same rule, marked not the stranger's line (ISL-031's precedent).
- 🔴 **A hash refresh can record a peer's open edit.** The helper hashes the working tree. P107 had uncommitted
  scenarios in the Dropdown's file, and the refresh took them in. Check `git diff` of the hashes file and put
  anything you did not change back to HEAD's hash.
- **A boundary around the element, not the component,** keeps every identity and ref. One line in
  `NoodlReactComponent.render()` covers every built-in.
- **Time a benchmark in CPU (`process.cpuUsage`) with the arms interleaved** when peers are loading the box (load 25
  this session). Wall-clock readings were noise.

## Recipes

- **A spec's announced ports without the editor:** call the module's `setup(context, graphModel)` with a fake graph
  whose `on('editorImportComplete')` you fire, and read `sendDynamicPorts` (`isl044-listdefaulttype` specs).
- **Commit one hunk of a file that holds two changes:** build the file from `git show HEAD:<f>` plus that hunk, then
  `git hash-object -w` and `git update-index --cacheinfo` into the temporary index.
- **Deploy-time roots:** `readDeployedRoots(outDir)` (`noodl-preview/src/deployReading.ts`), or read
  `noodl_bundles/*.json` for `roots`.
- Commit through a temporary index, as before.

## Worktrees

`p109-isl049` (branch `p109-isl052`) is unchanged. The older ones are spent.
