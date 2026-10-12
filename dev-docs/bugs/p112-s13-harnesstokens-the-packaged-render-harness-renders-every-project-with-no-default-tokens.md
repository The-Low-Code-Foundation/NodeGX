---
id: P112-S13-HARNESSTOKENS
title: "The packaged render harness renders every project with no default tokens: it ships a 12-line re-export as its token source"
status: fixed
severity: high
area: render harness packaging (`packages/noodl-editor/package.json` `build.files` → `render-harness/data`; `scripts/devtools/harness-paths.js` `TOKENS_SRC`; `scripts/devtools/render-from-disk.js` `tokenCss` fallback)
regression: packages/noodl-editor/tests-unit/uni-012/harness-packaging.test.ts "ships the token declarations the checkout reads, not a file of the same purpose" (fails on the old mapping: 1 failed, 7 passed)
found: P112 OWN-014 s13, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-014-THE-AGENT-SEES-ITS-APP.md §6
---

**What an agent gets.** `render_report` through the installed NodeGX 0.3.0 renders a project with its own token
overrides and none of the shipped defaults. Every `var(--space-*)`, `var(--radius-*)` and `var(--border-*)` the
project doesn't override resolves to empty, so there's no padding and no gaps. The `body` floor's `var(--font-sans)`
is empty too, so the page falls back to the browser's serif. The report looks like a product-wide spacing defect.
This is the lying harness `harness-paths.js` already describes (the TPL-005 repoint, 2026-09-11), on the packaged
side.

**Why.** HLS-001 moved the token declarations to `@nodegx/project-contract/tokens`, and
`StyleTokensModel/DefaultTokens.ts` became a 12-line re-export. TPL-005 repointed the **checkout** candidate to
`packages/nodegx-project-contract/tokens.ts` and left the packaged one alone (*"a packaged install ships the file
under its old name"*). But the packaging mapping still copies `StyleTokensModel/DefaultTokens.ts`, the re-export, into
`render-harness/data/`. The fallback's regex (`name: '--…', value: '…'`) finds **0** declarations in it, against
**193** in `tokens.ts`. Measured on `/Applications/NodeGX.app` (0.3.0): `render-harness/data/DefaultTokens.ts` is 12
lines with 0 matches. `render_report` never passes `--editor-tokens`, so the fallback is the only path it takes.

**Why no gate saw it.** `tests-unit/uni-012/harness-packaging.test.ts` asserts that every file the mapping names
*exists on disk*. The re-export exists. The gate checks the file is there, not what's in it.

**Fix.** Package `nodegx-project-contract/tokens.ts` itself, as `render-harness/data/tokens.ts`, and point the
packaged candidate at that name. The gate asserts the packaged token source is the same file the checkout resolves to,
not merely that a file exists.
