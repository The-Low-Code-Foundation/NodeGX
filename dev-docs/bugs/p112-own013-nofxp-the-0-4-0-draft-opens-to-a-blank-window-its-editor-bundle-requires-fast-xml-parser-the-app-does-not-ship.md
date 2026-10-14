---
id: P112-OWN013-NOFXP
title: "The 0.4.0 draft opens to a blank window — its editor bundle requires fast-xml-parser, which the packaged app does not contain"
status: fixed
phase: P112
task: OWN-013
severity: high
area: release / packaging (`packages/noodl-editor/package.json` dependencies × `webpackconfigs/helpers/get-externals-modules.js`)
found: P112 OWN-013 s13, 2026-10-14 (Richard installed the draft's Apple Silicon DMG)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-013-THE-0.4.0-CUT.md §11
fixed: 0728e42f4
regression: packages/noodl-editor/build/check-packaged-modules.js (electron-builder afterPack)
---

The launcher was blank; devtools: `Uncaught Error: Cannot find module 'fast-xml-parser'`, require stack
`app.asar/src/editor/index.html`.

The production webpack treats every package in the root `node_modules` as external, so the bundle keeps
`require("fast-xml-parser")` and resolves it from the asar at runtime. electron-builder packs only what
`noodl-editor` declares (and their dependencies). Parse XML and Parse Feed (`75fd8ef10`, `fcf68a1c7`) brought
`fast-xml-parser` in through `noodl-runtime` and `nodegx-node-spec`, never the editor. Every gate before the
Release run was green: CI builds the bundles but never packs or starts the app.

Measured on the draft's own `app.asar`: of every bare `require` in the editor, viewer-frame and main bundles,
`fast-xml-parser` is the only package missing.

**Fix:** declared by `noodl-editor` (`^4.5.7`). `build/check-packaged-modules.js` runs as electron-builder's
`afterPack` hook. It reads the packed asar and fails the build before signing if any bundle requires a package
the asar lacks. Control pair on the real artefacts: the 0.4.0 draft's asar exits 1 naming `fast-xml-parser`
only; 0.3.0's exits 0. A dependency walk is not a substitute: it reported `deprecation` missing, which the asar
holds (the editor's nested `@octokit/request-error`).
