---
id: P111-SEE001-HONESTYFIXTUREDRIFT
title: The editor's honesty spec pins the training template's numbers from before its 33 cloud functions were registered, so 3 of its cases are red at HEAD
status: open
severity: low
area: tests / `packages/noodl-editor/tests-unit/see-001/honestyView.test.ts` (fixture `templates/digital-bricks-training`)
found: P112 OWN-024 s1, 2026-10-20, running the SEE-001 specs beside the honesty gate
evidence: run on a clean `git archive HEAD` tree (cc7c32c06 + docs): 3 failed / 9 passed
---

Three cases pin the template's population and number: "over the registry … 66% (475 known, 245 script, 20 unspecced)"
expects 49 registered components and gets 82; the header expects "66% known" and reads "67% known"; the planted
Function expects "65.9% (475 known, 246 script, 20 unspecced)" and reads "66.9% (578 known, 286 script, 20 unspecced)".
The spec was written in `d75977deb`; `adc63eacf` (P111-SEE001-DBTCLOUDUNREGISTERED, later the same day) registered the
template's 33 cloud functions, which grew the population the walk reads. The rule didn't change; the fixture did.

Not a product defect, and not in a required PR check (`tests-unit` runs under `test:main`). The fix is SEE-001's: re-pin
the numbers against the ledger and the MCP (the case's point is that the three agree), or derive them from it.
