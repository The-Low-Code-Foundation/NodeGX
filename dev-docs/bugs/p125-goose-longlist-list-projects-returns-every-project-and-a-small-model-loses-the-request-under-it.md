---
id: P125-GOOSE-LONGLIST
title: list_projects returns every project the machine has seen (71 rows here), and a small local model loses the person's request under the result before its second call
status: open
severity: medium
area: mcp `list_projects` (`packages/noodl-mcp/src/tools/listProjects.ts` `registerListProjectsTools`)
found: OWN-030 side test (Goose + Gemma 4 E4B), 2026-10-29; Richard: "the poor model gets fucked up every time it uses list projects, because the list is enormous"
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-030/goose/FINDINGS.md (finding 7); `~/.noodl/known-projects.json` holds 60 rows, every one an OWN-029/030 lab project in `NodeGX test projects/`, plus 11 from the editor's recent list
kit: mcp
phase: P125 (agent surfaces)
regression: packages/noodl-mcp/tests/p125GooseNoEval.test.ts "P125-GOOSE-LONGLIST"
---

What a person sees: they ask a local model in a chat app to open their project. It lists the projects, then answers
something unrelated, or calls the wrong tool.

Cause: `list_projects` returns every row from the editor's recent list, from `~/.noodl/known-projects.json` (every
project an agent made or opened, which includes every lab run) and from the server's folder, with no cap and no way
to search. On a machine that runs harnesses, the result runs to thousands of tokens, and a 4B model with a
32k window loses the request beneath it. (Under Ollama's default 4096-token window, everything before the
result is cut off outright.)

Fix (in source, uncommitted, 2026-10-29): at most `LIST_PROJECTS_CAP` (10) newest rows, a `more` count, and an
optional `query` (part of the name, case-insensitive) that searches past the cap. The note says when rows are
hidden. Separately, a host can scope the remembered list with `NODEGX_KNOWN_PROJECTS` (Goose's entry now points at
`NodeGX Gemma projects/.known-projects.json`).

Not done: the lab harnesses still write their throwaway projects into the person's `~/.noodl/known-projects.json`.
They should set `NODEGX_KNOWN_PROJECTS` to a lab file.
