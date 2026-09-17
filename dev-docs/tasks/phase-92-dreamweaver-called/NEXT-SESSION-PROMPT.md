# Phase 92 — next session

**Written 2026-09-17 at the end of s27.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s27 in one paragraph: s26's handoff items 1 and 2 are **done** (CHR-009 §22). **Slice 14: a wired align row now draws the
binding chip** instead of its segments. Each row has been one port since slice 5, so `connectedRowPolicy`'s "no single
port" exception had gone stale, and a wired Align X still took presses the wire overwrote. Built, specced + mutant, and
driven on live, reselect, chip-click and unwire. **It awaits Richard's look.** §14.3's opacity `''` is **by design**
(`colorpicker.ts:121` + `placeholder="100%"`, since PLAT-002), and the drive read it as a greyed `100%`. **A token in a
pair field cuts to `--sp…` docked (needs 69px, has 43) and fits at wide.** No label trim fits, so it is a ruling for Richard.
Slice 13's look was sent to him at session start; no answer yet.

⚠️ Peers work in this checkout: **P88** (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`, `nodegx-backend/*`,
`noodl-runtime/*`) and **P93** (`VisualCanvas/*`, TVW-003). In s27 **a peer launched `dev:debug` (ports 9444/8680) between my
`ps` and my recents seed, then ran `test:ci`**. Commit by pathspec. **Run `ps` in the SAME command that seeds recents.**

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–14 approved (13+14 in s27: "They all look good"). AC2 met on the Group by ruling (§19.1.4). AC1 = Richard's WORTHY on the Group pair. AC5 needs CHR-004 + `test:ci`. Left: §22.5 |
| CHR-004, 010, 011 | ⬜ |

## What to do next, in order

0. ✅ Done in s27: Richard approved slices 13 and 14 and read the docked `--sp…` pair field as **leave it** ("They all look
   good", shown in Preview). Show him pictures with `open -a Preview <paths>`: links and file cards do not reach him.
1. **A wired margin/padding side** (§22.5 ⚠️): expanded per-edge fields are one port each, but `MarginPaddingType` is still an
   exception. Measure first with a copy of `drive-s27.js` arm A: wire `String.savedValue` → `paddingLeft`, expand, and read
   whether the field stays editable. Build a chip only if it does.
2. When the region list is empty: shoot the Group pair for **AC1** (CHR-001's `props-group-top.png` beside a fresh one) and
   ask for WORTHY; then **R6 final** with the cut census (`slice13/set-results.json`: docked Group 5/69, Button 1/54; wide
   Group 4/69, others 0).

## Settled in s27 (and where the handoff was wrong)

- **"§14.3 opacity `''`: compare against an opaque hex before calling it a defect"**: the code answered it before any drive
  (`alpha === 1 ? ''`). The drive confirmed the rendered placeholder. Not a defect.
- **The align-row chip was listed as "small"**, but it was a live FB-018-class defect: a wired alignment port kept clickable
  segments. The policy table's exception was a reason written for the pre-slice-5 strip, and nothing re-checks a reason.
- "A token in a pair field ellipsises" is true **docked only**. At wide it fits (273px fields).

## Traps (s12–s27)

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
- One heavy job at a time: stop the stack BEFORE jest, and wait out a peer's jest/`test:ci`.

## Still Richard's

1. ✅ Slices 13, 14 and the pair-field token: ruled in s27.
2. —
3. AC1's WORTHY on the Group pair, when the region list is done. R6 final ("ok so far"; show the cut census).
4. The `···` menu is DECLINED. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
5. The Projects tab's two full-width cards (BST-003 / UNI-001).
6. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s27 (2026-09-17, working tree on `ade2ced58` + slice 14)

`tsc --noEmit -p tsconfig.json` (editor) **EXIT 0**. Plain `npx jest` (editor, stack down) **483 suites / 7,783 tests, 1 failed**
(`tests-main/relay-auth` flake; 14/14 alone). `chr-009/alignRows` + `fb-018` 32/32; mutant killed. `colors`/`type` not re-run
(no CSS changed). `test:ci` **not run**. `dev.out`: 0 `ERROR in`. Recents restored byte-identical (`a1ea46f2`).
