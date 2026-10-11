---
id: P112-S9-NPXREG
title: "A project the MCP server creates while running under `npx` points its agent at npm's cache folder, which npm may empty at any time"
status: open
severity: high
area: mcp / create_project's agent config (`packages/noodl-mcp/src/project/agentConfig.ts` `selfRegistration`)
kit: mcp
found: P112 OWN-011 s9, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §7
---

`create_project` writes the new project's `.mcp.json` by reproducing how the running server was launched
(`process.execPath` and `process.argv[1]`, BST-005). Launched as `npx --package=<tarball> noodl-mcp --allow-writes` in a
clean folder, the project it made said:

```
"command": "/Users/richardosborne/.nvm/versions/node/v22.22.0/bin/node",
"args": [".../.npm/_npx/aabc33aa1e2306c2/node_modules/.bin/noodl-mcp", "<project>", "--allow-writes"]
```

That folder is npx's cache. npm clears it whenever it likes (`npm cache clean`, a new version of the package, a
different machine), and the project's agent then starts with no NodeGX server and no message saying why. The person
OWN-011 is written for runs exactly this launch (an `npx` command), so every project they make would carry it.

Under `npx` the launch that works IS the npx command; the fix registers that, pinned to the server's version:
`npx -y @noodl/mcp@<version> <project> --allow-writes`. A server started from a project's own install, or by the
editor, still reproduces its own launch.
