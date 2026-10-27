---
id: P128-S3-NOSTUDIOFORTHEEDITOR
title: "The editor's Connect Claude Code registers a server that cannot find Studio: `findStudio` looks only at `$NODEGX_STUDIO` and `~/vscode_projects/nodegx-studio`, and the registration sets neither, so `open_studio` says \"NodeGX Studio is not installed\" to everyone who does not have our checkout"
status: open
severity: medium
area: "`packages/noodl-mcp/src/studio/studioProcess.ts` `findStudio` (the two candidates); the editor's registration (`packages/noodl-editor/src/editor/src/pages/ProjectsPage/useConnectAgent.ts` → `connectBootstrapServer`) sets no `NODEGX_STUDIO`"
found: P128 S3 (CPY-003), 2026-10-27, checking the claim in the editor's new welcome line before keeping it
evidence: "MEASURED by reading: `findStudio` candidates are `[process.env.NODEGX_STUDIO, path.join(os.homedir(), 'vscode_projects', 'nodegx-studio')]` (studioProcess.ts:35-37); `grep -rln NODEGX_STUDIO packages` outside tests finds only studioProcess.ts and openStudio.ts, and in nodegx-studio only `app/main.cjs`, `app/check.mjs`, `scripts/mcpb.mjs` and `import/app-to-nodegx.mjs`. Nothing the editor registers sets it. Not driven: no stranger machine was used."
launch: beta
owner: none
task: CPY-003
---

The canon's "Which AI coder" says *"Claude Code and Cline open Studio in a browser window beside the chat."* The
`.mcpb` makes that true in Claude Desktop (it bundles Studio and sets `NODEGX_STUDIO`); Studio's own desktop app sets
it for the server it starts. The NodeGX editor's **Connect Claude Code** registers its bundled server with no Studio
behind it, so for a person who downloaded the editor, Claude Code's `open_studio` answers "not installed (set
NODEGX_STUDIO to its folder)", a sentence they cannot act on. Only a machine with the checkout at
`~/vscode_projects/nodegx-studio` (ours) gets Studio.

S3 put the line "Connect Claude Code and it opens Studio in a browser window beside the chat" on the editor's
launcher card (canon phrases, held by `scripts/canon-check.mjs`). It is the canon's claim and it is what the card should
say, so it stays; this row is what makes it true for a stranger before the editor is cut as Beta.

**Proposed.** `findStudio` adds the installed Studio desktop app (the companion's `findStudioApp` already finds it;
the app carries `editor/serve.mjs` in its resources) and, once `@nodegx/studio` is on npm (audit §8 B13), the
package resolved from the server's own `node_modules` or the npm cache; the not-installed sentence names
nodegx.io/start instead of an environment variable. The audit's "Waits on" names the download page; this row is the
server half of it.
