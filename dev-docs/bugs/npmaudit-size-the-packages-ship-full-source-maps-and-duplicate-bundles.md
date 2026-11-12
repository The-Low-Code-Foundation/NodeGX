---
id: NPMAUDIT-SIZE
title: The packages ship full source maps and duplicate bundles
status: needs-ruling
severity: low
area: packaging / size
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

Unpacked: mcp 43 MB, node-spec 42 MB, export 26 MB, preview 25 MB. node-spec: three 4.7 MB source maps with full TS `sourcesContent`, the 2.1 MB bundle three times, 17 MB of scenarios; preview: two near-duplicate 6.8 MB CLI bundles plus an undocumented 4.4 MB backend; mcp bundles a 4.6 MB backend, 6 MB render harness and 4.3 MB of starter assets. `0.0.0-stage` versions are published beside the real ones. Ruling: what each package needs to carry.
