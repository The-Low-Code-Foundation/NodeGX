---
id: NPMAUDIT-LICENCE
title: No package says what licence a deployed apps runtime is under
status: open
severity: medium
area: packaging / licences
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
launch: beta
---

Tools are GPL-3.0-only, node-spec/canvas-look/core MIT, nodegx.io says 'GPL-3.0'. A static export (`nodegx-deploy`) ships `noodl.deploy.js` out of the GPL `@nodegx/preview` with only a third-party LICENSE.txt beside it; the backend is called MIT in the repo README but ships only inside GPL `@nodegx/mcp`; `@nodegx/export`'s generated app has no stated licence while its README says 'It is yours now'. A commercial user cannot tell whether their app is GPL. Ruling: the runtime's licence, stated in the shipped app.

**Ruled by Richard, 2026-10-23 (asked by opennoodl-d7):** state the existing split everywhere it ships, in this
release. The tools are GPL-3.0; everything a finished app runs on (the runtime, the viewer, the backend) is MIT; the
app's own files and exported source belong to whoever built it. No licence changes, which is what the repo README
already says (its "Licenses" section, from the original project).

**Built 2026-10-23 (opennoodl-d7), for the release:**
- Every deployed folder (the editor's Deploy, `nodegx-deploy`, Studio's Publish, a full-stack folder's `app/`, so
  `deploy_to_vm` too) gets `NODEGX-LICENSE.txt` from `deployToFolder`: the app's own files are its builder's, the
  runtime files it actually wrote are named and are MIT (the runtime's text verbatim, asserted equal to
  `noodl-runtime`, `noodl-viewer-react` and `noodl-viewer-cloud`'s `LICENSE`), React keeps its own licence, and the
  tools are GPL-3.0. Found on the way: `noodl.deploy.js.LICENSE.txt` (the third-party notices inside the bundle,
  which MIT asks to travel with it) was never copied, because the runtime manifest does not list it. Now every
  `<file>.LICENSE.txt` beside a runtime file ships with it.
- The backend: `packages/nodegx-backend/LICENSE` (MIT; it had none), copied into `dist/backend/` by
  `build-backend-copy.mjs` (so into `@nodegx/mcp` and `@nodegx/preview`), and into every full-stack folder's
  `backend/`. `nodegx-backend-contract` and `nodegx-node-spec` get their MIT `LICENSE` too.
- The READMEs of `@nodegx/mcp`, `@nodegx/preview` and `create-nodegx` say the apps they make aren't under the GPL.

🔴 The three new `LICENSE` files say "Copyright (c) The NodeGX contributors": the original packages say "Future
Platforms AB", which did not write these. The holder's exact name is Richard's to confirm.

Measured: `tests-unit/p123/deploy-licence-notice.test.ts` 3/3 and `deploy-guide.test.ts` 19/19; a real
`nodegx-deploy` of the todo-list template (engine built in a worktree) wrote both files;
`dep-002-full-stack-deploy.test.ts` 8/8 with the engine rebuilt, 7/8 with HEAD's `fullStack.ts` (control: ENOENT
`backend/LICENSE`).

**Still open:** nodegx.io's "GPL-3.0" tag (`nodegx-web` `site/_page.html`; another session has that repo's working
tree open, and a push there deploys), and `@nodegx/export`'s generated source (lane 4, paused).
