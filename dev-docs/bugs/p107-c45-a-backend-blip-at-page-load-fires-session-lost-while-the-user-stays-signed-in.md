---
id: P107-C45
title: On a Directus / PocketBase project, a backend that fails the page-load session check (503, network down) fires Session Lost while the user stays signed in
status: needs-ruling
severity: medium
area: viewer / user service (`userservice.ts` constructor) — every User node
found: P107 (the node says what it does) s26, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.17 (row C45); scenarios/net.noodl.user.User.json "C45 — …" (two)
---

When the user service is made with a stored session it checks it (`fetchCurrentUser`, `userservice.ts` :141-160). On
ANY failure its error callback clears `this.adapter.sessionStore(this._defaultHandle())` — the **Parse-wire** adapter's
store — and announces `sessionLost`. On a project whose backend is Directus or PocketBase the session lives in the REST
adapter's store (`NodeGX/<id>/session`), so it is never cleared: the user is still signed in, and every User node has just
pulsed Session Lost. The REST adapter's own rule is the opposite — "a stored session must survive a backend restart"
(`RestAuthAdapter.ts` :1180-1183) — and it announces nothing for a 5xx.

**What the runtime does (measured s26, the real service and the real REST adapter, HTTP from the world):** session stored,
the check answered 503 → the User node pulses Session Lost; Authenticated, Id, Email stay the signed-in user's; storage
still holds the session; `UserService.current` is gone; a later Fetch succeeds as the same user. The failed check also
clears the LEGACY session (`Parse/undefined/currentUser` — the key the Record family's access rules read).

**Plain words:** *"If your Directus or PocketBase backend is briefly down when someone opens the app, every User node says
'Session Lost' — but they are actually still signed in. A graph that sends Session Lost to the login page sends a
signed-in person there."*

**Proposed:** clear the ACTIVE adapter's store (`this._active()`), and only when the backend REJECTED the session (the
adapter already did that and announced it — so the service's own clear + announce can go entirely; that also closes C46).

**Ruling:** R3 (a) — the runtime wins until Richard rules. The world (world.ts AUTH, THE START-UP CHECK) plays the service
as it is.
