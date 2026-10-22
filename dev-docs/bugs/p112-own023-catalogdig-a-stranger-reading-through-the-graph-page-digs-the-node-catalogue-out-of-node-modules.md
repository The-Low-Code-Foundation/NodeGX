---
id: P112-OWN023-CATALOGDIG
title: "A stranger that reads an app through the `--graph` page and never opens the server learns what a node type can do by digging `node-catalog.json` out of `node_modules/@nodegx/mcp` with Python"
status: open
severity: low
area: "`@nodegx/mcp` 0.2.5 `--graph` (`src/graphText.ts` header, `src/cli.ts`); the kit's agent note (`create-nodegx` `AGENT_NOTE`)"
kit: core
found: P112 OWN-023 round 3b (the graph as text), 2026-10-21 / 2026-10-22
evidence: "own-023/ROUND-3B-THE-GRAPH-AS-TEXT.md §5; runs-r3/B3-claude/sittings/1.jsonl (5 `node-catalog` commands) and runs-r3/B3b-claude/sittings/1.jsonl (tool calls 20–26: `ls dist src bin`, `sed README.md`, four `python3 -I` one-liners over `dist/node-catalog.json`)"
---

Both Opus arms that were given the page (B3-claude, before the READONLYOPEN wording fix; B3b-claude, after it) read the
whole app through `npx -y @nodegx/mcp@0.2.4 app --graph` and **never opened the project with the server**. The page
told them what every node *is* and how it is wired, but not what a node *type can do*: which ports a `Create User`
has, whether `Update Record` has an `onlyIfUnchanged`, what `jwtsign` needs. Both found the answer the same way: they
went into `node_modules/@nodegx/mcp/dist/`, read the README and ran `python3` over `node-catalog.json` (B3: 5
commands; B3b: 7 tool calls of 32). B3b's PLAN.md part 4: *"I worked out what the backend can do (`createuser`,
`updateuser`, `jwtsign` / `jwtverify`, `onlyIfUnchanged`, `upsertOn`, `allowNoAuth`) from the node catalog inside
`node_modules/@nodegx/mcp`, not from running it."* The DeepSeek arm (B3-vibe) did not dig: it opened the project and
called `list_node_types` / `get_node_type` (3 each).

Why it matters: a plan-only task is the case the page exists for, and on it the strongest model treats the server as
unnecessary (READONLYOPEN's fourth measurement). Whatever it then needs that the page does not carry, it gets from
the package's internals, which are not a documented surface and will move.

Fix, small, one of:
1. The page's header says where the node library is read from: *"What a node type can do (its ports and what they
   mean): `npx -y @nodegx/mcp@<v> --types [<type>]`, or the tool `get_node_type` with the server open."* and the CLI
   grows that flag (the catalogue already ships in `dist/node-catalog.json`; the `list_node_types` / `get_node_type`
   tools already render it).
2. Or the kit note's `--graph` line gains the same sentence.

Verify by re-running B3b's brief: the arm's transcript has no `node_modules/@nodegx/mcp` path in it.
