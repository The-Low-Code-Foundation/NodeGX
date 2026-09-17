# Phase 92 — next session

**Written 2026-09-17 at the end of s25.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s25 in one paragraph: handoff item 1 is **built, driven and committed as slice 12 (`10354b4ba`), and approved by Richard ("Looks good").**
The Function node's bright bordered `</>` `+` were **not a style**. Their class, `components-panel-edit-button`, has **no
rule in any stylesheet**, so they drew as Chromium's unstyled `<button>`, pinned 30px up over the group heading. Both list
widgets now draw one `ListActions` row after the list. It uses the node head's 26px `IconButton`s, and entry rows use the
same button for rename and delete (FontAwesome gone from both files). The first build broke the prop list's entry row: the
name hung below its band. **Only the PNG showed it.** Rows now own a 30px height (CHR-009 §20). Item 2 (selects at wide)
was started and **not finished**: a peer's dev stack came up at 12:36 and the width source needs a live measurement.

⚠️ Peers work in this checkout: **P88** (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`, `nodegx-backend/*`,
`noodl-runtime/*`) and **P93** (`VisualCanvas/*`, TVW-003; its mid-edit `CanvasView.ts` put 2 `ERROR in` into s25's compile).
Commit by pathspec. **Check `ps` for a peer's `scripts/start.ts` immediately before seeding recents and launching: s25 found one
at that moment and did not launch.**

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–12 approved (12: "Looks good", after s25). AC2 met on the Group by ruling (§19.1.4). AC1 = Richard's WORTHY on the Group pair. AC5 needs CHR-004 + `test:ci`. Region leftovers §20.5 |
| CHR-004, 010, 011 | ⬜ |

## What to do next, in order (re-run `set/drive-set.js` before and after each)

0. ✅ Slice 12 approved by Richard after s25 ("Looks good"), actions under the list.
1. **Selects do not stretch at wide** (`Position`/`Layout` ≈174px at 736 while number fields fill; `Box Sizing` cut). **Measure
   before building.** Select a Group at wide and walk the `Position` select's ancestors (`getBoundingClientRect`, computed
   `width`/`flex`/`max-width`) up to `.property-panel-row`, beside `Vertical Gap`'s chain. s25 already **ruled out by reading**:
   `PropertyPanelSelectInput.module.scss` (no width), `PropertyPanelBaseInput` (100%), `PropertyPanelInput.module.scss`
   (`InputContainer` is `flex: 1 1 auto`), `EnumType.render` (`width: 100%`), and the `fit-content` rules in `propertyeditor.css`
   (header name, comment label). So the cap lives somewhere not yet read: `PropertyRow`/`ControlHost`, the legacy `.property-row`
   rules, or an inline style. One eval will name it.
2. **Text's 33px control** (the textarea, s21's comment-field overshoot family). The filter's 30 is s13's design, leave it.
3. Still-small from s21: a token in a pair field ellipsises; a binding chip on an align row. The §14.3 opacity input
   reading `''` on an opaque colour: compare against an opaque hex before calling it a defect.
4. When the region list is empty: shoot the Group pair for **AC1** (CHR-001's `props-group-top.png` beside a fresh one)
   and ask Richard for WORTHY; then **R6 final** (the set's cut census: Group 5/69 labels, Button 1/54 value, others 0).

## Settled in s25 (and where the handoff was wrong)

- **"Bright bordered `</>` and `+`" was not a look to match against a neighbour. It was an unstyled button**: a class with no
  rule anywhere. s24's "name the elements with `paints.js`" would not have found it: an unstyled `<button>` paints Chromium's
  `buttonface`, not a token.
- **The heading overlay could not simply be copied to States.** Census (`node-catalog.json` × the CHR-007 snapshot): 35 list
  ports, 34 alone in their group, `ToCSV.columns` 1 of 4. But `PropertyGroups` draws no headings for a single unnamed group,
  and there is no action slot.
- 🔴 **Shrinking a button changed a ROW's height.** The legacy list label is `position: absolute` (line-height 35), so the
  prop-list header's height had come from the 33px FA buttons; at 26px the name hung below its band. The numbers passed;
  the PNG caught it. `drive-lists.js`'s alignment metric was written AFTER the fix, so it was **not armed on the broken build**.
- `ComponentPortsView` (the component ports panel, not the property panel) still draws `sidebar-panel-edit-button` + FA. That
  belongs to CHR-010's icon-font scope and was not touched.

## Traps (s12–s25)

- 🔴 **A class with no rule draws Chromium's `<button>`** (s25): grep the class in the stylesheets before "matching" its look.
- 🔴 **Shrinking a control can move a legacy row** whose height came from that control (s25): shoot the list POPULATED.
- 🔴 **A peer's stack can start while you plan** (s25): check `ps` right before seeding recents, not only at session start.
- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21, s25). Look at every PNG.
- 🔴 **Grading one node hid a region for 9 slices** (s23): run `set/drive-set.js` (8 node types) after any slice.
- 🔴 **A count is not a finding** (s24): `set/paints.js` names the element behind every fill and radius. Attribute before
  building. Two of s23's "unmet" fills were the switch.
- 🔴 **"Match the neighbour" means every paint, not the one named** (s24): read the computed fill, edge AND hover of both.
- 🔴 The scratch copy has **no icon set**: the icon picker is empty and a lucide glyph draws nothing. Set a value on the
  model + reselect to see the named state.
- 🔴 **Escape and `.popup-layer-blocker.click()` do NOT close the icon picker**; a real CDP press on the blocker does.
- 🔴 A nested control reads as its own height: grade the outermost drawn field (s23).
- 🔴 **The served bundle can carry a change while the renderer runs the old module**: check module source, then
  `cdp.js reload` (HMR also leaves old CSS; check `document.styleSheets` rule text). After a reload, run `drive-set.js` first:
  it walks the launcher back into the project; `drive-lists.js` does not.
- 🔴 A long compile drops the dev-server socket ("Disconnected!"). It is not dead; `ps` webpack CPU tells you.
- 🔴 A setup `setParameter` is invisible to an open panel: reselect (select another root node, then back).
- 🔴 A select row (`EnumType`) has **no `data-identifier`**: find its input through the visible row's label.
- 🔴 `require('@noodl-models/projectmodel')` in `tests-unit` throws at load (`Tests: 0 total`). A spec importing anything that
  reaches `common/Icon` needs FLD-017's `jest.mock` stub (s25's `listActions` failed to run without it).
- 🔴 A CDP Cmd+A selects nothing on macOS: call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is only part of it; plain `npx jest` adds `tests-main`. Name the command.
- 🔴 `verdicts/…/out/`, `*.log` and PNGs are gitignored: name result dirs `after/`, `slice12/`.
- 🔴 A quoted heredoc passes `\'` to python literally (s25's handoff script died on it). `node --check` every drive edit.
- Recipe: copy the scratch `story-engine` (s25: `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/1529b740-cc95-4fc4-823e-99e57dc64c1d/scratchpad/story-engine`;
  it has the `chr009-set-*` nodes) into the session scratchpad; it uses `nodegx.project.json` (no `project.json`). Back up
  `~/Library/Application Support/NodeGX/recently_opened_project.json` (sha `a1ea46f2…`; the file is `{recentProjects:[…]}`, not
  an array), unshift `{retainedProjectDirectory, latestAccessed, id, name:"Story engine"}` (`id` from `nodegx.project.json`), then
  `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug` in the background (exit 144 on `dev:stop` is the stop).
  Wait for `:9333/json/version` (45–185 s), run drives with `--expect=<copy>`, `npm run dev:stop`, restore recents,
  and compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest.

## Still Richard's

1. ~~Slice 12's look~~ approved.
2. AC1's WORTHY on the Group pair, when the region list is done.
3. R6 final ("ok so far"; show the cut census).
4. The `···` menu is DECLINED. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
5. The Projects tab's two full-width cards (BST-003 / UNI-001).
6. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s25 (2026-09-17, on `10354b4ba`)

`tsc --noEmit` (editor) **EXIT 0**. `npm run colors` / `npm run type` **holding**. Plain `npx jest` (editor, stack down, before
the new spec was written) **481 suites / 7,770 tests, all green, EXIT 0**. `chr-009/listActions` 2/2, mutants 1 + 1 red.
`test:ci` **not run**. `dev.log`: 4 `ERROR in` lines, all from the P93 peer's mid-edit `CanvasView.ts`, which recompiled clean.
Recents restored byte-identical (`a1ea46f2`) after the stack, and again after a reseed undone when the peer's stack was found.
