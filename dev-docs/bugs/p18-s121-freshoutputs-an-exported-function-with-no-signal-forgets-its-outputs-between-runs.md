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
