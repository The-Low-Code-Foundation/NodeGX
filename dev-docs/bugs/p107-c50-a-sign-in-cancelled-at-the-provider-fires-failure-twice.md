---
id: P107-C50
title: A sign-in cancelled (or refused) at the provider fires Sign In With's Failure twice on the page it returns to — and raises the error twice
status: needs-ruling
severity: medium
area: runtime / Sign In With (`signinwith.ts` `initialize` :76-89, `applyReturn` :202-226) with the adapters' return leg (`RestAuthAdapter.ts` `consumeAuthReturn` :1497-1513; `ParseAuthAdapter.ts` :765-770)
found: P107 (the node says what it does) s28, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.22 (row C50); the s28 return-leg probe, four arms × two mount orders, and a wire arm
---

When the provider sends the person back with an error (they pressed Cancel, or the provider refused) — and when the REST
adapter cannot match the returned `state` to the flow it parked — the adapter sets the FINAL state at once, inside the
user service's constructor, AND defers the `oauthReturn` event by `setTimeout(…, 0)` "so a listener attached during this
same tick still hears it". A Sign In With on the returning page does both things in its `initialize`: it subscribes, and
it reads the current state. So it reports the failure TWICE — once from the read, once when the deferred event fires.
Its own comment says `applyReturn` is "idempotent per page load"; it is not — every call mints a fresh token.

Measured s28 on the runtime target (the real node, the real user service; only `consumeAuthReturn` stood in by the
adapter's own branches, copied verbatim):

- **Wire:** Sign In With's Failure → a Counter's Increase. Provider error: the count goes 0 → **1** at the first frame
  and → **2** when the deferred event fires. Control (the exchange refused, :1550-1556 — no early state): → 1, once.
- **Error bus:** an On App Error mounted BEFORE the Sign In With fires **twice** (Code `user/sign-in-with-failed`,
  Message `access_denied`); mounted after it, once (the first raise happened before it listened). Controls: exchange
  refused → once in either order; exchange succeeded → none; no return → none.

The success path is single (the state is `inProgress` when the node mounts, so the read only sets Signing In, and the
event brings the one Done).

**Plain words:** *"If someone presses Cancel on the Google sign-in screen, the Sign In With node on the page they come
back to fires Failure twice — so an error toast shows twice, a retry counter counts two, and On App Error logs it twice.
Fire it once?"*

**Proposed:** make `applyReturn` once-per-page-load for a terminal state (remember the state object it already reported
and ignore the same one again), or drop the deferred re-emit for a node that has already read the state.

**Ruling:** R3 (a) — the runtime wins until Richard rules.
