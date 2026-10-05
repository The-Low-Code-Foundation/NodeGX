---
id: P109-S19-BRACKETINPUT
title: Inputs["x"] in a Function makes a port that is not an input, and a second one on the same line runs the names together
status: fixed
commit: b7fcad09a
severity: low
area: runtime / Function (the port reader, javascriptnodeparser.js)
found: P109 ISL-006 s19, 2026-10-05 (read from source; the canvas half not driven)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s19
---
`Inputs["first name"]` is mined with `plug: 'inputs'` (plural, a typo the door's copy restates on purpose), so the editor
does not offer it as an input to wire into. The pattern `(?:'|")(.*)(?:'|")` is greedy, so `Inputs["a"] + Inputs["b"]` on
one line mints one port named `a"] + Inputs["b`. The runtime still accepts a wire to `in-first name` (it registers any
`in-` name when a wire arrives; measured s19 for `in-` names generally).

0 uses in our templates and library; 8 Functions in old projects (hsseq-test-main 7, SuntappedX 1). Ruled "Fix all three":
the port becomes a real input and the name stops at its own quote.

**Fixed (b7fcad09a, 2026-10-05):** the Function reads its code with `@nodegx/project-contract/function-ports`, imported by the runtime's
Function node, the door, the exporter and the code editor. Old projects keep their wired ports through the on-open fix-up
(ISL-006 AC10). The Script node and the filter nodes still use the old reader (not ruled).
