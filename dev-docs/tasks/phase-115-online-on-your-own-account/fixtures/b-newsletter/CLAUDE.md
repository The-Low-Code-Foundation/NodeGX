# Newsletter

A one-page newsletter sign-up: a reader types their email and presses Subscribe, and a cloud function adds them to the mailing list with a key the browser never sees.

## How to change this app

The component graphs under `components/` are generated files. Editing that JSON by hand skips schema validation, the semantic checks, and the bookkeeping that keeps the registry and the router in step — the result usually loads, which is what makes it expensive to find later.

Use the `nodegx-b-newsletter` MCP server instead. It is registered for this folder in `.mcp.json`, so an agent started here is offered it and asks you to approve it once.

## Where the person sees this app

The person this app is for may not read code. They see it in NodeGX Studio (inside the conversation where the agent app can show it, otherwise in its own window), or one part at a time in a mini editor when there is something to decide; the NodeGX editor shows every node and wire. The authoring server's `get_project_info` section `surfaces` has the whole of it.

<!-- canon: For the agent (the rules, not copy) -->
5. A fixed list (a language, a status) is a `Static Data` node holding a JSON array, in its own logic component under
   `Option sets/<Name>` with `Component Outputs` items and count, so Studio lists it as an option set and the NodeGX
   editor shows it as the node it is. Never typed strings in several places.

A part Studio does not edit (a `States` node, a script, a function's insides) is still built; say so, and offer:

<!-- canon: The wiring underneath -->
*"I could make you an editor to tweak that now if you want, or you download the NodeGX editor to get full access and
connect me as an MCP so I can guide you. It's easy and I'll walk you through every step."*

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
