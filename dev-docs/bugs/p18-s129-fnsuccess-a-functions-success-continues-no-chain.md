---
id: P18-S129-FNSUCCESS
title: A Function whose Success drives a chain is refused whole ("only done continues a Run chain"); rocket-school's and star-class's Lists Editor never fills
status: fixed
severity: medium
area: export / `compileJsRun` (`src/analyze/plan.ts`: "its success output is consumed — only done continues a Run chain in this slice")
found: P18 session 129, 2026-10-19, reading what still stops the Lists Editor's `fill` once a field's Set ran (P18-S128-FIELDSET)
fixed: P18 session 130, 2026-10-19, branch l6-fnsuccess; EXP-011 §98
commit: 0486c391b
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

## Fixed (P18 session 130, EXP-011 §98)

Measured first (`dev-docs/tasks/phase-18-code-export-v2/s130-fnsuccess/census.ts`, the 19 templates): **189 wires out of a
Function's Success, 11 in visual components** (the bug said 12: the Component Outputs one is in a logic component), 178
in logic components. Of the 11: 8 out of Run-wired Functions (the two Lists Editors, pixel-game's `plTakeCoin` 2 and
`plStepEnemies` 2, story-engine's `rdCarry` and `rxParse`), 3 out of reactive ones (Run unwired). 4 were refused for the
Success itself (the Lists Editors, `plTakeCoin`), the others for their inputs.

🔴 **The bug's ticked-run claim was measured false for the Lists Editor**: `leFill`'s `sets` and `setId` boxes are written
`false` in both templates (`runOnChange-in-sets: false`), so it runs on `fill` alone. No Run-wired Function with a
Success wire in a visual component has a ticked input. The ticked path is built anyway (the runtime sends Success on a
ticked run) and graded on the desk.

The runtime (`simplejavascript.ts` `runScript`), read and then measured on the Success Desk: after the body's `await`,
Success, then Done (Done only with a Run's token); a ticked run sends Success and no Done; a throw sends Failure and
neither; Success comes after the chains of the body's own signals.

Built: `compileJsRun` compiles `doneChainOf(node, 'success')` and runs it after the pulses and before Done; the ticked
half carries it; a chain it cannot run refuses the run (as Done's does); the attach pass leaves a Run-wired Function's
Success wires to it and a sweep after names those it did not take (the sink's own refusal first). A Run of a Function a
ticked input also runs records its ticked read even when it is neither pulsed nor materialized (a Success chain gives
such a run a ticked half for the first time; without it a click that writes the value and runs it ran it twice).

Graded: `packages/nodegx-export/tests/the-function-succeeds.test.ts`, 26 rows, real React under StrictMode against the
runtime's own nodes; 12 mutant arms each killing rows. Reach (`dispdiff.ts`): templates 10 gained (the two Lists Editors'
Function and 4 Sets each), 0 lost, 2 re-worded (pixel-game: now named by the Function's real blocker); corpus 0 gained,
0 lost, 20 re-worded (pixel-game copies). In the emitted rocket-school and star-class, the Lists page's New now runs
`fill`: the four drafts and both fields are emptied. Editing an existing list still waits on the repeater's row relay
(`lsEach.itemOutputSignal-edit`) and on `sets`, which comes from a logic component (`/Logic/Active profile`, Tier B).
Found on the way: P18-S130-THROWCHAIN (a throwing body still runs its Done and Success chains in the export).
