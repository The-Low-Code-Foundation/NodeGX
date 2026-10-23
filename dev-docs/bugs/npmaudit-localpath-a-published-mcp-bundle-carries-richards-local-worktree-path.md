---
id: NPMAUDIT-LOCALPATH
title: A published mcp bundle carries richards local worktree path
status: open
severity: high
area: mcp / packaging
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`@nodegx/mcp@0.2.5` `dist/kit-extract.cjs` contains the absolute path `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/own020-pack024/packages/noodl-viewer-react/src/types.ts`, and `dist/kit-extract.inputs.json` lists `../../../../OpenNoodl/node_modules/...` build paths. A machine path and username ship to everyone who installs. Fix: strip absolute paths at bundle time (esbuild `sourceRoot`/relative inputs) and add a pack check that greps the tarball for `/Users/`.
