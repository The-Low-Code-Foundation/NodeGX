---
id: NPMAUDIT-EXPORTQUERYFIELD
title: A query fed into for each exports cards with no title
status: open
severity: high
area: export / For Each + Query Records
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

Exporting the MCP's `repeater-query-records` example: the field mapping (`title`) from the queried record into the repeated card is dropped, so the cards render empty. Also: Array Map has 'no rule yet', Global Store with persist is refused, a Receive Event → refetch handler exports with an empty body, a Static Data → Filter → Map For Each is deferred to 'EXP-003'.
