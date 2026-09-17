# Phase 92 — next session

**Written 2026-09-17 at the end of s20.** Richard ruled on slice 8 and asked for the token swatch fixed (done). §3.4 was
ruled closed where it stands. Slice 9, the Advanced CSS footer, is built, driven and committed, and awaits his look. Branch
`cline-dev`. Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half
(`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`,
`nodegx-backend/*`, `noodl-runtime/*` are theirs; staged `library/prefabs/date-picker` deletions are theirs).
Never commit their files; commit by pathspec. Before launching a stack, check `ps` for a peer's `scripts/start.ts`.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–8 approved; token swatch fixed (§14); §3.4 **ruled closed by position** (§15.1); **slice 9 (Advanced CSS footer) awaits his look** (§15) |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 9

Show `verdicts/CHR-009/2026-09-17/footer/after/zoom-footer-before-dark.png` beside `zoom-footer-dark.png` (the pill
becomes plain muted text), plus `props-group-footer-dark.png`. One question (§15.2): the count reads `1 set`; the mockup
draws a bare number. Keep `N set` or go bare? Record the ruling in §15.

## Then, in order

1. **Does a real edit inside Advanced CSS update the folded count?** (§15.3.) A setup `setParameter` did not redraw
   it even after reselecting, because `renderGroups`' hash is the port list, not the values. Drive it with real input:
   open Advanced CSS, type a `CSS Class`, fold it, then read the count. If it stays stale, FB-017 AC2 is broken; fix it.
2. A per-side border field draws EMPTY instead of the inherited all-sides value (§12.4; four per-side `Border Color`
   fields read `''`). Ask Richard in plain words whether a side shows the inherited value as a placeholder.
3. Small: comment field 4px overshoot; Escape on the Variant picker (compare against HEAD first); a token in a pair
   field ellipsises; a binding chip on an align row; `Box Sizing`'s value ellipsises at 156px.
4. A Text node's `Text Horizontal Align` label at 116px: predicted, not driven. Look at a Text node.
5. The picker opened on an opaque colour (`#FBF8F3`) read `''` in its opacity input (§14.3). Unmeasured whether that is
   normal for every opaque colour; compare against an opaque hex on HEAD before calling it a defect.

## Settled in s20 (and where the handoff was wrong)

- Slice 8 ruled: **looks ok; the 2px swatch radius stays; `100%` stays on an opaque hex.**
- **The token swatch (§14).** `ProjectModel.resolveColor` resolved colour styles only. It now resolves a `var(--token)`
  against the project's effective tokens (`resolveProjectTokenValue` in `ProjectTokenCss.ts`). Swatch
  `rgb(251,248,243)`, picker starts on `#FBF8F3`, stored value unchanged. Every other `resolveColor` caller (style
  picker, inspect popup, `extractProjectColors`) gets the resolved colour too.
- **§3.4 is closed.** The handoff ranked "Variant/State inside General" first. Asked in plain words with the cost stated
  (folding General would hide them and the variant edit bar), Richard ruled: leave them above the filter.
- The handoff called the Advanced CSS footer a build. Most of it already existed: the rule above (the previous
  group's border) and the right chevron. The only real change was the pill becoming plain text.

## Traps (s12–s20)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19). Look at the PNG after every drive; a
  14px glyph needs a 4× CDP clip. Name the row you zoom on.
- 🔴 **The served bundle can carry a change while the renderer runs the old module**: check the module source for
  every changed file before driving (both s20 drives do).
- 🔴 **A setup `setParameter` is invisible to an open panel, and so is a reselect** (s19, again s20): `renderGroups`
  hashes ports, not values. A group toggle clears the hash.
- 🔴 **`require('@noodl-models/projectmodel')` in `tests-unit` throws at load** (`reading 'join'`, `Tests: 0 total`):
  test a pure function beside it and grade the wiring by drive.
- 🔴 The select renders a measuring COPY of its options: pick an option by `elementFromPoint`, not by text.
- 🔴 A CDP Cmd+A selects nothing on macOS: call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is only part of it; plain `npx jest` adds `tests-main`. Name the command.
- 🔴 `2>&1 > file` sends jest's report to the TERMINAL: write `> file 2>&1`. No `timeout` binary on this Mac.
- 🔴 A text-slicing script edit can hit a NESTED selector ⇒ `SassError`: grep `dev.log` for `SassError|ERROR in`.
- 🔴 A backtick in a comment inside a JS template literal ends the string: `node --check` every drive edit. An `Edit`
  whose `old_string` spans a backtick-quoted doc line can miss: append with a quoted heredoc instead.
- 🔴 CDP never sends a mouse-leave: park the pointer (`mouseMoved 5,5`) before reading anything hover-dependent.
- 🔴 Verdict PNGs and `*.log` are gitignored by design (`.gitignore:265`, `:6`); the JSON and script are the record.
- Recipe: scratch copy of `templates/story-engine`, back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), insert one `Story engine` entry at `recentProjects[0]`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333
  npm run dev:debug` in background (exit 144 on `dev:stop` is the stop), wait for `:9333/json/version` (s20: ~8 min cold,
  ~70s warm), run the drive with `--expect=<copy>`, `npm run dev:stop`, restore recents, compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest.

## Still Richard's

1. Slice 9's look, and `N set` vs a bare number (§15.2).
2. R6 final ("ok so far"; ask again once the rows are done).
3. The `···` menu is DECLINED, don't build it. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.
6. Whether a per-side border field shows the inherited all-sides value (§12.4).

## Readings at the end of s20 (2026-09-17, working tree on `0e2812dac` + slice 9, before its commit)

`tsc --noEmit` (editor) **EXIT 0**. `npx jest tests-unit/chr-009/advancedFooter.test.tsx` **2/2**, mutant → 1 red;
`tokenSwatch.test.ts` **3/3**, mutant → 2 red. `npx jest` (editor, stack down) **475 suites / 7,717 tests, all passed,
EXIT 0** (after the token fix alone: 474 / 7,715, EXIT 0). `test:ci` **not run**. `npm run type` / `colors` /
`tokens:css` **not re-run in s20** (no token or type-scale file changed). Both stacks' `dev.log`: 0 `SassError|ERROR in`, 0
`synchronously unmount`. Recents restored byte-identical (`a1ea46f2…`) after both drives.
