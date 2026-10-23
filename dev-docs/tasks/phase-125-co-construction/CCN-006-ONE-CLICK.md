# CCN-006 — A stranger's install

**State:** open; the install shape ruled 2026-10-23, the offer of the desktop app built (s9). **After:** CCN-001 AC5.

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
8. ☐ The `.mcpb` Desktop Extension bundling the server, so Claude Desktop installs it by double-click and runs it on
   its own Node (the Node 16 trap gone).
9. ☐ `create-nodegx --desktop` writing the `claude_desktop_config.json` entry with an absolute node path, under the
   same never-overwrite rule the Cline kit has.

The stranger audit's findings on naming and jargon in the packages (`dev-docs/bugs/npmaudit-*`) are the other half
of the same work. `P125-CCN006-AGENTPILL` (Studio's header says "Connect Claude Code" while an agent in Claude Desktop
drives the project) is Studio's to fix. `/__nodegx/status` already names the agent.
