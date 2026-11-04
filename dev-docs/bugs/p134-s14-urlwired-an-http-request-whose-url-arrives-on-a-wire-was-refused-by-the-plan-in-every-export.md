---
id: P134-S14-URLWIRED
title: "export plan: an HTTP Request whose URL arrives on a wire was refused in every export, so HiveClip's window could not reach its engine (10 requests, 3 reads with them)"
status: fixed
commit: ae7a3e99d
severity: high
area: the export plan (`packages/nodegx-export/src/analyze/plan.ts` `compileHttpFetch`) and the request module (`src/emit/emitApp.ts` `httpFunction`), shared by the React and HTML exports
found: P134 session 11, 2026-11-04 (HiveClip's reach measured); fixed session 14
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/census/hive.ts (10 "its url is wired — that input configures what the request is" and 3 reads fed by them, before; none after)
regression: packages/nodegx-export/tests/http-request.test.ts (the P134-S14-URLWIRED block), packages/nodegx-export/tests/html-a-request.test.ts
---

EXP-011 §8.4 put every wired configuration input out of scope in one sentence. True for the inputs that rebuild the port
set; not for the URL's value: the path inputs come from the URL the editor holds, and the request reads the wire's latest
value when it is sent (`buildUrl` over `_internal.url`). Now the module takes `params.url` at the call, fills a path
placeholder in it as `buildUrl` does, and fails a blank or non-text URL with the runtime's codes and words. HiveClip's plan
refusals 87 -> 68.
