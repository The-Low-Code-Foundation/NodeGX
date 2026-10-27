# CCN-006 — A stranger's install

**State:** open; the install shape ruled 2026-10-23, the offer of the desktop app built (s9), **the `.mcpb` built and
driven headless 2026-10-24 (s13 below); Richard's double-click in Claude Desktop is next**. **After:** CCN-001 AC5.

## The ruling (Richard, 2026-10-23)

He asked whether the first thing a person downloads should be the Studio desktop app, so that "open in a window"
opens the app and not the browser. The answer he agreed to:

- **One install gets Studio into the conversation**: the `.mcpb` Desktop Extension (or the pasted JSON block). It
  bundles the server and Studio's web files. The app is **not** required first. Leading with it means two installs (the
  app does not connect the agent), Gatekeeper before anything works, and two version streams. It also contradicts
  D8's "integrate with Claude Desktop, never 'move to our app'".
- **The desktop app is offered at the moment a person needs it.** That's step 3 of the walk: Studio on its own,
  without the agent. A browser window of Studio dies with the agent's host, and the app does not.
- **"Window ↗" opens the app when it is installed**, the browser otherwise.
- **The npm paths stay whole**: build your own editor, the backend only, no Studio at all. Nothing requires the app.

Richard on the offer: *"make a clever way to offer to the user to download Studio, I guess especially if they open
independently of Claude Code in their browser, it detects that … maybe if it detects that the server has gone
offline … A modal? You decide."*

## What was built (s9, 2026-10-23)

- `packages/noodl-mcp/src/studio/companion.ts`. NodeGX's proxy adds this script to Studio's page (`GET /`), so
  it runs only in a window the agent opened. Its states:
  - **While the server is here:** a small pill at the bottom right reads "Connected to Claude Code · Get the desktop
    app" (or "Open in the desktop app" when the app is installed). It can be dismissed and stays dismissed.
  - **When the server goes** (two missed reads of `/__nodegx/status`, 3 s apart): a card titled "Claude Code has
    closed". It says the work is safe and names the folder, then offers **Get NodeGX Studio**, or **Open in NodeGX
    Studio** when the installed app takes `nodegx-studio://` links, plus **Copy the folder location**. Below those
    are "I'll go back to Claude Code" and "Just look at it", which leaves an amber pill reading "Changes made here
    won't be saved · What now?".
  - **When the server comes back on the same port:** "Claude Code is back. Ask it to open Studio…", and the page
    reloads itself once Studio answers.
- `studioProxy.ts` answers `/__nodegx/status`, `/__nodegx/companion.js` and `POST /__nodegx/open-app` itself. It
  asks for its last port first (`~/.noodl/studio-proxy-port`, `NODEGX_STUDIO_PORT_FILE=none` to disable; never under
  jest), so a window left open across a restart finds it again.
- `studioApp.ts` finds the app where its installers put it (`NODEGX_STUDIO_APP` overrides, `none` = absent). It
  reads whether the app declares the scheme, and launches it on the folder.
- `open_studio`'s browser URL is the proxy's origin, so Claude Code, Cline and every client without panels get the
  companion too.
- nodegx-studio `editor/hosted/hosted.js`: Window ↗ POSTs `/__nodegx/open-app` first and falls back to the browser.
- `tests/studioCompanion.test.ts`, 10 tests. Driven headless against the real Studio on a copy of `Puppy test 3`:
  all six states drawn, the same-port reconnect, the page's self-reload. Pictures in the s9 scratchpad.

## Acceptance

1. ✅ A browser window of Studio opened through the agent says, within ~6 s of the agent's server going, that the
   work is safe and in which folder, and offers the desktop app. (Drive, s9.)
2. ✅ Studio's own page served by the desktop app never carries the offer. It is added only by NodeGX's proxy.
3. ✅ The server returning on the same port brings the window back without the person doing anything.
4. ☐ **Window ↗ in Claude Desktop opens the installed app on the project.** Richard's run, with the app in
   /Applications. It isn't installed on this machine today, so the button still opens the browser here.
5. ☐ "Open in NodeGX Studio" from the card, with no server left, opens the folder in the app. Waits on
   `P125-CCN006-NOSCHEME` (the app registers no scheme yet).
6. ☐ "Get NodeGX Studio" lands on a page with a notarised download. Waits on `P125-CCN006-NODOWNLOAD`.
7. ☐ Studio on npm (`@nodegx/studio`, `npx` runnable, vendor/ inside); `@nodegx/mcp` resolving it by
   `require.resolve` first.
8. ◐ The `.mcpb` Desktop Extension bundling the server, so Claude Desktop installs it by double-click and runs it on
   its own Node (the Node 16 trap gone). **Built and driven headless (s13); the double-click is Richard's.**
9. ☐ `create-nodegx --desktop` writing the `claude_desktop_config.json` entry with an absolute node path, under the
   same never-overwrite rule the Cline kit has.

