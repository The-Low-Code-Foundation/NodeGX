---
id: P112-S11-REFUSALWORDS
title: "A project from a newer NodeGX is refused in another product's name, with a link to noodl.net, while a toast beside it says its project.json is missing"
status: open
severity: medium
area: editor / opening a project (`packages/noodl-editor/src/editor/src/models/projectmodel.editor.ts` :87-97; `packages/noodl-editor/src/editor/src/pages/ProjectsPage/ProjectsPage.tsx` `showLoadFailureToast` :265-285, called at :1334 and :1407)
found: P112 OWN-011 s11, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §9
---

Measured in the installed NodeGX 0.3.0 on a project made by `@nodegx/mcp@0.1.0` (P112-S11-FORMATSKEW); both messages are
unchanged in source at HEAD, so the next format bump shows them again.

Opening a project whose format is newer than the editor's shows two messages at once, and neither helps:

1. **The modal** says *"This project was saved with a newer version of Noodl"* and links **https://noodl.net** — the
   original Noodl product, not NodeGX. It does not say which version the project needs, or where NodeGX releases are.
2. **The toast** says *"Its project.json is missing or unreadable. The project stays in your list — fix the file and try
   again."* Both halves are wrong for this case: a v2 project has no `project.json`, the file it has is fine, and there
   is nothing to fix in it. `showLoadFailureToast` is the launcher's answer to *any* `loadProject` that resolves empty;
   `projectFromDirectory` refuses by calling `callback()` with nothing, so the launcher cannot tell a refusal it already
   explained from a file it could not read.

**Fix sketch:** the refusal names NodeGX, the project's format and the editor's, and links the NodeGX releases page;
`projectFromDirectory` passes the refusal back with the empty result, and the launcher shows its toast only for a load
nobody explained.
