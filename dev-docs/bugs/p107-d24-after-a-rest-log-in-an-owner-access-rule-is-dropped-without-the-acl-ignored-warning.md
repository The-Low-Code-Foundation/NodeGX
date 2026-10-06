---
id: P107-D24
title: After a Log In on Directus / PocketBase, a record's Owner access rule is dropped without the "ACL ignored" warning that exists to say so
status: fixed
commit: 225542f5b
phase: P109
task: ISL-029
severity: medium
area: runtime / the Record family's access rules (`dbmodelcrudbase.ts` `_getCurrentUser` :775-792 → `CloudStore.instance.currentUserId()`); `RestDataAdapter.ts` create :1043-1050
found: P107 (the node says what it does) s27, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/s11-the-owner-is-who-logged-in.json "Log In, then Create Record with an Owner rule: the create carries the person who logged in, read and write" (and NewDbModelProperties.json / SetDbModelProperties.json "… (v4, D24)"; the Parse-wire half in packages/noodl-runtime/test/nodes/isl-029-access-rules-ask-the-records-backend.test.ts)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.19 (row D24); the s27 probe graph (Log In → Create Record with an Owner rule), three arms
---

The access rules ask the LEGACY store who is signed in (`CloudStore.instance` — the `cloudservices` app id's Parse-wire
session). A Log In on a REST backend writes that backend's own session (`NodeGX/<id>/session`) and never the legacy one.
So on a Directus / PocketBase project the person who just signed in is nobody to the rules: a Create Record with an Owner
rule hands the adapter NO `acl`.

Measured s27 on the runtime target (the real `CloudStore`, the real REST auth adapter's session store; only the wire stood
in): Log In as `u2`, then Create Record with an Owner rule → `create { collection: "Lesson", data: {} }`, no `acl`. Control
(the legacy user `u1` scripted, no Log In) → `acl: { u1: { read: true, write: true } }`. Neither → no `acl`.

The access itself does not change: every REST backend marks `data.acl` unsupported and ignores a per-record ACL. What is
lost is the sentence. `RestDataAdapter.create` warns "ACL ignored on directus …" when it is handed an `acl` — the comment
says "Dropping it *silently* would be the failure; saying so is not" — and after a REST Log In it is never handed one,
so the author is never told their Owner rule does nothing.

Not measured: a `nodegx` backend configured through `backendServices` with no `cloudservices` endpoint (Parse wire, where
`data.acl` IS supported) — whether its session key and `CloudStore.instance`'s agree. The world does not play the Parse
wire. That is the case that would make this a security row; it is worth one probe on the real backend.

**Plain words:** *"On a Directus or PocketBase project, an Owner access rule on Create Record does nothing — which is
expected there — but the warning that is supposed to say so never appears once somebody has logged in."*

**Proposed:** read the signed-in user from the record's OWN backend (`CloudStore.forBackend(scope, backendId)`'s auth
session) rather than the legacy store; or warn at the rule when the backend has no `data.acl`.

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Ask the record's own backend".** The rules see the person who really logged in. On Directus and PocketBase the warning appears again. On a NodeGX backend, if the mismatch is real there, Owner rules start working. A modest change to how every access rule finds the user, and the NodeGX case should be checked on a real backend first. The question as asked: *"Should access rules ask the record's own backend who is logged in?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Measured s24 (P109 ISL-029, 2026-10-06), the probe the ruling asked for: a security row.** A real `nodegx-backend`
(`dist/cli.js` built from current source, dev-open off) configured under `backendServices` with no `cloudservices`
endpoint, the real `ParseAuthAdapter` signing in through the handle `UserService` uses there, and the real Create Record
methods. Log In wrote `Parse/<the entry's publicToken>/currentUser`; the rules read `Parse/undefined/currentUser`
(the legacy store has no app id) — nobody. The create went out with the person's session and **no `ACL`**:
- the collection's creator-owns on (the default): the server stamped the owner itself, and a second signed-in user got 404;
- creator-owns off: the record was stored with `ACL: null` and the second user read it (`GET` 200, and it was in their
  `find`). The author's Owner rule did nothing and nothing said so.
Control: the same press with a `cloudservices` endpoint sent `ACL: {<owner>: read, write}` and the server stored it.
Severity raised from low to medium on that reading: the default posture covers it; turning creator-owns off exposes it.

**Fixed 225542f5b (P109 ISL-029, 2026-10-06), as ruled.** `_getCurrentUser` asks `CloudStore.forBackend(scope,
backendId).currentUserId()`; `RestDataAdapter.currentUserId` reads the session a REST Log In wrote, so on Directus /
PocketBase the rule is handed on and "ACL ignored on …" is printed again.
