---
id: P109-S6-DEF038
title: Four shipped templates would be rewritten by an editor load — DEF-038's settled gate is red (6 rows)
status: open
severity: medium
area: templates / run-on-value-change settling (NDA-017, DEF-038; P109 ISL-018 AC7)
found: P109 s6, 2026-10-03 (the first full `noodl-mcp` run in P109; met as a red neighbour, not this session's change)
evidence: packages/noodl-mcp/tests/def038SettledTemplates.test.ts — 6 failed, full suite JSON 2026-10-03 08:57
---

`def038SettledTemplates.test.ts` reads that an editor load would add `runOnChange-*` parameters to
`templates/digital-bricks-training-demo` (44 lines of diff, e.g. `JavaScriptFunction sr_call runOnChange-in-conceptId`),
`templates/nightbook` (261, e.g. `DbCollection2 sp_find runOnChange-records`), `templates/digital-bricks-training` and
`templates/planning`. All four are at project format `"4"`.

**Not attributed.** Candidates, none measured: (a) P109 ISL-018 (`b2ba0320a`, s3) made the migration a one-time
format step 4 → 5, and its AC7 ("def038 stays green over every committed artefact") was never recorded; (b) a family
of run-on-change inputs grew after the templates were settled (`in-*` script inputs, `DbCollection2.records`) —
P107 commits land beside it. Not the P109 s6 data-* change (it touches no run-on-change code or template).

**Reproduce:** `cd packages/noodl-mcp && npx jest tests/def038SettledTemplates.test.ts`. First step: run it at
`b2ba0320a^` and at `b2ba0320a` in a worktree (`scripts/make-worktree.sh`) to settle (a).
