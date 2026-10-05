---
id: P109-S19-COMMENTPORT
title: A name inside a code comment makes a Function port
status: scheduled
phase: P109 ISL-006 slice 2 (AC9 and AC10's on-open fix-up)
severity: low
area: runtime / Function (the port reader, javascriptnodeparser.js)
found: P109 ISL-006 s19, 2026-10-05
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s19
---
`// Outputs.old = x` still makes the port `out-old`: the reader's comment strip is commented out
(`javascriptnodeparser.js`, `scriptWithoutComments`). A commented-out line leaves a ghost port on the node.

Measured with a string-, template- and regex-aware stripper (a plain `//.*` strip is wrong: it eats code after the `//` in a
URL string): 1 Function in our templates and library (file-upload `out-Accept`, unwired); 147 in 252 test and old projects,
18 of them with wires on such ports (34 wires, SuntappedX, a client project, Erleah-2). Ruled "Fix it, fix up old projects":
the reader skips comments, and a project opened in the editor writes each wired name the old reader made onto that
Function's list.
