---
id: P134-S10-SCREENREAD
title: "HTML export: a Screen Resolution's width, height or ratio is not printed, so todo-list's \"One pane or two?\" is left out and a phone shows the list and the open task side by side"
status: fixed
severity: high
area: the HTML printer (`packages/nodegx-export/src/emit/html/printComponent.ts`, `expr`, the `screen-out` read)
found: P134 session 10, 2026-11-04, the HTX-004 Chrome drive after SELECTREFUSED's fix let "One pane or two?" through the plan
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/htx-004/ (compare.py, D2 to D5 before the fix: the HTML arm rows=3 back=False where the runtime and the React export read rows=0 back=True); the export's own EXPORT-PREFLIGHT.md said "The list — its mounted reads a jsfun-out value, which the HTML target does not print yet" five times
regression: packages/nodegx-export/tests/a-value-sent-with-its-signal.test.ts
---

Never live on a released export: before session 10 the plan refused "One pane or two?" (its `found` came from a placed
component, SELECTREFUSED), so both exports drew both panes for that reason. Once the plan let it through, the React
export read the width through its `lib/screen.ts` and drew one pane at 390 px, as the running app does; the HTML export
still drew two. Its printer had no `screen-out` case, so the Function's width argument read as unprinted, the
Function's memo was not made, and every Mounted reading its outputs was left out, named in the preflight.

Pressing a task at phone width then showed the list with the summary under it, no "← Back", and the drive's next
presses landed on the wrong circles: closing "Write the release notes" sent nothing.

Fixed: a Screen Resolution read is the window's size in CSS pixels, a `keep` made with the part, set again on every
`resize`, the listener removed with the part, as the React export's `useScreenResolution` reads it. After it, the
HTML arm equals the runtime and the React export at all 12 steps of the drive.
