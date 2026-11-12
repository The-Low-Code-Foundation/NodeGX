---
id: P18-EXP022-S9-RAISELOG
title: A failed request in the Swift app is logged, not raised on the app error channel, so a Swift On App Error does not hear it
status: open
severity: low
area: export / Swift (`nodegx-export/src/emit/swift/view.ts` the `api-call` catch, `JS.raise` in `support.ts`; React's is `raiseLine` + `errorCodeOf` in `src/emit/component.ts`)
found: EXP-022 S9, 2026-10-23 — carrying On App Error into the Swift app (`AppErrorBoundary` over the web export's own `lib/errors`)
evidence: "`view.ts` prints a request verb's catch as `JS.raise(message, node:, in:)`, which `support.ts` documents as 'said in the log' (S3). React's catch prints `raiseAppError({ code, message, nodeId, nodeType, componentName })`, with the code chosen per node type in `component.ts` `errorCodeOf` (`API_CALL_ERROR_CODES`, 'cloud-function/call-failed', …). Since S9 the Swift app carries `lib/errors` and prints the boundary, and the parsers raise on it (`AppErrors.raiseParse`); the request verbs do not. Census 2026-10-23: On App Error is placed in 0 templates and in one fixture, `tests/fixtures/alarm-desk` (App and Pages/Home)."
---

Since S9 a Swift app's On App Error hears what a parser raises, as the React export's does. It does not hear a failed
request: the Swift catch writes the message to the log and raises nothing on the channel, where React raises it under the
node's own code. An app that shows "something went wrong" from an On App Error would show it on the web and stay quiet on
the phone.

**Reach today:** no template places an On App Error. One test fixture does (`alarm-desk`), and it is not exported to Swift
by any test.

**Proposed:** the code each verb raises under is decided in the React printer (`errorCodeOf`), which is the drift
`P18-EXP022-S2-EMITDECIDES` names. Move it into the plan (the action carries its `raises` code, as the parsers' `raiser`
does since S9), then print `raiseAppError` from both printers: in Swift through the carried `lib/errors`, as
`AppErrors.raiseParse` does.
