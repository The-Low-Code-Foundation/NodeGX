/**
 * P125 CCN-001 — does the client render MCP Apps?
 *
 * The MCP Apps extension (SEP-1865) announces itself in the client's capabilities as
 * `extensions["io.modelcontextprotocol/ui"]` — the id `@modelcontextprotocol/ext-apps` exports as `EXTENSION_ID`.
 * Two places read it: `open_studio` (open the browser itself when the host cannot draw the panel) and `call_tool`
 * (refuse to proxy `open_studio` when the host can: a panel is drawn for the tool the HOST sees being called, and
 * through `call_tool` the host sees `call_tool`).
 *
 * Measured 2026-10-23, Richard's second run in Claude Desktop (a regular chat, connector on): 18 `tools/call`, 7
 * `tools/list` (the host re-lists on every `list_changed`), one `resources/list`, **zero `resources/read`** — the
 * model reached `open_studio` through `call_tool`, so the host never saw a tool with `_meta.ui.resourceUri` being
 * called and never fetched the panel. Studio was running on its port the whole time, with nobody told.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const UI_EXTENSION_ID = 'io.modelcontextprotocol/ui';

export function clientRendersApps(server: McpServer): boolean {
  const caps = server.server.getClientCapabilities() as { extensions?: Record<string, unknown> } | undefined;
  return Boolean(caps?.extensions?.[UI_EXTENSION_ID]);
}

/**
 * Does the client load tools itself, from the FIRST `tools/list`, and never see a later reveal?
 *
 * Measured 2026-10-23, Richard's third run: Claude Desktop (`claude-ai 0.1.0`, calling as
 * `local-agent-mode-nodegx 1.0.0`) re-issued `tools/list` after every `list_changed` — and the model still could
 * not call `open_studio` by name: *"Searching for it again only returned the tools I'd already loaded."* Desktop
 * indexes a server's tools when the conversation starts and loads them into the model on demand; a tool this
 * server reveals later is in the list and not in the index. On such a host this server's own deferral hides
 * tools for nothing (Desktop already defers), and hides the one tool that must be called by name to draw a panel.
 * So it is told at `initialize`, and everything is advertised from the first list.
 */
export function clientLoadsToolsItself(server: McpServer): boolean {
  const name = server.server.getClientVersion()?.name ?? '';
  return name === 'claude-ai' || name.startsWith('local-agent-mode');
}

// P125 CCN-001 s4 — `call_tool` proxying `open_studio` says so here, and `open_studio` reads it once: a host that
// renders MCP Apps drew no panel for a proxied call, so the browser is opened instead of leaving the person with
// a URL in a result they never see.
let openStudioProxied = false;
export function markOpenStudioProxied(): void {
  openStudioProxied = true;
}
export function consumeOpenStudioProxied(): boolean {
  const was = openStudioProxied;
  openStudioProxied = false;
  return was;
}
