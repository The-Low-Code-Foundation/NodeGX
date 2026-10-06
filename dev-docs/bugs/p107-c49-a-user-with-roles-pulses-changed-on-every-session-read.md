---
id: P107-C49
title: A signed-in user with Roles makes every User node pulse Changed on every session read — three times per Fetch — when nothing changed
status: fixed
commit: c6bf4e8ac
phase: P109
task: ISL-027
severity: low
area: viewer / user service `currentFor` → cloudstore.js `_fromJSON`; runtime / User
found: P107 (the node says what it does) s26, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.user.User.json "Roles: a real list; a Fetch that returns the same roles pulses no Changed (v2, C49)" (and its control; Record's pair in DbModel2.json)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.17 (row C49); scenarios/net.noodl.user.User.json "Roles: …"
---

The session store is JSON text parsed on every read, so `roles` (an array) is a NEW array each time; `_fromJSON` writes it
onto the `_User` record and `Model.set`'s `!==` calls it changed. A Fetch reads the session three times (the service's
bridge on `sessionChanged`, `sessionGained`, the node's success) — three Changed pulses for one Fetch that returned the
same roles (measured s26). The page-load check and every sign-in do the same.

**Plain words:** *"For a user who has roles, the User node's Changed fires (three times) on every Fetch even when nothing
about the user changed — anything wired to Changed re-runs for nothing."*

**Proposed:** write a list onto the record only when its content differs (the R7 family — identity vs value; ask with R7).

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Compare the list's contents".** Changed fires only when the roles, or any other list on a record, really differ. A small change where the app loads a record from the backend, so Record nodes that hold a list get the same treatment. An app that used Changed as a sign that a Fetch finished stops getting it for users with roles. The question as asked: *"Should a list on a record, such as a user's roles, count as changed only when what is in it changes?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s22, ISL-027), as ruled "Compare the list's contents".** `cloudstore.js _fromJSON` skips a plain list whose contents equal the one the record holds; the spec world's `writeStoreEvent` and the four specs that inline it say the same (User v2, Record v3, Create Record v2, Query Records v3). Two more User scenarios were needed: the list churn had been the only thing showing two branches to the mutants. Runtime at 20732 and 13: the four conform, 0 divergences. Controls (HEAD's `cloudstore.js`): User fails the Roles pair plus 8 generated, Record its same-list scenario. Not covered: a list of OBJECTS becomes a fresh Collection on every read (`P109-S22-COLLECTIONCHURN`).
