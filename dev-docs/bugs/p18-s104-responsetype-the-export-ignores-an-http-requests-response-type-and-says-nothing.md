---
id: P18-S104-RESPONSETYPE
title: The export ignores an HTTP Request's Response Type and says nothing — Text or JSON in the app, Auto in the exported one
status: fixed
commit: 86fca0a03
severity: medium
area: export / HTTP Request (`nodegx-export/src/emit/emitApp.ts` httpFunction; the plan reads no `responseType`)
found: P18 session 104, 2026-10-14 — while fixing P109-S24-EXPORTBADBODY
regression: packages/nodegx-export/tests/http-request.test.ts "P18-S104-RESPONSETYPE — the exported request reads the body the way Response Type says" (the emitted fetchQuote run against a stub fetch over every Response Type; Text, JSON, the doc line and the wire row red on the old emitter, Auto green on both)
evidence: "`grep responseType packages/nodegx-export/src` finds nothing. A probe set `responseType: 'json'` on quote-desk's net.noodl.HTTP: the export notes say nothing about it, and the emitted src/api/http.ts reads the body by Content-Type alone"
---

FED-001 §3.2 gave HTTP Request a Response Type (`auto`, `text`, `json`; `httpnode.ts` around line 865). Text always
hands over the body as text. JSON always parses, and fails under `http/bad-body` when the body is not JSON. Auto parses
only when the server says `application/json`. The export transcribes Auto only, and a Response Type someone set is
neither translated nor reported. So the same request can hand over an object in one app and a string in the other,
and the export report never says so:

- **Text** on an `application/json` answer: the app hands over the text, and the exported app parses it into an object.
- **JSON** on a JSON body served as `text/plain`, which is common for raw GitHub and old APIs: the app parses it, and
  the exported app hands over a string. For a body that is not JSON, the app fails under `http/bad-body` while the
  exported one succeeds with the text.

**Reproduce:** set `responseType` to `json` on any exported HTTP Request (for example a copy of `quote-desk`), export,
and read `src/api/http.ts` and EXPORT-REPORT.md.

**Proposed:** carry `responseType` into the request plan and emit its three arms, as `httpnode.ts` does, with JSON's
own bad-body message ("Response Type is JSON but the body is not JSON: …"). Until then, the unmapped-parameter report
should at least name it.

**Fixed 2026-10-15 (P18 session 105, BOARD lane 6), as proposed.** The plan reads `responseType` with
`setResponseType`'s own defaulting (`value || 'auto'`, and anything but `text` / `json` reads as Auto, as the fetch's
two tests do), and `httpFunction` emits the matching arm: Text reads the text; JSON reads the text and parses it
itself, failing under `http/bad-body` with the runtime's sentence (the test reads that sentence out of `httpnode.ts`, so
a rewording turns it red); Auto is unchanged, byte for byte. The result type's comment says which. `responseType` joined
`HTTP_CONFIG_PORTS`, so a wire on it (the editor cannot draw one) defers with the configuration sentence. No corpus
project sets a Response Type: golden 0 lines moved.
