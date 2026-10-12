---
id: P112-S14-PERSONKEY
title: "On the npm path a person cannot put an API key on their backend without handing it to the agent, so the key goes through the chat (and, in a video, on screen)"
status: fixed
commit: (this session's commit)
severity: medium
area: mcp / function secrets (`packages/noodl-mcp` `set_function_secret`, the only writer of the `functions` namespace on the npm path; `packages/nodegx-backend/src/config/SecretsStore.ts` `FUNCTION_SECRET_ENV_PREFIX`; `packages/noodl-mcp/bin/noodl-mcp.js` has no subcommand)
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7
---

A person who set up a folder with `npm create nodegx` and wants a cloud function that calls Google has three ways to
get their key onto the backend:

1. Give it to the agent, which calls `set_function_secret {name, value}`. The value goes through the model's context
   and the chat transcript. In the planned tutorial video it would also be on screen.
2. Set `NODEGX_SECRET_<NAME>` in the environment of the backend. The MCP server starts the backend, so in practice
   that means the `env` block of `.mcp.json`, a project file that git sees.
3. Hand-edit `~/.noodl/backends/<id>/secrets.json` under `"functions"`. Nothing tells them the id or the shape.

Nothing on the npm path is a person-side command that writes the secret without the agent seeing it. The `nodegx-backend`
CLI has `--token` and `--require-secrets`, neither of which writes a function secret. Measured while setting up
OWN-015 AC1's stranger round: Claude Code's own safety check refused to hand the real key to a fresh agent in its
first message ("Credential Leakage"), which is the same judgement a careful viewer would make. Richard ruled that the
round runs with the agent never seeing the key (2026-10-12).

**Question for the fix:** a person-side command, e.g. `npx @nodegx/mcp secret set GEMINI_API_KEY` that reads the
value from a hidden prompt (or stdin) and writes the bound backend's `functions` namespace, named by
`set_function_secret`'s own description and by a Secret node's "not provisioned" error as the first way? Or a
tool that asks the person for the value through the client (MCP elicitation), so the value goes from the person to
the server and never into the model's context? The first works in every client today; the second needs a client
that supports elicitation.

**Ruling (Richard, 2026-10-12):** *"Can't the user add the key to a .env … the user just pastes the API key right
after the = … then Claude runs a script that sends it to the server? We need a better solution than tech noobs having
to paste terminal commands."*

**Fixed:** `set_function_secret` takes `value` only when the person typed the key to the agent on purpose. Without a
`value`, the first call writes `NAME=` into the project's `.env` (a plain-words header the first time, mode 0600) and
adds `.env` to `.gitignore`. It returns `tellThePerson`: open `.env` in the project folder, paste the key right
after the `=`, save, and say done. The next call reads the line (optional quotes, `export`, CRLF) and sends it to the
backend. The result carries the key's length and never its value. The tool's description says never to open `.env`
and never to ask for a key in the chat. `.env` was already outside every deploy (`ignore.ts`). The preview served
it, which is fixed separately as P112-S14-ENVSERVED. Specs: `tests/own015EnvSecret.test.ts` (11, how a person writes
`.env`; the placeholder never touches a filled line) and the end-to-end case in `tests/provision.test.ts`'s real-backend
block: the canary is in no result and is in the backend's `secrets.json`. A mutant that echoes the value turns it red.
