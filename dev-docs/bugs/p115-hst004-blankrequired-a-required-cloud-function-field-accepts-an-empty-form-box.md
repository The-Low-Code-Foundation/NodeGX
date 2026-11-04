---
id: P115-HST004-BLANKREQUIRED
title: "cloud functions: a Required Request field accepted an empty string, so a form submitted with its box empty ran the function as if it had a value"
status: fixed
commit: 21bb85fc3
severity: medium
area: "cloud runtime / Request node contract (`packages/noodl-viewer-cloud/src/nodes/cloud/requestContract.ts` `applyRequestContract`)"
regression: packages/noodl-viewer-cloud/tests/cwf-014-request-contract.test.ts "P115-HST004-BLANKREQUIRED"
found: P115 HST-004 session 3, 2026-11-04, Richard on the deployed Fixture B (MUST line 4)
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-004-A-WORKFLOW-ON-A-WORKER.md §8.6
---

Richard subscribed with the email box empty on the deployed newsletter page and it said *You are on the list*, the
same as with an email. Measured on the live function: `{"email":""}`, `{"email":"   "}` and `{"email":"not-an-email"}`
each answered 200 `subscribed: true`, and each call reached the list service. Only `{}` (no field at all) was the 400
the contract promises, and `{}` was what the session-2 reading had sent, so the gate never saw what a page sends.

Cause: `applyRequestContract` counted only `undefined` and `null` as missing. A page's empty Text Input sends `""`,
which is a valid `string`, so `preq-email: true` let it through.

Fix: for a Required field, `""` or only whitespace is `missing` (or takes the declared default); an optional field
keeps its `""`. Live after redeploy: `""` and `"   "` → 400 naming `email`, 0 calls at the stand-in; a real email →
200 and 1. SB-004 §7's empty setup token is now refused at the contract rather than by `claimSite` (test updated).

Not this bug: `not-an-email` still passes, because the contract has no email type. Whether the page shows a sentence
for the 400 is Richard's next reading.
