---
id: REL044-SEECENSUS
title: The committed SEE census and honesty ledger no longer match four templates (marketplace, rocket-school, star-class, digital-bricks-training-demo)
status: open
severity: low
area: P111 SEE census / `dev-docs/tasks/phase-111-you-can-see-what-it-built/census.json`, `honesty-ledger.json`; graded by `packages/nodegx-node-spec/tests/see-census.test.ts`, `honesty-ledger.test.ts`, `honesty.test.ts`
found: release 0.4.4, PR #54 CI run 43061637414, job "Test (runtime, backend, viewer, mcp, preview)" (not a required check), 2026-11-12
evidence: "6 reds, all new since release 0.4.3's run: AC1 hand computation on the four templates (marketplace: script 99 → 100 nodes, percent 89.6 → 89.5), the census gate's control, the ledger's control. The templates moved; the committed numbers did not"
---

Not a product defect: a measurement recorded against templates that have since changed.

🔴 Before regenerating: `census.json` and `honesty-ledger.json` are MODIFIED and uncommitted in the shared checkout (mtimes 2026-10-19),
someone's open edit. Read that diff first; a regeneration over it is an unperformed merge.

Fix: regenerate both against the templates as committed, then commit them with the template changes they measure.
