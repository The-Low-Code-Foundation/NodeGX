---
id: P119-S2-LIVEPATH
title: A collection read through a path rule refuses live updates — a chat thread whose messages a learner reads "through their conversation" must refetch
status: fixed
commit: (this session, the Beta sweep s6)
severity: medium
area: backend / realtime — `packages/nodegx-backend/src/realtime/RealtimeHub.ts:305-323`
found: P119 SRK-003 s2, 2026-10-12
regression: packages/nodegx-backend/tests/p119-s2-live-path.test.ts "Rick's reply in her conversation arrives live; a reply in someone else's never does"
evidence: packages/nodegx-backend/src/realtime/RealtimeHub.ts:311 ("live updates cannot follow a path yet — query it instead"); dev-docs/tasks/phase-119-learn-with-simple-rick/README.md §2
---

Learn with Simple Rick is a chat. A learner reads the messages of their own conversations, which is a path from their
sign-in: Learner (by `login`) → Conversation (by `learner`) → Message (by `conversation`). That is the fail-closed way to
say "their own" (P116 ONT-004), and the template uses it. But `RealtimeHub` refuses a subscription on any collection
read through a path rule, so when Rick replies, the learner's open thread does not change until it refetches.

The alternative, a row ACL on every message, does stream live, but it fails open: a row written without an ACL is
visible to every signed-in learner. So the template takes the path rule and refetches on open, on the "Rick replied"
push and on focus. For a coach who replies hours later that is acceptable. For any chat where both people are in the
thread at once, it is not.

ONT-004 decided this deliberately ("refuses the subscription rather than streaming past it") and the message says
"yet", but no task owns lifting it. Proposed fix: evaluate the path for each changed row in the hub (the SQL
predicate's JS twin, as `canReadRecord` is for ACLs), or re-run the subscriber's narrowed query on each change event
for that collection. Size: the hub's matcher plus a twin property test.

**Fixed (the Beta sweep s6, 2026-10-25).** The second proposal, not a JS twin: a narrowed subscription is accepted, and
each create or update reaches the subscriber only when their own query, narrowed by the rule the way `/classes` narrows
it, returns the row (`HubOptions.confirm`, answered in `service.ts` by `facade.rawQuery` with `aclFor(…, only)`). One
SQL, so a frame and a query cannot drift. A delete (the row is gone) is read from the record as it was: for a path whose
last hop is `{ from, by }`, the same path one hop shorter is asked about the row the link names; `creator` is the
record's own `owner`. Anything else (a last hop followed forwards, a list, a repeated hop) or a check that fails sends
`resync` `"unconfirmed"`, never the row. Confirmations run side by side; frames leave in change order. Same for
`creator` rules, which were refused by the same branch.

**Graded.** `tests/p119-s2-live-path.test.ts` 10/10: five over HTTP on a locked backend with the row's chain (red 5/5
at HEAD, in the row's words), five on the hub (order, a failed check, a delete one link back, an unreadable delete, a
hub with no `confirm` still refusing). Seven mutants red (confirm always yes, delete always yes, wrong collection one
link back, no ordering, unreadable → silence, `creator` delete dropped, and one that broke delivery). Neighbours:
realtime hub/http/filter/changebus, ONT-004 rule, ONT-012, FED-005, creator edits, path-no-table 224/224, tsc clean.
`docs/runtime/REALTIME.md` says so. Left: the P119 README §2 still says live updates refuse the path (a peer's open
edit is on that file); the template's refetch-on-open stays harmless.
