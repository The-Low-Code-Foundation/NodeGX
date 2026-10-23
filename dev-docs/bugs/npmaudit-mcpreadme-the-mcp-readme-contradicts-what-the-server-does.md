---
id: NPMAUDIT-MCPREADME
title: The mcp readme contradicts what the server does
status: open
severity: medium
area: mcp / README
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

The npm README of `@nodegx/mcp@0.2.5` is the repo root README (desktop install, a cline-dev CI badge, Linux FUSE notes, `node /Applications/NodeGX.app/.../noodl-mcp.cjs`, a contributors section). It says bootstrap mode advertises four tools (measured: 7); that creating a project 'does not repoint this server … BST-002 is the task that makes the live server bind itself' (measured: it binds and sends `tools/list_changed`); that `create-nodegx` 'writes one file' (it writes six); and 'no project-level settings/styles/routes writes' (`set_project_settings`, `set_project_tokens`, `set_element_style` exist). `create_project`'s own description ('Point a new server at the created directory') and its result `note` contradict its `bound: true`. `--help` says '60 of the 89 tools are backend admin' (115 tools, 65 backend). Fix: a package README for npm users, generated counts.
