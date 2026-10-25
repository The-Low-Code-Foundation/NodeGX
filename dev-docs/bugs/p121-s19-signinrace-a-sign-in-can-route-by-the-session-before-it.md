---
id: P121-S19-SIGNINRACE
title: Signing in as the admin over a staff member's session sometimes routes by the old session
status: fixed
commit: (this session, the Beta sweep s7)
severity: medium
area: template / templates/marketplace `/Pages/SignIn` (`ROUTE_SCRIPT` after Log In `done`); possibly the runtime's Log In
found: P121 s19, 2026-10-16, `nodegx-backend/tests/two-003-drive.test.ts`
evidence: one red run of three that reached the step (the other two green), with a peer's full suite running beside it
kit: core
regression: packages/noodl-viewer-react/tests/p121-s19-signinrace.test.ts "🔴 the staff member's check answers after the admin signed in: the admin stays signed in"
---

In the slice-1 drive's tablet pass, a seller's staff member is signed in; the drive opens `/sign-in`, types the
admin's email and password and presses Sign in. Once in three runs the app landed on the **staff's** Orders page
("SIGNED IN AS ADA PHONES") instead of the admin's Sellers: the drive timed out on "the admin is back on the sellers".
The next run, same code, was green. The template change in between touched only the admin's Sellers page and a new
page, neither on this path.

Not investigated. Reading by source only: `/Pages/SignIn` runs `whoAmI` on Log In's `done` (`ROUTE_SCRIPT`,
`packages/noodl-mcp/tests/two003Pages.ts`). If `done` can fire before the new session replaces the old one in what
`Noodl.CloudFunctions.run` sends, `whoAmI` answers for the staff member and the page routes them. That would be a
runtime race (Log In), not the template's; or the drive's Sign out/sign-in timing, a harness one. Measure first: log
which session token `whoAmI` carried on the red run.

A person would meet it on a shared phone: a seller's staff hands the phone to the admin, who signs in and finds
themselves on the seller's orders.

**Measured on the released 0.4.2 (P112 OWN-021 S8, 2026-10-20).** A tablet-size Chrome on the editor's preview, the
marketplace on its built-in backend: 20 sign-ins over the other person's session, alternating staff → admin and
admin → staff, never signing out. **The route was right all 20 times** (admin on `/admin/sellers` with the six tabs,
staff on `/orders`). Once (the 6th, admin → staff) the bar still read **ADMIN** 3 s after the staff's Orders page drew;
the next 12, read at 3 s and again at 7 s, were all clean. So the routing race s19 saw did not reproduce; a bar that
names the previous person for a moment may be the same race in a smaller form. Still open: log which session token
`whoAmI` carries, and when the bar's name is read.

**Found and fixed 2026-10-25 (the Beta sweep s7), by source, then graded without a browser.** Not Log In: it writes the new
session before it reports `done` (ParseAuthAdapter `logIn`: `setSession` then `success`). The hole is the page-load check.
Opening `/sign-in` is a path navigation, so the page reloads and the user service checks the STORED session (the staff
member's) with `/users/me`. `fetchCurrentUser` wrote whatever that answered into the session, unconditionally, on both
adapters. When the check answered after the admin's `/login` (a box under load), it put the staff member back: `whoAmI`
then answers for them and the page routes them, and the bar names the previous person. A "session invalid" answer for the
old token (Parse 209, REST 401/403) cleared the admin's new session outright.

Fix: `fetchCurrentUser` remembers which session was stored when the check was asked. If a sign-in or sign-out has replaced it
when the answer arrives, the answer changes nothing (no write, no `sessionGained`/`sessionLost`) and the caller is told
`SESSION_MOVED_MESSAGE` ("Someone signed in or out while this was being checked, so its answer was not used. Check
again."). The comparison is stored-then against stored-now, so an explicit `become(token)` still replaces the session.
Parse wire and REST alike.

Graded with every answer held and released in the race's order (so it reddens every run, not one in three): the Parse
wire through the real UserService (`noodl-viewer-react/tests/p121-s19-signinrace.test.ts`, red 2/4 on HEAD: `staff` written
back, the admin's session cleared by a 209), PocketBase through RestAuthAdapter (`noodl-runtime/test/backends/
p121-s19-signinrace-rest.test.ts`, red 2/3 on HEAD, the same two), each with known-firing arms (a check with nobody signing in
is adopted; a 209/401 still signs the person out). **Not driven in Chrome:** that s19's one red was this race is the
reading that fits both symptoms, not one measured on that run. If the slice-1 drive reddens the same way again, reopen.
