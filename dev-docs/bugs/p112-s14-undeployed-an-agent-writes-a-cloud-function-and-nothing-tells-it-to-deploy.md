---
id: P112-S14-UNDEPLOYED
title: "An agent writes a cloud function, the backend never gets it, and nothing tells the agent: the app's button calls a function the backend doesn't have"
status: fixed
severity: high
area: mcp / writing a `#__cloud__/` component (`apply_plan`, `create_component`, `update_component` results; `validate_project`); `deploy_cloud_functions` (`packages/noodl-mcp/src/tools/provisionTools.ts`) is only in the deferred backend group
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
regression: packages/noodl-mcp/tests/own015DeployNote.test.ts (the three write doors, each beside a plain write that carries no note; no backend and bound; a no-op update)
---

OWN-015's second stranger round (Sonnet, 0.2.0 tarballs, 89 turns) provisioned a backend, wrote
`#__cloud__/Functions/Speak` through `create_plan` → `stage_plan_operation` → `apply_plan`, wired a `CloudFunction2`
to it from `PhraseRow`, ran `validate_project` (0 errors) and reported the app built. It never called
`deploy_cloud_functions`, and the backend's `workflows/` folder is empty. In the app, every tap on a phrase calls a
function the backend doesn't serve.

**Why the agent didn't:** none of its 3 `apply_plan` results (341, 2,708 and 7,510 characters) or its
`validate_project` result mentions deploying (0 matches for "deploy"). The tool is listed once, in `find_tools`'
reveal of the backend group, among 19 others. The editor deploys from a Deploy button a person sees; the agent's
path has no equivalent step and no reminder.

**Proposed fix (small):** when a write touches a `#__cloud__/` component and a backend is bound, the write's result
carries `next: "deploy_cloud_functions — the backend still serves the previous version of <name> (or none)"`, in the
same shape as `deploy_cloud_functions`' own `next`. Larger alternative: deploy automatically after a cloud write when
exactly one local backend is running, and report the outcome in the write's result. Either way `render_report`
can't catch it: the render never presses the button.

**Fixed (s15, 2026-10-12): the small fix.** `create_component`, `update_component` and `apply_plan` add
`cloudFunctionsNotDeployed` to their result when they wrote a `/#__cloud__/` component: the functions written, and
`next`. With a bound backend it says *"Call deploy_cloud_functions now. This write changed "Functions/Speak" in the
project files only: the backend still runs the version it had before (or none)…"*. Without one it says to call
`provision_backend`, then `deploy_cloud_functions`. It also reveals those tools when the backend group is still
deferred (measured: both revealed in a default session). An update that changed nothing carries no note
(`tools/cloudDeployNote.ts`).

Not done, the larger alternative: deploying on its own after a cloud write. The next stranger round (OWN-015 AC1)
measures whether one sentence in the write result is enough.
