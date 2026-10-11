---
id: P107-S86-NODEIDSCOPE
title: The port-context builder found a node by its id across the whole project — a node whose id another component also uses was drawn from the other node's wires
status: fixed
severity: medium
area: packages/nodegx-project-contract/port-context.ts `findPortNode` / `portContextReader`; packages/noodl-mcp/src/specPorts.ts `drawnPortsFor` (`get_component`'s `drawnPorts`, R19 part 1); the drive's fake graph (noodl-runtime/test/node-spec/nsp-020-port-context.test.ts `projectGraph`)
found: P107 NSP-020 s86 (R19 part 2), 2026-10-11 — reading the builder before giving the wire check a node to draw
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §6.10
kit: project-contract
regression: packages/nodegx-project-contract/tests/port-context-node-scope.test.ts
commit: (s86, this session's R19 part 2 commit)
---

`portContextReader(project)(nodeId)` looked the node up with `findPortNode(project, nodeId)`: the FIRST component holding
a node with that id. A node id is unique within a component, not across a project. **27 of Richard's 117 local projects
reuse one in a second component (77 nodes)** — components copied on disk (the MCP itself gives a node it writes a fresh
id, `both` → `both-2`). The second node was handed the first one's wires, so `get_component` drew an And wired at
`input 2` as if wired at `input 0`, and the R19 wire check would have judged its wires against another node's ports.

The drive that graded the builder on 7,812 nodes looked both sides up the same way (the hook's fake graph by id too), so
both read the same wrong node and agreed.

**Fixed:** `findPortNode(project, nodeId, componentName?)` and the reader take the component's legacy name; the MCP
and the drive pass it. Without it, the first node is read as before. Planted: the lookup with the component ignored
turns `nsp020WireCheck.test.ts` "get_component draws each node from its own component's wires…" red.

**Plain words:** *"In a project where a component was copied, the agent was shown the ports of the original's node
for the copy's."*
