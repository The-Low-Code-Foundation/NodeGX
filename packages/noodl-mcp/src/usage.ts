/**
 * `noodl-mcp --help`, apart from the CLI so a test can read it: `cli.ts` starts the server when it is loaded.
 */
import { BOOTSTRAP_ADVERTISED, TOOL_GROUPS } from './toolGroups';

// NPMAUDIT-MCPREADME — counted from the manifest, so --help cannot drift from the server again ("60 of the 89" was
// stale by the time it shipped: 115 tools, 65 backend).
const ALL_TOOLS = new Set(TOOL_GROUPS.flatMap((g) => g.tools)).size;
const BACKEND_TOOLS = TOOL_GROUPS.find((g) => g.id === 'backend')?.tools.length ?? 0;

export const USAGE = `Usage: noodl-mcp [project-dir] [options]

Serves a NodeGX (OpenNoodl) v2 project directory over the Model Context Protocol (stdio).

With NO project directory the server starts in bootstrap mode: it advertises
${BOOTSTRAP_ADVERTISED.join(', ')}, and nothing else.
That is the mode for a machine with no projects yet, or for one where the agent
does not know which project it wants — it finds what is already there and opens
it, or scopes and creates one, and either way this same server binds itself and
serves it. Bootstrap mode requires --allow-writes, because creating a project is
a write and there is nothing to read.

Options:
  --allow-writes   Register the authoring tools (create/update/delete component).
                   Default is read-only. Required when no project directory is given.
  --all-tools      Advertise every tool from the first tools/list. By default the
                   authoring set is advertised and the backend, docs, project and
                   theme groups are revealed on demand via find_tools — ${BACKEND_TOOLS} of the
                   ${ALL_TOOLS} tools are backend admin, and they are re-sent every turn.
                   Use this for a client that ignores tools/list_changed.
  --reproducible <namespace>@<epoch>
                   Write the same bytes for the same plan: component ids derived
                   from <namespace> and each component's path, and every
                   created/modified stamp set to <epoch> (a full ISO-8601 UTC
                   time). For template generators and CI; a person's session
                   keeps the wall clock.
  --screenshots-to-files
                   render_report and drive_page write screenshots under the
                   project's .previews/ and return their paths, unless asked for
                   another folder. For a model whose prompt cache stops at the
                   first image in a conversation (Mistral).
  --profile <client>
                   Word what this server tells the agent for that client:
                   "vibe" (Mistral Vibe) — its tool list never changes after
                   start, so every other tool is named as a call_tool call,
                   and images cost its prompt cache, so screenshots go to files
                   (implies --screenshots-to-files). Default: "default".
  --graph[=<path prefix>]
                   Print the project as text and exit: a map of every component,
                   then each component's nodes, parameters, function code and
                   wires, on one page a reader can grep. With a prefix ("Pages/"
                   or "Pages/Home"), only those components' sections; the map is
                   always the whole app. Nothing is served and nothing is written.
  --version        Print version and exit.
  --help           Show this help.

Example MCP client configuration:
  { "command": "noodl-mcp", "args": ["/path/to/project", "--allow-writes"] }

  and with no project yet:
  { "command": "noodl-mcp", "args": ["--allow-writes"] }
`;
