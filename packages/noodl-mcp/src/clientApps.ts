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
 * P125-GOOSE-NOEVAL — does the client's MCP Apps sandbox forbid `eval`?
 *
 * Measured 2026-10-29, Goose Desktop 1.57.0 (`goose-app`): the guest frame's CSP is built from the resource's
 * domains with no `'unsafe-eval'` and no way to ask for it, and Studio's in-page preview compiles its validators with
 * `new Function` at load, so the panel drew Studio's chrome and stopped at "starting…". Goose does honour
 * `frameDomains`, so such a host gets Studio framed from its own origin (`framedPanelHtml`), where eval runs.
 * `NODEGX_PANEL_FRAME=1` forces it for any host.
 */
export function clientForbidsEval(server: McpServer): boolean {
  if (process.env.NODEGX_PANEL_FRAME === '1') return true;
  return server.server.getClientVersion()?.name === 'goose-app';
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
// a URL in a result they never see. CCN-008 — the same for every tool that draws a panel (`show_mini_editor`).
export const UI_TOOLS: ReadonlySet<string> = new Set(['open_studio', 'show_mini_editor']);
const proxied = new Set<string>();
export function markUiToolProxied(name: string): void {
  proxied.add(name);
}
export function consumeUiToolProxied(name: string): boolean {
  return proxied.delete(name);
}
export function markOpenStudioProxied(): void {
  markUiToolProxied('open_studio');
}
export function consumeOpenStudioProxied(): boolean {
  return consumeUiToolProxied('open_studio');
}

/**
 * P128-S1-PREVIEWCUT — the answer the agent must read whole, whole in Claude Code too.
 *
 * Claude Code (measured in 2.1.251's own code, `Az=50000`, and its MCP docs, "MCP output limits and warnings") saves a
 * text result over **50,000 characters** to a file and shows the agent a 2,000-character preview of the JSON-escaped
 * content. `get_project_info` is ~62,000 (`templates/todo-list`), so a Claude Code agent got `readFirst.note` and
 * MUST_KNOW lines 1–7 and never the `sections` index (P128 S1's rounds, and the haiku drive that measured this fix).
 * Its documented door: `_meta["anthropic/maxResultSizeChars"]` on the tool's `tools/list` entry raises that tool's
 * threshold, to a hard ceiling of 500,000. `call_tool` carries it as well, because that is how the measured round
 * reached `get_project_info`.
 *
 * Set only for a client that says it is Claude Code, so every other client (Cline, Claude Desktop's `claude-ai` and
 * `local-agent-mode-*`, Vibe) gets a `tools/list` byte for byte what it got before; the result itself is unchanged
 * for everyone. Costs nothing on the resident budget: the gate bills name, description and schema, and Claude Code
 * reads `_meta` itself rather than sending it to the model.
 */
export const RESULT_SIZE_META_KEY = 'anthropic/maxResultSizeChars';

/** Twice today's `get_project_info`, so the guidance can grow before it is cut again; far under the 500,000 ceiling. */
export const WHOLE_RESULT_CHARS = 120_000;

/**
 * The tools whose answer is read whole: the orientation the instructions say to call first, and the door to it; and
 * the workflow step catalog (P132 BWF-004 AC4): BWF-004's `formulaLanguage` took the backend's served catalog to
 * 50,351 characters, so a Claude Code agent got a 2 KB preview of it and never the formula list it is told to use.
 */
export const WHOLE_RESULT_TOOLS: readonly string[] = ['get_project_info', 'call_tool', 'list_backend_step_kinds'];

export function clientIsClaudeCode(server: McpServer): boolean {
  const name = server.server.getClientVersion()?.name ?? '';
  return name === 'claude-code' || name.startsWith('claude-code');
}

/**
 * At `initialize`: raise Claude Code's save-to-file threshold on {@link WHOLE_RESULT_TOOLS}, or take the key away for
 * any other client (a second client can initialise on the same transport). Assigned, not `update()`d: the list is not
 * yet read, so no `list_changed` is owed.
 */
export function applyResultSizeMeta(
  server: McpServer,
  handleFor: (name: string) => { _meta?: Record<string, unknown> } | undefined
): void {
  const claudeCode = clientIsClaudeCode(server);
  for (const name of WHOLE_RESULT_TOOLS) {
    const handle = handleFor(name);
    if (!handle) continue;
    const { [RESULT_SIZE_META_KEY]: _dropped, ...rest } = handle._meta ?? {};
    const next = claudeCode ? { ...rest, [RESULT_SIZE_META_KEY]: WHOLE_RESULT_CHARS } : rest;
    handle._meta = Object.keys(next).length > 0 ? next : undefined;
  }
}
