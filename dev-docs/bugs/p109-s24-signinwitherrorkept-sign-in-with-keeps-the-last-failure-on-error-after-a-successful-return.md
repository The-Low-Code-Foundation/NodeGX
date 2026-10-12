---
id: P109-S24-SIGNINWITHERRORKEPT
title: Sign In With keeps the last failure on Error after a sign-in that succeeds — the clear is undefined, never sent
status: needs-ruling
phase: P109
task: ISL-030
severity: low
area: viewer / Sign In With (`signinwith.ts` `applyReturn`, the succeeded branch)
found: P109 s24 (ISL-030, while fixing P107-D25), 2026-10-06
evidence: read, not measured — `applyReturn` sets `_internal.error = undefined` and flags Error on a succeeded return, the shape P107-D25 had on Request Magic Link; the spec models it the same way (`user-handovers.ts` `applyReturn`: "Error cleared (never sent: C3)")
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
