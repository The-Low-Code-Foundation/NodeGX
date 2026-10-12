---
id: P107-S86-WIREUNCHECKED
title: The agent's checker never refused a wire to a port that a node whose ports appear at run time does not have — For Each `addToBasket` went through as "skipped" and the press did nothing
status: fixed
severity: high
area: packages/noodl-editor/src/editor/src/validation/rules/nonexistentPort.ts branch (3); packages/noodl-mcp (create_component, update_component, plans, validate_component / validate_project)
found: P107 NSP-020 s85 (AC3 research, CMG Drive Looks' featured products), measured in s86, 2026-10-11
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §6.9 (AC3), §6.10 (the measurement)
kit: mcp
regression: packages/noodl-mcp/tests/nsp020WireCheck.test.ts
commit: 306c917e1
---

For the ~50 types whose ports appear at run time (a For Each's row outputs, a Record's columns, a Function's script
ports…), a wire to a name that neither the catalog nor the node's saved lists held was an info, "could not be
statically verified … Skipped", never an error. CMG Drive Looks' featured products wire For Each `addToBasket`; For Each
registers only `itemOutput-` / `itemOutputSignal-` names (foreach.tsx :1081-1096), so the Add to Basket press never
reached the page.

**Measured over Richard's 117 local projects (s86):** 575 wire endpoints were skipped. With R19 part 2 (ruled R19,
"check wires and show ports"), 471 are checked and pass, **99 are refused** — every class read, every one a wire the
runtime never makes: For Each `addToBasket` / `browse` (46, the CMG copies), For Each `item` (8), Set Object Properties
`stored` (22, P107-S86-STOREDWIRE), a Function's `items` / `text` (22: its ports are `in-` / `out-`; FIX-007's rule
already refuses these at a write), Navigate To Path's `id` (`p-id`). 5 stay skipped (types the spec does not draw).

**Fixed:** `ValidatorOptions.drawnPorts`, supplied by the MCP from the spec over the candidate project; the refusal names
the port with the same name after its prefix (`itemOutputSignal-addToBasket`). The editor's own validator does not pass
it yet (a separate question for Richard).
