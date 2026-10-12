---
id: P109-S24-EXPORTBADBODY
title: An exported HTTP Request reports a body it cannot read as JSON under http/network-error, where the runtime now says http/bad-body
status: scheduled
phase: P109
task: ISL-043
severity: low
area: export / HTTP Request (the emitted request function in `nodegx-export/src/emit/emitApp.ts` and its failure arm in `src/emit/component.ts`)
found: P109 s24 (ISL-030, the P107-D11 fix), 2026-10-06
evidence: `emitApp.ts` (the generated request) awaits `response.json()` outside its `try`, so a broken body throws a plain SyntaxError with no `code`; `component.ts` (`failArm`) then reports `(error).code ?? 'http/network-error'`. Read, not run.
---

P109 ISL-030 fixed P107-D11 in the runtime (`httpnode.ts`, ruled 2026-10-05 "Give it its own code"): a body that fails to
parse as JSON (Response Type JSON, or an `application/json` answer under Auto) fails under `http/bad-body`, its message
unchanged. The exported app still reports it as `http/network-error`, the code for a request that never reached a server.

**Plain words:** *"In an exported app, a server reply that cannot be read as JSON is still reported as if the server
was never reached."*

**Proposed:** wrap the body read in the emitted function and throw `HttpError(<the parser's message>, 'http/bad-body')`,
as the timeout and network arms already throw theirs. The runtime's ruling covers it; no new question.
