---
id: P132-STEPKINDSCUT
title: Since BWF-004's formula list, the workflow step catalog is over 50,000 characters, so Claude Code shows an agent a 2 KB preview of it and never the formulas
status: fixed
phase: P132
task: BWF-004
severity: medium
area: noodl-mcp / list_backend_step_kinds (Claude Code's save-to-file threshold)
found: BWF-004 AC4's agent round 2 on a Greenhouse copy, 2026-11-03 (s5)
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/BWF-004-FORMULAS-WITHOUT-CODE.md (s5, AC4)
launch: beta
---

`list_backend_step_kinds` is the one place an agent is told to read before authoring a workflow, and where
`formulaLanguage` is served. In the round it arrived as `Output too large (53.5KB). Full output saved to …
Preview (first 2KB)`: the catalog's version and the start of `call-function`. BWF-004's 27 formulas took the served
catalog from under Claude Code's 50,000-character threshold to 50,351 (`JSON.stringify(stepKindCatalog())`), so the
very change that added formulas put them out of a Claude Code agent's sight. (In the round the agent tried to open the
saved file and the round's own fence, `Read(//Users/**)`, refused it: that part is the lab's, as P128 S1 already
recorded. A person's agent may open the file, or may not; P128 S1's unfenced round never did.)

**Fix:** the tool joins `get_project_info` and `call_tool` on `WHOLE_RESULT_TOOLS` (`src/clientApps.ts`): for a client
that says it is Claude Code, its `tools/list` entry carries `_meta["anthropic/maxResultSizeChars"]: 120000`. Other
clients' lists are unchanged.

**Gate:** `tests/p128PreviewCut.test.ts` names the three tools itself (a first version looped over
`WHOLE_RESULT_TOOLS`, and a mutant that took the tool off the list stayed green) and measures the catalog: over 50,000,
under 80 % of the raised limit.
