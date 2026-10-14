---
id: P112-OWN019-BACKENDSESSION
title: "An npm-kit app's local backend runs only while an agent's MCP session is open — after the session the app's Records and saves fail, and nothing tells the person how to start it again"
status: fixed
phase: P112
task: OWN-019
severity: high
area: mcp / backend lifetime (`packages/noodl-mcp/src/backend/provision.ts` — `spawn(…, { detached: false })`, reaped with the server; `provision_backend`'s description: "The backend stops when this server does"); noodl-preview does not start one (`projectExport.ts` keeps the loopback endpoint only)
found: P112 OWN-019 s4, 2026-10-14 (the "your own editor" brief: E1 Large 4, SE1 Sonnet — both chose the local backend, as the brief's "for everyone on this computer … start it again tomorrow" asks)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/noodl-preview/tests/own019-own-backend.test.ts "starts it, records itself as its owner, and the backend dies with the preview (even a SIGKILL)"
kit: preview
---

Both editor apps grade 13/13 — but only because the grader (and the gallery) start the backend themselves, through
the packed MCP with the round's HOME and `provision_backend` by name (which reuses the same data). A person who
closes Vibe and comes back tomorrow has a project pointing at `http://127.0.0.1:<port>` with nothing listening; the
preview serves the page and every Record fails. Read from source: the backend is a non-detached child of the MCP
server, stopped when it stops and reaped on its next start.

**Proposed (to rule):** `noodl-preview` starts the project's own local backend when its endpoint is loopback and the
backend exists under ~/.noodl/backends (the gallery's keeper does exactly this), or `npx nodegx start` does both;
create-nodegx's closing lines say how. Until then a backend app from the npm kit is not "kept for tomorrow".

**Ruled (R38, Richard 2026-10-14 ~14:20): "Preview starts it."** **Fixed (s5):** `@nodegx/preview` starts the backend
the project names (`metadata.cloudservices`, type nodegx, loopback endpoint) when its folder exists under
`~/.noodl/backends` and nothing answers on its port, and stops it with the preview (`src/ownBackend.ts`; `--no-backend`
opts out). It plays by the other two spawners' rules: `--parent-pid` (a SIGKILLed preview's backend is gone within
~5 s — measured in the regression), a `runtime.json` record with owner kind `preview` and a 10 s heartbeat, so an
agent's `provision_backend` ADOPTS it (`packages/noodl-mcp/tests/own019PreviewOwnedBackend.test.ts`: same pid, same
port) instead of starting a second SQLite writer; a backend already running is used, never restarted; it looks again
every 10 s, so an app whose agent session ended gets its backend back. The package ships the service
(`dist/backend/cli.js`, built at prepack by noodl-mcp's `build-backend-copy.mjs --out`; +4.6 MB unpacked). The kit
says it: create-nodegx's notes and closing lines and the Vibe AGENTS.md ("it starts the app's own backend too … how
the app opens again another day"). Control: on HEAD the preview starts nothing. Ships in tgz31 — NOT in the s5
series kit (tgz30), which the graders run with their own backends.
