---
id: P112-OWN008-FILESONLY
title: "A PASS from the editor suite reads the same whether or not the adapter's graph half was graded, though the brief says the report says so"
status: fixed
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/project-contract` `editor-suite/suite.ts` `formatReport`"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/blocks/REPORT.md (question 4), own-008/map/REPORT.md (question 10)
kit: project-contract
---

Two OWN-008 strangers built editors with no graph runner and read a bare `PASS — … (80 ms)`. The brief (OWN-007)
said "an adapter with no runner is graded on files only. The report says so". `formatReport` added a graph summary
only when there was one.

**Fixed in the repo (2026-10-18):** the PASS line ends `; files only: the adapter offers no graph runner` when there
is no graph half, and with the graph summary when there is one (`tests/editor-suite.test.ts`). With the old line
restored, the new test is red. It ships on the next `@nodegx/project-contract` publish. The brief tells a 0.1.0 user
to say "files only" in their report themselves.
