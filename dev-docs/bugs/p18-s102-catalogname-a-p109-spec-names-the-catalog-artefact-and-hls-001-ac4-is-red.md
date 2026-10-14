---
id: P18-S102-CATALOGNAME
title: HLS-001 AC4 is red — ISL-034's stale-deploy spec names the catalog artefact, which only src/catalog.ts may
status: fixed
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

**Fixed 2026-10-14 (session 104), by the first of the two proposals, after reading AC4's reason.** AC4 polices
*readers*: files that compute their own path to the real catalog, which breaks once the package is installed. The
stale-deploy spec reads no catalog. It writes a stand-in file under the catalog's name in a temporary checkout,
because the engine's staleness check is an mtime comparison over whatever names its inputs list carries. So the
stand-in is now `CATALOG_INPUT = 'node-catalog.stand-in.json'`, in one constant with the reason beside it, and the
P109-S5 regression is unchanged in substance. AC4's scan is untouched. Teaching it an exemption would have been a
hand-kept list, which is the thing its docblock says a count exists to avoid.

One trap on the way: the first draft of the constant's comment spelled the artefact's name, and the gate, a text
search, counted the file again. The comment now says why it doesn't spell it.

Readings: `hls001-catalog-cardinality` and `p109-s5-stale-deploy-engine` read 15/15, and the package's `tsc --noEmit`
is 0.
