---
id: P18-S128-FIELDSET
title: A text field's Set, Focus or Blur sent from a chain is not exported, and the chain it sits in is refused whole (35 + 34 template wires)
status: open
severity: medium
area: export / a text input's action ports (`src/analyze/plan.ts` `isTriggerWire`, `CONTROL_ACTION_PORTS`: only `clear` is a trigger)
found: P18 session 128, 2026-10-19, reading the Set Variable Done chains the export still refuses after P18-S127-SETDONE
evidence: dev-docs/tasks/phase-18-code-export-v2/s128-setdone/census.ts (rows whose target is `net.noodl.controls.textinput.set`); EXP-011 §95.5
---

A text field has three action inputs besides Clear: Set (puts its Value into the field), Focus and Blur. The export makes
only Clear a trigger (`isTriggerWire`: `isTextInputType(type) && toProperty === 'clear'`), so a wire into Set, Focus or Blur
"drives no translatable action", and a chain that holds one is refused whole.

Counted in the 19 shipped templates (wires into a field's action input): **Set 35** (planning and its demo 10 each, the
Site Builder 5, rocket-school and star-class 4 each, nightbook 1, marketplace 1), **Focus and Blur 34** (planning and its
demo 10 Blur each, todo-list and its demo 3 + 3 each, nightbook 1). By sender: a Function's own signal 45, a Set Variable's
Done 6, a field's own Did Mount or Enter 12, a signal input 4, a Group's Did Mount 1.

Since P18-S127-SETDONE a Set Variable's Done runs its chain, and this is what still stops rocket-school's and star-class's
Lists Editor filling its two fields (`leSetName.done → leName.set`, `leSetText.done → leText.set`; the Editor's `fill` chain
is refused from there) and the Moon Adopt form clearing its name (`maClearName.done → maName.set`).

Fix, its size: small to medium. The field's Set writes the field's controlled value row from its Value input (the
runtime's `setText(value)` path, which also sends the text on), Focus and Blur call the element's `focus()`/`blur()` through
a ref. Grade against `runtime-mounted-arm.js` (it has the viewer's own Text Input).
