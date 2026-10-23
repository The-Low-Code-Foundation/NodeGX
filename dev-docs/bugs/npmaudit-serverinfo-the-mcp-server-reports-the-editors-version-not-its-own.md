---
id: NPMAUDIT-SERVERINFO
title: The mcp server reports the editors version not its own
status: open
severity: low
area: mcp / initialize
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`@nodegx/mcp@0.2.5` answers `initialize` with `serverInfo: {name: "noodl-mcp", version: "0.4.3"}` (the desktop editor's version) while `--version` prints 0.2.5. Fix: stamp the package version.
