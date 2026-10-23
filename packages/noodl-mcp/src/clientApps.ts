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
