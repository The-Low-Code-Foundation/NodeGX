---
id: P18-S102-CATALOGNAME
title: HLS-001 AC4 is red — ISL-034's stale-deploy spec names the catalog artefact, which only src/catalog.ts may
status: open
severity: low
area: export / package structure (test)
found: P18 EXP-011 session 102, 2026-10-14 (the owed whole-package jest run)
evidence: packages/nodegx-export/tests/hls001-catalog-cardinality.test.ts:40-42 — red at HEAD a66ebd2c5 in a clean worktree
---

HLS-001 AC4 ("one accessor, one source") asserts that exactly one file in the package names the catalog artefact.
`tests/p109-s5-stale-deploy-engine.test.ts`, added by P109 ISL-034 (`d88ae73d6`, 2026-10-10) as P109-S5-STALEDEPLOYCLI's
regression, names it too, so the gate is red.

**Reproduce:** `cd packages/nodegx-export && npx jest tests/hls001-catalog-cardinality.test.ts`.

**Proposed:** the stale-deploy spec reads the path through `src/catalog.ts`, or AC4's scan learns that a regression
test may name the artefact it guards. Tiny; whoever picks it reads AC4's reason first.
