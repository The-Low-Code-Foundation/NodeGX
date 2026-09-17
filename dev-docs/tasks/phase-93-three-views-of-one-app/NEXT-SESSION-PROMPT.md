# Phase 93 — next session

**Written 2026-09-17, end of session 8.** Sessions 1–5 built and drove TVW-003 slices 1–5. Session 6
started TVW-001 (slice 1, AC1 + AC2); session 7 built and drove slice 2 (row d) and closed AC3.
**Session 8 built and drove TVW-001 slice 3 (row c, `×N` → *Used in*) and closed AC4** (`6396ea64c`).
It also fixed the meta misalignment slice 1 had recorded, and spent a large part of its wall-clock
blocked on a peer's dev stack — see "The box", below, which is now a phase rule rather than a note.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | 🟡 slices 1 (a, b), 2 (d), 3 (c) ✅ | **AC1 ✅ AC2 ✅ AC3 ✅ AC4 ✅** · AC5–8 — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED** — AC1 ✅ (hover 1px / selection 2px, ruled) |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 10** (TVW-003 all six — closed; TVW-001 AC1, AC2, AC3, AC4).

## Gate readings (2026-09-17, session 8, at `6396ea64c`)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **4 suites / 33**, armed (s8: five
  mutants on `usedIn.ts`, each red — one row per occurrence; walk order kept; the parent's *last*
  instance navigated to; the heading never reconciling the counts; the label/folder split off by
  one. Restored, `cmp` clean).
- `tsc -p packages/noodl-editor --noEmit` EXIT=0.
- `test:ci` **not run** in s6, s7 or s8. Owed before TVW-001 closes (AC8); run it alone with
  `.webpack-cache` cleared. s7 touched `propertyeditor/Pages/Pages.tsx` and s8 touched only
  `ComponentsPanelNew/`; no spec in `tests/` references either.
- Driven: TVW-001 §7 has the slice 1, 2 and 3 tables.

## What session 7 settled

