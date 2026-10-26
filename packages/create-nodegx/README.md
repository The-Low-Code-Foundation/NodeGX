# create-nodegx

Sets a folder up so your AI agent can build [NodeGX](https://nodegx.io) apps in it.

```
npm create nodegx my-apps
cd my-apps
claude
```

Then say what you want to build. Your agent talks it through with you, makes the app in a folder inside `my-apps`,
and builds it. To see it running:

```
npx @nodegx/preview my-apps/<your app> --open
```

To try it on your phone, on the same Wi-Fi: add `--host 0.0.0.0`, and open the address it prints on the phone. The
address carries a token, so nobody else on the network can open it without being handed the whole link.

The command writes `my-apps/.mcp.json`, which gives your agent the NodeGX server (`@nodegx/mcp`, pinned to the
version this release was made with), a short `CLAUDE.md` and `AGENTS.md` that tell the agent apps here are NodeGX
apps, the same server for Mistral Vibe (`.vibe/config.toml`) and OpenCode (`opencode.json`), and one skill,
`.claude/skills/nodegx-your-own-editor/SKILL.md`: how your agent builds you an editor of your own for these apps, from
the published kit. It never touches your global agent settings, never replaces a file you already have, and if
`.mcp.json` already has a server called `nodegx` it leaves it alone.

Not using Claude Code? Any agent that speaks MCP can use the same server: `npx -y @nodegx/mcp@<version> --allow-writes`
over stdio.

You can open the app in the NodeGX visual editor whenever you like. It is the same project, and nothing needs
converting.

## Licence

GPL-3.0-only. The source is in [The-Low-Code-Foundation/NodeGX](https://github.com/The-Low-Code-Foundation/NodeGX),
under `packages/create-nodegx`.

The project it creates isn't under the GPL. Its pages, data and assets belong to whoever builds it, and the
runtime it runs on is MIT.
