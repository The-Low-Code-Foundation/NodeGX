---
id: P18-S129-FNSUCCESS
title: A Function whose Success drives a chain is refused whole ("only done continues a Run chain"); rocket-school's and star-class's Lists Editor never fills
status: open
severity: medium
area: export / `compileJsRun` (`src/analyze/plan.ts`: "its success output is consumed — only done continues a Run chain in this slice")
found: P18 session 129, 2026-10-19, reading what still stops the Lists Editor's `fill` once a field's Set ran (P18-S128-FIELDSET)
evidence: dev-docs/tasks/phase-18-code-export-v2/s129-fieldset/census.ts on the tree (the Lists Editor's two Set wires, "trigger leFill.success is not a rendered element event or a receiver")
---

P18-S128-FIELDSET said the field's Set was what stopped the Lists Editor filling. Measured on the tree with the Set
carried: it is not the first blocker. The Editor's `fill` runs the Function "The list to edit, or an empty one" (`leFill`),
and its **Success** (not Done) starts the chain `leSetName → leSetText → leSetBoth → leSetId` and the two fields' Sets. The
export refuses the run outright when Success is wired, so the whole chain is named dropped from there.

The runtime (`simplejavascript.ts`): after the script resolves, `sendSignalOnOutput('success')`, then
`reportOutcomes(this, tokens, 'done')`, so on a Run the two co-fire, Success first. But Success also fires on runs that
are not invocations (the script set at load, a ticked input arriving): `leFill`'s `sets` and `setId` inputs are ticked,
so in the running app the editor refills whenever the list of sets or the id changes, not only on `fill`. A fix must
carry both: the Success chain on the Run path (before Done), and on the ticked-run path (P18-S119-TICKEDRUN's effect).

Reach, wires out of a Function's Success in the 19 templates: 12 in visual components (story-engine 4 into a Condition's
Evaluate and 1 into a Component Outputs, pixel-game 3 Conditions and 2 Set Variables, rocket-school and star-class 1 Set
Variable each, the Lists Editor), 177 in logic components (Tier B anyway). Moon Adopt's Set is blocked earlier still, by a
logic component (`/Logic/Moon act`'s Done).
