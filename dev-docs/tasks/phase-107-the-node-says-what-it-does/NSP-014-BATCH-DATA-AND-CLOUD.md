# NSP-014 — Batch: records, users, files, HTTP, streams, and the cloud-only nodes

**Opened 2026-09-29.** **Depends on NSP-007** (the world's network and backend) and R4 = continue.
**Status: 📋 not started. Likely to split in two when the census lands (frontend / cloud-only).**

## 1. The person sentence

> **Every node that talks to the app's backend or the internet is specced as the requests it
> makes and what it does with each answer — including failures — so a new backend or a new
> target can be checked against it.**

## 2. The nodes (from the census)

**41**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T1 pure / state machine (1):** Filter Records (`FilterDBModels`)
- **T2 clock, randomness & environment (1):** Open File Picker
- **T3 network & backend (39):** Add Record Relation (`AddDbModelRelation`) · Cloud File · Cloud Function (`CloudFunction2`) · Query Records (`DbCollection2`) · Record (`DbModel2`) · Delete Record (`DeleteDbModelProperties`) · HTTP Request (`net.noodl.HTTP`) · Server-Sent Events (`net.noodl.SSE`) · Log In (`net.noodl.user.LogIn`) · Log Out (`net.noodl.user.LogOut`) · Request Magic Link (`net.noodl.user.RequestMagicLink`) · Set User Properties (`net.noodl.user.SetUserProperties`) · Sign In With (`net.noodl.user.SignInWith`) · Sign Up (`net.noodl.user.SignUp`) · User (`net.noodl.user.User`) · WebSocket (`net.noodl.WebSocket`) · Create Record (`NewDbModelProperties`) · Add User To Role (`noodl.cloud.addusertorole`) · Aggregate Records (`noodl.cloud.aggregate`) · Create User (`noodl.cloud.createuser`) · Delete User (`noodl.cloud.deleteuser`) · Get User Roles (`noodl.cloud.getuserroles`) · HMAC (`noodl.cloud.hmac`) · JWT Sign (`noodl.cloud.jwtsign`) · JWT Verify (`noodl.cloud.jwtverify`) · List Users In Role (`noodl.cloud.listusersinrole`) · Model Request (`noodl.cloud.modelrequest`) · Remove User From Role (`noodl.cloud.removeuserfromrole`) · Request (`noodl.cloud.request`) · Response (`noodl.cloud.response`) · Secret (`noodl.cloud.secret`) · Send Email (`noodl.cloud.sendemail`) · Update User (`noodl.cloud.updateuser`) · Verify Session Token (`noodl.cloud.verifysessiontoken`) · Remove Record Relation (`RemoveDbModelRelation`) · Update Record (`SetDbModelProperties`) · Sign File URL · Subscribe To Changes (`SubscribeToChanges`) · Upload File

Of these, **17** run only in the cloud runtime: Add User To Role · Aggregate Records · Create User · Delete User · Get User Roles · HMAC · JWT Sign · JWT Verify · List Users In Role · Model Request · Remove User From Role · Request · Response · Secret · Send Email · Update User · Verify Session Token.

Census notes:
- **Query Records** — the request is part of the behaviour
- **Filter Records** — client-side over the store ('one subscription, no requests' — filterdbmodelsnode.ts:42), so T1 with the store as a world fake
- **Aggregate Records** — category Cloud Services but availableIn is cloud ONLY — the 17th cloud-only node
- **HMAC** — deterministic given the secret — T1 shape on the cloud target
- **JWT Sign** — deterministic given key and clock
- **JWT Verify** — needs the clock for expiry
- **Request** — the inbound request — a protocol's first event
- **Response** — the outbound response — a protocol's last event
- **Open File Picker** — no network — a DOM input and a user gesture; environment-fed, so T2, kept with the file family

## 3. What is special here

- **The request is part of the behaviour.** A Query Records node that returns the right rows by
  fetching the whole table is wrong. Traces carry `request` events (NSP-007), and the spec states
  the request: collection, filter in the contract's neutral model, sort, limit.
- **Every failure path is specced**: network error, 4xx, 5xx, timeout, a malformed body. The
  outcome contract's `failed` and each node's *Failure* signal and error output.
- **Cloud-only nodes** run in `noodl-viewer-cloud`; their runtime adapter drives that runtime.
  These specs would be one of the inputs to the (uncommitted) Rust backend idea in README §8 —
  record that, don't act on it.
- **Filter Records** may be client-side (`recordFilterLib`), which makes it T1. The census decides.

## 4. Acceptance criteria

As NSP-011 §4, plus:

5. For every node in §2, at least one **failure** scenario per failure kind it can meet, each
   asserting the outcome and the error output.
6. For every record node, the request it makes is asserted, and one scenario proves it does
   **not** make a request when it should not (e.g. no fetch before its inputs are ready) —
   beside a known-firing control.

## 5. Watch for

- Memory: *an awaited callback-style write has a dead error path.* Failure paths in the runtime
  may be unreachable; a spec that says "on failure, pulse Failure" may describe code that never
  runs. Prove each failure path fires on the runtime before writing it into the spec.
- Memory: *a throw is reported against the emitter, not the thrower.* Error attribution is
  behaviour; spec which node's error output carries it.
- Memory: *count the request, not the node that would make it.*

## 6. Built

*(empty)*
