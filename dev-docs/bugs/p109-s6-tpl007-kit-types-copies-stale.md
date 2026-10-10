---
id: P109-S6-TPL007
title: Rocket School's checked-in kit type copies differ from what the generator writes (two node-kit.d.ts)
status: fixed
commit: 7ad544278
phase: P109
task: ISL-036
severity: low
area: templates / Rocket School generator (TPL-007), kit types copies (GAM-015 lineage)
found: P109 s6, 2026-10-03 (full `noodl-mcp` run; red neighbour, not this session's change)
evidence: packages/noodl-mcp/tests/tpl007Template.test.ts — differing files noodl_modules/game-kit/types/node-kit.d.ts and noodl_modules/keyboard-shortcuts/types/node-kit.d.ts
regression: packages/nodegx-kit-scaffold/tests/types-copy.test.js
---

The byte-for-byte gate on the Rocket School artefact lists the two kits' `types/node-kit.d.ts` copies as different
from what the generator writes today. Same shape as GAM-015's stale types copies (P109 s2 refreshed seven).

⚠️ A peer has `tpl007Components.ts`, `tpl007Curriculum.ts` and `tpl007Template.test.ts` uncommitted in the shared
checkout (2026-10-03), so re-run on a clean tree before acting. Not the P109 s6 change (`node-kit.d.ts` comes from
`nodegx-node-kit-types`, which s6 did not touch). **Reproduce:** `cd packages/noodl-mcp && npx jest tests/tpl007Template.test.ts`.

**Fixed 2026-10-10 (P109 s39, ISL-036, `7ad544278`).** Re-measured: still red on the two (stale since ISL-013 changed the types on Oct 7). GAM-015's copy gate had missed them, and two more: the dbt-lesson pair, which uses a different layout. All four refreshed. The gate now grades every committed copy (`git ls-files`, so a peer's untracked template is not read), named. tpl007Template 110/110.
