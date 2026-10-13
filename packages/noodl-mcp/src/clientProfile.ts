/**
 * P112 OWN-019 (R29) — the client this server talks to, as two facts the agent-facing text depends on.
 *
 * Every sentence this server sends was written against Claude Code. Two of Claude Code's behaviours are not
 * universal, and the OWN-019 census found 29 sentences that assume one or the other:
 *
 * - **The tool list refreshes.** Claude Code re-reads `tools/list` on `notifications/tools/list_changed`, so a tool
 *   revealed by `find_tools` or by binding a project "arrives in your next tool list". Mistral Vibe (2.26.1) lists
 *   tools once per session: started unbound by create-nodegx, it shows the seven bootstrap tools for the whole
 *   session, and every other tool is reachable only through `call_tool` (P112-OWN018-LISTCHANGED). A sentence that
 *   says "call find_tools and it arrives" sends such an agent looking for something that never comes.
 * - **Images are cheap.** Claude caches across images. One image part anywhere in a Mistral request turns its prompt
 *   cache off (P112-OWN018-IMAGECACHE), so "look at the screenshots" makes every later step full price.
 *
 * Neither fact can be read from the client: Vibe sends the Python SDK's default `clientInfo` (`mcp`), which any
 * Python client sends. So whoever starts the server says which client it is — `--profile vibe`, written by the
 * Vibe kit into `.vibe/config.toml` — never the model.
 *
 * One server per process, so the profile is module state, set by `createServer` every time (a test that makes a
 * second server gets the default back unless it asks).
 */

export type ClientProfileName = 'default' | 'vibe';

export const CLIENT_PROFILES: readonly ClientProfileName[] = ['default', 'vibe'];

export interface ClientProfile {
  name: ClientProfileName;
  /** The client never re-reads the tool list: every tool it was not shown at start is called through `call_tool`. */
  staticToolList: boolean;
  /** An image the model opens costs more than its pixels (Mistral: the prompt cache, for the rest of the session). */
  imagesCostly: boolean;
}

const PROFILES: Record<ClientProfileName, ClientProfile> = {
  default: { name: 'default', staticToolList: false, imagesCostly: false },
  vibe: { name: 'vibe', staticToolList: true, imagesCostly: true }
};

let current: ClientProfile = PROFILES.default;

export function setClientProfile(name: ClientProfileName | undefined): ClientProfile {
  current = PROFILES[name ?? 'default'];
  return current;
}

export function clientProfile(): ClientProfile {
  return current;
}

export function isClientProfileName(value: string): value is ClientProfileName {
  return (CLIENT_PROFILES as readonly string[]).includes(value);
}

/**
 * How to name a tool the agent should call next. On a client whose list never changes, the only way to reach a
 * tool outside the bootstrap seven is `call_tool`, so the hint says that instead of the bare name.
 */
export function callHint(tool: string, args?: string): string {
  if (!current.staticToolList) return args ? `${tool}(${args})` : tool;
  return args ? `call_tool({ name: "${tool}", arguments: ${args} })` : `call_tool({ name: "${tool}" })`;
}

/**
 * The one sentence a static-list client needs before anything else that names a tool. Empty for a client whose
 * list refreshes.
 */
export function staticToolListRule(): string {
  if (!current.staticToolList) return '';
  return (
    'YOUR TOOL LIST WILL NOT CHANGE IN THIS SESSION: every tool of this server that is not in it — reading, ' +
    'authoring, validation, render_report, drive_page, the backend — is called through call_tool({ name, ' +
    'arguments }); call_tool({ name, describe: true }) shows a tool\'s arguments first, and find_tools({ query }) ' +
    'names the tools that exist. Wherever this server says "call X", call it that way. '
  );
}
