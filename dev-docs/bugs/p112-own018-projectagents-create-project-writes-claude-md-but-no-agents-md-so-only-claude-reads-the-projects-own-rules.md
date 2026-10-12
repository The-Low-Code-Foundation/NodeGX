---
id: P112-OWN018-PROJECTAGENTS
title: "create_project writes the project's CLAUDE.md but no AGENTS.md, so only Claude reads the project's own rules (\"use the MCP server, don't hand-edit components/\") — the same gap NOTNODEGX closed for create-nodegx's folder"
status: fixed
severity: medium
area: mcp / create_project (`packages/noodl-mcp/src/tools/createProject.ts` BST-005, :676-680)
found: P112 OWN-018 round 1, 2026-10-12 (the `studio-hub` project Mistral Large 4 created in Mistral Vibe)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §7
---

`create-nodegx` writes `CLAUDE.md` and `AGENTS.md` (P112-S14-NOTNODEGX, ruled: both). `create_project` writes the
project's own note only as `CLAUDE.md` (1,552 bytes: the brief in one line, *"Editing that JSON by hand skips schema
validation … Use the `nodegx-studio-hub` MCP server instead"*, where the decisions are). Mistral Vibe, Codex, Cline
and most other agents read `AGENTS.md`. A person who opens their agent in the project folder on day two gets none of
it, and the registration it points at is `.mcp.json`, which Vibe doesn't read either.

**Proposed:** write the same text as `AGENTS.md` beside `CLAUDE.md` (absent-only, as `create-nodegx` does), and say in
it how to register the server for an agent that doesn't read `.mcp.json` (the one stdio line).

**Fixed 2026-10-12 (OWN-018 s1):** `installAgentConfig` writes `AGENTS.md` beside a `CLAUDE.md` it writes (never
beside the person's own `CLAUDE.md`, never over an `AGENTS.md`); same text except the server paragraph, which gives
the stdio command with the project folder as `<this folder>` (the file is committed and travels in templates, and the
absolute path names the machine's user). Backfill and the docs upgrade carry it. Deploy already excluded `AGENTS.md`.
Specs: 5 new in `tests/agentConfig.test.ts` (39 green); editor `fb-005`, `mcp-001`, `p112` deploy specs green (326).
