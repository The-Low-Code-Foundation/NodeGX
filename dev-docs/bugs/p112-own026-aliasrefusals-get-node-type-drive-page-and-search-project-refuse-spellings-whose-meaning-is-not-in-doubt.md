---
id: P112-OWN026-ALIASREFUSALS
title: get_node_type, drive_page and search_project refuse argument spellings whose meaning is not in doubt, a turn each
status: open
severity: low
area: mcp tool arguments (`packages/noodl-mcp/src/tools/unknownArguments.ts`, `disclosure.ts` call_tool, `catalogTools.ts`)
kit: mcp
found: P112 OWN-026 t2-nodegx-c01…c03, 2026-10-23; FIX-04 C
evidence: refused calls by the server's message, c01–c03 — get_node_type 11 (typeName ×3, node_type ×3, nodeType, ports true ×2, detail "brief", nine names past the cap of 8), drive_page wait_for text_contains 7, search_project query 1
---

Each refusal named the right spelling, and the next call was right, so each was a turn and a re-read with nothing
learned. `wait_for: { text_contains }` was refused although a target takes `text_contains` and `wait_for.text`
already matches part of the page's text.
