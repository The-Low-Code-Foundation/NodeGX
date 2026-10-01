---
id: P96-FED005-R10
title: A cloud component's description never reaches its MCP tool, so every tool says "Run the cloud function X"
status: open
severity: medium
area: export / cloud functions → backend MCP
found: P96 FED-005 (register R10), 2026-09; hit again by P78 Digital Bricks Training sprint 55 (TASK-L189), 2026-10-01
evidence: dev-docs/tasks/phase-96-the-backend-carries-a-feed/FED-005-A-BACKEND-SPEAKS-MCP.md §5.7; NEXT-SESSION-PROMPT.md R10 ("unowned — an editor phase")
---

An author writes a description on a cloud component in the editor, for the model that will call it as a
tool. A model connected over MCP never sees it: every tool is described generically from its name and ports.
A model choosing between nine tools is choosing on names alone.

**Where.** `noodl-editor/src/editor/src/utils/exporter/util.ts`: `exportComponent` builds
`{name, nodes, connections, ports, roots, metadata}` and drops `ComponentModel.description`. FED-005 builds
the tool description from what the bundle carries, so the backend side is already ready to use one.

**Cost already paid.** The Digital Bricks Training template had to carry its whole writing brief as a TOOL
(`authoringGuide`) and tell the model to call it first, because the description that should have said so
cannot be delivered.

**Proposed fix.** Carry `description` in `exportComponent` (and in the template's
`tools/deploy-functions.mjs`, which assembles bundles the same way), and prefer it in FED-005's tool
description when present. Small; it was filed as an editor change and has had no owner since.
