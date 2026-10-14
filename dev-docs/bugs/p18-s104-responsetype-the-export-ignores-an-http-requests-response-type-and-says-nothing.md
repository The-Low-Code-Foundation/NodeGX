---
id: P18-S104-RESPONSETYPE
title: The export ignores an HTTP Request's Response Type and says nothing — Text or JSON in the app, Auto in the exported one
status: open
severity: medium
area: export / HTTP Request (`nodegx-export/src/emit/emitApp.ts` httpFunction; the plan reads no `responseType`)
found: P18 session 104, 2026-10-14 — while fixing P109-S24-EXPORTBADBODY
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
