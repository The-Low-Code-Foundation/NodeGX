---
id: P18-EXP022-S4-DIALOGREFUSED
title: Every dialog in todo-list is refused by the plan (a States value left unauthored in one state), so neither export can close, reopen or tick anything
status: fixed
severity: high
area: export / the plan (`packages/nodegx-export/src/analyze/plan.ts` ~14961, the States compiler: `its value "<name>" has no authored value in state "<state>"`)
found: EXP-022 session 4, 2026-10-22, the three-arm drive of todo-list on one real backend
fixed: EXP-022 session 6, 2026-10-22
commit: f42a3d8a2
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/compare.json (D4dialog, D4), dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/readings-*.json, dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/side-by-side.png; seven preflight lines "`Todo/Dialog flow` "Was it closing?" — its value "heading" has no authored value in state "none""
---

Pressed the ✓ on "Write the release notes" in all three arms. The running app opens the note dialog ("What happened?",
Cancel, Close task), and after a note and Close task (pressed twice, P18-EXP022-S4-FIRSTPRESS) sends
`PUT /classes/Task/<id>`, writes the Event, and reads `List (3)`, `Done (2)`. Neither export opens the dialog at all,
so nothing is sent.

`Todo/Dialog flow` decides which dialog shows with seven States nodes ("What the dialog is asking", "Was it closing?",
"Was it reopening?", "Was it ticking?", "Was it unticking?", "Was it ticking off a recurring item?", "Was it stopping
one?"). Each leaves its `heading` value empty in the state `none`, which is right: there is no heading when no dialog is
open. The plan refuses a States node with any value unauthored in any state, so all seven are left out, and with them
every confirm in the app: close, reopen, tick and untick an action, tick off a routine, stop a routine.

**What the runtime does with an unauthored value** (`noodl-viewer-react/src/nodes/std-library/states.ts`): a value that
does not animate (text, boolean) is `stateParameters['value-<state>-<name>']`, so `undefined`; a number animates from
`|| 0`; a colour from black. So the plan can take the runtime's value instead of refusing. That changes `byState`'s type,
which both printers read, so it is the React lane's change (`plan.ts` and `component.ts`), with Swift's printer following.

**Not the Swift printer's:** the Swift app reads exactly what the React export reads at every step.

**Fixed in EXP-022 session 6 (f42a3d8a2).** A States text or boolean a state leaves empty is the runtime's `''` / `false`; and a States value into a placed component's input binds (Pass 4f), which the dialog also needed. With P18-EXP022-S6-NOOVERLAY fixed beside it, the S6 drive closes "Write the release notes" in all three arms: `PUT /classes/Task/<id> 200`, `Event 201`, `List (3)` `Done (2)`. Graded by `tests/the-same-graph-in-swift-s6.test.ts` §A and `animation-pair` B9b.
