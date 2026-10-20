---
id: P121-TWO004-RUNWHY
title: A run refused before its first step shows "This run recorded no steps" and hides why — the reason is only in Raw JSON
status: fixed
commit: 7aabf8535
phase: P121 TWO-004 s11
severity: medium
area: backend / admin app, Runs (`packages/nodegx-backend/src/admin/app/views/runs.tsx` `FailureBand`)
found: P121 TWO-004 s11, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-004-PAYSTACK.md §10
regression: packages/nodegx-backend/tests/admin-app/runs-view.test.tsx
---

A webhook call the trigger refuses (wrong signature, no signature, a body too big) is recorded as a failed run, with
its reason in the record's `errorMessage` ("unauthenticated webhook (hmac-sha512): HMAC-SHA512 signature mismatch").
The run's Detail showed the band ("error · ran paystackEvent · steps 0") and "This run recorded no steps." The
reason was only inside Raw JSON. `recordSummary` (`format.ts`) computed `errorMessage` and nothing rendered it:
the failure band listed failed STEPS only.

Met driving the marketplace's Paystack setup: the builder's setup page says refused calls are listed under Runs. A
builder who pasted the wrong key saw "error" and nothing saying the key was wrong.

Fixed in the working tree: with no failed step and an `errorMessage`, the band reads "Why it failed" and the
reason. Driven (`two-004-admin-hook-drive.test.ts`, 1024×640 and 1440×900); jsdom spec in `runs-view.test.tsx`,
red with the old early return.
