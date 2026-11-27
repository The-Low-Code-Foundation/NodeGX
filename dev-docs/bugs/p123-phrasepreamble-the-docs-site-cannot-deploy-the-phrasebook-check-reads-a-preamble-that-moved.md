---
id: P123-PHRASEPREAMBLE
title: "The docs site cannot deploy: `docs:bubble`'s check looks for `functionPreamble` in `expression.ts`, which moved to `printedcode.ts` on 2026-11-05"
status: fixed
commit: 9963d4894
severity: high
area: "`scripts/bubble-phrasebook/check.js` `assertPreambleMatchesRuntime`; `.github/workflows/deploy-docs.yml` (the `npm run docs-site:build` step)"
found: COMMUNITY-CFSECRETS session, 2026-11-27. The first docs deploy since 2026-10-20 (run 46011873215, on the merge of The-Low-Code-Foundation/NodeGX#57) failed in its build job, so the guide the new `@nodegx/backend` 0.1.3 deploy links to stayed a 404
evidence: "Run 46011873215's log: `Error: expression.ts no longer declares functionPreamble — this checker cannot mirror it` at `scripts/bubble-phrasebook/check.js:73`, then `Refusing to build: a code cell on the phrasebook does not do what its row says.` `10510764b` (P115 HST-013) moved the Expression preamble to `packages/noodl-runtime/src/printedcode.ts` as `EXPRESSION_PREAMBLE`. The PR check \"Docs site builds (HLT-013)\" runs the Docusaurus build only, not the generators, so PR 57 was green and only the deploy saw it. Every docs-site deploy since 2026-11-05 would have failed the same way; none ran, because no push to `main` touched the deploy's paths until PR 57."
regression: scripts/bubble-phrasebook/check.js
---

The check that keeps the phrasebook's Expression sandbox in step with the runtime reads the runtime's preamble to
compare alias lists. It looked for `const functionPreamble` in `expression.ts`. HST-013 moved the preamble to
`printedcode.ts` as `export const EXPRESSION_PREAMBLE`, so the check threw. `docs-site:build` stopped before
Docusaurus ran.

**Fix:** the check reads `printedcode.ts` and looks for `export const EXPRESSION_PREAMBLE`. Its alias regex reads
the new shape as it is (15 aliases, the same 15). After the fix all five generators ran clean on `main`
(`docs:nodes`, `docs:bubble` 77/77 cells and 0 failures, `docs:bubble-dictionary`, `docs:export`, `docs:library`).

**Still open:** HLT-013 grades the Docusaurus build but not the generators the deploy runs first. A PR that breaks a
generator is green until the deploy, after the merge.

**Live 2026-11-27.** Merged into `main` as `214fd44d0` (#58). The merge did not start the deploy, because `deploy-docs.yml`'s
push paths leave out `scripts/**`, so it was started by hand (run 46028117278): build, deploy and verify all green. The
Cloudflare guide answers 200 with all nine anchors.
