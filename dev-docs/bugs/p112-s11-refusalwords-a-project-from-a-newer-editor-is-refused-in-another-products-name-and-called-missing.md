---
id: P112-S11-REFUSALWORDS
title: "A project from a newer NodeGX is refused in another product's name, with a link to noodl.net, while a toast beside it says its project.json is missing"
status: fixed
severity: medium
area: editor / opening a project (`packages/noodl-editor/src/editor/src/models/projectmodel.editor.ts` :87-97; `packages/noodl-editor/src/editor/src/pages/ProjectsPage/ProjectsPage.tsx` `showLoadFailureToast` :265-285, called at :1334 and :1407)
found: P112 OWN-011 s11, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §9
regression: packages/noodl-editor/tests-unit/p112-s11-refusalwords.test.ts "a newer format: the modal names NodeGX, both formats and the download page; the refusal is explained"
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

**s12 (2026-10-11), a second path to the same toast.** R17's copy (`8f9137d8e`) refuses to open a 0.3.0 project when
the `.before-0.4` copy can't be made, with its own message. Like every failed open, ProjectsPage then adds *Its
project.json is missing or unreadable*. Fixing this bug should cover that path as well.

**Fixed (the Beta sweep s9, 2026-10-25), as sketched.** The modal (`describeNewerFormat` in
`ProjectPatches/formatCopy.ts`) is titled *"This project needs a newer NodeGX"*, gives the project's format and the
highest this editor opens, says the project was neither opened nor changed, and links `https://nodegx.io/download`
(the site forwards it to the download block a release keeps current). `projectFromDirectory` hands
`{ explained: true }` back beside the empty result on every refusal it explained: the newer format, the copy it could
not make (s12's path), the v2 kill switch, the person's own Cancel on the upgrade prompt. `LocalProjectsModel`
`loadProject` / `openProjectFromFolder` take `onRefused`, and the launcher's four open paths (open folder, launch, read
only, a lesson) show their own message only when nobody explained. The generic toast no longer names `project.json`:
*"NodeGX couldn't read this project's files."*

Graded: `tests-unit/p112-s11-refusalwords.test.ts` on the real loader with its collaborators mocked, red 3 of 4 on
HEAD's `projectmodel.editor.ts` (the control, an unreadable file carrying no refusal, green both ways) → 4/4;
own-013 formatCopy + openWrites green; editor tsc clean. DEF-007's seam scan is red at HEAD before and after
(P112-OWN008-TESTMAINRED). **Not driven** in the Electron launcher: the `onRefused` wiring in `ProjectsPage` is graded
by tsc only.
