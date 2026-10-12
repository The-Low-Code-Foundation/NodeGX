---
id: P109-S20-ES5READER
title: The editor's preview made no port from any Function's code, so every wire on a code-named port showed "port doesn't exist"
status: fixed
commit: a7914b837
severity: high
area: runtime / Function (the shared reader, as the viewer compiles it)
found: P109 ISL-006 s20, 2026-10-06 (introduced b7fcad09a, 2026-10-05)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s20
regression: packages/noodl-editor/tests-unit/isl-006/function-ports.test.ts "nothing in the file iterates an iterator: no TS2802 under the viewer's options"
---
`@nodegx/project-contract/function-ports.ts` read a script with `for (const match of source.matchAll(…))`. The viewer
bundle compiles that file with its own tsconfig (`target: es5`, no `downlevelIteration`), which turns the loop into an
index loop over `.length`. An iterator has no `length`, so the loop ran zero times and the reader found no names. The
dev log said `[tsl] TS2802` and "compiled with 1 error", and the bundle was emitted anyway.

What a person saw: in the editor, every Function port made only by the code (`Outputs.Items = …`) was missing, and its
wires were error-level ("Source port doesn't exist."). On a copy of SuntappedX: 461 of 612 Functions had no ports from
their code and 1,769 wire ends were errors. Cloud Functions were not affected (the editor derives their ports itself),
nor were deployed apps measured to be (the runtime registers a port when a wire arrives). Not measured: whether an
`Outputs.done()` signal named only in the code failed in the preview in that window.

**Fixed (a7914b837):** an exec loop. Re-read live after the fix: 0 Function errors, 2,707 wire ends alive, 3 dead (wires to
names the script never reads, dead before ISL-006 too). Control hsseq-test-main: 584 alive, 0 dead.
