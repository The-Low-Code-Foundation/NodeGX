---
id: P78-DBT-UNRULED
title: A function deployed to a running backend with no rule runs for any signed-in caller, and nothing says so
status: fixed
commit: 89b9fd339
phase: P109
task: ISL-040
severity: high
area: backend / function permissions (hot deploy)
found: P78 Digital Bricks Training template, TASK-L190, 2026-10-01
evidence: templates/digital-bricks-training/docs/decisions/009-the-trainers-claude.md ("A backend keeps the policy it started with"); templates/digital-bricks-training/tools/deploy-functions.mjs :205-222
regression: packages/nodegx-backend/tests/isl040-unruled-deploy.test.ts
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

**Fixed (P109 s41, 2026-10-11, ISL-040).** Re-measured at HEAD by driving it:
- The Site Builder's cloud half (SB-016's own bundle, authored through the MCP door) was deployed with
  `PUT /admin/workflows/site` to a backend on `0.0.0.0` whose policy predates it. The deploy answered 200.
- A newly signed-up account with no role then got past the function gate on `publishPage`, which the template means
  for admins. It answered 400 from the graph's own input check, past the gate. An anonymous caller got 403.
- `POST /admin/workflows/reload` loaded the same folder with no check.

The fix:
- `SecurityState.undeclaredOnDeploy` asks SB-016's `unresolvedFunctionRules` about the functions arriving, read with
  `declaredFunctionsIn` from the bundle or `scanDeployedFunctions` from the folder on a reload.
- On a public bind it refuses before anything loads: 409, naming each function and what it would run for. The
  sentence says to declare the rule on the Permissions page (`PUT /admin/permissions/functions/<name>`), and gives the
  `functions` block to paste.
- On loopback it loads and answers with a `warning`, as the start-up interlock does.
- The 409 body also says `success: false`. The editor's and the MCP door's deploy clients read that field, not the
  status, so without it an agent would have been told the refused deploy worked.
- Graded: the spec was red on the old code (3 of 4). Once the functions are declared `role:admin`, the same deploy
  goes through and the learner gets 403. The backend specs that deploy or reload are 92 / 92. `noodl-mcp`
  `hls013-deploy-cloud-functions` is 4 / 4.
