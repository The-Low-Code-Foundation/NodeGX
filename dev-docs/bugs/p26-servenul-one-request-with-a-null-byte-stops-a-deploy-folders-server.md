---
id: P26-SERVENUL
title: One request with %00 in its path stops a deploy folder's serve.js for everyone
status: fixed
severity: medium
area: deploy / static/deploy/serve.js (every client-side deploy, and the SSR server's port helper)
kit: preview
found: P26 DEP-002 session, 2026-10-23
evidence: dev-docs/tasks/phase-26-deployment/PROGRESS.md D25
regression: packages/noodl-viewer-react/tests/dep-002-serve-hostile-paths.test.js
---

What a person sees: their app, started with `npm start` (`node serve.js`), stops answering. Anyone who
can reach the address can do this with one request, by mistake or on purpose: `GET /a%00b`.

Where: `createStaticHandler` decodes the path and passes it to `fs.stat`. A string with a NUL byte makes
`fs.stat` throw synchronously (`ERR_INVALID_ARG_VALUE`) instead of calling back with an error, the throw
leaves the request handler, and the process exits.

Reproduce (measured 2026-10-23): a folder with `index.html` and a copy of `serve.js`, `node serve.js
--port 0`, then `curl http://127.0.0.1:<port>/a%00b` → no response, the process printed
`TypeError [ERR_INVALID_ARG_VALUE] … without null bytes` and exited; a second `curl /` → connection
refused.

Reach: `serve.js` has been copied into every client-side deploy since 3c41dc02d (2026-10-22). The
published `@nodegx/preview` (0.2.4 at the time of writing) predates it, so npm users do not have it yet.

Fix: the handler answers 400 to a path holding a NUL byte before it touches the file system.
