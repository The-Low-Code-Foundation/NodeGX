---
id: P127-BKO002-HOSTEDPRIVACY
title: Inside a conversation, Studio's Data → Privacy shows "Failed to fetch dynamically imported module" and no types, because the backend map's answers carry no CORS
status: fixed
commit: nodegx-studio f50fb31
severity: high
area: nodegx-studio (`editor/serve.mjs` mounts `@nodegx/backend-map`'s handler at /backend-map/, which writes its own headers; every other Studio route answers with CORS for the panel)
found: P127 s2, 2026-10-26, measuring BKO-002 before building it
evidence: MEASURED in nodegx-studio `editor/hosted-check.mjs` (a todo copy with its own backend, Studio's /panel served from another origin with the host's CSP, headless Chrome) — "Privacy lists the app's types" FAIL, `#privmain` says "Failed to fetch dynamically imported module: http://127.0.0.1:<studio>/backend-map/words.js". The handler's three `writeHead` calls (`@nodegx/backend-map` 0.1.1 `server.mjs:241,273,291`) set no Access-Control-Allow-Origin
regression: ../nodegx-studio/editor/hosted-check.mjs "Privacy lists the app's types, read from the map across origins"
owner: P127 BKO-002
---

What a person sees: in Claude Desktop, Studio's Data tab → Privacy says "Failed to fetch dynamically imported module …"
where each type's rule should be. They cannot see or change who can reach their app's data from inside the
conversation. In Studio's own window it works.

Why: in a conversation the panel runs at the host's sandbox origin, so every request it makes to Studio is
cross-origin. Studio answers its own routes with CORS (STU-070), but `/backend-map/*` goes to the map package's
handler, which writes its own headers and sends none. Privacy imports `/backend-map/words.js` and fetches
`/backend-map/api/map`, and both are refused.

Fix (nodegx-studio `f50fb31`): `serve.mjs` sets Studio's CORS headers before it hands `/backend-map/*` to the map's
handler, so they join whatever the handler writes. The package itself is left without CORS on purpose: run on its
own (`npx @nodegx/backend-map`) it holds the backend's admin credential, and only Studio's mount needs another origin.
Graded by `check:hosted` 9/9; with the line taken out, Privacy and both map lines are red (3).
