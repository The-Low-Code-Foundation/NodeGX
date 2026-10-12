---
id: P99-HLT016-NOACL
title: Without an ACL, a save, delete or increment that matches no row answers success
status: fixed
commit: f8574d6f7
phase: P109
task: ISL-039
severity: medium
area: backend / data adapters (SQLite and PostgreSQL)
found: P99 HLT-018 s15 and HLT-016 s16, 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22/VERDICT.md "What §2 got right and wrong"; verdicts/HLT-018/2026-09-22/VERDICT.md §2
regression: packages/nodegx-backend-contract/conformance/cases/records.ts "records/a-write-to-a-missing-row-is-not-found"
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

**Fixed (P109 s41, 2026-10-11, ISL-039).** Re-measured at HEAD first: the new conformance case was red on SQLite
(the save, the increment and the delete of a just-deleted row each answered success with no ACL).
- Both adapters answer `Object not found` when a save, delete or increment changes no row, whatever the ACL. That is
  three checks on each engine, `options.acl &&` removed. With an ACL the answer is unchanged (not found or
  forbidden, indistinguishable).
- The contract suite has the case, listed under `save`, `delete` and `increment` in `coverage.ts`. It also has the
  mutation `missing-row-written-without-acl-succeeds`, which puts back the old answer. On SQLite that mutation is caught
  by this case and by the precondition case. On PostgreSQL it is caught by this case. Conformance: SQLite 29 / 29
  across the four BRG-003 files, PostgreSQL 82 / 82.
- **Reach:** every internal caller that writes without an ACL now hears "not found" for a row that has gone. That
  includes the session sweeps, audit pruning, `_EmailToken` consumption and P116's link cascade. A sign-in token
  consumed twice now fails instead of succeeding quietly. A race between two sweeps of the same session would now
  be loud where it was silent. The full `nodegx-backend` suite is 228 / 230 files, 2781 tests passed. The two red
  files are P116's filed `P116-S13-REL002B` (red with the old adapters too, measured) and `P116-S13-AC2STALL` (the
  drive's setup hook ran past 30 minutes).
