---
id: P18-S121-FRESHOUTPUTS
title: An exported Function with no signal of its own starts every run with empty outputs; the running app's keeps the last run's
status: open
severity: low
area: export / Function (EXP-003 §4 wrapper, reactive and invoked)
found: P18 session 121, 2026-10-17, emitting ticked-desk's first draft ("Say the word" counted 1, 1, 1)
evidence: packages/nodegx-export/src/emit/component.ts (the wrapper declares `const Outputs = {}` unless the run is pulsed); runtime simplejavascript.ts (`outputValues` persist on the node); dev-docs/tasks/phase-18-code-export-v2/s121-tickedrun/freshoutputs.ts
---

The wrapper of a Function whose run is not pulsed (no signal of its own drives a chain) declares a fresh `Outputs`
each call. The runtime's node keeps its outputs across runs, so a body that reads an output it wrote in an earlier run
(`Outputs.count = (Outputs.count || 0) + 1`) counts in the running app and reads 1 forever in the export. A §86 run
keeps a `functionNode` and is right.

**Reach, measured:** 0. Of the 15 template Functions (5 in the corpus) whose body reads one of its own outputs, the
one that exports (the Site Builder's SectionRow) reads only what the same run wrote. Latent; the fix is to keep a node
for any run whose body reads `Outputs.x` before writing it.

**Session 122 (2026-10-17): half fixed, the half that now has reach.** A Function whose run *materializes* a row (§4f:
something outside its Run chain reads its outputs) keeps a `functionNode` now, as a pulsed run does, and copies the
node's outputs into the row. "Hold the id" gave this reach: a second Function reads the first one's id between runs,
and the held id survived a run that returned early only with the node kept (`tests/the-id-is-held.test.ts`, "no ready",
and its control). Left open: an invoked run with no signal and no row (its Done chain reads its outputs), still a
fresh `Outputs` each run; reach 0, as above.
