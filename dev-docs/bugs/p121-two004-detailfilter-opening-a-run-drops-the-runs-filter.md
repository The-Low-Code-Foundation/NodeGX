---
id: P121-TWO004-DETAILFILTER
title: Opening a run's Detail drops the Runs page's filter — "Runs of this trigger" becomes every run
status: open
severity: low
area: backend / admin app, Runs (`packages/nodegx-backend/src/admin/app/views/runs.tsx`: `navigate('runs', x.id)`, and `navigate('runs')` on close)
found: P121 TWO-004 s11, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-004-PAYSTACK.md §10
---

From a trigger, "Runs of this trigger" opens `#/runs?trigger=<id>`: "Showing 1–5 of 5 where trigger is Paystack
Ghana". Pressing Detail on one row goes to `#/runs/<id>` with no query, so the list behind the dialog reloads with
every run ("Showing 1–10 of 10", screenshot `shots/two004-hook-laptop-7-refused-detail.png`), and closing the dialog
goes to `#/runs`, also without the filter. A person checking one hook's refused calls has to set the filter again
after each Detail.

Fix, proposed: keep the query on the Detail's route and on the way back.
