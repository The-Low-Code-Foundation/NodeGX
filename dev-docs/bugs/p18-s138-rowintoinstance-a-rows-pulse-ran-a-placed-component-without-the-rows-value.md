---
id: P18-S138-ROWINTOINSTANCE
title: A row's signal into a placed component ran it while the row's value wired into the same component was dropped, so the component acted on undefined (todo-list's money rows marked no key paid)
status: fixed
severity: high
area: export / the repeater's row relay into a placed component's input (`src/analyze/plan.ts`, `compileInstanceSignal`, §99's `rowRelayOf`)
found: P18 session 138, 2026-10-22, reading rocket-school's emitted Lists page after a logic component's list began to draw (EXP-011 §108)
fixed: P18 session 138, 2026-10-22; EXP-011 §108
commit: 10dc1c990
evidence: dev-docs/tasks/phase-18-code-export-v2/s138-lifted-list/README.md, rowinto-head.out, rowinto-after.out
regression: packages/nodegx-export/tests/a-logic-component-is-a-hook.test.ts
---

A For Each's relayed row value wired into another placed component's input (`lsEach.itemOutput-id → lsDelete.setId`)
fell to Pass 6's "has no deterministic translation (deferred to EXP-003)", while the same row's signal into that
component (`lsEach.itemOutputSignal-delete → lsDelete.run`) was compiled as a pulse. The exported component ran with
the input `undefined`. The runtime hands the row's values first and then the signal (`foreach.tsx`
`itemOutputSignalTriggered`).

On HEAD, 10 template wires had drawn rows (todo-list's Money and Money sheet: Paid, tick and untick each ran Mark money
with no key, ×2 copies; rocket-school's and star-class's Moon care: Feed and Wear with no id). Once a logic component's
list began to draw rows (§108), there were 34.

Fixed: the value is §99's relay, a state row holding the value of the row whose signal fired last. Each row signal's
callback writes it before its chain runs, and the placed component reads it as its prop. 36 wires are carried now, 27 of
them with the pulse that goes with them (rocket-school's list Delete and Profiles select, todo-list's money keys,
bot-garden's robot cards). Where the row's output is computed inside the row (bot-garden's robot card Name, Colour and
Hat; todo-list's Money editor), the value cannot be relayed. The row's pulse into that component is then refused by name
("the row hands … its "value" with this signal, which the export does not carry"), so it never acts on `undefined`.
