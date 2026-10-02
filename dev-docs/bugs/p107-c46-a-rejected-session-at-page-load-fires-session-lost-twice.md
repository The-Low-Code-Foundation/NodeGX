---
id: P107-C46
title: A session the backend rejects at page load fires Session Lost twice on every User node
status: needs-ruling
severity: low
area: viewer / user service (`userservice.ts` :147-158) — every User node
found: P107 (the node says what it does) s26, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.17 (row C46); scenarios/net.noodl.user.User.json "C46 + C47 — …"
---

The page-load check's rejection (401 / 403 on REST, 209 on the Parse wire) is announced by the ADAPTER (`sessionLost`,
`RestAuthAdapter.ts` :1184) and then again by the service's error callback (`userservice.ts` :157). The service's comment
calls the double emit "pre-existing and preserved" and says `user.ts` "handles the event idempotently" — the node's model
does; its **Session Lost output pulses twice** (measured s26 on the runtime: two `sessionLost` signals in one settle).

**Plain words:** *"When someone's login has expired and they open the app, Session Lost fires twice — anything wired to it
(a toast, a counter, a navigation) runs twice."*

**Proposed:** the service announces nothing the adapter already announced — ask together with C45 (one change closes both).

**Ruling:** R3 (a) — the runtime wins until Richard rules.
