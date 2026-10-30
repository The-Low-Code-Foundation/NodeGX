---
id: P125-GOOSE-NOEVAL
title: In Goose Desktop the Studio panel draws inside the chat but its preview never starts, because Goose's MCP Apps sandbox forbids eval and the preview bundle needs it
regression: packages/noodl-mcp/tests/p125GooseNoEval.test.ts
status: fixed
commit: 48f81d89f (the framed panel for Goose, in @nodegx/mcp after 0.2.9); nodegx-studio be3a9c5 (the message)
severity: medium
area: mcp `open_studio` panel (`packages/noodl-mcp/src/tools/openStudio.ts`, resource `ui://nodegx/studio.html`) + Studio's preview bundle (`preview.js`, Ajv schema compile; the runtime's `new Function` for expressions and Function nodes)
found: OWN-030 side test (Goose as a local-model chat host), 2026-10-29, Goose Desktop 1.57.0, `@nodegx/mcp` 0.2.9 from the Claude Desktop .mcpb, gemma4 E4B with a 32k window
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-030/goose/studio-panel-in-goose.png (Studio's chrome inside the Goose chat, blank preview), own-030/goose/panel-console.txt (the EvalError and `memoryFiles` TypeError), own-030/goose/handshake-and-calls.txt (`goose-app 1.57.0; renders MCP Apps: yes`, `open_studio` → `resources/read ui://nodegx/studio.html`)
kit: mcp
phase: P125 CCN-001 (the panel)
---

What a person sees: in Goose Desktop, with a local model, they ask for Studio and it appears inside the chat, with
the top bar, HOLD, the rail, the project name and the breakpoints. The preview stays white, and the status reads
"starting…" indefinitely.

Measured: Goose Desktop announces `extensions["io.modelcontextprotocol/ui"]` with `text/html;profile=mcp-app` at
`initialize`. The model's `open_studio` call (direct, not proxied) makes Goose read the resource and mount it in
its guest frame (`http://127.0.0.1:<port>/mcp-app-guest`). The guest's CSP is built from the resource's
`connectDomains` / `resourceDomains` / `baseUriDomains`:
`script-src 'self' 'unsafe-inline' http://127.0.0.1:<studio>` … `frame-src 'self' <guest>`. It has **no
`'unsafe-eval'`**. `preview.js` compiles Ajv validators with `new Function` at load:
`Uncaught EvalError: Evaluating a string as JavaScript violates … 'unsafe-eval' is not an allowed source of script`.
After that, Studio's module reads the preview's result and throws
`TypeError: Cannot read properties of undefined (reading 'memoryFiles')`, so the status never leaves "starting…".
Claude Desktop runs the same panel, so its sandbox evidently allows eval. Goose's does not, and the spec does not
require a host to allow it.

A trap for whoever re-measures this: `Runtime.evaluate` over CDP is not subject to the page's CSP, so
`new Function('return 1')()` typed into DevTools succeeds in the same frame. Read the replayed console instead
(`Runtime.enable` + `Log.enable` on the guest target).

Fix, to measure first:
1. Run the preview in a nested frame served from Studio's own origin (whose CSP allows eval), and name that origin
   in the resource's `frameDomains` when the host is not Claude (openStudio.ts:20 says Claude restricts
   `frameDomains`; whether Goose honours them is unmeasured. Its proxy URL today carries only `connect_domains`,
   `resource_domains` and `base_uri_domains`, because that is all we declare).
2. Or make the preview load without eval: Ajv standalone (validators precompiled at build). This only gets the
   panel past load. Expression and Function nodes still need `new Function` to run in the preview, so a project
   with logic would still fail in an eval-free host.
3. Whichever is chosen, the panel should say what is wrong instead of "starting…" when the preview throws at load.

Related, not ours (recorded in own-030/goose/FINDINGS.md): Ollama's 4096-token default window silently truncates
Goose's 12–24k-token prompts, and Goose's Code Mode hides `open_studio` from the host the way `call_tool` did.

**Fixed in source 2026-10-29 (uncommitted), verified in Goose 1.57.0:** for `goose-app` (or `NODEGX_PANEL_FRAME=1`), the resource is a wrapper that frames Studio's `/panel` from the proxy's origin, names it in `frameDomains`, and relays MCP Apps messages both ways (`framedPanelHtml`). Studio drew in the Goose chat with the app running, and the tea counter counted 0 → 3 and reset (own-030/goose/build-app-tea-counter-*.png). Regression: `tests/p125GooseNoEval.test.ts`. Not done: a Studio-side message when the preview throws at load.

## 2026-10-30: the third part (the message), and the status

The fix above was committed in 48f81d89f (2026-10-29); it reaches a stranger with the next `@nodegx/mcp` (0.2.9, the
published one, predates it). The third part is built: when the preview's script stops at load, Studio's status says
"The app can't run inside this chat. Its sandbox blocks code the preview needs." in red, and its title reads
`failed: the preview did not start`, instead of "starting…" for ever. Inside a chat the preview's script is another
origin's, so the browser hides why it stopped (a listener for its error event reads nothing): the tooltip names the one
cause measured. check:hosted serves the panel a second time under its CSP without `'unsafe-eval'` and asserts the
sentence; the same drive under Claude's CSP (eval allowed) shows the app as before.
