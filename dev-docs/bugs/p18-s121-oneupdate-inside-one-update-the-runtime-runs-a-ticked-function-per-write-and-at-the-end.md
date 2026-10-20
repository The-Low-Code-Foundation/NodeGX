---
id: P18-S121-ONEUPDATE
title: Inside one update the runtime runs a Function at the end and once per arriving write; the export runs it where Run sits and once per render
status: open
severity: medium
area: export / Function (invoked, ticked inputs, Did Mount chains)
found: P18 session 121, 2026-10-17, a parent's and a child's Did Mount touching one Variable (the runtime arm of tests/the-ticked-input-runs-it-again.test.ts)
evidence: packages/nodegx-export/tests/helpers/runtime-ticked-arm.js readings recorded in dev-docs/tasks/phase-18-code-export-v2/s121-tickedrun/README.md ("one update"); runtime simplejavascript.ts `scheduleRun` (`scheduleAfterInputsHaveUpdated`)
---

Three shapes, each measured on the runtime's own Function, Variable and Set Variable:

1. **A Run before a write in the same event.** A child's Did Mount sends Run and its parent's Did Mount writes the
   Function's ticked input, in one update: the runtime runs once, at the end, reading the new value, with Done. The
   export runs where the Run sits (the old value, with Done) and then again for the arrival. The same holds for a click
   whose Run wire comes before its Set Variable wire, ticked box or not: the export's run reads the value from before
   the write.
2. **Two writes to one watched value in one event.** One click sets the Variable to `q` and then `p`: the runtime runs
   twice (Runs 2 → 4). The export batches both writes into one render and runs once, on `p`.
3. **Did Mount writes in one mount.** The same as 2, across elements: the runtime delivered `q` and `p` as two arrivals.

Reach not measured. The ticked effect (EXP-011 §88) reproduces the common order (a write, then a Run, which coalesces
through `tickedArrival`); these are the orders it does not.
