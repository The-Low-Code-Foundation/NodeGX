---
id: P18-S137-ARRIVALLIFT
title: A logic component's output fed by a Function that runs on its inputs' arrival was computed in the hook and never handed to the parent, so every list on todo-list's exported page read empty
status: fixed
severity: high
area: export / the §4d lift pass (`src/analyze/plan.ts`, the Component Outputs value read of an arrival run's row)
found: P18 session 137, 2026-10-22, reading todo-list's emitted page before driving EXP-021 AC1, then driving it (runtime against two exported builds, one backend)
fixed: P18 session 137, 2026-10-22; EXP-011 §107, EXP-021 §7
commit:
evidence: dev-docs/tasks/phase-18-code-export-v2/s137-todo-drive/README.md, readings.json, shot-D2-*.png
regression: packages/nodegx-export/tests/a-logic-component-is-a-hook.test.ts
---

todo-list's `Logic/Task rows` (and `Today rows`, `Log rows`, `Selected task`, `Selected routine`) is Component Inputs →
one Function → Component Outputs, and the Function reads the clock, so it has no Run wire and runs when its inputs arrive
(EXP-019 slice 2). The exported hook ran it and kept its row (`buildTheRowsOut`), but the lift pass resolved the
Component Outputs read before the arrival run had compiled, found no row, and refused it: "the script runs on its inputs'
arrival …, and that run writes no row this read can reach". The parent's wires from those outputs were then dropped
("instance output "openRows" is not lifted"), so the exported todo list, signed in against a backend holding three
tasks, showed "Nothing on the list", three blank tab buttons, and an empty Today, Done and Log, while `useTodoData`
had fetched every row.

Fixed: the lift pass compiles an arrival-run feeder first, with every Function upstream of it (as the sink loop's
`compileFunctionFeedersOf` does), and reads its row. Driven: the runtime and the fixed export read the same tabs, the
same three tasks in the same order with the same lines, the same Done, Today and Log. Reach: templates 61 nodes gained,
0 lost (planning, rocket-school, star-class, todo-list, digital-bricks-training, bot-garden); corpus 18 gained, 0 lost.
