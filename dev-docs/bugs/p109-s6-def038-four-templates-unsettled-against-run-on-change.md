---
id: P109-S6-DEF038
title: The DBT demo template would be rewritten by an editor load — 6 Function inputs lose their run-on-change (DEF-038's settled gate)
status: fixed
commit: f7d3bcc2b
phase: P109
task: ISL-037
severity: medium
area: templates / digital-bricks-training-demo, run-on-value-change settling (NDA-017, DEF-038)
regression: packages/noodl-mcp/tests/def038SettledTemplates.test.ts (templates/digital-bricks-training-demo)
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

## Measured in s7 (2026-10-03) — the six red rows were three different things

Run in a clean worktree at HEAD `5fc537fb5` (`scripts/devtools/make-worktree.sh`), so only committed artefacts:
**3 red**, not 6. The other three were a peer's **uncommitted** templates (`nightbook`, `planning`, `planning-demo`
have no commits at all), which the gate sweeps from the working tree.

- **Not ISL-018.** The same 3 rows at `b2ba0320a^` and at `b2ba0320a`. Between the two, the gate's only changed
  input is the contract file, and that diff adds an export and a comment; the planner is untouched.
- **Two were the gate's own control arm** (`rocket-school`, `digital-bricks-training`): it deleted a key the planner
  never reads. Filed and fixed separately: `P109-S7-DEF038CONTROL`. The peer's `planning` / `planning-demo` were
  the same.
- **One is real and is this bug:** `templates/digital-bricks-training-demo`, red **from its first commit**
  (`eb9ace9da` 2026-09-24, `feat(dbt-template/l180)`). Six `JavaScriptFunction` inputs (`in-conceptId` ×3,
  `in-field`, `in-value`, `in-learnerId`) on `sr_call`, `ls_finish_call`, `pr_about`, `le_call` carry no answer.
  The project is at format `"4"`, so since ISL-018 the editor's first open runs the migration once, writes `false` on
  all six (those Functions stop re-running when their input changes) and saves the project as format 5.
- The peer's uncommitted `nightbook` reads the same shape (DbCollection2 `records`, 261 lines of diff); it turns
  this gate red the moment it is committed unless its generator pins.

**Owner:** the dbt-template workstream (commits `dbt template: …` / `feat(dbt-template/…)`); no generator for the
demo lives in this repo. **Fix, either:** pin the six keys to `true` with `pinRunOnValueChangeDefaults` (what every
generated template does), or stamp the template at format `"5"` (what `create_project` writes since ISL-018).

## s45 (2026-10-11): re-measured, fixed in the demo's builder

Re-measured at HEAD: still red, now in **2** keys, not 6 — s42's DEMOSTUBWIRES (`6d8323ef4`) took the write
stand-ins' inputs away. Left: the two value-driven responders, `pr_about` (`in-learnerId`) and `le_call`
(`in-conceptId`). The demo has a generator after all (`templates/digital-bricks-training/tools/build-demo.mjs`, since
TASK-L180); its `responder()` made each stand-in with no pin, while its `threader()` already pinned `false`.

**Fix:** `responder()` pins `runOnChange-in-<input>: true`. Absent, the runtime re-runs a Function when that input
changes; `true` says the same thing in the file, so an editor load changes nothing. Control first: HEAD's builder
reproduced the committed demo byte for byte; after, 2 files change, one key each. `check-demo.mjs` OK;
`def038SettledTemplates` green for the demo (its one red is `templates/nightbook`, P78's untracked pile, which the
gate reads from the working tree).
