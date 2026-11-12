---
id: P109-S24-SIGNINWITHERRORKEPT
title: Sign In With keeps the last failure on Error after a sign-in that succeeds — the clear is undefined, never sent
status: fixed
commit: ac33256ac
phase: P109
task: ISL-030
severity: low
area: viewer / Sign In With (`signinwith.ts` `applyReturn`, the succeeded branch)
found: P109 s24 (ISL-030, while fixing P107-D25), 2026-10-06
evidence: read, not measured — `applyReturn` sets `_internal.error = undefined` and flags Error on a succeeded return, the shape P107-D25 had on Request Magic Link; the spec models it the same way (`user-handovers.ts` `applyReturn`: "Error cleared (never sent: C3)")
launch: beta
regression: packages/nodegx-node-spec/golden/net.noodl.user.SignInWith.json
---

P107-D25 was ruled 2026-10-05 "Clear it to blank text" for Request Magic Link, and fixed in P109 ISL-030 (s24). Sign In With
clears its Error the same way on a sign-in that comes back succeeded: to `undefined`, which a node never sends (CONTRACT
C3). A label wired to Error after a failed sign-in keeps that failure when the next sign-in succeeds.

The reach is small: the receiver's Error is set only by a failed return, and the next return is on a later page load, where
the node is new (its Error never held the old failure). It shows only when a page load returns a failure and a later
return on the SAME page succeeds — which a page load cannot do (one return per page load). **So this is probably not
reachable today;** recorded because the shape is the one D25's ruling removed, and a future second return path would make
it live.

**Plain words:** *"Sign In With clears its Error the old way (to nothing, which never reaches a wire). It probably can't
show today, because each page load has one sign-in coming back. Change it to blank text like Request Magic Link, for
consistency?"*

**Proposed:** blank text, as D25. Or close as unreachable.

**Ruled by Richard, 2026-10-27 (Beta sweep s19): "Blank text, like magic link".** Asked: *"A page load only ever
gets one sign-in back, so it cannot happen today. On Oct 5 you ruled that Request Magic Link clears its Error to
blank text. Same for Sign In With?"* — blank text / close it, can't happen.

**Built s19.** `signinwith.ts` clears Error to `''` on a succeeded return; the spec is Sign In With v4 (`changes` entry,
golden re-written: five scenarios now send `error ""` before Done). The golden showed it reaches one case the row
called unreachable: a Do that fails (no provider) on a page whose sign-in return then succeeds kept the press's
failure; it now clears. Conformance on the runtime CONFORMS, 200/200; control (HEAD's `undefined`) DOES NOT CONFORM.
Viewer sign-in suites 9/9; `catalog:check` and `catalog:merge:check` up to date.
