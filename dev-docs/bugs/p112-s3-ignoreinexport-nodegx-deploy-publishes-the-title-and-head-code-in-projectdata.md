---
id: P112-S3-IGNOREINEXPORT
title: "`nodegx deploy` and the CLI preview publish the project's Title and Head code in `window.projectData.settings`; the editor's deploy leaves them out"
status: fixed
severity: low
area: preview / headless node library (nodegx deploy, noodl-preview CLI)
kit: preview
found: P112 OWN-004 s3, 2026-10-10
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-004-THE-REAL-APP-BESIDE-IT.md §6.1
regression: packages/noodl-preview/scripts/in-page-check.mjs
commit: 0aa8954f1
---

A deployed app made with `nodegx deploy` (or shown by `noodl-preview`) carried two settings in its `window.projectData`
that a deploy from the editor does not: `htmlTitle` and `headCode`. Both are marked `ignoreInExport` in the viewer's
project-settings ports (`noodl-viewer-react/src/project-settings.ts`), because the page's `<title>` and `<head>` already
carry them (the deploy's `HtmlProcessor` writes them there). Harmless for the title; the head code is whatever a person
pasted (an analytics snippet, a font link), now also in the app's data where any script can read it.

**Where:** `packages/noodl-preview/src/headless.ts`. It builds the node library the way the editor gets it, from a
runtime with the viewer's nodes registered, but never called `runtime.setProjectSettings(...)`, which the viewer's
constructor and `ssrSetupRuntime` both do. So the library's `projectsettings` had no ports, and `exportSettings`
(`utils/exporter/util.ts`) had no `ignoreInExport` flag to honour. Measured: the headless library's
`projectsettings.ports` was `[]`.

**How it was found:** OWN-004's in-page check compares the export a page makes from in-memory files (reading the
node library from the runtime it renders with) against `nodegx deploy`'s, on all 13 templates. Every component
matched on every template (747 of 747); `settings` differed on all 13, by `htmlTitle` alone (no template has head
code).

**Fixed:** `headless.ts` hands the runtime the viewer's project settings, as the viewer does. The check then reads
13 of 13 templates with `settings` identical.
