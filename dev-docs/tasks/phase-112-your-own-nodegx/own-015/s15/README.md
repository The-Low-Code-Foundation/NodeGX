# OWN-015 s15: the AC1 round's scripts, as they ran

Paths point at the s15 session's scratchpad. None holds a key. `drive.mjs` reads the checkout's `.env` in-process
only to search for the key, and never prints it. The key reached the backend through the project's `.env`, which
Richard filled, and `set_function_secret` (`stack.mjs` polls it).

- `sentence.txt`: s14's round-1 sentence (no "NodeGX").
- `run.mjs`: `claude -p` (Sonnet) in the folder the packed `create-nodegx` made.
- `stack.mjs`: day two. Packed MCP, `open_project` → `provision_backend` (no force) → `validate_project` → poll
  `set_function_secret` until the `.env` line is filled.
- `drive.mjs`: s14's drive with the probe on `HTMLMediaElement.prototype.play` (a detached `Audio` never reaches
  `document`).
- `peek.js`: the round's tool calls, cost and turns from `agent.jsonl`.
