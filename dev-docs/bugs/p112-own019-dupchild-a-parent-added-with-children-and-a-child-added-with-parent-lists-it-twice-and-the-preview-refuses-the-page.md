---
id: P112-OWN019-DUPCHILD
title: "update_component's add_node lists a child twice when its parent was added with `children` naming it and the child with `parent` — the packed preview then refuses the page as 'duplicate node id', while validate_project says 0 errors"
status: fixed
phase: P112
task: OWN-019
severity: high
area: noodl-mcp write path (`packages/noodl-mcp/src/graph.ts` — `applyOperations` add_node, `reconcileHierarchy`)
found: P112 OWN-019 s2, 2026-10-13 (the Sonnet yardstick for the second brief, `sentence-pack.txt`, kit tgz14)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s2)
regression: packages/noodl-mcp/tests/operationsWritePath.test.ts "P112-OWN019-DUPCHILD"
kit: mcp
---

Sonnet built "Pack It" through one `update_component` on `Pages/Home` whose operations added a Group with
`children: ["title_text", "add_form", …]` and then each child with `parent: "shell"` — both sides of the bookkeeping,
as `reconcileHierarchy`'s own doc says agents may. `add_node` spliced each child into its parent's `children` on its
own add without looking, so every child was listed twice (`band → ["shell","shell"]`, `shell` → ten entries for five
children). `reconcileHierarchy`, run after the batch, fills a missing side but never removed a repeat.

What a person saw: `npx @nodegx/preview pack-it` showed **"38 diagnostics — waiting for a valid graph"**, all
`duplicate-node-id` ("2 nodes share 'shell'", "4 nodes share 'title_text'") — every reader that walks `children`
builds the node once per entry. What the agent saw: `validate_project` 0 errors (it reads `nodes` flat: 19 nodes, no
repeats), and 11 `drive_page` runs that passed. It reported the app done.

**Fixed:** `reconcileHierarchy` keeps each child once (the first entry, the author's order) — every write path runs it
— and `add_node` no longer appends a child its parent already lists. Control arm: both regression tests fail with the
fix reversed. Apps already written heal at their next write through the server.
