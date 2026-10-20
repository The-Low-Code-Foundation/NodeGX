---
id: P18-S128-FIELDSET
title: A text field's Set, Focus or Blur sent from a chain is not exported, and the chain it sits in is refused whole (35 + 34 template wires)
status: fixed
severity: medium
area: export / a text input's action ports (`src/analyze/plan.ts` `isTriggerWire`, `CONTROL_ACTION_PORTS`: only `clear` is a trigger)
found: P18 session 128, 2026-10-19, reading the Set Variable Done chains the export still refuses after P18-S127-SETDONE
fixed: P18 session 129, 2026-10-19, branch l6-fieldset; EXP-011 §97
commit: 8307dc26d, 21cebe2d9
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

## Fixed (P18 session 129, EXP-011 §97)

A Set is the `state-set` of the field's row with `field: { port: 'set' }`: printed behind `xField.current !==
document.activeElement` (a focused field takes no Set), it writes the Value as the runtime's `_internal.text` holds it
(the source read where the handler is; the typed-in Value where nothing was delivered; `''` after a Clear until the
Variable is written again) and runs the field's own change chain with that text. Focus and Blur are `field-focus`, a call
on the `<input>`'s ref. A field's On Enter is its Enter key. A drawn field keeps its disposition when one of these wires
is refused. Graded by `tests/the-field-does-what-it-is-told.test.ts` (34 rows, 14 mutant arms) against the runtime's own
Text Input and the viewer's own focus tracker.

🔴 **Counted again on the tree, two claims above were wrong.** Focus and Blur are 33 wires, not 34. And the field's Set
is not what stops the Lists Editor filling: its `fill` runs a Function whose **Success** starts the chain, and the export
refuses a Run whose Success is wired (**P18-S129-FNSUCCESS**). Moon Adopt's Set is sent from a logic component's Done.
Carried now: Set 3 of 35 (the rest refused by the field's own reason, a Number field 14, two Value wires 5, a wired Type 1,
or by a sender the export does not run, 12), Focus 7 of 7, Blur 6 of 26 (the rest planning's refused Functions).
