---
id: P121-TWO005-NEVERRUNS
title: A Function whose Run is unwired and whose every wired input is set not to run on change can never run, and the door writes it without a word
status: fixed
severity: medium
area: editor / validation, as the MCP door runs it (`packages/noodl-editor/src/editor/src/validation/rules/`; nearest rule `signalDrivenStaleInput.ts`, the opposite case)
found: P121 TWO-005 s13, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §8.5
kit: mcp
regression: packages/noodl-editor/tests-unit/p121/function-script-and-reruns.test.ts "is warned, naming the inputs and the box to tick"
commit: 12fad4b2a
---

A Function node runs when its Run signal arrives, or when an input whose **Run On Value Change** box is ticked gets a
new value. Untick that box on every input it has (`runOnChange-in-<name>: false`) and leave Run unwired, and nothing
can ever start it: values arrive, the script never runs, its outputs never change.

Measured 2026-10-15, in the community template's Edit profile page (TWO-005 slice 3): the photo script took three
wired inputs (the current photo, the new upload, Remove), all three written with the box unticked, and no Run wire.
In the rendered app the photo was uploaded and stored (private, both readers) and the circle never showed it: zero
`<img>` on the page, no console line. `npm run template:gram` (the MCP door's `create_plan` / `stage_plan_operation` /
`apply_plan`) raised no warning or error on it, only its usual info lines. Ticking the boxes back fixed it.

How it happens: the template's helper takes a "quiet inputs" list meant for a gather script that runs on a button's
Run; passed to a script with no Run, it makes a dead node. An agent or a builder unticking boxes to stop a script
running too often gets the same dead node, and nothing on the canvas or in validation says it can't run.

Fix, proposed (small): a validation warning on a JavaScript Function (and any node with Run plus Run On Value Change
boxes) that has no wire into Run and no wired input with its box ticked: "Nothing can run this Function: Run isn't
wired and every input is set not to run on change. Wire Run, or tick Run On Value Change on an input." With a
`suggestedFix` naming the inputs.

**Fixed (2026-10-25, the Beta sweep):** a validation warning `function-never-reruns`
(`validation/rules/functionNeverReruns.ts`) on a Function (and any node in the run-on-value-change family whose inputs
the catalog gives a `runOnChange-` twin) with no control signal wired and every WIRED input's box explicitly unticked.
The measured shape is not quite "never runs": with Run unwired a Function runs once at load (its script setter) and a
new value never runs it again; the message says so, names the inputs, and suggests the box to tick. Not blocking.
Over the 19 shipped templates (~14,000 nodes) it fires twice, filed as BETA-TPLNEVERERUNS; 114/114 catalog examples
stay clean.
Graded: `tests-unit/p121/function-script-and-reruns.test.ts` (controls: Run wired, one box ticked, absent = ticked, an
unwired input).
