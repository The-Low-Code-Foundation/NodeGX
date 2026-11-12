---
id: NPMAUDIT-PREVIEWWARNINGS
title: The preview state endpoint reports no warnings while the cli prints three
status: fixed
commit: 6a766a382
severity: low
area: preview / __preview/state
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: preview
regression: packages/noodl-preview/tests/preview.test.ts "a good render reports its validation warnings on the state endpoint, as the cli prints them"
---

`@nodegx/preview@0.2.4` on a project with three `raw-spacing-literal` findings prints '! 3 validation warning(s) — rendering anyway' but `GET /__preview/state` returns `warnings: []`. A tool polling the endpoint sees a clean project.

**Fixed (the Beta sweep s9, 2026-10-25).** The validation report of a build that rendered now travels with it:
`setBuild(build, report)`, so `GET /__preview/state` answers `state: { kind: 'ok', report }` (summary and diagnostics,
the same shape the invalid state carries) and `warnings` adds one line per validation warning
(`<code> in <component> (<node>): <message>`) after the load warnings it already held. Graded:
`tests/preview.test.ts` new case red on a dist built from HEAD's `server.ts`/`cli.ts` → green; the preview suite
110/110 on a dist rebuilt from this tree; preview tsc clean.
