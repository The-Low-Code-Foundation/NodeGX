# create-nodegx-cline

Sets a folder up so [Cline](https://cline.bot) can build [NodeGX](https://nodegx.io) apps in it.

```
npm create nodegx-cline my-apps
cd my-apps
cline
```

Then say what you want to build, in a paragraph. Cline talks it through with you, builds the app in a folder inside
`my-apps` and checks it in a browser against what you asked for. To see it running:

```
npx @nodegx/preview my-apps/<your app> --open
```

We tested it with the Cline command line (3.0.71) and DeepSeek V4.1 Flash on ClinePass:

```
cline -P cline-pass -m cline-pass/deepseek-v4.1-flash
```

## What it writes

In `my-apps`: an `AGENTS.md` that tells Cline apps here are NodeGX apps, and one skill,
`.claude/skills/nodegx-your-own-editor/SKILL.md`, for building an editor of your own.

Outside it, one entry. Cline reads its MCP servers from a single file in your home folder
(`~/.cline/data/settings/cline_mcp_settings.json`), never from a project folder, so the command adds a server called
`nodegx` there: `npx -y @nodegx/mcp@<version> --allow-writes --screenshots-to-files`. Your other servers stay as they
are. If you already have a server called `nodegx` of your own, it is left alone. Running a newer `create-nodegx-cline`
moves the entry it wrote to the newer server.

It is [`create-nodegx`](https://www.npmjs.com/package/create-nodegx) with its Cline profile: the same server and the
same app format. You can open the app in the NodeGX visual editor whenever you like. It never replaces a file you
already have.

## Licence

GPL-3.0-only. The source is in [The-Low-Code-Foundation/NodeGX](https://github.com/The-Low-Code-Foundation/NodeGX),
under `packages/create-nodegx/cline`.
