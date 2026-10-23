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

## How to run it (Richard)

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
