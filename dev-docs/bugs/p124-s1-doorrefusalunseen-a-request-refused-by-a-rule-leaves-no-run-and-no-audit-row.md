---
id: P124-S1-DOORREFUSALUNSEEN
title: "A request refused by a permission rule (403 at the door) leaves no run in `/executions` and no row in the audit: the most security-relevant event a backend has is invisible to every screen"
status: fixed
severity: medium
area: backend / the rule gate (`checkClp`, `checkFunctionCall` in `security/model.ts`, the dispatcher) and the audit (`ops/audit`)
found: P124 s1 (the mystery of the backend), 2026-10-20, on a copy of `templates/digital-bricks-training`; first named by the round's stranger (its REPORT.md question 4)
kit: core
regression: packages/nodegx-backend/tests/p124-s1-door-refusal.test.ts "records an anonymous read of a collection the rule refuses: who, what, which rule"
evidence: `POST /functions/conceptList` with no credential → 403; `X-Total-Count` on `GET /executions` 2 before and 2 after; `GET /admin/audit` count 37 before and 37 after; no audit action name matches /den|refus|forbid/ (the list: `permissions.*`, `auth.link.credentials-revoked`)
---

A function run that fails INSIDE the function is a run (`status: error`, `errorMessage`), so "what just ran" shows
it. A request the RULE turns away before the function starts is not: the dispatcher answers 403 and records nothing,
neither as a run nor as an audit entry. The audit's action vocabulary has no "denied" action at all.

**Why it matters:** the client's question "is it secure" is answered by watching the door. A canvas of the backend
(P124) can show every run the functions made and not one of the attempts the rules stopped; an operator reading the
audit after an incident finds the rule changes and none of the refusals. "Somebody tried to read Lesson as nobody at
02:13" is the sentence a person who vouches needs, and the backend cannot say it.

**Fix shape:** an audit action `access.denied` (actorKind, the principal's kind and id if any, collection or function,
op, the rule that refused, the request id), rate-capped per principal so a flood cannot fill the table, and a
`GET /executions?status=refused` view or a separate `GET /admin/refusals` the canvas can poll beside the runs.

**Fixed (2026-10-25, the Beta sweep):** every 403 a RULE gives at the door (a collection's rule, including each op in
`/api/_batch`; a function's `call` rule or a key's missing scope; the files rule; signup) now writes an audit entry
`access.denied`: who (principal kind, user id or key name, address), what (`target: {collection}` / `{function}` /
`{file}`), the op, the rule that refused and why, the request id, the function run when a run made the request. Capped
at 20 per caller per minute (`ACCESS_DENIED_AUDIT_CAP`); the first entry after a capped minute carries
`notRecordedBefore`. Every refusal still answers 403 and writes its access-log line. The backend manager's Audit page
lists it in its action filter ("access · denied"); a canvas polls `GET /admin/audit?action=access.denied`. Not done:
no `/executions?status=refused` view (the audit is the one place), and refusals inside `/mcp` stay the `mcp.tool.call`
entry's failure. Graded: `tests/p124-s1-door-refusal.test.ts` 6/6 (the spec ran red 5/6 first; the cap mutant red).
