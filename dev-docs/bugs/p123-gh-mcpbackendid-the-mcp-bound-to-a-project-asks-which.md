---
id: P123-GH-MCPBACKENDID
title: The MCP bound to a project asks which backend when the project already names its own
status: open
severity: low
kit: mcp
area: noodl-mcp / backend tools backend resolution
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

With two backends running, `list_backend_step_kinds` on the server bound to Greenhouse answered "Multiple backends
are running (…); pass backendId to choose one", although nodegx.project.json `metadata.cloudservices.instanceId`
names backend_mvv1hrdnfftkg. Fix: default to the bound project's backend.
