---
id: P115-S9-APICALLSAUDIT
title: Saving or deleting a saved API call (PUT/DELETE admin/api-calls/:id) leaves no row on the audit trail
status: open
severity: low
area: nodegx-backend ops/audit-actions — routes added by P132 BWF-012 (saved API calls)
found: P115 s9, 2026-11-05 (a whole nodegx-backend run for HST-011's AC2)
evidence: packages/nodegx-backend/tests/ops-audit.test.ts:77 "every state-changing privileged route declares an action": missing ["PUT admin/api-calls/:id", "DELETE admin/api-calls/:id"]
phase: P115
---

An owner changes or deletes a saved API call (its address, its key's secret name) in the admin. The audit trail, which
records every other privileged change, has nothing: nobody can later see who changed where a function sends data.
The gate that exists to catch this is red. Fix: declare the two actions in `ops/audit-actions` (names that read as the
act), or say in that file why they are not worth recording.

Not HST-011's: it only changed how `api-calls.json` is written, not the route table.
