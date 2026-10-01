---
id: P100-UPG001-LOCKOUT
title: Ten failed credentials from one IP lock it out of every route for five minutes, /health and valid admin calls included
status: open
severity: medium
area: backend / auth rate limit
found: P100 UPG-001 s3 (§3.6b), 2026-09-23 (on 0.2.4); re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
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
