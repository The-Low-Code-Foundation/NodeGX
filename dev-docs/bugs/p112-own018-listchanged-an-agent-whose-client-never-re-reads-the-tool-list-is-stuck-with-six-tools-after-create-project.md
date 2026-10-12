---
id: P112-OWN018-LISTCHANGED
title: "An agent whose client never re-reads the tool list is stuck with the six bootstrap tools after create_project — it can scope an app but never build it (Mistral Vibe 2.26.1; any client that ignores tools/list_changed)"
status: fixed
commit: 4a18723fe
severity: high
area: mcp / bootstrap mode and tool disclosure (`packages/noodl-mcp/src/cli.ts` bootstrap, `src/tools/createProject.ts` :589-593, `src/tools/disclosure.ts` :306-307, `--all-tools`)
found: P112 OWN-018 round 1, 2026-10-12 (Mistral Large 4 in Mistral Vibe 2.26.1, from the 0.2.0 tarballs packed at `9505d342d`)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §7
---

`npm create nodegx` registers the server with no project (`npx -y @nodegx/mcp@0.2.0 --allow-writes`), so it starts in
bootstrap mode with 6 tools. `create_project` and `open_project` bind it and announce the rest with
`notifications/tools/list_changed`. Claude Code re-lists; Mistral Vibe 2.26.1 builds its tool namespace once per
session and never does. Round 1's agent scoped and created `studio-hub` correctly, then spent 10 turns searching for
tools that weren't there ("The session's tool list still only has the 6 original tools"). It can't restart its own
client's server from inside the session, so the round could not build anything.

Measured with the MCP SDK against the 0.2.0 tarball (tools advertised):

| flags | before `create_project` | after |
|---|---|---|
| `--allow-writes` | 6 | 24 |
| `--allow-writes --all-tools` | 6 | 116 |

`--all-tools` is the documented escape for a client that ignores `list_changed`, but it changes nothing in bootstrap
mode: a client that never re-lists sees 6 either way. The two sentences the server gives such a client are also two
different repairs: `create_project` says *restart the server with the project directory as its argument*,
`find_tools`' disclosure says *restart the server with --all-tools*. A person in Vibe would have to edit
`~/.vibe/config.toml` twice.

**Proposed (smallest first; needs a ruling):**
1. A server started in a folder that holds exactly one project binds to it (as `list_projects` already reads that
   folder), so the repair for any client is *"restart your agent"* — one sentence, no config edit. And the two
   sentences become one: restart with the project folder and `--all-tools`.
2. A resident dispatcher in bootstrap (`call_tool {name, arguments}`, schemas from `find_tools`), so a non-refreshing
   client can reach every tool in the same session. Costs one resident tool against AWP-006's budget.
3. `create-nodegx` names the other agents' configs (Vibe's `config.toml`, Cline, Codex) in its closing lines.

**Fixed 2026-10-12 (OWN-018 s1), option 2 — ruled "Both", built one (see below).** `call_tool {name, arguments?,
describe?}` is resident in every mode (`src/tools/disclosure.ts` `registerCallTool`): it runs any registered tool
through that tool's own input schema and handler, advertised or not; `describe: true` returns its description and JSON
schema; a refusal comes back as an answer `{ok: false, tool, error}` so Vibe's default harness shows it too
(P112-OWN018-OPAQUEERRORS). Unbound, a project tool gets `ProjectBinding`'s own no-project refusal. The bound note,
`find_tools`' reveal note and `create-nodegx`'s agent notes name it. Resident surface unchanged at 8,279/8,280: five
resident descriptions were shortened, same content. Spec `tests/own018CallTool.test.ts` (6, a client that lists once;
sabotage of the handler call turns 3 red).

**Option 1 (a folder with one app binds on start) was not built:** a server binds once, so it would stop a Claude Code
user with one app in the folder from creating a second one there; `call_tool` already gives a fresh sitting every tool.
Raised with Richard in OWN-018 §8.
