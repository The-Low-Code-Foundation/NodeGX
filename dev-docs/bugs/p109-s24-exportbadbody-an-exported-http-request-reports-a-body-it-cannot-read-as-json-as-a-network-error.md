---
id: P109-S24-EXPORTBADBODY
title: An exported HTTP Request reports a body it cannot read as JSON under http/network-error, where the runtime now says http/bad-body
status: fixed
regression: packages/nodegx-export/tests/http-request.test.ts "P109-S24-EXPORTBADBODY — a body that is not JSON fails under http/bad-body" (runs the emitted fetchQuote against a stubbed fetch; the bad-body row red on HEAD's emitter, both controls green)
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

**Re-measured and fixed 2026-10-14 (P18 session 104, ISL-043 AC1).** It still fired at HEAD. Read first, then run: the
emitted `fetchQuote`, transpiled and called with a stubbed `fetch` whose `json()` rejects, threw a bare `SyntaxError`
with no `code`. The emitted request now wraps the JSON read and throws `HttpError(<the parser's message>,
'http/bad-body')`, which is the proposal. As `httpnode.ts` marks only the JSON read, a failed `text()` is not a bad
body, and a row pins that. The module header now names the code. HLS-001 golden: 1 line predicted and 1 counted
(`quote-desk/src/api/http.ts`). The spec reads 23/23, the http.ts readers 359/359, and the package's `tsc` is 0.

Found on the way and filed as P18-S104-RESPONSETYPE: the export ignores Response Type altogether, so this fix covers
only the Auto path, which is the only one the export has.