- Slice 2's decisions are in TVW-001 §7 "Slice 2 — what was built": Pages flat in Router order,
  headed per Router only when >1 group; `start` marker; home in Pages only with a `Page` node;
  `empty` always in Components (the spec's "its folder's section" has no answer for a split folder);
  cloud rows keep full paths; cross-boundary drags refused in the sectioned view. None is a ruling —
  but Richard sees them at AC7.
- AC1 reworded in the task file to the s6-driven sequence (the handoff's "reword owed" is done).
- 🔴 **Defect 1, fixed:** on first open every visual component was filed under `Logic`, because
  `allowAsChild` reads a cached `node.type` that resolves only after the node library loads. The
  panel now rebuilds on NodeLibrary events. The same staleness was behind PNL-006's wrong glyphs.
- 🔴 **Defect 2, fixed:** the Router's Pages editor mutated the parameter object that undo holds, so
  add, remove and start page could not be undone. `pagesValue.ts` now returns a new object per edit.
- Filter: a section heading's count is now the rows that survive the filter.
- Seen for AC7 (not fixed): the `Not in a router` heading repeats the row chip; rows are 26px under
  30px headings; home sorts after folders.
- 🔴 The sectioned view is **only the unfiltered view** (`currentSheet === null`, the default). A
  selected sheet still draws the old tree — deliberately, until slice 4.

## What session 6 settled

- **AC1's first step names a gesture that does nothing**: double-clicking a Router opens its
  properties (no component-typed port). Driven instead through a canvas double-click on the `Hero`
  instance on Home, then ⌘[. Reword the AC (not a ruling).
- Meta rules that the AC did not spell out, written in `componentUsage.ts` and TVW-001 §7: home,
  unplaced popups and cloud functions carry no meta; `empty` wins over every kind.
- The usage index already carries each instance's `{parent, nodeId}` — slice 3's *Used in* popover
  needs no second walk.

## What session 8 settled

- **Slice 3 is built and driven; AC4 is closed.** The design decision inside it — rows grouped **by
  parent**, not one per occurrence as X-Ray draws them — came from a measurement, not taste: on the
  corpus, five of the six components with 2+ instances have them all in one parent. It is not a
  ruling, but Richard sees it at AC7. Detail and the drive table are in TVW-001 §7.
- 🔴 **The handoff's own slice-3 plan named the wrong candidates.** It said "`ServiceCard ×4` and
  `StatTile ×4` are the `×3`-or-more candidates" for AC4. Both have **one** parent, so neither can
  satisfy "lists three parents". The only component on LPV2 that can is
  `/Components/Logic/Scroll to section` (×8 across Hero, SiteFooter, SiteNav). Check the parents, not
  the count, when picking a fixture.
- The meta misalignment slice 1 recorded is fixed (`WarningDot` reserves its slot); every row's meta
  right edge is now 344, dotted or not.

## Next, in order

1. Slice 4 (e, AC5). Sheets retire; `#Sheet` folders draw as folders (the unfiltered view still
   strips them); a door for the first cloud function once the sheet selector goes (today the cloud
   section's empty text names no door). Drive a drag across the cloud boundary here: s7 could not,
   because the QA fixture has no cloud folder.
3. Slice 5 (f, AC6), then AC7 screenshots and AC8 (`test:ci`). The AC7 list is now: the three s7
   notes (the `Not in a router` heading repeating the row chip; 26px rows under 30px headings; home
   sorting after folders) plus one from s8 — in the *Used in* popover a parent's count renders on a
   **second line** under the path (`MenuDialogItem.endSlot` draws below the label), so rows with a
   count are two lines tall and rows without are one. The meta alignment item is **done**.
4. Optional, no AC asks it: the bench outlining a canvas selection or hover inside itself.

## Rulings owed by Richard

None open. **Ruled s6:** preview hover outline is 1px, selection 2px (TVW-003 slice 6). Richard also
ruled the Docker cleanup in s8 (below) — not a phase matter, but it is why the box is quieter.

R-A…R-I inherited, R-J ruled.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` §4.3; TVW-001 §2 and §7.
2. README §2 and §6. TVW-003 §6 has the selection plumbing map.

## How the drive was done (reuse it)

Scratch profile (`firstRunLegal.json` copied from the live profile + `recently_opened_project.json`
pointing at a copy of `Landing page test V2`), `NOODLPORT=8680 NOODL_REMOTE_DEBUG_PORT=9444
NOODL_USER_DATA_DIR=<scratch> npm run dev:debug -- --quiet`. **Check `ps` for a peer's `dev:debug` and
wait for it** (s4 waited 20 min); cold compile ≈ 6 min. Open the copy by clicking its `h3`. Canvas =
`window.__nodeGraphEditor`; modules via `webpackChunknoodl_editor.push([[Symbol()],{},r=>window.__wreq=r])`,
then the module with `selectionStore`+`authoredPath` and the one with `ProjectModel.instance`. Design
mode = first `[class*=ModeSegmentedButton]`. Node screen point = canvas rect origin +
(`node.global` + `getPanAndScale()`) × scale — pan the node in first with `setPanAndScale`. Preview
clicks through the editor target at guest point + webview rect origin; guest reads via
`webview.executeJavaScript` or the `localhost:<NOODLPORT>` target. Spy by wrapping
`webview.executeJavaScript`; 🔴 reset it in a separate eval. Stop with `node scripts/devtools/stop-dev.js`
(`--list` first). Drive scripts (s7's are in its scratchpad, gone): `ev.js` (`--target=<substr>` + expression, awaited) and `click.js x y`
(scratchpad, gone — the shapes are above). 🔴 cdp.js reads `NOODL_REMOTE_DEBUG_PORT` at require time —
set it to 9444 before requiring, or every call hits 9222. 🔴 zsh does not word-split `$P`: pass
coordinates as two literal args. 🔴 A double-click on a non-component node hides the Components tree
(0×0 rects) — click the rail's Components button first. Bench: `EventDispatcher.instance.emit('preview-bench-mount',
{target})` (the module with `EventDispatcher.instance`); its guest target is `--target=noodl-sandbox=`.
🔴 An absence ("no store write") needs a guest `pointerdown` counter beside it, or it grades nothing.
s7 additions: theme = the module exporting `ThemeManager` → `setMode('light'|'dark')`; panel-only PNG
= `Page.captureScreenshot` with `clip` = the tree's BasePanel rect (`sips -c` crops from the CENTRE);
Router node → `__nodeGraphEditor.selectNode(findNodeWithId(id))`, then *Add new page* is
`.sidebar-fullwidth-button`, the popup rows `.variant-item-name`, a page's menu
`.router-pages-actions-icon`; the rail's Components button (26,101) brings the tree back after the
property panel. `location.reload()` returns to the launcher, so re-`cp` the project copy there to
reset it.

## The box — read this before planning a drive

**Only one dev stack can run in this checkout at a time.** `webpack-dev-server` hardcodes
`port: 8080` *and* `publicPath: http://localhost:8080/` in
`packages/noodl-editor/webpackconfigs/webpack.renderer.dev.js`. `NOODLPORT` moves the editor's own
server and design socket but not webpack's, so a second `npm run dev:debug` dies with
`EADDRINUSE ::1:8080`. Editing that file to get around it would repoint a peer's live bundle URL —
don't. **Check `node scripts/devtools/stop-dev.js --list` and `lsof -nP -iTCP:8080 -sTCP:LISTEN`
first, and if a peer holds it, ask them rather than waiting blind.** s8 lost roughly 50 minutes here.

🔴 **A failed launch looks exactly like a good one.** `dev:debug -- --quiet` writes its banner only
to `.logs/dev.log`, and the launcher **exits 0** even when the stack never came up. Gate on the CDP
port answering:

```bash
until curl -s -m2 http://127.0.0.1:9444/json/list >/dev/null; do sleep 10; done
```

⚠️ Also: `&` inside a backgrounded tool call dies with its wrapper; background the launcher as the
call's own command. And `dev-debug.js` opens `.logs/dev.log` with `flags: 'w'`, so launching
**truncates a peer's live log**.

✅ **Teardown sweeps the whole checkout, by every route** — `dev:stop`, killing the launcher pid, all
of it. Announce before you run it; s8 announced to two peers and took the box cleanly.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover outlines, never scrolls — driven
`scrollY` 0 in s4; keep it that way when the bench gets its bridge.
