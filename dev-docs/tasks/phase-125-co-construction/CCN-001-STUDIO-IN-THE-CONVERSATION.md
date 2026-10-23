# CCN-001 — Studio in the conversation, with HOLD

**State:** built 2026-10-23 (s1). **Waits on:** Richard's run in Claude Desktop (AC5). **Pillar:** 1 (the blueprint
stays open), as the live form of it.

## Acceptance criteria

1. ✅ `open_studio` exists in `@nodegx/mcp`: starts NodeGX Studio for the bound project, returns `{ url, panel }`,
   carries `_meta.ui.resourceUri`; a second call for the same project is a no-op with the same URL; the Studio dies
   with the server. Measured over JSON-RPC (`run A`: 03/04 same 629 B answer; `pgrep` count equal before and after).
2. ✅ The resource `ui://nodegx/studio.html` lists and reads as `text/html;profile=mcp-app` with `_meta.ui.csp`
   naming Studio's origin on both the listing and the content; the HTML is Studio's `/panel` (433,475 B, five
   absolute origins, the bridge before the first script).
3. ✅ The panel, drawn at a foreign origin, completes the MCP Apps handshake and draws Studio with the running app
   (fake host at 127.0.0.1:47612 framing Studio at :47611; `initialize from {"name":"NodeGX Studio"}`,
   `size-changed`, `shots/01-panel-in-fake-host.png`).
4. ✅ HOLD binds: with `.nodegx-hold.json` in the project, `set_project_settings` and `create_component` answer
   `{ error: { code: "held", … "the background went blue" … } }`; `validate_project` and `open_studio` still answer;
   with the file gone the same writes succeed (`run A` 08 vs `run B2` 04/05).
5. ⏳ **In Claude Desktop:** the person says "make me a NodeGX app", clicks Allow, and Studio is inside the
   conversation with the app redrawing as Claude writes it; HOLD refuses Claude's next write and Claude says so.
   If the sandbox refuses `http://127.0.0.1` in the CSP, the strip still works and **Open in a window** is the route;
   file that as the finding and this AC closes on the window.
