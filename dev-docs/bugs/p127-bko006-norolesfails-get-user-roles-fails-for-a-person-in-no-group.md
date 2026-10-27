---
id: P127-BKO006-NOROLESFAILS
title: Get User Roles answers "That user is in no roles" as a failure, so every ordinary customer's call fails
status: open
severity: medium
area: "the cloud runtime's Get User Roles node (noodl.cloud.getuserroles): a person in no group is the failure branch; the agent says a setting meant to treat it as normal had no effect"
found: P127 BKO-006, 2026-10-27, the repair shop brief (REPORT.md item 2)
evidence: "MEASURED in the transcript: consoleErrors 'CloudFunction2 (/Pages/Workshop): That user is in no roles. [cloud-function/call-failed]' for a customer, until the agent wired the failure into its own staff check. The setting's name and its effect are not yet read."
owner: none
---

"In no groups" is an answer (an empty list), not an error, for every app with staff and customers.
