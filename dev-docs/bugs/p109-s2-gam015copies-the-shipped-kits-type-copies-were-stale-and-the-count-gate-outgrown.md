---
id: P109-S2-GAM015COPIES
title: The shipped kits' copies of the node-kit types were stale at HEAD, and GAM-015's count gate had been outgrown twice
status: fixed
commit: 4638de4b1
severity: low
area: kit scaffold / types copies (library/modules/*/project/noodl_modules/*/types/node-kit.d.ts)
found: P109 s2, 2026-10-02 (ISL-011 edited the types' `defaultCss` comment and ran the scaffold suite)
evidence: packages/nodegx-kit-scaffold/tests/types-copy.test.js (GAM-015); `typesCopyStatus` over HEAD 68b1549f5's copies
---

`npx jest` in `packages/nodegx-kit-scaffold` read **8 failed / 68 passed at HEAD `68b1549f5`**, before this session
changed a byte of the types. Measured with the control: `typesCopyStatus` over `git show HEAD:library/modules/game-kit/
project/noodl_modules/game-kit/types/node-kit.d.ts` reads `current: false` — the published `index.d.ts` had moved on
since the copies were refreshed on 2026-09-17 (GAM-015's own commit), and no gate in a path anyone ran told them. The
eighth red was the known-firing count: `expect(copies.length).toBe(5)` with seven copies on disk, because P105 (garden-kit)
and P106 (garden-3d-kit) each added a kit with a types copy and neither re-read the literal.

This is the F19 trap (a kit's files live in four places) wearing its documentation face: the copies are what an author's
editor reads for autocomplete, so a type documented after 09-17 reached none of them.

**Fix (this session):** the seven copies refreshed to the published body (stamp kept), `templates/bot-garden`'s three
module copies regenerated with them, and the count gate names the kits instead of counting them. **Left as they were:**
`templates/nightbook`, `templates/rocket-school` and `templates/digital-bricks-training` carry their own copies (the
peers' trees; GAM-015 leaves rocket-school out on purpose) — stale by the same measure, each its template's to refresh.
