---
id: P18-EXP022-S7-LONGLINE
title: The Swift graph target read its plays from one line of `swift test` output, and with 14 plays that line came back cut at 15,559 characters — every row failed on a JSON parse
status: fixed
severity: low
area: export / Swift graph harness (`packages/nodegx-export/tests/helpers/swift-graph-target.ts`, `playSwiftGraphs`)
found: EXP-022 session 7, 2026-10-22, the first build of the 14 graph scenarios (S5's 5 plays fit on the line)
fixed: EXP-022 session 7, 2026-10-22
commit: 62f274719
evidence: packages/nodegx-export/tests/node-spec-graph-swift.test.ts B1–B4 (the first run: "SyntaxError: Unterminated string in JSON at position 15559")
---

The generated `GraphTests.swift` printed every play as one line, `NODEGX-GRAPHS <json>`, and the harness parsed it out
of the output. `swift test` splits a long output line, so 14 plays (store scenarios carry whole history entries) came
back as a cut string and nothing was graded.

**Fix:** the plays are written to a file whose path the harness hands the test in its environment (`NODEGX_GRAPHS_OUT`);
a run that writes no file is an error by name ("the Swift package wrote no plays").
