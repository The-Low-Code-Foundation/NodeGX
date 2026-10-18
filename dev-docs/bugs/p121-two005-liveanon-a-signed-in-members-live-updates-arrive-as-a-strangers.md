---
id: P121-TWO005-LIVEANON
title: On the built-in backend a signed-in member's live updates are asked for as a stranger's, so a members-only collection refuses every one
status: fixed
severity: high
area: runtime / realtime (`packages/noodl-runtime/src/api/backends/realtime/RealtimeSubscription.ts` `token`; `SseTransport.ts` `NODEGX_SSE.subscribeRequest`)
found: P121 TWO-005 s12, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §7
phase: P121
regression: packages/noodl-runtime/test/backends/realtime-transports.test.ts "a signed-in user’s stored session"
---

A Subscribe To Changes node on a project bound to its own backend opens the live stream with no session, even when
the person is signed in. The hub then reads them as anonymous, and any collection whose `find` rule names a role
refuses the subscription. The node retries every few seconds and each retry puts a red line in the console.

Measured 2026-10-15 driving the community template (TWO-005 slice 2): Ann signed in by her emailed link, her feed
listens to Heart, Comment and Post (all `find: [role:admin, role:member]`). Bob hearted her post; Ann's count never
moved. Her page had asked `GET /__backend/realtime` seven times with no `?token=`, and logged 21 times "The
subscription to "Heart" was rejected: rule ["role:admin","role:member"] denies find to anonymous".

Why: `RealtimeSubscription.token` returned `handle.sessionToken` on a Parse-wire backend, and nothing sets it on that
wire (`ParseWireAdapter._makeRequest` says so: "nothing sets one yet"). Every data request falls back to the session
store (`readStoredCurrentUser`, `localStorage['Parse/<appId>/currentUser']`); the realtime token did not. SBR-011's
arm "sends the SESSION token when there is one" passed because it put the token on the handle, where a real app
never has it.

Who meets it: any app on the built-in backend whose live collection is not public. The site builder's public pages
worked (anonymous is allowed there), which is why nobody saw it.

**A second half, found once the first was fixed:** with the session on the stream, the subscription POST was
"rejected: no reason given". The NodeGX dialect sent the session as `Authorization: Bearer`, which our backend reads as
an admin token, then as an API key, and refuses 401 before the route runs. The route needs no credential: the hub
checks each collection against the principal the stream opened with, and the `clientId` it minted is the capability
(`HttpServer.realtimeSubscribe`). So no signed-in member's subscription could ever have been accepted.

**Fixed 2026-10-15 in the working tree:** the token falls back to the stored session for the backend's app id, as
requests do; the subscription POST carries no credential. Four arms: this app's stored session is on the stream,
another app's is not, one on the handle still wins, and the POST carries only its content type; the first and the
last each go red on the old code. Driven: the drive's Ann sees Bob's heart without a reload.

Not changed: a subscription opened before the person signed in keeps the stream it opened (keyed by its token) until
it reconnects.
