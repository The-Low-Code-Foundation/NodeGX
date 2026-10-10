---
id: P116-S16-INCLUDECLP
title: "`include` embeds a record from a collection whose own find/get rule refuses the caller — a one-hop bypass of collection permissions"
status: open
severity: high
area: backend / wire serialisation (`nodegx-backend/src/persistence/AdapterFacade.ts` `toWire`: `rawFetch(className, value, acl)` with the SOURCE collection's ACL option) and `$path` hops (noodl-runtime `QueryBuilder.buildPathSelect`: the caller's row ACL at every hop, never the hop collection's CLP)
found: P116 ONT-012 s16, 2026-10-10 (the door census, §4)
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-012-WHO-READS-WHICH-DETAIL.md §4
regression: packages/nodegx-backend/tests/p116-s16-include-clp.test.ts "the salary does not come back embedded in a contract the user may read" (it.failing until fixed)
---

`Salary` has `get: nobody` for users. Its rows carry no ACL (the default when `creatorOwns` is off). A user's
`GET /classes/Salary/:id` is a 403. The same user's `GET /classes/Contract/:id?include=salary` is a 200 with
`"salary": {"__type":"Object", …, "amount": 91000}`. Measured 2026-10-10 on SQLite, with the body printed. The spec's
`it.failing` passes because the amount is there, not because of a TypeError.

The comment at the include site says *"the caller's read ACL applies to the TARGET row too — without this, include= is
a one-hop ACL bypass"*. That is true of the ROW ACL. The target's COLLECTION rule (`find`/`get`) and a path rule's
narrowing on the target (ONT-004, scoped to its own collection) are never asked. The same holds for a `$path` hop
through a collection the caller may not `find`. The path can filter by that collection's values (an oracle) even
though it returns nothing from it.

Fix: the facade cannot ask `checkClp` (it holds no config). Carry it the way ONT-012 carries `hidden`: the ACL option
gains, per collection, "may not get" and the path narrowing of `get`. `toWire` degrades an unreadable target to the
unexpanded Pointer (as it already does for an unreadable row) and ANDs the target's narrowing into its fetch.
`refuseHiddenNamed`'s path walk refuses a hop through a collection the caller may not `find`. ONT-012's field rules
already strip an included record by the target's own `fields`. This is the collection-level half.
