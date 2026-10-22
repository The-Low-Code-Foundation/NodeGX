---
id: P18-EXP022-S6-NOOVERLAY
title: A dialog draws below the page in both exports, out of sight — the scrim's `position: fixed` reaches them, its `top`, `left` and colour (authored as CSS Style) do not
status: fixed
severity: high
area: export / both printers (`packages/nodegx-export/src/emit/style.ts` drops `styleCss`; `src/emit/swift/modifiers.ts` has no counterpart for `position: fixed`)
found: EXP-022 session 6, 2026-10-22, the three-arm drive of todo-list after the dialog's plan refusal was fixed (P18-EXP022-S4-DIALOGREFUSED)
fixed: EXP-022 session 6, 2026-10-22
commit: f42a3d8a2
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s6/shots/react-D4dialog.png, swift-D4dialog.png; readings-react.json and readings-swift.json, D4 (the dialog still open after Close task was pressed, no request)
---

With the dialog's switch translated, pressing the ✓ on "Write the release notes" opens the note dialog in all three
arms. In the running app it is a modal over the list: `Todo/Note dialog`'s `ndScrim` is a Group with `position: fixed`,
`zIndex` 50, 100% by 100%, and `styleCss` "top: 0; left: 0; background-color: rgba(20, 22, 24, 0.45);".

- **The React export** drops `styleCss` ("has no style/content mapping — dropped, reported"). A fixed element with no
  offset stays where it would sit in the flow, so the dialog draws below the list, past the bottom of a 390 × 844
  screen. The drive's press at "Close task" lands outside the page and nothing is sent.
- **The Swift app** lists `position: fixed`, `height: 100%` and `styleCss` as looks a phone has no counterpart for and
  draws the dialog inline below the list; the keyboard then covers its buttons (`ndOk` not hittable).

A person pressing ✓ on a phone sees nothing happen in either export. Every dialog in todo-list is this one component,
so close, reopen, tick, untick, a routine's tick and stop are all out of reach. `Projects/Money sheet`'s `msScrim` is the
same idiom.

**Fixed in EXP-022 session 6 (f42a3d8a2).** React reads a CSS Style as the runtime does (`readStyleCss` in `style.ts`: comments stripped, split on `;`, one error and none applies) and puts it after the ports; a declaration that could close the stylesheet rule early is left out and said. Swift prints the full-screen fixed scrim (fixed, 0 0, 100% by 100%) as a full-screen cover (`fixedOverlay`); any other fixed element stays a named loss. The S6 drive shows the dialog over the dimmed list in all three arms (`exp-022/s6/side-by-side.png`). Graded by `tests/the-same-graph-in-swift-s6.test.ts` §E.
