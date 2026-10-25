---
id: P124-S2-ACTSASHTTP
title: "An API key bound to a person (`actsAsUserId`) passes the rule gate on `POST /functions/<name>` as that person, but the function's Request node then sees nobody signed in; the MCP door (`POST /mcp`) runs the same function as them"
status: fixed
commit: (this session, the Beta sweep s5)
severity: medium
area: backend / the functions HTTP door vs the MCP door (FED-005 `actsAs`; `noodl.cloud.request` reading the caller)
found: P124 s2 (the mystery of the backend), 2026-10-20, on a copy of `templates/digital-bricks-training`
regression: packages/nodegx-backend/tests/fed-005-mcp-acts-as.test.ts "P124-S2-ACTSASHTTP: POST /functions/<name> with a bound key runs as that user, on either key header"
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

**Fixed (Beta sweep s5, 2026-10-25), the first fix shape.** The MCP door's `sessionForGraph` moved to
`src/server/actingSession.ts` (`sessionForActingKey`); `/mcp` and `POST /functions/<name>` both call it. For a bound
key the functions door now mints the one-minute `_Session`, hands the run its token as `x-parse-session-token`, and
deletes it in a `finally`, per run (so the idempotent path's retries mint their own). An unbound key, a person's own
session and the admin token are untouched. `docs/runtime/BACKEND-ACCESS-CONTROL.md` says a bound key's function runs
as that person over either door.

**Graded.** `fed-005-mcp-acts-as` 13/13 with two new arms: `POST /functions/whoAmI` with Alice's key answers Alice's id
on both key headers (`x-nodegx-api-key`, `Authorization: Bearer`), the unbound key is still refused by the graph's own
check beside it; no `_Session` row outlives the calls. Mutants: no session minted (red 2), no release (red 1). Backend
specs on functions, `/mcp` and bound keys 44 suites 566/566, tsc clean.
