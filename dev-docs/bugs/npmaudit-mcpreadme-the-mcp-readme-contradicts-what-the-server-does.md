---
id: NPMAUDIT-MCPREADME
title: The mcp readme contradicts what the server does
status: fixed
commit: 27557936d
severity: medium
area: mcp / README
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: mcp
regression: packages/noodl-mcp/tests/npmauditMcpReadme.test.ts "a create that bound this server says to build here; its note no longer sends the agent to start one"
---

The npm README of `@nodegx/mcp@0.2.5` is the repo root README (desktop install, a cline-dev CI badge, Linux FUSE notes, `node /Applications/NodeGX.app/.../noodl-mcp.cjs`, a contributors section). It says bootstrap mode advertises four tools (measured: 7); that creating a project 'does not repoint this server … BST-002 is the task that makes the live server bind itself' (measured: it binds and sends `tools/list_changed`); that `create-nodegx` 'writes one file' (it writes six); and 'no project-level settings/styles/routes writes' (`set_project_settings`, `set_project_tokens`, `set_element_style` exist). `create_project`'s own description ('Point a new server at the created directory') and its result `note` contradict its `bound: true`. `--help` says '60 of the 89 tools are backend admin' (115 tools, 65 backend). Fix: a package README for npm users, generated counts.

**Fixed (the Beta sweep s8, 2026-10-25).** The package has had its own README since a4ac921d5 (the 0.2.5 tarball the
audit read predates it), but it repeated the claims. Now: `create_project`'s description says a server with no project
binds to the new one and its tools arrive in the same conversation; its result `note` says "from this conversation"
when this server bound (and keeps "start a server" only when it did not); `--help` is `src/usage.ts`, its bootstrap list
and its "N of the M tools are backend admin" counted from `TOOL_GROUPS`; the README says `npm create nodegx` writes
`.mcp.json` beside `CLAUDE.md` / `AGENTS.md` and the skills, lists the seven bootstrap tools, says creating or opening
binds the server, and names the project-level write tools. Graded: `tests/npmauditMcpReadme.test.ts` 3/3 (the two text
cases red on HEAD's strings), bind/create/bootstrap neighbours 37/37, the resident surface unchanged (8,277 of 8,280:
`create_project` is not on it), mcp tsc clean. Not done: generated counts inside the README itself.
