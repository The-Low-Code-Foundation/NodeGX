---
id: P112-S10-UNLICENSED
title: "The first publish of `@nodegx/mcp` and `@nodegx/preview` would have gone out restricted, with no licence, and the MCP tarball carrying a 767 KB server from August"
status: fixed
severity: blocker
area: mcp + preview / package manifests (`packages/noodl-mcp/package.json`, `packages/noodl-preview/package.json`)
kit: mcp
found: P112 OWN-011 s10, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §8
regression: scripts/own/publishable.js
commit: a4ac921d5
---

s9's gates all passed (`publishable.js` 3 packages, 0 problems), yet the two scoped packages were not publishable as
intended:

- **Restricted.** Neither had `publishConfig.access: "public"`. npm publishes a scoped name as restricted unless told
  otherwise, so the first `npm publish` would have failed or produced a private package nobody can install.
- **No licence.** Neither had a `license` field or a LICENSE file. Both bundles inline the editor's GPL-3.0-only code,
  so the licence text has to travel with them (GPL-3.0 §4).
- **A stale server in the tarball.** `files: ["dist"]` packed everything in `packages/noodl-mcp/dist`, including a
  gitignored `nodegx-observe.cjs` from 2026-08-02. That server moved to `packages/nodegx-observe` that day and nothing
  reads this copy. It added 767 KB to every install.

**Fixed:** both manifests carry `license: "GPL-3.0-only"`, `repository`, `homepage` and `publishConfig.access: "public"`;
each folder holds the repository's LICENSE and lists it in `files`. The MCP's `files` names the five build outputs one by
one, so a leftover in `dist/` can no longer ship. `scripts/own/publishable.js` now fails a scoped package without public
access, any package without a `license`, and a GPL package without a LICENSE file. Run on the s9 manifests it names four
problems and exits 1; on the fixed ones, 0. The leftover-file half has no gate: the MCP's `files` list is the guard, and
a new build output has to be added to it by hand (the stranger chain would fail without it).