6. ✅ `tests/toolDisclosure.test.ts` 18/18 (manifest = registrations, both modes); `tsc --noEmit` clean for noodl-mcp
   (the two errors on HEAD are `nodegx-export/src/emit/swift/modifiers.ts`, lane 6's open edit).

## s2 (2026-10-23, the same day): Richard's first run — no editor, and why

`~/Library/Logs/Claude/mcp-server-nodegx.log`: the `nodegx` server connected three times (10:29, 10:32, 10:38),
answered `initialize`, `tools/list` (bootstrap, 7 tools) and `resources/list` — and received **zero `tools/call`
and zero `resources/read`, ever**. `cowork_vm_node.log` loads its VM at the same three minutes: it was a **Cowork
session**. Claude, having a computer of its own, wrote `mcp.mjs` in its scratch workspace, spawned a second
`noodl-mcp` over stdio and drove the tools from a shell (Richard's paste: "noodl-mcp serving … Tap Counter 2
(read-write) on stdio", then `get_project_info`, `get_style_vocabulary`, `get_node_type` with a wrong argument name).
A tool called from a script has no host behind it: nothing it does can draw a panel, and it never called
`open_studio` anyway.

Two consequences, both built in s2:
- **`open_studio` opens the browser itself when the client cannot render MCP Apps** (the client's capabilities carry
  `extensions["io.modelcontextprotocol/ui"]` when it can). Claude Code, Cline, Vibe and a script all get Studio in a
  window beside them; the result says `onScreen`. `NODEGX_STUDIO_NO_OPEN=1` keeps a test from opening windows.
- The briefings say: call these tools through your MCP client, never start `noodl-mcp` from a shell — a tool run
  from a script cannot put anything on the person's screen.

**AC5 is still open.** It needs a *regular* chat, not Cowork: the host's own client has to make the call for the
panel to exist.

## s3 (same day): the second run — a regular chat, the connector on, still no panel, and why

`mcp-server-nodegx.log` after the 10:45 start: 18 `tools/call`, **7 `tools/list`** (Claude Desktop re-lists on every
`list_changed` — 39 of them), one `resources/list`, one `resources/list_changed` (the CSP update when Studio
started), **zero `resources/read`**. Studio was started (port 57123, alive after the chat) and never fetched. The
model's own account says why: *"Some of those reached me through call_tool"* — `open_studio` is deferred, so it
called it through `call_tool`, and a host draws a panel for the tool IT sees being called, which was `call_tool`.

Built in s3:
- `call_tool` refuses to proxy `open_studio` when the client declares MCP Apps
  (`extensions["io.modelcontextprotocol/ui"]`): it reveals the tool by name and says *call open_studio directly*.
  A client that does not declare it is proxied as before and gets the browser. Measured over JSON-RPC with a client
  that declares the extension (refusal, then the direct call answers `onScreen: "in the conversation"`) and one that
  does not (proxied, `onScreen` the browser route).
- One stderr line on `initialize`: the client's name and whether it declares MCP Apps, with its capabilities. Claude
  Desktop logs no request params, so this is the only record on disk of what the host said it can render.
- Not done: making `open_studio` resident. The resident surface is 14 tokens under its 8,280 budget and the tool's
  description is ~150; the reveal-by-name path is the one the budget allows.

**The host must restart the server to run the new build** (Developer → Reload MCP Configuration, or restart Claude
Desktop): the chat's server is the process that started at 10:45 with the old bundle.

## s4 (same day): the third run — Claude Desktop cannot see a tool revealed mid-conversation

The stderr line answered the capability question: `claude-ai 0.1.0` and its calling client `local-agent-mode-nodegx
1.0.0` both declare `extensions["io.modelcontextprotocol/ui"]`. The run then showed the real obstacle: the host
re-issued `tools/list` after every `list_changed` (ids 7, 8, 10, 11) and the model still could not call
`open_studio` by name — *"Searching for it again only returned the tools I'd already loaded."* Desktop indexes a
server's tools when the conversation starts and loads them into the model on demand; a tool this server reveals
later is in the list and not in the index. Our deferral hides tools on a host that already defers, and it hid the one
tool that must be called by name. The model, told not to use `call_tool`, stopped and asked. Correct, and nothing on
screen. (Studio at 57123 from run 2 was open in Richard's browser meanwhile: the app, the tree, the properties.)

Built in s4:
- `clientLoadsToolsItself`: a client named `claude-ai` or `local-agent-mode-*` gets **every tool from the first
  `tools/list`**, bootstrap included (`ToolDisclosure.advertiseEverything()`, called from `oninitialized`, which
  fires before that list). An unbound project tool answers `no-project` with the way out. Measured: a JSON-RPC
  client named `claude-ai` lists 121 tools unbound, `open_studio` among them; unbound `open_studio` → `no-project`;
  after `open_project`, the direct call → `onScreen: "in the conversation"`.
- `call_tool` no longer refuses `open_studio`: it proxies it and marks it, and `open_studio` opens the browser for a
  proxied call (a host draws no panel for it) with a note to call it by name next time. The person always gets
  Studio somewhere.
- The resident budget (8,280) is untouched: Desktop's path is profile-specific; `toolDisclosure.test.ts` 18/18.

## s5 (same day): "nodegx couldn't start" — Desktop's second server runs on Node 16

After the reload, the chat's server started on Node 22, advertised 121 tools and answered two `tools/list`s; Desktop
recycled it as it always does. Then Desktop started a SECOND copy "for Cowork and Code sessions" from a shared
pool with a 16-entry PATH, in which `node` is `~/.nvm/versions/node/v16.20.2/bin/node`; the bundle threw
`@nodegx/node-spec: this host has no File constructor` three times and Desktop reported the server as failed.
Fix: the config's `"command"` is an absolute path to Node 22, not `node`; `bin/noodl-mcp.js` now says this in one
line on Node < 20 and exits 1 instead of a stack trace. A stranger's install (CCN-006) has to write the absolute path
or ship its own runtime.

**AC5 run 4:** config with the absolute node path, reload the server, a NEW conversation (the index is built at its start), connector on. Say: *"Open the
NodeGX project at ~/vscode_projects/NodeGX test projects/Tap Counter C7Q4 with open_project, then call open_studio,
then build its Home page: the count, a Tap button and a Reset button."* Click Allow on the panel.

## How to run it (Richard)

Use a **normal chat, not a Cowork session**. In the chat's tools menu check that `nodegx` is on. If Claude starts
writing a script or running `noodl-mcp` itself, say: *"Use the nodegx connector's tools directly; don't run the
server yourself."*


1. Claude Desktop → Settings → Developer → Edit Config, add inside `mcpServers` (auto mode refused to write your
   config; the backup it made first is `claude_desktop_config.json.bak-2026-10-23`):
   ```json
   "nodegx": {
     "command": "node",
     "args": ["/Users/richardosborne/vscode_projects/OpenNoodl/packages/noodl-mcp/bin/noodl-mcp.js", "--allow-writes"],
     "env": { "NODEGX_STUDIO": "/Users/richardosborne/vscode_projects/nodegx-studio" }
   }
   ```
2. Restart Claude Desktop (or Developer → Reload MCP Configuration). Say: *"Make me a NodeGX app: a tap counter with
   a reset button, in a new folder under ~/vscode_projects/NodeGX test projects/."* Claude creates it; when it calls
   `open_studio`, click **Allow**.
3. Watch. Press **HOLD** (type a note first if you like). Ask Claude to change something: its write is refused and it
   should say why. Press **Release**. Try **Full screen** and **Open in a window**.
4. If the panel is blank: Help → Troubleshooting → Enable Developer Mode, ⌘⌥I, find the inner iframe, read the
   console (a CSP refusal names the origin). That line is the finding.

## What was built, where

- `packages/noodl-mcp/src/tools/openStudio.ts` — the tool and the resource (why in its docblock).
- `packages/noodl-mcp/src/studio/studioProcess.ts` — find, start, keep, stop Studio.
- `packages/noodl-mcp/src/hold.ts` — the hold file, the refusal, the gate wrapped around the recorder for the write block.
- `packages/noodl-mcp/src/server.ts` — the gate (`const rec = holdGate(recAll, binding)` inside `if (allowWrites)`), the registration.
- `packages/noodl-mcp/src/toolGroups.ts` — `open_studio` appended to the project group; keywords.
- `packages/noodl-mcp/src/errors.ts` — the code `held`.
- nodegx-studio `editor/serve.mjs` — CORS, `OPTIONS`, `/panel`, `/api/hold`; `editor/hosted/hosted.js`, `mcp-app.js` (ext-apps 1.7.5, Apache 2.0).

## Traps met

- studio.html has no `<head>`: a `<head[^>]*>` injection matched `<header>` and put the bridge in the body. The bridge
  goes before the first `<script>`.
- The SDK's `autoResize` measures `max-content` and read Studio as 303 px; the panel names its own 640 px inline.
- A deferred tool called before `find_tools` reveals its group answers "Tool … disabled" — that is disclosure, not
  the hold; the held run must reveal first (run B vs B2).
- `refuseUnknownArguments` and zod run before the hold gate: a malformed write under hold gets the argument error,
  not `held`. It still writes nothing.
