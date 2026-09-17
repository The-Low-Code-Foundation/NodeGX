# Phase 92 — next session

**Written 2026-09-17 at the end of s28.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s28 in one paragraph: s27's item 1 is **done** (CHR-009 §23). **The code answered the measurement:** `MarginPaddingType` and
`MarginPaddingInput` never read a connection, so a wired margin/padding edge kept an editable, scrubbable field in its pair
and expanded. That is FB-018's bug in a third control. **Slice 15:** any wired edge forces its side to per-edge fields. The wired
edge draws a `BoundField` (edge glyph, link glyph, source in mono, chip paint, precedence sentence in the tooltip, click to
navigate). The other edges stay editable, and reset and the changed dot skip wired edges. Policy `MarginPaddingType` → chip.
Specced (+9), 3 mutants killed, driven live/reselect/type/click/unwire docked and wide. **Not yet approved:** PNGs opened
in Preview for Richard; docked the source cuts to `S…`.

⚠️ Peers work in this checkout: **P88** (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`, `nodegx-backend/*`,
`noodl-runtime/*`) and **P93** (`VisualCanvas/*`). Commit by pathspec.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–14 approved; **slice 15 + label fix approved** ("clearer"). AC2 met on the Group by ruling (§19.1.4). AC1 = Richard's WORTHY on the Group pair. AC5 needs CHR-004 + `test:ci`. Left: §23.5 |
| CHR-004, 010, 011 | ⬜ |

## What to do next, in order

1. ✅ Done in s28: Richard drove slice 15 live, found the floating label, and approved the fix (*"It looks good now, it's
   clearer"*, §23.5). The docked `S…` was visible and he raised nothing about it; don't reopen it unless he does.
2. **The region list is now empty** (§22.5 and §23.5 have no unbuilt region). Shoot the Group pair for **AC1**
   (CHR-001's `props-group-top.png` beside a fresh one) and ask for WORTHY; then **R6 final** with the cut census
   (`slice13/set-results.json`: docked Group 5/69, Button 1/54; wide Group 4/69, others 0). Re-run `set/drive-set.js`
   first (8 node types) because slice 15 is visual. Its fixtures carry no wires, so it will not show a bound field.
3. Then CHR-004 (the gates), which AC5 needs, and a `test:ci` when no peer holds the box.

## Settled in s28 (and where the handoff was wrong)

- **"Measure first with a drive"**: the code measured it with no branch to miss (zero connection reads in both files). The
  drive was spent on the built consequence instead. That is cheaper and grades more.
- `connectedRowPolicy`'s `MarginPaddingType` reason ("four sides in one control", FB-016) was the second stale reason in two
  sessions (s27: align rows). **Every exception in that table is now a real one** (the Logic Builder pair and trigger info).
  The 17 deferred rows were not re-read.
- A pair field cannot chip one wire, so the design **forces the side open** instead of drawing a chip over a pair.

## Traps (s12–s28)

- 🔴 **A peer stack can start in the gap between `ps` and the recents write** (s25, again s27). Check and seed in one command.
  If it happens, remove only your entry, then `cp` the backup back **before** their editor launches (`JSON.stringify` changes
  whitespace, so the sha only matches after a `cp`).
- 🔴 **Launching an editor beside a peer `test:ci` can kill it**: wait it out (`pgrep -f "run-electron-tests|webpack.test-ci"`).
  A `pgrep -f` watcher matches its own `zsh -c` line, so drop `zsh -c` from the results.
- 🔴 **A policy table's reason can outlive the control it describes** (s27): `connectedRowPolicy`'s exceptions are text, not
  graded. When a slice changes a control's shape, re-read its row there.
- 🔴 **An inline `style` is invisible to a stylesheet reading** (s26): walk computed `flex`/`width` up the live chain first.
- 🔴 **A census run docked grades nothing about wide** (s26): print the panel width with every reading.
- 🔴 **`drive-textarea.js` readings trail its `setParameter` by one step** (s26). Build newlines with `String.fromCharCode(10)`.
- 🔴 **`NodeGraphNode.setParameter` directly is not heard by the panel**: reselect (another node, then back) after it.
  `graph.addConnection`/`removeConnection` ARE heard live (s27 read the chip within 5 s, no reselect).
- 🔴 **Right after `cdp.js reload`, the panel is not there yet** (s26). Drives wait for the project.
- 🔴 **A class with no rule draws Chromium's `<button>`** (s25). **Shrinking a control can move a legacy row** (s25).
- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21, s25). Look at every PNG.
- 🔴 **Grading one node hid a region for 9 slices** (s23): `set/drive-set.js` (8 node types) after any visual slice.
- 🔴 **A count is not a finding** (s24): `set/paints.js`. **"Match the neighbour" means every paint** (s24).
- 🔴 The scratch copy has **no icon set**. **Escape and `.popup-layer-blocker.click()` do NOT close the icon picker**; a real
  CDP press on the blocker does (it also closes the colour picker).
- 🔴 A nested control reads as its own height: grade the outermost drawn field (s23).
- 🔴 **HMR leaves old CSS** (s25, s26): `cdp.js reload`, then re-check the rule text. Check the renderer runs the new module
  (`String(r.m[key]).includes(...)`) before a drive, as `drive-s27.js` does.
- 🔴 A long compile drops the dev-server socket ("Disconnected!"). s27 cold start to CDP: 120 s.
- 🔴 A select row (`EnumType`) has **no `data-identifier`**: find its input through the row's label.
- 🔴 `require('@noodl-models/projectmodel')` in `tests-unit` throws at load. A spec reaching `common/Icon` needs FLD-017's stub.
- 🔴 A CDP Cmd+A selects nothing on macOS: call `input.select()` in the page.
- 🔴 Plain `npx jest` includes `tests-main`; `tests-main/relay-auth` "viewer disconnects" flaked once in s27 (green alone).
- 🔴 `verdicts/…/out/`, `*.log` and PNGs are gitignored; `node --check` every drive edit.
- Recipe: copy the scratch `story-engine` (s27: `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/c9a7d2a8-b9e9-46bf-bbef-0e6fbf917154/scratchpad/story-engine`;
  it has the `chr009-set-*` and `chr009-s27-*` nodes) into the session scratchpad; it uses `nodegx.project.json` (id `6f071c1a-…`).
  `cp` `~/Library/Application Support/NodeGX/recently_opened_project.json` to a backup (sha `a1ea46f2…`), unshift
  `{retainedProjectDirectory, latestAccessed, id, name:"Story engine"}`, then
  `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug` in the background (exit 144 on `dev:stop` is the stop).
  Wait for `:9333/json/version`, run drives with `--expect=<copy>`, `npm run dev:stop`, `cp` the backup back, compare `shasum`.
- ✅ **s28 recipe, better than the recents seed:** `NOODL_USER_DATA_DIR=<scratch>/profile` (copy `firstRunLegal.json`, write a
  one-row `recently_opened_project.json`) + `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug -- --quiet`. Richard's
  recents are never written, so the peer-launch race above cannot touch them. s28's profile + project copy:
  `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/e3ba906e-8785-410f-9df9-08288b835f9b/scratchpad/{profile,story-engine}`.
- 🔴 **Never edit a source file while a stack is compiling or live** (s28): mid-compile it WEDGED the dev server (bundle
  `000`, blank window, relaunch only). A mutant on a live stack disconnected the renderer under Richard. Mutants and edits go
  BEFORE the launch or after `dev:stop`.
- 🔴 **Your `dev:debug` REAPS a peer's live stack** (`start.ts` `reapPreviousSession()` sweeps the whole checkout). s28 waited
  ~35 min for a peer `dev:debug` to exit (`while ps -p <pid>`), then launched with the `ps` check in the same command.
- One heavy job at a time: stop the stack BEFORE jest, and wait out a peer's jest/`test:ci`.

## Still Richard's

1. ✅ Slice 15 + the top-aligned label: approved in s28.
2. AC1's WORTHY on the Group pair. R6 final ("ok so far"; show the cut census).
3. The `···` menu is DECLINED. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s28 (2026-09-17, slice 15 = the commit after `53cc84b90`)

Targeted jest (editor): `chr-009/marginPaddingRows` 23, `chr-009/boundEdge` 3, `fb-018` ×2 → **4 suites, 45/45**. Mutants
M1–M3 each **1 failed / 23**, restored `cmp`-identical. `tsc --noEmit -p tsconfig.json` **EXIT 0**. `npm run colors` / `type`
**holding**, `tokens:css` ✓. Plain `npx jest` (editor, stack down) **487 suites / 7,841 tests, EXIT 0**. `test:ci` not run. Drive EXIT 0, `dev.out`
0 `ERROR in`, stack stopped (26), recents sha `a1ea46f2`.
