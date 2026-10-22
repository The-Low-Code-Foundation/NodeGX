# Le Gala de danse

A dance-school gala management game (French/English) converted from a plain-JS + three.js game: every screen, tab, list and the game state are NodeGX nodes; the 3D view, the synthesised music and the gala-rules engine stay code in Function/Script nodes. Grown-ups can change the game's tables (step names and difficulty, prices, starting stars, new costumes and steps) through a guarded settings page, stored in the backend.

## How to change this app

The component graphs under `components/` are generated files. Editing that JSON by hand skips schema validation, the semantic checks, and the bookkeeping that keeps the registry and the router in step — the result usually loads, which is what makes it expensive to find later.

Use the `nodegx-app` MCP server instead. Claude Code finds it in `.mcp.json`; any other agent needs it registered once, as a stdio server running this, with `<this folder>` the full path of this folder:

```
npx -y @nodegx/mcp@0.2.4 <this folder> --allow-writes
```

## Where the decisions are

- `docs/BRIEF.md` — what the app is and who opens it
- `docs/ARCHITECTURE.md` — how it is put together
- `docs/CONVENTIONS.md` — rules this project agreed to follow, and worth checking work against
- `docs/decisions/` — what was considered and deliberately not done, with reasons

What the person asked for is quoted word for word in `docs/decisions/000-initial-scope.md` ("What was asked
for"). Build anything they spelled out (names, lists, wording, order) from that quote, and read it again after
your conversation has been summarised: a summary keeps the gist and drops the exact words.

## A note on `.mcp.json`

It names absolute paths belonging to this machine’s NodeGX install, so it is listed in `.gitignore` — committed, it would point a teammate’s agent at a path that does not exist on their disk. It is written when a project is created **and whenever the project is opened in NodeGX without one**, so a checkout cloned from git gets its own on first open. Nothing here is ever overwritten: edit either file and it stays edited.
