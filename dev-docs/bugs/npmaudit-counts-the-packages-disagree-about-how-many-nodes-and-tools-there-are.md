---
id: NPMAUDIT-COUNTS
title: The packages disagree about how many nodes and tools there are
status: open
severity: low
area: docs / counts
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

Node types: 147 pickable / 180 in `node-catalog.json` / 163 reported by the preview runtime / 125 node specs / 'All 130 nodes' (export README) / '18 so far' and '86 specs' (node-spec README). Tools: 4 (mcp README) / 7 measured bootstrap / 89 (`--help`) / 115 measured. `@nodegx/project-contract` README says 'Two modules live here' over a four-row table and '`private: true` for now' though published. The shipped skill lists `nodegx.routes.json` and `nodegx.styles.json`, which a fresh project does not have. `render_report` cites 'README §2's WordPress-starter tell', a README that is not shipped. Fix: generate every count from the catalog at pack time.
