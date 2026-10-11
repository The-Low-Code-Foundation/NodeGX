---
id: P112-S9-NORUNTIME
title: "`noodl-preview` installed from npm refuses every project: the viewer runtime it renders with is not in the package"
status: open
severity: blocker
area: preview / packaging (`packages/noodl-preview/src/loader.ts` `DEPLOY_DIR`, `src/deploy.ts` `EXTERNAL_DIR`; `package.json` `files`)
kit: preview
found: P112 OWN-011 s9, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §7
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
