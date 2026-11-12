---
id: P127-BKO006-TABLESNOTINFILES
title: The tables and columns an agent declares reach the backend and never the project, so an agent-built app's schema lives on one machine
status: fixed
severity: medium
area: "noodl-mcp `provision_backend` (`src/tools/provisionTools.ts`): seeded the backend with the agent's `collections` and wrote only `metadata.cloudservices`; nothing on the agent's side wrote `metadata.dbCollections`, where the editor keeps a project's schema (`SchemaHandler._store`, `decideSchemaCache`)"
found: P127 BKO-006, 2026-10-27, the book club brief's "open" grade (a stranger's Opus agent, npm kit 0.2.7)
evidence: "MEASURED: `briefs/grade.mjs` on the book club — the backend has Book (title, author, rating Number, status, ownerEmail) and Digest (5 columns); `nodegx.project.json` metadata = { cloudservices } only: 'the table Book is in the project's files (metadata.dbCollections) — declared: []'. READ: no noodl-mcp source writes dbCollections. A backend started for the project from its files (Studio's Start a backend, which seeds from dbCollections) began with no tables."
kit: mcp
regression: packages/noodl-mcp/tests/p127ProvisionTables.test.ts
owner: P127 BKO-006
commit: 2fde69490
---

What a person sees: nothing, on the machine the agent built on. The project's files carry the app's rules, functions
and automations (BKO-001) but not its tables: a copy of the folder, a git clone or a fresh backend has no Book table
until a row lands, and its column types (rating is a number) are nowhere in the files.

Fixed: `provision_backend` seeds the backend from the tables the project already declares (the agent's named ones
winning), then writes the backend's tables into `metadata.dbCollections`, the value the editor caches there on open.
The answer says so (`project: { file, written, tables }`). Not covered: a column a later write adds on the backend
reaches the file the next time the editor or Studio opens the project, or the next provision.