The stranger audit's findings on naming and jargon in the packages (`dev-docs/bugs/npmaudit-*`) are the other half
of the same work. `P125-CCN006-AGENTPILL` (Studio's header says "Connect Claude Code" while an agent in Claude Desktop
drives the project) is Studio's to fix. `/__nodegx/status` already names the agent.

## 2026-10-27 (P128 S3, on Richard's ask): 0.2.7 rebuilt, and the run written down

`nodegx-0.2.7.mcpb` (25.1 MB, unsigned: `mcpb verify` says "Extension is not signed"). Driven as s13 did, from the
unpacked bundle, an empty HOME and PATH `/usr/bin:/bin`, client `claude-ai` with the UI extension: initialize 260 ms;
`open_project` on a copy of `templates/todo-list` binds (122 tools); `open_studio` → `http://127.0.0.1:<port>/` 200,
526,365 chars, title "NodeGX Studio"; `ui://nodegx/studio.html` 526,843 chars; no process left after close. AC8's
double-click is written as [CCN-006-FRESH-ACCOUNT-CHECKLIST.md](CCN-006-FRESH-ACCOUNT-CHECKLIST.md): a new macOS
user, so the checkout cannot stand in for the bundle. Outside the `.mcpb`, no install finds Studio
(P128-S3-NOSTUDIOFORTHEEDITOR, AC7's row).

## s13 (2026-10-24, opennoodl-d7): the `.mcpb`, built and driven headless

**What it is.** `npm run mcpb` in nodegx-studio (`scripts/mcpb.mjs`, commit 09219e6) writes
`dist/nodegx-<@nodegx/mcp version>.mcpb`. Inside: `studio/` (Studio's `editor/`, `lib/`, `import/*.mjs`, `vendor/`, and
`npm ci --omit=dev` beside them: the pinned `@nodegx/mcp` 0.2.6, `@nodegx/preview` 0.2.5, `@nodegx/backend-map` 0.1.1)
and a v0.3 manifest. The server is a `node` server: `${__dirname}/studio/node_modules/@nodegx/mcp/bin/noodl-mcp.js
--allow-writes` on Desktop's own Node. `NODEGX_STUDIO` = the bundled Studio (so `open_studio` needs no checkout and no
`@nodegx/studio` on npm); `NODEGX_DEPLOY_CLI` = the bundled preview's engine (so `deploy_to_vm` needs no npx). Packed
with `@anthropic-ai/mcpb` 2.1.2 through npx (not a Studio dependency). 0.2.6: 24.7 MB packed, 103.9 MB unpacked,
1,844 files. The packer's default ignore drops 702 files: `.d.ts`, source maps, a `tsconfig`, the lockfile.

**Driven** (the s13 scratchpad's `mcp-client.mjs`, a stdio MCP client), from the UNPACKED `.mcpb`, a fresh HOME, PATH
`/usr/bin:/bin`, client name `claude-ai` declaring the UI extension:
- initialize 0.3 s; 119 tools in the first list (Desktop indexes once, s4);
- `resources/read ui://nodegx/studio.html` valid before any tool call (Desktop prefetches, s7);
- `open_project` on a copy of the todo template binds; `open_studio` → `http://127.0.0.1:<port>/` serves the bundled
  Studio (200, the page, 489,419 chars).

**Not driven, and what to look for in Richard's run:**
1. Double-click `nodegx-0.2.6.mcpb` → Desktop's install sheet → Install. Then a NEW conversation: "Make me a NodeGX app:
   a tap counter with a reset button." Pass = the panel draws, as with the pasted entry.
2. **Which Node Desktop runs it on.** A `node` server runs on Desktop's built-in Node unless the person turned that
   off (Settings → Extensions). The bundle needs Node 20+. `mcp-server-nodegx.log` names the start line; if it says
   Node 16, the manifest needs `compatibility.runtimes` read by Desktop, or a `binary` server.
3. **Studio's child process.** `open_studio` starts Studio with `process.execPath`. If Desktop's built-in Node is its
   Electron binary run as Node, the child inherits `ELECTRON_RUN_AS_NODE` from the environment (studioProcess.ts passes
   `{ ...process.env }`). If Studio fails to start, that is the first suspect.
4. Remove the pasted `nodegx` entry from `claude_desktop_config.json` first, or Desktop runs two NodeGX servers.

**Also s13, Studio side:** inside a conversation, Data → Map draws a card with "Open the map ↗" (the host's openLink to
`/backend-map/`) instead of `#mapframe`, which no host frames (no `frameDomains`). Driven in this phase's fake host from
a foreign origin: frame hidden, card drawn, `open-link` to `/backend-map/` (4/4). The timeline's screen is a `srcdoc`
frame and was left alone (not measured in Desktop).

**Left:** AC7 (`@nodegx/studio` on npm, so `@nodegx/mcp` finds Studio by `require.resolve` outside the `.mcpb`) and
AC9 (`create-nodegx --desktop`). Both matter only for people who paste JSON; the `.mcpb` does not need either. The
`.mcpb` should be built in CI beside the DMG and linked from nodegx.io's quickstart (lane 7, SEE-009).
