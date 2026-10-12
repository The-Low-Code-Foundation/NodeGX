---
id: P119-S2-LIVEPATH
title: A collection read through a path rule refuses live updates — a chat thread whose messages a learner reads "through their conversation" must refetch
status: open
severity: medium
area: backend / realtime — `packages/nodegx-backend/src/realtime/RealtimeHub.ts:305-323`
found: P119 SRK-003 s2, 2026-10-12
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
