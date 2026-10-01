---
id: P78-D84
title: The headless cloud-function bundler fails when loading the project logs a line (the fix is uncommitted)
status: open
severity: high
area: mcp / cloud function bundler (deploy_cloud_functions)
found: P78 TPL-011 s3, 2026-09-26
evidence: dev-docs/tasks/phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md §D84 (uncommitted on cline-dev); TPL-011-THE-EVENING-JOURNAL.md §3c V1-0
---

Deploying cloud functions headlessly (`deploy_cloud_functions`, or any script using the same child) fails with
*"The cloud-function bundler produced output that was not JSON"* for any project whose load logs something. Loading
runs `applyPatches`, and its NDA-017 migration prints `[NDA-017] migrated …` with `console.log` to the same stdout
that carries the child's one JSON answer.

**Where:** `packages/noodl-mcp/src/cloud/bundleEntry.js`. At HEAD (`git show HEAD:…`) it has no stdout guard. The
fix (lines 42-46: `console.log` / `info` / `debug` sent to stderr) has been **in the working tree, uncommitted, since
2026-09-26**. The register marks D84 "fixed", but nothing has shipped it. `packages/noodl-mcp/src/kitExtract/entry.js`
has the same shape (one JSON answer on stdout, `:170`, while a kit's own code runs). That was read and not measured.

**Reproduce:** deploy the cloud functions of a project whose `nodes.json` the NDA-017 migration touches. TPL-011's
generator fails loudly if this regresses. No spec of its own.

**Proposed:** commit the `bundleEntry.js` change with a spec (a project that logs on load still bundles), and give
`kitExtract/entry.js` the same three lines. Small.
