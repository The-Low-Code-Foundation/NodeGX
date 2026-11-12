---
id: P134-S14-HTTPSTEP
title: "HTML export: the printer had no HTTP Request step, so any chain that ran a request was left out whole — hidden while the plan refused every request first"
status: fixed
commit: ae7a3e99d
severity: high
area: the HTML printer (`packages/nodegx-export/src/emit/html/printComponent.ts`, the step switch and the value reads)
found: P134 session 14, 2026-11-04, the census after URLWIRED (HiveClip: 5 "a http-call step, which the HTML target does not print yet")
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/census/own-after-s14.txt (0 after; 5 measured before the fix in the same session)
regression: packages/nodegx-export/tests/html-a-request.test.ts
---

"The printer's own gaps: 0" (session 13) counted only what reached the printer; every request a chain ran in the corpus was
HiveClip's, refused upstream for its wired URL. Fixed by copying React's `http-call` step and `http-out` read
(P134-HTX001-PRINTERDECIDES). Graded on the Request Desk in the running app, the React export and the HTML export: equal at
every press, the same two addresses asked; 1 mutant killed.
