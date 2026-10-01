---
id: P78-DBT-UNRULED
title: A function deployed to a running backend with no rule runs for any signed-in caller, and nothing says so
status: open
severity: high
area: backend / function permissions (hot deploy)
found: P78 Digital Bricks Training template, TASK-L190, 2026-10-01
evidence: templates/digital-bricks-training/docs/decisions/009-the-trainers-claude.md ("A backend keeps the policy it started with"); templates/digital-bricks-training/tools/deploy-functions.mjs :205-222
---

A backend takes `nodegx.security.json` once, into a data folder that has no policy yet. A cloud function deployed
afterwards with no `functions` entry gets its rule from the graph's own *Allow Unauthenticated* port. For a function
without that port, the rule is: any signed-in caller. This was measured, not argued: DBT's staff-only `previewLesson`,
deployed to a backend started before its rule was written, ran for a learner-bound key.

**Where:** SB-016's interlock (`packages/nodegx-backend/src/security/state.ts:327-341`,
`UNDECLARED_FUNCTION_ON_PUBLIC_BIND`) runs only at startup and only on a non-loopback bind. The hot-deploy route
`PUT /admin/workflows/:name` (`packages/nodegx-backend/src/server/byob-admin.ts:846-851`, then
`WorkflowRunner.loadWorkflow`) checks no rule at all, so a public backend serves an unruled endpoint the moment it
is deployed. Related: TPL-011 met the "policy only on first start" half on 2026-09-26 (an upgrade's new collection
was `nobody`). That half is P91 proposal P11, not a bug.

**Reproduce:** start a backend whose policy lacks function `f`, deploy a bundle containing `f` with no *Allow
Unauthenticated*, then call `f` with a session for an account with no role. It answers. The template now refuses
this in its own `deploy-functions.mjs`.

**Proposed:** the deploy route applies SB-016's check to the incoming bundle and refuses an unruled endpoint by name
on a public bind (warns on loopback), with the same `functions` block to paste. Medium.
