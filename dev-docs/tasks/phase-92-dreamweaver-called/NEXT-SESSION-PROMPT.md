# Phase 92 — next session

**Written 2026-09-17 at the end of s24.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s24 in one paragraph: Richard **approved slice 10** and ruled the head rows' edge **"all four dimmer"**. Measured first,
the mismatch was the fill as well as the edge, so `Preset`/`Size` now paint exactly what `Variant`/`State` paint
(`fbc88257b`). Then **AC2's fills and radii were attributed element by element** (CHR-009 §19.2) instead of counted:
the Group was already at spec apart from the switch and the nested 4px segment corner, which **Richard ruled allowed**.
So **AC2 is met on the Group**. The attribution found the Button's only two off-vocabulary controls, and **slice 11**
made them fields: `Icon Source` (a 33×32 square with a hard-coded white glyph) and `PropertyPanelButton` (`Edit`).
It was driven on real input, **approved** ("looks good"), and committed `7bb79dc53`.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`, `nodegx-backend/*`,
`noodl-runtime/*`, `tests-unit/gam-020/` are theirs). Never commit their files; commit by pathspec. Check `ps` for a peer's
`scripts/start.ts` before launching a stack.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–11 approved. **AC2 met on the Group by ruling (§19.1.4).** AC1 = Richard's WORTHY on the Group pair. AC5 needs CHR-004 + `test:ci`. Region leftovers §19.6 |
| CHR-004, 010, 011 | ⬜ |

## What to do next, in order (re-run `set/drive-set.js` before and after each)

1. **Function `Script Inputs` / `Script Outputs` heading buttons** (bright bordered `</>` and `+`) vs **States** (the same
   two actions drawn borderless). One look for one action. Name the elements with `set/paints.js` first.
2. **Selects do not stretch at wide** while number fields do (`Box Sizing` stays cut at 736, §18.2.4).
3. **Text's 33px control** (the textarea, s21's comment-field overshoot family). The filter's 30 is s13's design, leave it.
4. Still-small from s21: a token in a pair field ellipsises; a binding chip on an align row. The §14.3 opacity input
   reading `''` on an opaque colour: compare against an opaque hex before calling it a defect.
5. When the region list is empty: shoot the Group pair for **AC1** (CHR-001's `props-group-top.png` beside a fresh one)
   and ask Richard for WORTHY; then **R6 final** (the set's cut census: Group 5/69 labels, Button 1/54 value, others 0).

## Settled in s24 (and where the handoff was wrong)

- **Slice 10 approved; edge "all four dimmer".** The handoff said "`Variant`/`State` use `border-default`". That was true
  but incomplete: they also use a **`bg-2` fill** where `Preset` had `bg-3`. Matching only the edge would have left two
  fills. The P75 sweep's ≥3:1 rows for these two controls were **removed by ruling**, replaced by a MATCH row (§19.5).
- **AC2 "unmet on every node"** (§18.6) was a count, not a finding. Attributed, the Group's 5 fills and 3 radii are
  field / sticky filter (panel tone) / selected segment / switch on+off; 6 / nested 4 / switch pill. Ruled allowed.
- **Handoff item 4 (`Icon Source` 24px square)** was 33×32, and it drew a **white** glyph (invisible on light). Fixed.
- The popout `Edit` button was on no list. The attribution found it (`bg-3`, borderless, hover darker). Fixed.
- s23's single red (`gam-020`, the peer's spec) passes now: plain `npx jest` is all green.

## Traps (s12–s24)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21). Look at every PNG.
- 🔴 **Grading one node hid a region for 9 slices** (s23): run `set/drive-set.js` (8 node types) after any slice.
- 🔴 **A count is not a finding** (s24): `set/paints.js` names the element behind every fill and radius. Attribute before
  building. Two of s23's "unmet" fills were the switch.
- 🔴 **"Match the neighbour" means every paint, not the one named** (s24): read the computed fill, edge AND hover of both.
- 🔴 The scratch copy has **no icon set**: the icon picker is empty and a lucide glyph draws nothing. Set a value on the
  model + reselect to see the named state.
- 🔴 **Escape and `.popup-layer-blocker.click()` do NOT close the icon picker**; a real CDP press on the blocker does.
- 🔴 A nested control reads as its own height: grade the outermost drawn field (s23; a whole-panel height query still
  lists 24px inputs inside 26px fields).
- 🔴 **The served bundle can carry a change while the renderer runs the old module**: check module source, then
  `cdp.js reload` (HMR also leaves old CSS; check `document.styleSheets` rule text).
- 🔴 A long compile drops the dev-server socket ("Disconnected!"). It is not dead; `ps` webpack CPU tells you.
- 🔴 A setup `setParameter` is invisible to an open panel: reselect (select another root node, then back).
- 🔴 A select row (`EnumType`) has **no `data-identifier`**: find its input through the visible row's label.
- 🔴 `require('@noodl-models/projectmodel')` in `tests-unit` throws at load (`Tests: 0 total`).
- 🔴 A CDP Cmd+A selects nothing on macOS: call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is only part of it; plain `npx jest` adds `tests-main`. Name the command.
- 🔴 `verdicts/…/out/`, `*.log` and PNGs are gitignored: name result dirs `after/`, `slice11/`.
- 🔴 `sed` edits in a spec: re-grep the line (s24 wrote `'').=== 'IconField'`). `node --check` every drive edit.
- Recipe: copy the s24 scratch `story-engine` (it has the `chr009-set-*` nodes) into the session scratchpad; it uses
  `nodegx.project.json` (no `project.json`). Back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), unshift one `Story engine` entry (`id` from `nodegx.project.json`), then
  `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug` in the background (exit 144 on `dev:stop` is the stop).
  Wait for `:9333/json/version` (60–185 s), run drives with `--expect=<copy>`, `npm run dev:stop`, restore recents,
  and compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest.

## Still Richard's

1. AC1's WORTHY on the Group pair, when the region list is done.
2. R6 final ("ok so far"; show the cut census).
3. The `···` menu is DECLINED. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s24 (2026-09-17, on `7bb79dc53`)

`tsc --noEmit` (editor) **EXIT 0**. `npm run colors` / `npm run type` **holding**. Plain `npx jest` (editor, stack down)
**479 suites / 7,751 tests, all green, EXIT 0**. `border-sweep` + `nat-001` 9 suites / 517. `style-section-control-borders`
29/29, mutant 2 red; `chr-009/iconField` 9/9, mutants 1 + 1 red. `test:ci` **not run**. Both stacks' `dev.log`:
0 `SassError|ERROR in`. Recents restored byte-identical (`a1ea46f2`) after both stacks.
