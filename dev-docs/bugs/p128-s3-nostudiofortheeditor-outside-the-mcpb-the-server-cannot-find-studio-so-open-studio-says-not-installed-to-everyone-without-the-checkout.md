---
id: P128-S3-NOSTUDIOFORTHEEDITOR
title: "Outside the `.mcpb`, the server cannot find Studio: `findStudio` looks only at `$NODEGX_STUDIO` and `~/vscode_projects/nodegx-studio`, and neither the npm route (`create-nodegx`, every agent it sets up) nor the editor's Connect Claude Code sets the variable, so `open_studio` says \"NodeGX Studio is not installed\" to everyone who does not have our checkout"
status: fixed
severity: high
area: "`packages/noodl-mcp/src/studio/studioProcess.ts` `findStudio` (the two candidates); `packages/create-nodegx/bin/create-nodegx.js` `serverEntry` (`npx -y @nodegx/mcp@<v> --allow-writes`, no env) for Claude Code, Cline, Mistral Vibe and OpenCode; the editor's registration (`packages/noodl-editor/src/editor/src/pages/ProjectsPage/useConnectAgent.ts` → `connectBootstrapServer`); `@nodegx/studio` is not on npm (nodegx-studio `package.json` is `private: true`)"
found: P128 S3 (CPY-003), 2026-10-27, checking the claim in the editor's new welcome line before keeping it; widened the same day when Richard asked what a fresh Claude Desktop install takes
evidence: "MEASURED by reading: `findStudio` candidates are `[process.env.NODEGX_STUDIO, path.join(os.homedir(), 'vscode_projects', 'nodegx-studio')]` (studioProcess.ts:35-37); `@nodegx/mcp` 0.2.7 has no dependencies; `npm view @nodegx/studio` is a 404; create-nodegx.js:365-368 registers `npx -y @nodegx/mcp@0.2.7 --allow-writes` with no env; `grep -rln NODEGX_STUDIO` finds it set only by nodegx-studio's `scripts/mcpb.mjs` and `app/main.cjs`. MEASURED the other side: the unpacked `nodegx-0.2.7.mcpb` under an empty HOME and PATH `/usr/bin:/bin` serves its bundled Studio (`open_studio` 200, 526,365 chars), so the `.mcpb` is the one install that works for a stranger today. Not driven: the npm route on a machine without the checkout."
launch: beta
regression: packages/noodl-mcp/tests/p128NoStudioForTheEditor.test.ts
owner: Beta sweep s19 (2026-10-27)
task: CCN-006 AC7
---

The canon's "Which AI coder" says *"Claude Code and Cline open Studio in a browser window beside the chat."* That is
true only where Studio is on disk at a path the server knows:

- **Claude Desktop with the `.mcpb`**: true. The bundle carries Studio and sets `NODEGX_STUDIO`.
- **Studio's own desktop app**: true for the server it starts.
- **`npm create nodegx`** (Claude Code, Cline, Mistral Vibe, OpenCode) and the editor's **Connect Claude Code**: false.
  The server comes from npm alone, `open_studio` answers "not installed (set NODEGX_STUDIO to its folder)", a sentence
  a person cannot act on. Only our machines, with the checkout at `~/vscode_projects/nodegx-studio`, get Studio, which
  is why every Studio window seen from Claude Code so far opened.

Two places say the false line today: the canon (its "Waits on" now lists it, P128 S3) and the editor's launcher card
(S3, canon phrases held by `scripts/canon-check.mjs`). The card's line is what the product should do, so it stays;
this row makes it true before the editor or the npm route is cut as Beta.

**Proposed.** CCN-006 AC7: publish `@nodegx/studio` (editor/, lib/, import/, vendor/, as the `.mcpb` stages it) and
have `@nodegx/mcp` resolve it with `require.resolve` first, either as a dependency or fetched with `npx` on the first
`open_studio`; `findStudio` also takes the installed Studio desktop app's resources (the companion's
`findStudioApp` finds the app). The not-installed sentence names nodegx.io/start, never an environment variable.

**Built s19 (launch plan L7).** `findStudio`'s third candidate is the installed desktop app (`findStudioApp`, where
its installers put it), whose `Contents/Resources/app` (macOS) or `resources/app` holds Studio's `editor/` unpacked
(`asar: false`). Measured first: the packaged build's `editor/serve.mjs` runs on plain Node 22 and serves the page.
The not-installed sentence is `STUDIO_NOT_INSTALLED`, naming `STUDIO_DOWNLOAD_URL` instead of an environment
variable, in `findStudio` and `open_studio`'s holding page. The npm-package candidate waits on `@nodegx/studio`.
- `tests/p128NoStudioForTheEditor.test.ts` 4/4, its drive starting the s18 packaged Mac build's Studio from the app on
  a todo copy (GET / 200); HEAD's finder: 3 red. Neighbours (companion, mini editor, Puppy bursts) 41/41; tsc clean
  but for P128's own `p128OptionSet.test.ts` (red at HEAD, filed P128-S2-OPTSETTSC).
- Reaches a stranger with the next `@nodegx/mcp` (and the editor's bundled copy of it), and once the download exists
  (P125-CCN006-NODOWNLOAD, Richard's three steps). Not driven through the editor's Connect.
