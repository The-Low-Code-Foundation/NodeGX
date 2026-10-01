---
id: P99-HLT016-DIALECTTEST
title: QueryBuilder's dialect spec goes red when two runs share the PostgreSQL test database
status: open
severity: low
area: runtime tests / QueryBuilder.dialect
found: P99 HLT-016 s17, 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22-checks/VERDICT.md (9 and then 15 failures when concurrent; alone, green)
---

A gate that reads red for a reason that is not the code: two runs of the runtime's adapter tests at once (two
sessions on this box) collide on one table and fail 9, then 15 cases; alone they pass. A session reading that red
can blame its own change, or learn to ignore the file.

**Where:** `packages/noodl-runtime/test/adapters/QueryBuilder.dialect.test.js` :46-47 — a fixed
`TABLE = 'BrgDialect'` in the shared `nodegx_brg005` database. Read at HEAD 2026-10-01: unchanged.

**Proposed:** a per-run table name (suffix with the pid or a random id) and drop it in `afterAll`. Small.
