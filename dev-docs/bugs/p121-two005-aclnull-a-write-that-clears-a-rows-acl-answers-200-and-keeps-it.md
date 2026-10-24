---
id: P121-TWO005-ACLNULL
title: A write that clears a row's ACL (`ACL: null`) answers 200 and keeps the old ACL
status: fixed
severity: low
area: backend / record writes (`packages/nodegx-backend/src/server/parse-wire.ts` `classPut`, `delete body.ACL` on null); runtime `Noodl.Records.save(…, { acl })` (`packages/noodl-runtime/src/api/backends/ParseWireAdapter.ts`)
found: P121 TWO-005 s15, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §10.4
kit: core
regression: packages/nodegx-backend/tests/p121-acl-null.test.ts "on a row with an ACL: refused in words, nothing written, the ACL as it was"
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

## Fixed (2026-10-24) — the second answer: refused in words

A write with `ACL: null` on a row that has an ACL is a 400 (code 123): *"A row's ACL can't be removed (ACL: null). To
open this Post row to everyone the collection's rules let read it, write ACL {"*": {"read": true}}; add "write": true
for writing too."* Nothing in that write lands. The first answer (null clears the ACL) was not taken: it changes who can
read a row, and is Richard's to rule on if he wants it. A row with no ACL, or one the caller cannot write, goes on as
before (200, or the 404 any refused write gets), so the refusal reveals nothing. Graded:
`tests/p121-acl-null.test.ts` 4/4 (two controls); `two-005-moderate`, `security-enforcement`, the owner and creator
suites 52/52. Not done: the Records API's `acl` option and Set Record's docs do not mention it yet (the refusal says it
where it happens).

