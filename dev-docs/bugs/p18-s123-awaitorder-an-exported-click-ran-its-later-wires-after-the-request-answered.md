---
id: P18-S123-AWAITORDER
title: An exported click ran its later wires only after a request answered; the running app runs them first
status: fixed
commit: 3d44078e8
regression: packages/nodegx-export/tests/the-failure-runs-its-chain.test.ts "a control: the call awaited in place puts the refusal away after it shows" (and §A, fail-desk against the runtime's own nodes; mutants B and I)
severity: high
area: export / handler order (api-call, cloud-call, http-call, record-fetch, file calls)
found: P18 session 123, 2026-10-17, reading the emitted diff of every node the Failure chain gained
evidence: dev-docs/tasks/phase-18-code-export-v2/s123-failchain/after-await.ts (4 lists at HEAD 06ea65ea3, all Cloud Functions; 14 in the tree); EXP-011 §90
---

An exported handler awaited a request where its wire sat, so every wire after it on the same click ran only once the
request answered. The running app's Log In, Delete Record, Cloud Function, HTTP Request and Condition each act in an
after-update callback, in wire order, and a request answers later, so the later wires run first.

Shipped at HEAD: **digital-bricks-training's Settings** sends its export request, then sets "preparing"; the export set
"preparing" after the answer had cleared it, and said "preparing" for ever. Its Unsubscribe said "stopping" for ever the
same way. With the Failure chain (§90) it reached todo-list's Sign in: Log In, then "put the refusal away", and the
refusal vanished as it was shown.

Fixed: an awaited call that a later action of its list follows is started and not waited for (`void (async () => { … })();`).
A failure before its first await still runs its chain first, as the runtime's synchronous `setError` does. A later
wire that writes a value the call sends is refused by name (the runtime reads it after the update).
