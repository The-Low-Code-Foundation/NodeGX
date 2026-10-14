# OWN-015 s14: the stranger round's scripts, kept as they ran

Copied from the session's scratchpad (2026-10-12), with the scratchpad paths they used left as they were. Read them
as a record of OWN-015 §7–§8; to run them again, change the paths. None of them contains a key: the key went from
the checkout's `.env` straight into the backend's `secrets.json` by `put-key.py`, which Richard ran (R26 replaces
this with `set_function_secret` reading the project's `.env`).

- `sentence-round1.txt`, `sentence.txt`: the one sentence each round got (round 2 adds "Using NodeGX,").
- `run.mjs`: `claude -p` (Sonnet) in the folder `create-nodegx` made, the MCP from the 0.2.0 tarball, `HOME` empty.
- `stack.mjs` / `deploy-repaired.mjs`: bring the round's backend back (`provision_backend`, `force` as 0.2.0 says)
  and deploy, staying up because the backend stops with its server.
- `render.mjs`: `render_report` on the round's project through the tarball.
- `drive.mjs`: headless Chrome (`--use-mock-keychain`), Home → lesson → tap a phrase, wait for `playing`, capture
  every request and search it for the key with a known-firing control.
- `put-key.py`: the key from `.env` into the backend's `secrets.json`, printing only its length.
