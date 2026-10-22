---
id: P18-S137-HALFREFUSED
title: A Function with two Run wires, one exported and one refused, is reported as left out of the export while the export runs it
status: open
severity: low
area: export / the report's dispositions (`src/analyze/plan.ts`, a JS node's disposition when one of its triggers is refused)
found: P18 session 137, 2026-10-22, driving todo-list: the export queried four collections the report said it had left out
fixed:
commit:
evidence: dev-docs/tasks/phase-18-code-export-v2/s137-todo-drive/README.md (the requests row), readings.json
regression:
---

todo-list's `Logic/Projects` runs "Read the projects and the money" from two wires: the hook's `refresh` input (exported)
and "Bring Planning's moves over, once"'s `changed` (refused: that body reads a `Noodl.Records` member the export does
not carry). The exported `useProjects` runs the reader on `refresh`, and the drive saw it query `Project`, `MoneyItem`,
`MoneyMark` and `BalanceReading`. The export report lists the same node under "What needs your attention" as left out
("the Function that sends its "changed" signal is not exported"), under a heading that says "Nothing here was translated
wrongly — it was left out". A person reading the report is told the app does not read their projects when it does; only
the second trigger is missing.

The faithful line names the trigger, not the node: the node is translated, and the wire from `changed` is dropped.
Reach not measured yet (count JS nodes deferred for a trigger while another trigger of theirs compiles).
