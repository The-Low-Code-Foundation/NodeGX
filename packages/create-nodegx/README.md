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

The command writes one file, `my-apps/.mcp.json`, which gives your agent the NodeGX server (`@nodegx/mcp`, pinned to
the version this release was made with). It never touches your global agent settings, and if `.mcp.json` already
has a server called `nodegx` it leaves it alone.

Not using Claude Code? Any agent that speaks MCP can use the same server: `npx -y @nodegx/mcp@<version> --allow-writes`
over stdio.

You can open the app in the NodeGX visual editor whenever you like. It is the same project, and nothing needs
converting.

## Licence

GPL-3.0-only. The source is in [The-Low-Code-Foundation/NodeGX](https://github.com/The-Low-Code-Foundation/NodeGX),
under `packages/create-nodegx`.
