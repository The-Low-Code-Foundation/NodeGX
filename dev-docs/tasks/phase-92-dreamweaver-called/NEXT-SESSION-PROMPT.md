# Phase 92 — next session

**Written 2026-09-17 at the end of s26.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s26 in one paragraph: handoff items 1 and 2 are **built, driven and committed as slice 13 (CHR-009 §21). It awaits
Richard's look.** The select cap was the one place s25 had not read: `PropertyPanelInput`'s **inline flex line** around every
control. The select's root has no width, so as a `0 1 auto` item it shrink-wrapped to **174px** of a 580px line. A census
at wide over the whole set found **all 30 selects** leaving 406px empty and nothing else short. The fix grows the select
there only, because the same root is the unit select inside number fields. Selects now draw at 580px, the width of the
number fields. The Box Sizing value cut at wide is gone (Group 5→4, Button 1→0). Text's 33px was the textarea's
`min-height: 33px`. It is now 26 for one line and grows 16px per line (three lines = 58).

⚠️ Peers work in this checkout: **P88** (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`, `nodegx-backend/*`,
`noodl-runtime/*`) and **P93** (`VisualCanvas/*`, TVW-003). s26 also found a peer running `jest tests-unit/chr-007 chr-008
fb-018 aib-001` and waited for it to finish. Commit by pathspec. **Check `ps` for `scripts/start.ts` right before seeding recents.**

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–12 approved; **slice 13 awaits his look** (§21). AC2 met on the Group by ruling (§19.1.4). AC1 = Richard's WORTHY on the Group pair. AC5 needs CHR-004 + `test:ci`. Left: §21.5 |
| CHR-004, 010, 011 | ⬜ |

## What to do next, in order (re-run `set/drive-set.js` before and after each)

0. **Richard's look on slice 13**: `verdicts/CHR-009/2026-09-17/set/slice13/props-group-wide-top-dark.png` (selects at wide),
   `props-group-docked-top-dark.png` (docked unchanged), `textarea-one-line-light.png` and `textarea-three-lines-dark.png`.
   Those two names are **swapped relative to their content** (§21.3). The first shows `Text`, the second three lines.
   PNGs are gitignored: they exist only on this machine.
1. s21 still-small: **a token in a pair field ellipsises**, then **a binding chip on an align row**. Measure each before
   building, as with `set/drive-row-slack.js` (the census that scoped slice 13).
2. §14.3 opacity input reads `''` on an opaque colour. Compare against an opaque hex before calling it a defect.
3. When the region list is empty: shoot the Group pair for **AC1** (CHR-001's `props-group-top.png` beside a fresh one)
   and ask Richard for WORTHY; then **R6 final**. The cut census, from `slice13/set-results.json`: docked, Group 5/69
   (1 value + 4 labels), Button 1/54 (the Box Sizing value), others 0. Wide: Group 4/69 (labels only), all others 0.

## Settled in s26 (and where the handoff was wrong)

- **"One eval will name it" was right**, but the cap was not in any of the three candidates s25 listed (`PropertyRow`,
  `ControlHost`, legacy `.property-row`). It was an **inline style in `PropertyPanelInput.tsx`**, a file s25 had read for
  its stylesheet only. Walking the ancestors' computed `flex` found it in one eval.
- **The obvious fix, `width: 100%` on the select root, would have been wrong**: the root is reused as the unit select in
  `NumberUnitInput` and `PropertyPanelLengthUnitInput`.
- Text's 33 was not "the comment-field overshoot family". It was its own `min-height` floor.

## Traps (s12–s26)

- 🔴 **An inline `style` is invisible to a stylesheet reading** (s26): walk computed `flex`/`width` up the live chain first.
- 🔴 **A census run docked grades nothing about wide** (s26): selecting a node put the panel back to docked. `drive-row-slack.js`
  now forces wide after each select and prints the width. Check that printed width before trusting its numbers.
- 🔴 **`drive-textarea.js` readings trail its `setParameter` by one step** (s26). Attribute every reading by the `value` it
  prints. And a `'\\n'` inside a JS string that is `JSON.stringify`'d into an eval arrives as a literal backslash-n (one wrapped
  line, 42px); build newlines with `String.fromCharCode(10)`.
- 🔴 **Right after `cdp.js reload`, the panel is not there yet** (s26: `null.querySelector`). Run `drive-select-chain.js` or
  `drive-set.js` first. They wait for the project.
- 🔴 **A class with no rule draws Chromium's `<button>`** (s25): grep the class in the stylesheets before "matching" its look.
- 🔴 **Shrinking a control can move a legacy row** whose height came from that control (s25): shoot the list POPULATED.
- 🔴 **A peer's stack can start while you plan** (s25): check `ps` right before seeding recents, not only at session start.
- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21, s25). Look at every PNG.
- 🔴 **Grading one node hid a region for 9 slices** (s23): run `set/drive-set.js` (8 node types) after any slice.
- 🔴 **A count is not a finding** (s24): `set/paints.js` names the element behind every fill and radius.
- 🔴 **"Match the neighbour" means every paint, not the one named** (s24).
- 🔴 The scratch copy has **no icon set**: set a value on the model + reselect to see the named state.
- 🔴 **Escape and `.popup-layer-blocker.click()` do NOT close the icon picker**; a real CDP press on the blocker does.
- 🔴 A nested control reads as its own height: grade the outermost drawn field (s23).
- 🔴 **HMR leaves old CSS** (s25, again s26: the new rule was absent from `document.styleSheets` after a clean compile).
  `cdp.js reload`, then re-check the rule text.
- 🔴 A long compile drops the dev-server socket ("Disconnected!"). It is not dead; `ps` webpack CPU tells you. s26's
  first editor compile took 187 s, and a rebuild triggered by a peer edit took 323 s.
- 🔴 A select row (`EnumType`) has **no `data-identifier`**: find its input through the visible row's label.
- 🔴 `require('@noodl-models/projectmodel')` in `tests-unit` throws at load. A spec reaching `common/Icon` needs FLD-017's
  `jest.mock` stub.
- 🔴 A CDP Cmd+A selects nothing on macOS: call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is only part of it; plain `npx jest` adds `tests-main`. Name the command.
- 🔴 `verdicts/…/out/`, `*.log` and PNGs are gitignored: name result dirs `after/`, `slice13/`.
- 🔴 `node --check` every drive edit.
- Recipe: copy the scratch `story-engine` (s26: `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/06967943-b045-4bf4-acfc-b9fefd4e5fd4/scratchpad/story-engine`;
  it has the `chr009-set-*` nodes) into the session scratchpad; it uses `nodegx.project.json` (id `6f071c1a-…`). Back up
  `~/Library/Application Support/NodeGX/recently_opened_project.json` (sha `a1ea46f2…`; `{recentProjects:[…]}`), unshift
  `{retainedProjectDirectory, latestAccessed, id, name:"Story engine"}`, then
  `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug` in the background (exit 144 on `dev:stop` is the stop).
  Wait for `:9333/json/version`, run drives with `--expect=<copy>` (`drive-select-chain.js` takes it as argv[2]),
  `npm run dev:stop`, restore recents, compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest, and wait out a peer's jest.

## Still Richard's

1. **Slice 13's look** (item 0).
2. AC1's WORTHY on the Group pair, when the region list is done.
3. R6 final ("ok so far"; show the cut census).
4. The `···` menu is DECLINED. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
5. The Projects tab's two full-width cards (BST-003 / UNI-001).
6. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s26 (2026-09-17, working tree on `8fe91b234` + slice 13)

`tsc --noEmit` (editor) **EXIT 0**. `npm run colors` / `npm run type` **holding**. Plain `npx jest` (editor, stack down)
**482 suites / 7,777 tests, all green, EXIT 0**. No spec added: jsdom does no layout, so the drives are the grade (§21.4).
`test:ci` **not run**. `dev.log`: 0 `ERROR in`. Recents restored byte-identical (`a1ea46f2`).
