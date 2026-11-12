---
id: P134-S14-HTTPRAISEWORDS
title: "export: for an HTTP Request answered non-2xx, the running app raises \"The server answered 404 Not Found\" with { url, status } on the error channel, and both exports raise \"HTTP 404: Not Found\" with { status }"
status: open
severity: low
area: export / the React printer's `http-call` failure arm (`packages/nodegx-export/src/emit/component.ts`, `raiseLine(… 'http/error-status', message, { status })`), copied by the HTML printer (`src/emit/html/printComponent.ts`); the runtime's words are `packages/noodl-runtime/src/nodes/std-library/data/httpnode.ts` (`reportOutcomes(… 'failure', { code: HTTP_ERROR_CODES.status, message: \`The server answered ${status} ${statusText}\`, detail: { url, status } })`)
found: P134 session 14, 2026-11-04, the Request Desk in three arms (each arm stopped on the 404 its error channel reported, in its own words)
evidence: packages/nodegx-export/tests/html-a-request.test.ts — the runtime arm allows "The server answered 404 Not Found [http/error-status]", the React and HTML arms "HTTP 404: Not Found [http/error-status]"
---

The node's Error output is the same in all three ("HTTP 404: Not Found", read on the desk at every press), and the code is
the same (`http/error-status`). What differs is what an On App Error handler or the error channel hears: the running app
reports "The server answered 404 Not Found" and names the URL in the detail; both exports report the Error output's text
and the status alone. An app that shows the channel's message, or logs the URL it failed on, reads differently once
exported.

Fix, shared by React and HTML: the failure arm raises the runtime's sentence (`The server answered ${statusCode}
${statusText}` needs the status text on the answer, which the module does not return yet) with `{ url, status }` (the
module knows the URL it asked). React's lane is paused (BOARD §2); this waits for the order, as CLICKBUBBLES did.
