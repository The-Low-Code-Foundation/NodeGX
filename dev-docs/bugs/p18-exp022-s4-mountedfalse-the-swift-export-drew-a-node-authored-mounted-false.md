---
id: P18-EXP022-S4-MOUNTEDFALSE
title: The Swift export drew a node authored Mounted false whose Mounted wire the plan does not carry — todo-list showed a dead "Also keep track of projects and money"
status: fixed
severity: low
area: export / Swift target (`packages/nodegx-export/src/emit/swift/view.ts`, `print`)
found: EXP-022 session 4, 2026-10-22, the first simulator screenshot of todo-list signed in (the React export does not draw it, s137)
fixed: EXP-022 session 4, 2026-10-22
commit: ad1845dc6
evidence: packages/nodegx-export/tests/the-same-graph-in-swift-s4.test.ts A5 (mutant M4 killed); dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/work/m0-session-seeded.png was the before
---

`Pages/Todo`'s "Projects and money" button (`tdProjectsOn`) is authored Mounted false; a wire from Projects'
`showTurnOn` mounts it, and the plan does not carry that wire. The React printer removes such a node from the tree
(`component.ts`: "authored Mounted false — removed from the tree"). The Swift printer honoured a bound Mounted only, so it
drew the button with nothing wired to its press.

**Fix:** the same rule in the Swift printer, before anything is printed for the node. It is one more decision the React
printer makes and a second printer copies (P18-EXP022-S2-EMITDECIDES).
