---
id: P127-BKO006-DRIVEHALFRUN
title: drive_page refuses a bad step only after the steps before it have run, so a refused drive still made an account
status: open
severity: low
area: "noodl-mcp drive_page: a step's shape is checked when it is reached, not before the run"
found: P127 BKO-006, 2026-10-27, the shared-expenses brief (REPORT.md item 13)
evidence: "REPORTED by the stranger, not yet re-measured: one run was rejected for a bad step after its earlier steps had already created the Alice account (a duplicated test lunch is the trace)."
owner: none
---

To measure: a drive whose third step has an unknown key; does the sign-up in step 1 happen?
