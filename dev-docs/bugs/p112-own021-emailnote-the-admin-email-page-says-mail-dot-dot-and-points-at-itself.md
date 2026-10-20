---
id: P112-OWN021-EMAILNOTE
title: The admin app's Email page warning ends "send mail.." and tells you to go to the Email page you are on
status: open
severity: low
area: backend / admin app Email page
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
---

A fresh backend's Email page shows: "Email is NOT configured: Email is not configured for this backend: no SMTP
host/port set. Set it up on the Email page of the backend manager (/_admin) or via the backend admin API before this can
send mail.. Sends fail loudly into execution records rather than queueing."

`packages/nodegx-backend/src/admin/app/views/email.tsx:146` wraps `notConfiguredReason`
(`src/email/EmailConfigState.ts:234`, which already ends in a full stop) in "Email is NOT configured: " … ". ". Fix: on
this page, say it in its own words ("Nothing is sent yet: choose who sends your mail below and save."), keep the
reason for the API and logs.
