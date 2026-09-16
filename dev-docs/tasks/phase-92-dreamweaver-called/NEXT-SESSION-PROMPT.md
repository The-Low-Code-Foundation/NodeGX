# Phase 92 — next session

**Written 2026-09-16 at the end of s12 (CHR-009 slice 1: the row geometry — built, driven, committed).**
Branch `cline-dev`. Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform
half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/rocket-school/*` are
theirs). Never commit their files; commit by pathspec.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 **slice 1 built s12 (§6)** — label column, section header, number+unit field. **Awaits Richard's look** |
| CHR-004, 010, 011 | ⬜ |

## First job: Richard's look at slice 1 (a pixel changed this time)

Put these side by side for him (PNGs are local/gitignored by ruling):
- before: `verdicts/CHR-001/2026-09-15/editor-group-panel-top-{dark,light}.png` (installed 0.2.4)
- after: `verdicts/CHR-009/2026-09-16/after/props-group-top-{dark,light}.png`

Ask him two things: **is the direction right**, and **R6** — the 116px column cuts 4 of 59 Group labels
(`Background Gradient`, `Scroll To Element - Duration`, `Scroll To Index - Index/Duration`), with a tooltip.
Keep the trial, or not?

## Then, in order (CHR-009 §6.5)

1. **The head** — the biggest visible change left: seven zones → title row, node row (glyph tile, name,
   mono eyebrow), segmented `Properties | Ports`, filter with `/` hint. R7 = the comment becomes a TAB beside
   Ports (moves P75's feature; `leg-005/nodeCommentRow` pins today's placement). `propertyeditor/index.tsx`.
2. **One control height**: `PropertyPanelSelectInput` (Position/Layout, 28px) and legacy `.property-value`
   rows to 26 — AC2's last open clause on the Group.
3. The gutter connection dot (AC3) replacing the `●` after the label; paired Gap/Padding rows (AC4).
4. The resizing segment (four icons + stray dot → per-axis mode segment); colour field; Advanced CSS footer.

## Traps (s12)

- 🔴 **Numbers passed while the picture was broken** — "2 sizes, one label x" and Width drew `1(`. Look at
  the PNG after every drive; `drive.js` now reads each field's `scrollWidth > clientWidth`.
- 🔴 **CHR-009 §3 was wrong twice** (§6.1): the `:global(.sidebar-property-editor)` hook is NOT gone, and
  the row grid can't live on `.property-panel-row` — the label is inside the opaque control element. The
  37% column exists in TWO places (`PropertyPanelInput.module.scss`, `propertyeditor.css`).
- 🔴 A click that rebuilds a row makes a `find(label).parentElement` retry THROW — swallow it in the retry.
- The served dev bundle is `http://localhost:8080/src/editor/index.bundle.js`; confirm a marker string in it,
  then `Page.reload({ignoreCache:true})` on **9333** (`cdp.js` defaults to 9222 — set the env on EVERY call).
- Recipe: copy `templates/story-engine` to scratch, back up `~/Library/Application Support/NodeGX/
  recently_opened_project.json`, insert one `Story engine` entry, `npm run dev:debug` in background,
  `drive.js --expect=<copy>` → `interact.js`, `npm run dev:stop`, restore recents and compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest/tsc.

## Still Richard's

1. R6 final (above). R7's marker-on-the-tab detail is proposed, not ruled.
2. CHR-007 AC4 `_portsHash` clause declined — don't revisit quietly.
3. The Projects tab's two full-width cards (BST-003 / UNI-001).
4. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s12

Targeted `tests-unit` **20 / 20 suites, 332 tests** (every spec that reads a touched file + `chr-008`,
`property-editor`), EXIT 0. `tsc --noEmit` **0 errors**. `npm run type` / `npm run colors` holding.
Full `tests-unit` and `test:ci` **not run** this session.
