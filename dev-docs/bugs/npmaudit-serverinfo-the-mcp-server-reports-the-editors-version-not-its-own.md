---
id: NPMAUDIT-SERVERINFO
title: The mcp server reports the editors version not its own
status: fixed
commit: (this session, the Beta sweep s4)
severity: low
area: mcp / initialize
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
regression: packages/noodl-mcp/tests/npmauditServerInfo.test.ts
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`@nodegx/mcp@0.2.5` answers `initialize` with `serverInfo: {name: "noodl-mcp", version: "0.4.3"}` (the desktop editor's version) while `--version` prints 0.2.5. Fix: stamp the package version.

**Fixed (2026-10-25, the Beta sweep s4), reaches npm with the next cut.** The editor's version in the handshake is on
purpose for the bundle inside the editor (`server.ts` PKG_VERSION: it is the number a person quotes). So only the npm
build changes: `build-common.mjs` `reportedVersion()` stamps `@nodegx/mcp`'s own `package.json` version when npm runs
the build for `npm pack` (`npm_lifecycle_event=prepack`, the way `publish-npm.sh`'s tarballs are made), and the
editor's otherwise. No script change, nothing per platform. Measured: the server bundle built from it into a scratch
folder answers `initialize` with `{"name":"noodl-mcp","version":"0.2.6"}` under prepack and `"0.4.3"` without.
`tests/npmauditServerInfo.test.ts` 4/4 (red at HEAD: no `reportedVersion`).

