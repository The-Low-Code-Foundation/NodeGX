---
id: NPMAUDIT-PREVIEWWARNINGS
title: The preview state endpoint reports no warnings while the cli prints three
status: open
severity: low
area: preview / __preview/state
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: preview
---

`@nodegx/preview@0.2.4` on a project with three `raw-spacing-literal` findings prints '! 3 validation warning(s) — rendering anyway' but `GET /__preview/state` returns `warnings: []`. A tool polling the endpoint sees a clean project.
