---
id: P112-S5-REPARENTINDEX
title: "An agent reparenting a node through update_node could not say where among the new parent's children it goes — the child always landed last"
status: fixed
severity: low
area: mcp / update_component operations (`packages/noodl-mcp/src/graph.ts` update_node, `tools/author.ts` the set schema)
found: P112 OWN-006 s5, 2026-10-10 — the editor suite's first run with the MCP as an adapter
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-006-THE-EDITOR-SUITE.md §6.1; the small fixture's edit "add_child home-title → home-box at 0" produced `"children" is ["home-count","home-title"]; the official editor saves ["home-title","home-count"]`
regression: packages/noodl-mcp/tests/editorSuite.test.ts "small: the MCP saves what the reference saves" (red with the index ignored)
fixed: P112 OWN-006 s5, 2026-10-10 — `update_node.set.index` (0 = first; appended when absent), read with `parent`
commit: 6e88589d0
---

`add_node` could place a new node at an `index` among its parent's children; `update_node.set.parent` could only
append. So the one way to put an existing node first in a row (what a person does by dragging it there) was to
remove and re-add it, which loses its wires. The editor suite's small fixture reparents a node to position 0 of a
parent that already has a child; the reference writer puts it first, the MCP put it last.

**Fix:** `set.index` beside `set.parent`, clamped to the children range, used only with a reparent (the
`children` field itself stays unacceptable by AWP-002 A19: it is reconciled from `parent`). The tool schema names it
in one sentence.

**Plain words:** *"When the AI moved a block into another block, it could only drop it at the end, never first or
in the middle. Now it can say where."*
