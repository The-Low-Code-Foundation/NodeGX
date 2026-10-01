---
id: P99-HLT016-LASTINDEX
title: Promoting a schema whose source removed its last index leaves that index on the target, silently
status: open
severity: medium
area: backend / schema promotion (schema-migrate)
found: P99 HLT-016 s17 (checks), 2026-09-22 (pre-existing since FED-002)
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22-checks/VERDICT.md ("Found, not fixed, pre-existing")
---

If a collection's last index (say a unique one) is removed on the source and the schema is promoted, the target
keeps the index — and so keeps refusing rows the source now accepts. The result names it neither as applied nor as
skipped.

**Where:** `packages/nodegx-backend/src/backup/schema-migrate.ts` `applyIndexes` :444 — `if (!indexes ||
indexes.length === 0) return;` — called with `c.indexChange.to` at :546, which is `[]` exactly when the last index went.
`applyChecks` (:466) does not copy the mistake: its `whole` flag applies an empty declaration. Read at HEAD 2026-10-01:
unchanged.

**How to reproduce:** source and target with one index on a collection; remove it on the source; promote → the
target's `reconcileIndexes` is never called.

**Proposed:** give `applyIndexes` the same `whole` flag as `applyChecks` (an empty list on a changed table is
reconciled; on a new table it is a no-op), and a migrate spec for "last index removed". Small.
