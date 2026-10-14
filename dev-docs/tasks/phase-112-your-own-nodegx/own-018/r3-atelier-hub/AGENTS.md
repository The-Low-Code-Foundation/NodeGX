# Atelier Hub

The design agency's internal app, self-hosted in Europe: clients and projects (status + owner), a team wiki anyone can edit, a team feed that auto-posts when a project is marked Done, and an "Ask" box answered by Mistral mistral-large-4 via a server-side function.

## How to change this app

The component graphs under `components/` are generated files. Editing that JSON by hand skips schema validation, the semantic checks, and the bookkeeping that keeps the registry and the router in step — the result usually loads, which is what makes it expensive to find later.

Use the `nodegx-atelier-hub` MCP server instead. Claude Code finds it in `.mcp.json`; any other agent needs it registered once, as a stdio server running this, with `<this folder>` the full path of this folder:

```
npx -y @nodegx/mcp@0.2.0 <this folder> --allow-writes
```

## Where the decisions are

- `docs/BRIEF.md` — what the app is and who opens it
- `docs/ARCHITECTURE.md` — how it is put together
- `docs/CONVENTIONS.md` — rules this project agreed to follow, and worth checking work against
- `docs/decisions/` — what was considered and deliberately not done, with reasons

## A note on `.mcp.json`

It names absolute paths belonging to this machine’s NodeGX install, so it is listed in `.gitignore` — committed, it would point a teammate’s agent at a path that does not exist on their disk. It is written when a project is created **and whenever the project is opened in NodeGX without one**, so a checkout cloned from git gets its own on first open. Nothing here is ever overwritten: edit either file and it stays edited.
