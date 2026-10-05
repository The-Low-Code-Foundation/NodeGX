---
id: P109-S19-UNDERSCORESIGNAL
title: A Function signal named with an underscore throws when the script calls it
status: fixed
commit: b7fcad09a
severity: medium
area: runtime / Function (the port reader, javascriptnodeparser.js)
found: P109 ISL-006 s19, 2026-10-05
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s19
---
A script that calls `Outputs.do_it()` stops with "Outputs.do_it is not a function". The reader's signal pattern
(`/Outputs\.([A-Za-z0-9]+)\s*\(\s*\)/`, `javascriptnodeparser.js` parseAndAddPortsFromScript) has no `_`, so the name is
mined by the value pattern instead and the port is `*`, not a signal. Measured s19 in the runtime's graph harness: with the
port as the editor mints it the script throws at the call; the control `Outputs.doit()` runs to the end.

Used 0 times in 1,214 Functions (templates, library, catalog examples) and in 5,942 Functions across 252 test and old
projects. Ruled "Fix all three" (ISL-006 ruling 3): the pattern takes `_` in all six copies of the reader.

**Fixed (b7fcad09a, 2026-10-05):** the Function reads its code with `@nodegx/project-contract/function-ports`, imported by the runtime's
Function node, the door, the exporter and the code editor. Old projects keep their wired ports through the on-open fix-up
(ISL-006 AC10). The Script node and the filter nodes still use the old reader (not ruled).
