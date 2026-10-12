---
id: P99-HLT016-DIALECTTEST
title: QueryBuilder's dialect spec goes red when two runs share the PostgreSQL test database
status: fixed
commit: b2b956e6b
phase: P109
task: ISL-041
severity: low
area: runtime tests / QueryBuilder.dialect
found: P99 HLT-016 s17, 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22-checks/VERDICT.md (9 and then 15 failures when concurrent; alone, green)
regression: packages/noodl-runtime/test/adapters/QueryBuilder.dialect.test.js "two runs at once"
---

A gate that reads red for a reason that is not the code: two runs of the runtime's adapter tests at once (two
sessions on this box) collide on one table and fail 9, then 15 cases; alone they pass. A session reading that red
can blame its own change, or learn to ignore the file.

**Where:** `packages/noodl-runtime/test/adapters/QueryBuilder.dialect.test.js` :46-47 — a fixed
`TABLE = 'BrgDialect'` in the shared `nodegx_brg005` database. Read at HEAD 2026-10-01: unchanged.

**Proposed:** a per-run table name (suffix with the pid or a random id) and drop it in `afterAll`. Small.

**Fixed (P109 s41, 2026-10-11, ISL-041), as proposed.** Re-measured first: two runs of the spec at once at HEAD ended
18 failed of 39 and 39 failed of 39. The table is now `BrgDialect_<pid>`, and `afterAll` already dropped it. Two runs
at once after the change: 39 / 39 each, and no `BrgDialect%` table is left in `nodegx_brg005`.
