---
id: NPMAUDIT-MAINTS
title: Two packages name unshipped typescript as their main
status: fixed
severity: medium
area: mcp, preview / package.json
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: preview
---

`@nodegx/mcp@0.2.5` and `@nodegx/preview@0.2.4` both declare `"main": "src/index.ts"`, which re-exports files not in the tarball: `require('@nodegx/preview')` fails MODULE_NOT_FOUND. mcp's devDependencies name unpublished workspace packages (`@nodegx/kit-catalog: "*"`, `@nodegx/kit-scaffold`, `@nodegx/module-inject`). preview's bin error text tells users to run `npm --prefix packages/noodl-preview run build`. Fix: drop `main` (bin-only) or point it at a shipped dist entry.

**Fixed 2026-10-23 (opennoodl-d7).** Both packages are bin-only, so `main` is gone from both `package.json`s rather
than pointed at a bundle nobody imports: nothing in the repo or in nodegx-studio resolves either package by name
(searched: imports, `require.resolve`, tsconfig paths, jest and webpack configs; only bins and file paths inside the
package are used). The preview's two bins now say what an npm user does when `dist/` is missing (install it again)
before what a checkout does (build it). Left as they are: mcp's `devDependencies` on the unpublished workspace
packages (npm never installs a dependency's devDependencies, so a stranger's install does not read them).
