---
id: P112-OWN021-LISTPORTCENSUS
title: "The ERG-003 list-port census pins 54 editable inputs and 40 outputs, and the catalog now has 83 and 44, so `noodl-core-ui`'s `listPortCoverage.test.ts` is red in the PR workflow's package job"
status: open
phase: P112
task: OWN-021
severity: low
area: tests — `packages/noodl-core-ui/tests/json-editor/listPortCoverage.test.ts` (ERG-003 criterion 2), read against the node catalog
found: P112 OWN-021 S5, 2026-10-19 (PR #52, run 39214479584, job "Test (runtime, backend, viewer, mcp, preview)")
evidence: that job's log; 3 of 575 `noodl-core-ui` tests fail, all in this file
kit: none
---

The census derives the list-shaped port surface from the catalog and then pins its size. The pins are
`inputs.length === 54` with `{ array: 11, object: 7, stringlist: 28, proplist: 7, optionslist: 1 }` and
`outputs.length === 40`. In PR #52 the counts were 83 inputs and 44 outputs, and the per-node listing differed too. The
file was last touched in `0ce92adc7` (P82's `optionslist`), weeks of catalog growth ago. So this is drift from many
new nodes and ports, not something the 0.4.2 cut added. The job is not one of `main`'s six required checks, which is
how the red went unseen.

Fix shape: re-derive the census from the current catalog, read each new list-shaped port by name (does the editor
give it a list editor, or is it an output with none?), and update the pins with the reasons in the test's comments, as
`bccc5555f` did after ERG-004. Regression: the test is green on `cline-dev` and goes red when one list-shaped input is
planted in the catalog.
