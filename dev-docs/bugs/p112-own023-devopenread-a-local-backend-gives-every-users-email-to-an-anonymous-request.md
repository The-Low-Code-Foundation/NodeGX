---
id: P112-OWN023-DEVOPENREAD
title: "A NodeGX app's local backend answers an anonymous request for `/classes/_User` with every user's username and email (and every like/dislike), because a local backend starts with \"devOpen\": true — its permission rules written but not enforced — and every answer carries `Access-Control-Allow-Origin: *`"
status: fixed
commit: f2afd62b0
regression: packages/nodegx-backend/tests/own026-enforce-rules.test.ts (control arm open, enforced arm 403/404); packages/noodl-mcp/tests/own026ProvisionEnforces.test.ts (through provisionBackend and the built dist)
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

**Seen again, twice more (OWN-023 round 2, 2026-10-21).** Arm B (the gala, kit 0.2.4): "its first backend didn't enforce
its own permission rules, so I replaced it" (B's words). Arm B2 (round 2b, the gala converted): its `CONVERSION.md` §7,
"the backend starts in *dev-open* mode, where permission rules are reported but not enforced — my 'nobody may write'
rule let a child's account write 9 999 stars straight into the collection"; it caught it only because it tried the
direct write over HTTP, then wrote `devOpen: false` into `app/nodegx.security.json`, installed it and restarted. Three
of three NodeGX arms that wrote access rules met this; one shipped it (round 1 B), two found it by testing.

**Fixed for the kit's backends, P112 OWN-026 FIX-01 (2026-10-22).** The service takes `--enforce-rules`: a first
start with no `security.json` (and no project policy) mints the default posture with `devOpen: false`. `@nodegx/mcp`'s
`provision_backend` and `@nodegx/preview`'s own-backend start pass it. Measured on a fresh backend: anonymous
`GET /classes/Note` and `/classes/_User` 403; user B's find returns none of A's rows, B's get/put of A's row 404; A
signs up, creates, finds and updates its own; rows the admin tools seed have no owner and every signed-in user reads
them. What it did not change, on purpose: an existing `security.json` is never rewritten (a reused backend reports
`enforced: false` and `set_backend_enforcement` turns it on); the **editor's** spawner does not pass the flag and
still mints dev-open (its own decision, not this kit's); CORS `*` is unchanged, but on an enforced backend an
anonymous cross-site read is refused like any other.
