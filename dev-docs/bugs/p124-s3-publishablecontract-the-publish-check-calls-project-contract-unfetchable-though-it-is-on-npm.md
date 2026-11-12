---
id: P124-S3-PUBLISHABLECONTRACT
title: "`scripts/own/publishable.js` refuses any package that depends on `@nodegx/project-contract`, calling it a private workspace package npm cannot fetch, though 0.2.1 is on npm (published from `dist/publish`)"
status: open
severity: low
area: scripts/own/publishable.js (the first-publish check)
found: P124 s3, 2026-10-21, packing @nodegx/backend-map
evidence: `node scripts/own/publishable.js dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor` → "depends on @nodegx/project-contract (packages/nodegx-project-contract), a private workspace package npm cannot fetch"; `npm view @nodegx/project-contract version` → 0.2.1; the packed tarball installed outside the checkout and ran
---

The check reads each workspace folder's own `package.json`; `packages/nodegx-project-contract/package.json` is
`private: true` because the package is published from the folder its `build:publish` writes. The script's own KIT
list already knows that (`packages/nodegx-project-contract/dist/publish`), but the dependency check does not.

**Fix shape:** treat a workspace package whose KIT entry is a `dist/publish` folder as published (read that
folder's manifest), or ask the registry for a dependency marked private before refusing.
