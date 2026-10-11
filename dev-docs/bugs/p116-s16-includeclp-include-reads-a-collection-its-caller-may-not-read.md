---
id: P116-S16-INCLUDECLP
title: "`include` embeds a record from a collection whose own find/get rule refuses the caller — a one-hop bypass of collection permissions"
status: fixed
commit: e06ebbd2a
severity: high
area: backend / wire serialisation (`nodegx-backend/src/persistence/AdapterFacade.ts` `toWire`: `rawFetch(className, value, acl)` with the SOURCE collection's ACL option) and `$path` hops (noodl-runtime `QueryBuilder.buildPathSelect`: the caller's row ACL at every hop, never the hop collection's CLP)
found: P116 ONT-012 s16, 2026-10-10 (the door census, §4)
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-012-WHO-READS-WHICH-DETAIL.md §4
regression: packages/nodegx-backend/tests/p116-s16-include-clp.test.ts "a closed collection is never embedded: get, query and the POST query tunnel each answer a bare link"
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

**Fixed 2026-10-11 (P116 s17, `e06ebbd2a`).** Re-measured first with a probe over every door. Red at HEAD were
the include on get, query and the POST tunnel; max's payslip embedded through a path-rule collection; a `$path`
from a closed collection (>90k found the contract, >99k did not) and from a narrowed one; and, found beside it,
**another person's `_User` embedded with their email, verified flag and admin access**, plus a path from `_User`
filtered by email that matched it. `$inQuery` was already refused, by the adapter, as an operator it cannot
translate.

- The ACL option gains `reach` (`{ get, find }`, each `{ by, otherwise }` of `'all' | 'none' | { where }`).
  `model.collectionReach()` computes it from `checkClp`, the one decider, so an embed answers what a direct
  request would. It is absent when every collection is open, so most callers' option is unchanged.
- `toWire` leaves a closed target a bare link and fetches a narrowed one with `only` set to the target's
  narrowing. The person's own payslip still embeds.
- `refuseHiddenNamed`'s walk refuses (403, `reason: collection-rule`) a `$path` `from` or hop landing on a
  collection the caller may not `find` in full. A narrowed one is refused too, because a hop cannot carry the
  narrowing (a path inside a path is invalid). `$relatedTo` on a record of a collection the caller may not
  `get` is refused the same way. The collection being read is skipped, since the route gated it.
- System collections other than `_User` are refused as targets and hops. For `_User`, see **R-h**.

**R-h (Richard, 2026-10-11, the recommendation): "the name, not the account."** Every `ACCOUNT_COLUMNS` entry
except `username` joins the `hidden` mask for every caller the row ACL binds. ONT-012's strip and naming
refusal then keep it: an included author carries `username` plus the fields the app added, and a filter on
`email` is a 403 naming it. `/users/me` and sign-in read the account with no reader's ACL and are unchanged.
The caller's OWN row embedded through a link is stripped the same way (uniform; their details come from
`/users/me`).

**Not covered, said:** a `repeat` hop that walks the queried collection itself passes through rows outside a
narrowing, because the route-gated collection is skipped. Rows past the last hop are still narrowed by `only`.
A dotted filter (`salary.amount`) returned no rows for the user and was not measured further.

