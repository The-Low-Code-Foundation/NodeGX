---
id: P121-TWO005-ACLNULL
title: A write that clears a row's ACL (`ACL: null`) answers 200 and keeps the old ACL
status: open
severity: low
area: backend / record writes (`packages/nodegx-backend/src/server/parse-wire.ts` `classPut`, `delete body.ACL` on null); runtime `Noodl.Records.save(…, { acl })` (`packages/noodl-runtime/src/api/backends/ParseWireAdapter.ts`)
found: P121 TWO-005 s15, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §10.4
kit: core
---

The community template hides a post by writing its row ACL (`{"role:admin": {"read": true}}`, so members stop reading
it) and brings it back by taking that ACL off again. The first version of `hide` brought a post back with
`Noodl.Records.save(id, { endedAt: null, hiddenReason: null }, { acl: null })`.

Measured 2026-10-15 (`packages/nodegx-backend/tests/two-005-moderate.test.ts`, its first run): the save answered 200,
`endedAt` and `hiddenReason` were cleared, and the row kept `{"role:admin": {"read": true}}`. Every member's read of the
brought-back post still came back empty. The backend drops `ACL: null` (and `undefined`) from a PUT before it writes
(`classPut`: `if (body.ACL === undefined || body.ACL === null) delete body.ACL;`), and says nothing.

So a row that has had an ACL can never go back to having none. The template now writes `{"*": {"read": true}}` instead
(the collection's policy still decides who reads, and a stranger is still refused: the spec asserts both). That works,
but a builder writing "no ACL" gets a 200 and a row that hasn't changed.

Fix, proposed (small, one of): treat `ACL: null` on a write as "no ACL" (the row reads as one never given one), or
refuse it in words ("A row's ACL can't be removed; write `{"*": {"read": true}}` to open it to everyone the policy lets
read"). Either way the Records API's `acl` option and the Set Record node's docs say which.
