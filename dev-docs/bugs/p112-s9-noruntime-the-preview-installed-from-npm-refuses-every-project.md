---
id: P112-S9-NORUNTIME
title: "`noodl-preview` installed from npm refuses every project: the viewer runtime it renders with is not in the package"
status: fixed
severity: blocker
area: preview / packaging (`packages/noodl-preview/src/loader.ts` `DEPLOY_DIR`, `src/deploy.ts` `EXTERNAL_DIR`; `package.json` `files`)
kit: preview
found: P112 OWN-011 s9, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §7
regression: packages/noodl-preview/tests/own011-installed-runtime.test.ts
commit: efcb43788
---

Installed from its packed tarball in an empty folder and pointed at a project `create_project` had just made:

```
noodl-preview: The deployed viewer runtime is missing from .../node_modules/@noodl/noodl-editor/src/external/deploy
(index.html, noodl.deploy.js, react.production.min.js, ...). It is a build artifact, not committed.
Build it with:  npm run build:editor:_viewer
```

Both the preview and `nodegx-deploy` find the runtime at `../../noodl-editor/src/external` from their bundle, a path
that exists only in a checkout. `deploy.ts` already said so ("a published package resolves it to somewhere that does
not exist ... the refusal is the shipped behaviour"); nothing shipped the runtime. The sentence it prints tells a person
with no checkout to run a script they do not have.

Copying the checkout's runtime would not do either: on any checkout where `npm run dev` has run, the file is the
development build, 17 MB, two-thirds of it a source map of the whole viewer source (EXP-017).

**Fixed:** `npm pack` runs `build.mjs` and `scripts/pack-runtime.mjs`, which builds a PRODUCTION viewer runtime with the webpack config's `OUT_PATH` straight into `dist/external/deploy` (1.66 MB, 17 s, the checkout's own runtime untouched), refuses it unless EXP-017's classifier reads `production`, and `postpack` deletes it, so no second copy lives in a checkout. `loader.ts` `EXTERNAL_DIR` (the one rule for the preview and the deploy) takes the checkout's folder first and `dist/external` second. The installed preview then renders a fresh project in headless Chrome. The test runs the engine from an installed layout with and without `dist/external`; a mutant that ignores it fails the positive arm.
