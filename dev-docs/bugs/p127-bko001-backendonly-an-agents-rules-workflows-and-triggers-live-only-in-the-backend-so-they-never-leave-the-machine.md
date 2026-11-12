---
id: P127-BKO001-BACKENDONLY
title: An agent's access rules, backend workflows and triggers are written to the running backend only, never to the project, so they are not in git, cannot be drawn from the project, and a VM ship goes without them
status: fixed
commit: 0275990c3 6d64e5426 78b8a528e 8494038c5
severity: high
area: noodl-mcp (`src/tools/backendTools.ts` set_collection_permissions, create_/update_/delete_backend_workflow, create_/update_/delete_backend_trigger, set_backend_trigger_enabled); noodl-preview (`src/fullStack.ts` finishFullStack); nodegx-backend (`deploy/folder/start.js`)
found: P127 s1, 2026-10-26, scoping the backend in the open (Richard: "I want people to be able to play with it to make whatever they want")
evidence: rules MEASURED in P112 OWN-026 test 2 (P112-OWN026-RULESFROMBACKEND, t2-nodegx-c11…c15: no project rules file, the rules only in `~/.noodl/backends/*/security.json`). Workflows and triggers READ, not driven: the tools write `/admin/workflow-defs` and `/admin/triggers` only; finishFullStack ships `nodegx.security.json` and the cloud-function bundle and nothing else, so start.js has no rules to install (`none`) and no automations at all
regression: packages/noodl-mcp/tests/p127ProjectFiles.test.ts
owner: P127 BKO-001
---

What a person sees: the agent builds a full-stack app with its own rules and a daily reminder; it works on their machine.
A teammate who clones it gets an app with no rules and no reminder. Studio cannot draw the reminder, because Studio reads
the project. The app shipped to a VM runs the backend's default rules and no reminder, and nothing says so.

Why: SB-015 gave rules a project file (`nodegx.security.json`), seeded into a backend on its first start and shipped by
the deploy. But only templates write that file. The agent's tool writes the backend. Workflows and triggers never had a
project file at all.

Fix (BKO-001, ruling R1, "the files are the truth"): every agent write of a rule, a workflow or a trigger goes to the
backend first (it validates) and then into the project's file. That is `nodegx.security.json` for rules, and the new
`nodegx.automations.json` for workflows and triggers, which holds no secrets and no run state. A first start seeds
from both files, the deploy ships both, and a difference between a file and its backend is reported, not hidden.

Fixed in code, P127 s1 (commits above). Not yet driven on the throwaway VM (BKO-001 AC5), and not live in Claude
Desktop until the noodl-mcp dist and the backend bundle are rebuilt or released.

Also graded by `packages/nodegx-backend/tests/p127-project-automations.test.ts`, `packages/nodegx-backend/tests/dep-002-full-stack-folder.test.ts` "P127 BKO-001" and `packages/noodl-preview/tests/dep-002-full-stack-deploy.test.ts` "P127 BKO-001" (the ledger takes one `regression:` path).
