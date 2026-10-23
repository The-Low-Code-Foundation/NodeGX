---
id: P112-OWN026-WIREWRITECOST
title: A wire costs about 128 characters to write, and the one line read_graph prints it as was refused by every write door
status: open
severity: medium
area: mcp authoring (`packages/noodl-mcp/src/tools/author.ts`, `planTools.ts`, `vocabulary.ts`)
kit: mcp
found: P112 OWN-026 t2-nodegx-c03, 2026-10-23; FIX-04 A
evidence: t2-nodegx-c03 sittings/1/agent.jsonl — 486 connections were 61,433 of the 152,195 characters written through create_component / update_component (41%); defaults 479 characters, x/y 0
---

The graph as text prints a wire as `a.click -> b.run`, but `create_component`, `update_component` (`set` and
`operations`) and `stage_plan_operation` took a connection only as a four-key object, and an `add_connection` as
`{"op": "add_connection", "connection": {…}}`. A new feature therefore cost about 1.6× the characters as graph
operations as the same feature as code (152k against the code arm's 90k). Nothing else in the writes was waste: the
model already left defaults and positions out.
