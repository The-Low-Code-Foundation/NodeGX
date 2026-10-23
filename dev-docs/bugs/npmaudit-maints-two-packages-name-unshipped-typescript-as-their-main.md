---
id: NPMAUDIT-MAINTS
title: Two packages name unshipped typescript as their main
status: open
severity: medium
area: mcp, preview / package.json
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: preview
---

`@nodegx/mcp@0.2.5` and `@nodegx/preview@0.2.4` both declare `"main": "src/index.ts"`, which re-exports files not in the tarball: `require('@nodegx/preview')` fails MODULE_NOT_FOUND. mcp's devDependencies name unpublished workspace packages (`@nodegx/kit-catalog: "*"`, `@nodegx/kit-scaffold`, `@nodegx/module-inject`). preview's bin error text tells users to run `npm --prefix packages/noodl-preview run build`. Fix: drop `main` (bin-only) or point it at a shipped dist entry.
