---
id: P112-OWN026-ONEHALFDRIVEN
title: A build that verified by driving the page drove only the half it had just made appear (a setting on, a delete armed), never the setting off and what it governs or the cancel, and nothing at the drive seams asked for the other half
status: fixed
commit: 154ea1088
regression: packages/noodl-mcp/tests/own026BothHalves.test.ts
severity: medium
area: kit / verify guidance (`packages/noodl-mcp/src/tools/renderTools.ts` drive_page; `packages/noodl-mcp/src/guidance.ts` readFirst; `prompts/traps.ts` trap 7)
found: P112 OWN-026 t2-nodegx-c10, c12 (LEARNINGS #14, #17–19), 2026-10-24; FIX-07
evidence: /Users/Shared/nodegx-lab/own026-grades/t2-nodegx-c10|c12|c13|c14/grade.json (C10.1, C12.1, C12.2, F3, F4)
---

c12's 10 drives (6 passed) switched chips off three times (#158, #163, #165), but no drive switched the limited items
off and then read what the setting governs: 0 drives read questions with 11–12 off, at most 2 questions were read in
any drive, the mistakes list was never opened, and 0 cancel presses in c12 or c10 (12 drives). The model's plan says
what it set out to prove: that the new chips write the record and "questions can come from 11/12". The plain-code arm
wrote unit tests for the bounds and passed C12.1, C12.2, F3 and F4.

Fixed (A, generic): the three seams the model was measured reading say to drive both halves: readFirst's verify rule
("drive_page both ways"), drive_page's own description ("Prove both halves: a setting off as well as on (then read
what it governs), a limit at its edge, a confirmation by its cancel"), and trap 7; and every passing drive's headline
adds `BOTH_HALVES` ("A pass proves the path you drove. Drive the other half too: …").

Not taken: B (a graph check for a setting that limits nothing) is quiet (0 flags on 113 examples and 999 template
components; 4 true and 0 false on the test-2 snapshots after one refinement) but reaches one of the three causes: the
limit lives in a Function's script text, which a graph walk cannot read. C (a confirm with its cancel): the examples
already have one (`nav-show-close-popup`, Cancel and Delete both wired) and c10 made 0 example calls; the half confirm
came from the app's own c01 latch.
