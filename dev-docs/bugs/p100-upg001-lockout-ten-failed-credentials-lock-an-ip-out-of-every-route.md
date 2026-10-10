---
id: P100-UPG001-LOCKOUT
title: Ten failed credentials from one IP lock it out of every route for five minutes, /health and valid admin calls included
status: needs-ruling
phase: P109
task: ISL-040
severity: medium
area: backend / auth rate limit
found: P100 UPG-001 s3 (§3.6b), 2026-09-23 (on 0.2.4); re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
regression: packages/nodegx-backend/tests/isl040-lockout.test.ts
---

After ten rejected credentials in five minutes from one client IP, every request from that IP gets 429 for
five minutes. That includes `/health`, anonymous public reads, and calls with a valid admin token. One browser
retrying with an expired session token (a rejected session counts as a failure), or every user behind one
NAT or proxy, can take the app offline for everyone on that address.

**Where:** `packages/nodegx-backend/src/server/HttpServer.ts:1758-1762`. `isLockedOut(clientIp)` is checked
before the principal is resolved and before any route is told apart. The limiter is
`packages/nodegx-backend/src/admin/auth.ts` (BAK-005). Its own docblock says it is *"a speed bump against
online guessing, not an account-lockout system"*.

**How it was found:** P100's 0.2.4 drive. Not re-run on HEAD, but the code path above is the same.

**Proposed:** check the lockout only when the request carries a credential, and let a request whose
credential then resolves go through. Keep `/health` outside it. Spec: ten bad tokens, then a good admin token
→ 200, `/health` → 200, an eleventh bad token → 429. Small.

**Half fixed (P109 s41, 2026-10-11, ISL-040); the other half is a ruling.** Re-measured at HEAD first: after ten bad
tokens, `/health` and an anonymous public read from the same address answered 429.

**Built:** the lockout now holds back only a request that carries a credential. That means one of
`CREDENTIAL_HEADERS` (`authorization`, `x-parse-master-key`, `x-nodegx-api-key`, `x-parse-session-token`, the ones
`resolvePrincipal` reads), or a route marked `takesCredential`. Today the only such route is `POST /_admin/login`, whose
password spends the same budget. `/health` and anonymous reads pass.
- `bmg-014`'s "ten wrong passwords lock the address out" went red when the route flag was missing. It caught the first
  version, which let the eleventh password attempt through. It is green now.
- The new spec was red on the old code on exactly `/health` and the anonymous read. The 15 specs that touch the lockout
  are 253 / 253.

**Not built, and why (the ruling):** the ledger also proposed letting a locked-out address through when its credential
is right. That answers a guesser 429 for a wrong credential and 200 for the right one, so the guessing goes on at full
speed. An admin token can be anything a person typed (`--token`), so guessing it is realistic. The spec pins today's
answer (a right token from a locked-out address is 429) until Richard rules. The case it costs: a person whose
browser retried an expired session ten times waits five minutes, though the app still works for them anonymously.
