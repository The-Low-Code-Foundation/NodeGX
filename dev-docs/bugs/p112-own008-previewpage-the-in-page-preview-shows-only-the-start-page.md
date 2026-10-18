---
id: P112-OWN008-PREVIEWPAGE
title: "The in-page preview can show an app only from its start page, so an editor can't show the page or component being edited, and on an app with sign-in it shows the sign-in page"
status: open
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/preview` `src/inPage/index.ts` (`update` renders the project from its router's start)"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/blocks/REPORT.md (question 10)
kit: preview
---

The blocks stranger's children edit `Todo/Header`, but the app beside the blocks shows the todo template's start page,
which redirects to Sign in when there's no backend. All three OWN-008 screenshots show the sign-in card. The
`nodegx` server's `render_report` and `drive_page` take a page, but the in-page preview doesn't.

**Fix shape:** `update(files, { page })` to start at a page, or `mountComponent(name)` to render one component on its
own, as the visual editor's preview does.
