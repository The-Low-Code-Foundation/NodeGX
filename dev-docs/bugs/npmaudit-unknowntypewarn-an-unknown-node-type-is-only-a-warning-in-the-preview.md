---
id: NPMAUDIT-UNKNOWNTYPEWARN
title: An unknown node type is only a warning in the preview
status: needs-ruling
severity: medium
area: preview / validator
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: preview
---

`@nodegx/preview@0.2.4` reports `unknown-node-type "Countr"` (suggestion `Counter`) as a WARNING and renders anyway, while `@nodegx/mcp`'s write validator refuses the same type. The published `@nodegx/project-contract` validator passes it (and a dangling wire) entirely: it is shape-only, the semantic validator lives only inside the editor/preview bundles. Ruling: should an unknown type be an error everywhere, and should the semantic validator be published?
