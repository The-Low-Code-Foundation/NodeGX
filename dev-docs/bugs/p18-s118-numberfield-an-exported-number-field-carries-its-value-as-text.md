---
id: P18-S118-NUMBERFIELD
title: An exported Number field carries its Value as text — "5" where the running app sends 5, "" where it sends null
status: open
severity: medium
area: export / Text Input (Type Number)
found: P18 session 118, 2026-10-16, building P18-S116-FIELDMOUNT (EXP-011 §85)
evidence: packages/nodegx-export/tests/helpers/runtime-field-arm.js (the runtime's field, Type Number: announces 5 for "5", null when empty); the emitted onChange `search.set(event.target.value)` for a Number field (tests/the-field-announces-at-mount.test.ts §C); nodegx-export src/analyze/appState.ts (a text input's Value is typed `string` whatever its Type); plan.ts CONTROL_STATE.input (tsType `string`, boot `''`)
---

FB-026 made the runtime's Text Input publish what its Type says: a Number field's Value is a number, and `null` when
the field is empty or unparseable (`outwardValueForFieldType`, `textInputValue.ts`). The export never followed. Every
read of an exported field is the DOM's string: the field's own `onChange` writes `event.target.value`, a handler that
reads the field reads its state row, which boots `''` and holds what was typed, and the Variable it writes is typed
`string`. So a Number field typed "5" hands "5" to a record's number column where the running app hands 5, and an
empty one hands `""` where the running app hands `null`.

Measured over the corpus (`NodeGX test projects/`, `Noodl projects/`, the export fixtures): 21 Number fields with a
wired Value in 21 projects, every one read from a handler (state row), 19 of them into a Set Record's `navOrder`.

FIELDMOUNT refuses a Number field's mount announcement by name and points here, because the announcement would be the
same text. The fix is the runtime's own rule at each read: `outwardValueForFieldType('number', text)` on the field's
value (its `onChange`, the state row's reads), and the Variable it writes typed `number | null`.
