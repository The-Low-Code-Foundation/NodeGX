---
id: P124-S2-ACTSASHTTP
title: "An API key bound to a person (`actsAsUserId`) passes the rule gate on `POST /functions/<name>` as that person, but the function's Request node then sees nobody signed in; the MCP door (`POST /mcp`) runs the same function as them"
status: open
severity: medium
area: backend / the functions HTTP door vs the MCP door (FED-005 `actsAs`; `noodl.cloud.request` reading the caller)
found: P124 s2 (the mystery of the backend), 2026-10-20, on a copy of `templates/digital-bricks-training`
evidence: a key `{scopes:["functions:*"], actsAsUserId:<Marie>}`; `POST /functions/course` with `Authorization: Bearer <secret>` → 200 `{"error":"Unauthenticated requests not accepted."}` (the function's own refusal, past the `call: authenticated` gate); the same key on `POST /mcp` `tools/call course` → Marie's rows
---

FED-005 says a bound key "is that user for every row-level and rule-level question". On the HTTP functions door that
is true of the gate (`checkFunctionCall` admits the key as Marie) and false of the run: the graph's Request node has
no user, so a function that reads "the signed-in learner" refuses or reads nobody's rows. The MCP door resolves the
acting user into the run and the same function answers as Marie.

**Why it matters:** two doors, one credential, two answers. A server-to-server caller holding a bound key reaches
nothing through `/functions/*` and everything it should through `/mcp`; a person debugging the first will read it as
"the key is wrong". For P124, "run this page's functions as this person" has to go through MCP, which is the right
answer but not the obvious one.

**Fix shape:** when the principal is a bound key, hand the functions door the acting user the way the MCP door does
(the same resolution, one place), so the Request node sees them; or refuse a bound key on `/functions/*` in words
("this key acts as a person; call through /mcp") rather than passing the gate and failing inside.
