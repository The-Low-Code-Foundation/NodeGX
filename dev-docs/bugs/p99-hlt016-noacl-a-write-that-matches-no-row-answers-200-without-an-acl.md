---
id: P99-HLT016-NOACL
title: Without an ACL, a save, delete or increment that matches no row answers success
status: open
severity: medium
area: backend / data adapters (SQLite and PostgreSQL)
found: P99 HLT-018 s15 and HLT-016 s16, 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22/VERDICT.md "What §2 got right and wrong"; verdicts/HLT-018/2026-09-22/VERDICT.md §2
---

A write that finds nothing to write is told it worked. With an ACL context, 0 rows changed is answered
`Object not found`; with none — the admin, the master key, and **every cloud function** — an UPDATE that matched no
row (an unknown or already-deleted `objectId`) answers 200 and emits a change event. A cloud function that saves a
record someone else just deleted reports success and nothing is stored.

**Where:** `packages/noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts` :1114 (save), :1175 (delete),
:1275 (increment) — each checks `result.changes === 0` only `if (options.acl ...)`;
`postgres/PostgresAdapter.ts` save (:634 `if (options.acl && changed === 0)`), delete, increment the same. HLT-016 closed
the case for a write that carries a precondition (`expect`), not the general one. Read at HEAD 2026-10-01: unchanged.

**How to reproduce:** `PUT /classes/<C>/<unknown id>` with the master key, or `Noodl.Records.save` on a deleted record
from a cloud function → 200. The HLT-016 drive (`verdicts/HLT-016/2026-09-22/hlt016.functions.drive.test.ts`) is the
harness to copy.

**Proposed:** answer `Object not found` on 0 changed rows whatever the ACL (the no-ACL path has no forbidden case to
hide), on both engines and all three verbs; one conformance case per verb. Small; a behaviour change, so its own commit.
