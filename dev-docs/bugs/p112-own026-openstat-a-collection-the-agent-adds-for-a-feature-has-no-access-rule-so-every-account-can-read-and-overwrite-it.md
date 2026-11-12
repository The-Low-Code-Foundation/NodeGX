---
id: P112-OWN026-OPENSTAT
title: a collection the agent adds for a feature has no access rule, so every signed-in account can read and overwrite it
status: fixed
severity: high
area: backend / record access (records created without rules) + mcp guidance
kit: mcp
found: P112 OWN-026 Mistral lab (NodeGX re-run on kit ALL-0107-VIBECFG-ab9546ad0), 2026-10-25
evidence: /Users/Shared/nodegx-lab/own026-grades/mistral/t2-nodegx-c0{2..7}/grade.json (T7, C5.2, C5.3); MISTRAL-PLAN.md §6
commit: fix(p112-own026-openstat), 2026-10-25
regression: packages/nodegx-backend/tests/p112-own026-openstat-a-functions-record-is-its-callers.test.ts "🔴 another family can neither read nor overwrite the history row a function recorded for A"
---

Mistral Large 4 built a children's app with a per-child, per-table answer history in a second collection,
`TableStat`. The children's own records were locked to their family. The history collection had no rule at all
(the graders read `ACL null`). With a second family's session, the grader could:

- read every family's answer history (`POST /classes/TableStat` with no filter returned 53 rows across 12 children
  in c02; 104 rows from every family in c05);
- overwrite another family's child's rows (`PUT /classes/TableStat/<row>` answered 200), after which that family's
  page showed "Mastered tables: none yet".

It failed T7 in every graded NodeGX change from c01 to c07. It also failed both teacher checks in c05 (C5.2: the
teacher's session could write it; C5.3: it could read families that never invited it).

FIX-05 (owner is the server's word) and FIX-06 (group write access) teach the safe shape for the records an agent
thinks of as private. A collection added later for a feature (stats, history, settings) gets no rule unless the
agent remembers to write one, and Create Record's docs call a record with no rules "public" (FIX-06's own finding).

Fix, to size in its session:
- (a) records created without rules default to the creator's own (the safe default), with an explicit "public" to
  share;
- or (b) a write-time info when a collection that other owner-filtered collections point at has no rule;
- plus (c) `validate_project` lists every collection without a rule.

(a) is the one that makes the safe way the short way (LEARNINGS #3).

## Measured, ruled, fixed (2026-10-25)

**The cause was narrower than above.** `TableStat` did have a rule (`create: "nobody"`, FIX-06's advice) and kept the
default `creatorOwns: true`. Pages never created into it; the cloud function `RecordAnswer` did, with
`Noodl.Records.create('TableStat', …)` and no `acl`. A function writes with the admin credential, and `stampCreate`
(`HttpServer.ts`) gave an ACL only to a `user` principal, so every row was `ACL null`, which reads as public to every
signed-in account (`QueryBuilder.ts`, Parse semantics). Rows a page creates were already the creator's own.

**Richard ruled (2026-10-25): the caller owns it.** A function run now remembers the signed-in person whose call
started it (`FunctionRun.callerUserId`, from `POST /functions/:name` and the MCP door, a session or a key bound to a
person). A record the run creates into a creator-owned collection, with no ACL of its own, gets that person's ACL;
`owner` is left as it was. A function that shares says so (`acl` with `'*'`), or its collection sets
`creatorOwns: false`. Unchanged: a run with no signed-in caller (anonymous, a schedule, a trigger, a workflow step),
admin and unbound-key calls, and every collection with `creatorOwns: false`. That covers all five shipped templates
that create from functions (gram, marketplace, digital-bricks-training, nightbook, members-area), and the examples
(`cloud-members-can-edit-my-records` already passes `acl`; `cloud-tag-a-feed-item-with-a-model` is a scheduled run).

The kit's words: the enforced-rules note (`provision_backend`, `set_backend_enforcement`) and Create Record's
function-creates pattern now say a function's record is the caller's, and how to share one.

Regression: 4 cases, a real backend and a real function run. A's row is ACL'd to A; B neither reads nor overwrites
it. Known-firing beside it: `acl '*'` and a `creatorOwns: false` collection are read by B through the same door. An
anonymous call is unchanged. With the new branch disabled, the first case fails. Backend: the 121 files that touch
functions, ACLs or creator-ownership, 1,545 tests, 1 red: `sb004-publication-invariant` "the POINTER arm…", red with
these files at HEAD too (not this change). noodl-mcp backend tool tests 88/88; `catalog:merge:check` up to date.

Not done: (b), a write-time note when a function creates into an open collection. The ruling made the default safe
instead.
