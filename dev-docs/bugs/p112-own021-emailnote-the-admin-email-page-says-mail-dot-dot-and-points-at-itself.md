---
id: P112-OWN021-EMAILNOTE
title: The admin app's Email page warning ends "send mail.." and tells you to go to the Email page you are on
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: backend / admin app Email page
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2
regression: packages/nodegx-backend/tests/admin-app/email-signin-views.test.tsx "P112-OWN021-EMAILNOTE: one sentence per reason, in the order the backend checks them"
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
---

A fresh backend's Email page shows: "Email is NOT configured: Email is not configured for this backend: no SMTP
host/port set. Set it up on the Email page of the backend manager (/_admin) or via the backend admin API before this can
send mail.. Sends fail loudly into execution records rather than queueing."

`packages/nodegx-backend/src/admin/app/views/email.tsx:146` wraps `notConfiguredReason`
(`src/email/EmailConfigState.ts:234`, which already ends in a full stop) in "Email is NOT configured: " … ". ". Fix: on
this page, say it in its own words ("Nothing is sent yet: choose who sends your mail below and save."), keep the
reason for the API and logs.

**Fixed (the Beta sweep s6, 2026-10-25), as proposed.** `email.tsx` `emailNotReadyLine`: the page says the reason in
its own words, one per reason in the backend's order ("Nothing is sent yet. Choose who sends your mail below, then
save." / "Fill in the From address below" / "Turn on “Sending is on” below"), then "Until then, a message your app
sends fails, and its run says why." `notConfiguredReason` is unchanged for the API, flows and logs.

**Graded.** Two jsdom cases (the rendered warning on a fresh backend: no "..", no "Email page", no `/_admin`; each
reason's sentence): red 2/2 at HEAD. Admin app + BMG-010 suites green, admin tsc clean. Not rendered in a browser.
