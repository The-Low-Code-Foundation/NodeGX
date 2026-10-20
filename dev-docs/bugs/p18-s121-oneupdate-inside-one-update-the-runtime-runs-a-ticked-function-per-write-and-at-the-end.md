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

## A fourth shape, measured in P18 session 130 (EXP-011 §98)

4. **A Run's chains against the click's later wires.** A click whose first wire sends a Function's Run and whose second
   wire sets a Variable that the Function's Success (or Done) chain also sets: the runtime runs the Function after the
   update (`scheduleAfterInputsHaveUpdated`) and sends Success and Done after the body's `await`, so the chain writes
   last; the export prints the run and its chains where the Run's wire is, so the click's second wire writes last.
   Measured on the Success Desk (`s130-fnsuccess/probe.ts`, the variant with Say's second wire): runtime "success",
   export "second", and the same with the base's Done chain (`EDIT=` every Success wire made a Done wire). Pinned in
   `tests/the-function-succeeds.test.ts` A9. Reach not measured.
