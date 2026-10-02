---
id: P107-C49
title: A signed-in user with Roles makes every User node pulse Changed on every session read — three times per Fetch — when nothing changed
status: needs-ruling
severity: low
area: viewer / user service `currentFor` → cloudstore.js `_fromJSON`; runtime / User
found: P107 (the node says what it does) s26, 2026-10-02
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
