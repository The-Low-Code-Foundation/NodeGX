---
id: P127-S8-DUPEROLE
title: "Two Add User To Role calls at the same moment make the role twice, and then a member removed from it keeps reading the group's rows"
status: fixed
severity: high
area: "packages/nodegx-backend `src/roles/RoleStore.ts`: `ensure` (find, then create: nothing in between stops a second caller) and `find` (`limit: 1`, so every add, remove and list by name reaches one row of several); callers `SystemRoles` add/remove/list (the cloud nodes), `admin-security.ts`, `admin-users.ts`"
found: "P127 s8, 2026-10-27, adding the group-only drive to BKO-006's grader (`briefs/grade.mjs`) on a copy of the shared-expenses lab"
evidence: "MEASURED on a copy of `/private/tmp/bko006/lab/expenses` (built by a stranger's Opus on @nodegx/mcp 0.2.7) with the @nodegx/mcp 0.2.8 tarball's backend: `_Role` holds two rows named `members-of-4744a5f5-…`, created in the same millisecond (09:31:04.402), each with bob in it. bob signs in and lists Expense: 4 rows. `DELETE /admin/roles/<name>/users/<bob>` answers 200 success; bob lists Expense: 4 rows. The same DELETE again: 200 success; bob still 4 rows. `/admin/roles` after: the first row empty, the second still holding bob. The cloud node Remove User From Role resolves the role the same way (`roles.find(name)`)."
owner: P127 s8
task: P127 BKO-006 (the group-only rule the grader now drives)
regression: packages/nodegx-backend/tests/p127-duplicate-role.test.ts (all four arms)
---

What a person sees: an owner removes someone from their team in an app an agent built, the app says it worked, and
the person who was removed still sees every one of the team's expenses. Nothing tells either of them.

How it happens: the expenses app's Join Group function puts a person in `members-of-<owner>` with Create Role If
Missing on, and two of its calls ran at once (two invites for the same address). Both looked for the role, found none
and made one. From then on every call by name reaches only the first row the store returns, so the second row's
members can never be taken out by name.

Present in 0.2.7 and 0.2.8 alike (not a regression of the 0.2.8 cut).

**Fixed (P127 s8, 2026-10-27), before the 0.2.8 re-cut (Richard: "Hold, re-cut with fix").** `RoleStore` queues every
look-then-make per role name, per storage (four stores wrap one facade): `ensure`, and the admin door's create through
the new `createIfAbsent`. `find(name)` puts a name held by several rows back to one: every member moves into the
oldest row, a description carries over, the others go. Every add, remove and list by name reads through it, so a
backend that already holds duplicates (the expenses lab's) heals on its next call by name.

Graded: `p127-duplicate-role.test.ts` 4/4 on a real service with enforcement on. Before the fix: the in-run arm made
two rows a millisecond apart (the lab's shape) and removal answered `wasnt`. Mutants: `ensure` unqueued reds the
two-stores arm; `find` without the merge reds the healing arm (bob still reads the group's row). The 65 backend specs
that touch roles, ACLs or the role nodes: 59 passed, 6 skipped (Postgres- and ontology-gated), 981 tests, 0 failed.
