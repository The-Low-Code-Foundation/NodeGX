---
id: P18-EXP022-S4-CARDOVERFLOW
title: The Swift app's Todo page runs its detail card ("Select a task, or something that repeats…") past the phone's right edge
status: open
severity: low
area: export / Swift target (`packages/nodegx-export/src/emit/swift/view.ts` and `modifiers.ts`; `Pages/Todo`'s `tdRight` pane, whose two-pane layout is `styleCss`, a web-only look)
found: EXP-022 session 4, 2026-10-22, the simulator screenshots of todo-list signed in
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/side-by-side.png (D1, the Swift column), dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/shots/swift-D1.png
---

At 390 points the card under the add field is wider than the screen: its text is cut at "to see its detail". The React
export, in Chrome at the same width, wraps the same text inside a card that fits. Not chased in S4: the page's two-pane
layout is the project stylesheet's (`styleCss` on `tdMain`, `tdLeft`, `tdRight`), which the Swift preflight lists as
a look it does not carry, and the card's width comes from that layout. Read the printed `TodoPageView` for the frame
that does not shrink first.
