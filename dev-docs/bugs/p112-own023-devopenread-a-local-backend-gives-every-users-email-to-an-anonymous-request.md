---
id: P112-OWN023-DEVOPENREAD
title: "A NodeGX app's local backend answers an anonymous request for `/classes/_User` with every user's username and email (and every like/dislike), because a local backend starts with \"devOpen\": true — its permission rules written but not enforced — and every answer carries `Access-Control-Allow-Origin: *`"
status: open
phase: P112
task: OWN-023
severity: high
area: kit — `@nodegx/backend` defaults: `security.json` "devOpen": true on a local backend (`security/state.ts` devOpenActive → no permission check on loopback), CORS `*` by default (`ops/headers.ts`); the kit's guidance to the agent and person
found: P112 OWN-023 s1, 2026-10-20 — reported independently by the NodeGX arm's F4 agent and hats A, D and X; verified by the lab
evidence: the F2 copy of arm B's app served by its own `npm start`: `curl -X GET http://127.0.0.1:8584/classes/_User` with no session and a made-up `X-Parse-Application-Id` → 7 rows, fields incl. `email`, all 7 with an email; same with POST `_method: GET`; response header `Access-Control-Allow-Origin: *`. Its `security.json`: "devOpen": true, defaults "authenticated", no `_User` entry. B's build agent knew: its notes say "the backend runs with devOpen (permission rules are set but not enforced locally)". Read in code, NOT measured: the backend refuses to START with devOpen on a non-loopback bind (`security/state.ts:368`), so a deployed copy can't run this way. NOT measured: whether a web page the person visits can read it cross-site from their browser (CORS `*` says yes; Chrome's Private Network Access may block it). OWN-023 TABLE.md §4, verdicts/A.md D.md X.md
kit: backend
---

Three hats called it "leaks every user's email on day one". The measured scope is the person's own machine: any
process there, and possibly any web page open in their browser, reads the user table and everyone's reactions without
signing in. The deploy interlock is the reason it is not (by code) an internet leak. What a person meets either way:
the access rules the agent wrote are not what the running app enforces, and nothing in the app's folder says so.
Carried in OWN-023 arm B's row (C3); not fixed during the study.
