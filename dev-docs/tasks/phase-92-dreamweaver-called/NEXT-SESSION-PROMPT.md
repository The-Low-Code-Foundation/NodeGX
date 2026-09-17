# Phase 92 — next session

> **s22 (2026-09-17) addendum — CHR-013 obsidian ✅ closed on Richard's look ("love it").** The dark ramp is
> obsidian and every `BasePanel` paints `bg-1` (CHR-013). Richard then moved to other work, so **§16's greyed hint
> was NOT shown to him — it still awaits his look (item "First" below stands).** New open items from s22, in
> CHR-013 §5: ~15 `bg-1` wells in six rail panels may blend with the new panel ground (look by eye); 28 × React
> "synchronously unmount" on every project → launcher transition (re-measure on HEAD, then file); one null `value`
> input warning in the property panel. Readings: `npx jest` 476 suites, 3 palette pins moved on purpose and
> re-run green (318/318), `colors`/`type` holding. The verdict PNGs for §16 were shot on the OLD palette.

**Written 2026-09-17 at the end of s21.** Richard approved slice 9 and ruled on the count wording and the per-side
hint. The folded count had a real defect (fixed). An unset per-side border field now shows its inherited value greyed.
Both are driven and committed, and the greyed hint awaits his look. Branch `cline-dev`. Phase commits:
`git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half (`~/vscode_projects/nodegx-community`,
deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`,
`nodegx-backend/*`, `noodl-runtime/*` are theirs; staged `library/prefabs/date-picker` deletions are theirs).
Never commit their files; commit by pathspec. Before launching a stack, check `ps` for a peer's `scripts/start.ts`.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–9 approved; folded count fixed (§15.5); **the per-side greyed hint (§16) awaits his look** |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at the greyed hint (§16)

Show `verdicts/CHR-009/2026-09-17/inherited/after/border-left-inherited-dark.png`, `…-light.png` and
`corner-top-left-inherited-dark.png`: Left edge picked, all sides solid / 3px / red / radius 8, and the left fields
show `Solid`, `3`, `#FF0000` greyed with a red swatch. Ask in plain words: (1) does it read as "this side is using
the all-sides value"? (2) The grey is now on EVERY placeholder in a panel field (the shared base input), not only
these. Is that fine? Record the answer in §16.

## Then, in order

1. Small: comment field 4px overshoot; Escape on the Variant picker (compare against HEAD first); a token in a pair
   field ellipsises; a binding chip on an align row; `Box Sizing`'s value ellipsises at 156px.
2. A Text node's `Text Horizontal Align` label at 116px: predicted, not driven. Look at a Text node.
3. The picker opened on an opaque colour (`#FBF8F3`) read `''` in its opacity input (§14.3). Unmeasured whether that is
   normal for every opaque colour; compare against an opaque hex on HEAD before calling it a defect.
4. `model/scopeRows.ts:117` decides a scope segment's set-mark with `!== undefined`, the same rule §15.5 found wrong
   for the folded count. Drive it: set a side, clear it (stores `''`), and see whether the mark stays.

## Settled in s21 (and where the handoff was wrong)

- **Slice 9's look approved; the count keeps `N set`** (not the mockup's bare number).
- **§12.4 ruled: show the inherited value greyed**, then built (§16).
- **The handoff's item 1 was half right.** A real type-then-fold always updated the count: folding clears the
  hash and recounts. The defect it did not predict: **clearing a field stores `''`, and `''` counted as set**, so an
  emptied `CSS Class` read `1 set`. Fixed with `isParameterSet` (`''` counts only against a non-empty default).
  The folded-undo arm could not see it before the fix (it undid to `''`); after the fix it shows `1 set` → nothing.
- The first hint colour (`fg-muted`) was **too close to white in dark** to read as greyed; `fg-disabled` does.
  Found only by looking at the PNG: the numbers already said "placeholder present".

## Traps (s12–s21)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21). Look at the PNG after every
  drive; a 14px glyph needs a 4× CDP clip. Name the row you zoom on.
- 🔴 **A cleared text field stores `''`, not `undefined`** (s21). Any `!== undefined` "is set" rule is wrong for it.
- 🔴 **The served bundle can carry a change while the renderer runs the old module**: check the module source for
  every changed file before driving (every s21 drive does, then `cdp.js reload` after a rebuild).
- 🔴 **A setup `setParameter` is invisible to an open panel, and so is a reselect**: `renderGroups` hashes ports, not
  values. A group toggle clears the hash (both s21 drives press a heading to redraw).
- 🔴 A select row (`EnumType`) has **no `data-identifier`**: find its input through the visible row's label.
- 🔴 `require('@noodl-models/projectmodel')` in `tests-unit` throws at load (`Tests: 0 total`).
- 🔴 The select renders a measuring COPY of its options: pick an option by `elementFromPoint`, not by text.
- 🔴 A CDP Cmd+A selects nothing on macOS: call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is only part of it; plain `npx jest` adds `tests-main`. Name the command.
- 🔴 `2>&1 > file` sends jest's report to the TERMINAL: write `> file 2>&1`. No `timeout` binary on this Mac.
- 🔴 A backtick in a comment inside a JS template literal ends the string: `node --check` every drive edit.
- 🔴 CDP never sends a mouse-leave: park the pointer (`mouseMoved 5,5`) before reading anything hover-dependent.
- 🔴 `noodl-core-ui`'s own `tsc --noEmit` has 45 pre-existing path-alias errors; the editor's `tsc` is the gate.
- 🔴 Verdict PNGs and `*.log` are gitignored by design (`.gitignore:265`, `:6`); the JSON and script are the record.
- Recipe: scratch copy of `templates/story-engine` in the session scratchpad, back up
  `~/Library/Application Support/NodeGX/recently_opened_project.json` (sha `a1ea46f2…`), insert one `Story engine`
  entry at `recentProjects[0]`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug` in background (exit 144
  on `dev:stop` is the stop), wait for `:9333/json/version` (s21: 60s and 100s warm), run the drive with
  `--expect=<copy>`, `npm run dev:stop`, restore recents, compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest.

## Still Richard's

1. The greyed per-side hint, and `fg-disabled` on every panel placeholder (§16.4).
2. R6 final ("ok so far"; ask again once the rows are done).
3. The `···` menu is DECLINED, don't build it. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s21 (2026-09-17, working tree on `67e1c7639` + this session, before its commits)

`tsc --noEmit` (editor) **EXIT 0**. `npm run colors` / `npm run type` **holding**. `npx jest
tests-unit/fb-017/propertyPanelTiers.test.ts` **22/22**, mutant → 1 red; `tests-unit/chr-009/inheritedSide.test.tsx`
**5/5**, two mutants → 1 red each. `npx jest` (editor, stack down) **476 suites / 7,724 tests, all passed, EXIT 0**
(after the count fix alone: 475 / 7,719, EXIT 0). `test:ci` **not run**. Both stacks' `dev.log`: 0
`SassError|ERROR in`, 0 `synchronously unmount`. Recents restored byte-identical (`a1ea46f2…`) after both stacks.
